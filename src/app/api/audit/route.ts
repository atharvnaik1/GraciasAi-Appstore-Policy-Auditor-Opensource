import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { Readable } from 'stream';
import Busboy from 'busboy';
import { LRUCache } from 'lru-cache';
import { buildRetrievedContext, type SourceFile } from '../../../utils/audit-retrieval';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;

const RELEVANT_EXTENSIONS = new Set([
  '.swift', '.dart', '.m', '.h', '.mm',
  '.plist', '.storyboard', '.xib', '.pbxproj',
  '.entitlements', '.json', '.xml', '.yaml', '.yml',
  '.md', '.txt', '.strings', '.xcprivacy',
  '.js', '.ts', '.tsx', '.jsx',
  '.java', '.kt', '.gradle', '.pro', '.properties',
  '.html', '.css',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Pods', 'build', 'DerivedData',
  '.build', '.swiftpm', 'Carthage',
  'vendor', '__pycache__', '.dart_tool',
  'Frameworks', 'PlugIns', '_CodeSignature', 'SC_Info',
  'Assets.car', 'Base.lproj',
  'META-INF', 'assets', 'res/raw'
]);

const MAX_FILE_SIZE = 50_000;
const MAX_TOTAL_CONTENT = 350_000;

const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 1000 * 60,
});

function getClientKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip');

  if (ip) return `ip:${ip.trim()}`;

  return `fp:${req.headers.get('user-agent')}-${req.headers.get('accept-language')}`;
}

/* ---------------- MULTIPART PARSER ---------------- */

interface ParsedUpload {
  filePath: string;
  fileName: string;
  provider: string;
  model: string;
  context: string;
}

function parseMultipartStream(req: NextRequest, tempDir: string): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: { 'content-type': req.headers.get('content-type') || '' },
      limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
    });

    let filePath = '';
    let fileName = '';
    let provider = 'anthropic';
    let model = '';
    let context = '';

    let writeFinished = false;
    let busboyFinished = false;

    const tryResolve = () => {
      if (writeFinished && busboyFinished) {
        resolve({ filePath, fileName, provider, model, context });
      }
    };

    busboy.on('file', (_, fileStream, info) => {
      fileName = path.basename(info.filename || 'upload.zip');
      filePath = path.join(tempDir, fileName);

      const writeStream = createWriteStream(filePath);
      fileStream.pipe(writeStream);

      writeStream.on('finish', () => {
        writeFinished = true;
        tryResolve();
      });

      writeStream.on('error', reject);
    });

    busboy.on('field', (name, val) => {
      if (name === 'provider') provider = val;
      if (name === 'model') model = val;
      if (name === 'context') context = val;
    });

    busboy.on('finish', () => {
      busboyFinished = true;
      tryResolve();
    });

    busboy.on('error', reject);

    const reader = req.body!.getReader();

    const stream = new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) this.push(null);
        else this.push(Buffer.from(value));
      },
    });

    stream.pipe(busboy);
  });
}

/* ---------------- FILE COLLECTION ---------------- */

async function collectFiles(dir: string): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  let totalSize = 0;

  async function walk(current: string, rel = '') {
    if (totalSize > MAX_TOTAL_CONTENT) return;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (totalSize > MAX_TOTAL_CONTENT) break;

      const full = path.join(current, entry.name);
      const relative = path.join(rel, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full, relative);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (!RELEVANT_EXTENSIONS.has(ext)) continue;

        try {
          const stat = await fs.stat(full);
          if (stat.size > MAX_FILE_SIZE) continue;

          const buf = await fs.readFile(full);

          if (buf.includes(0)) continue; // skip binary

          const content = buf.toString('utf-8');
          files.push({ path: relative, content });
          totalSize += content.length;
        } catch { }
      }
    }
  }

  await walk(dir);
  return files;
}

/* ---------------- PROMPT ---------------- */

function sanitizeContext(context: string) {
  return context?.slice(0, 2000) || '';
}

function buildAuditPrompt(
  files: SourceFile[],
  context: string,
  fileName: string
) {
  const { filesSummary, chunkCount, fileCount } = buildRetrievedContext(files);

  const isAndroid = fileName.toLowerCase().endsWith('.apk');
  const storeName = isAndroid ? 'Google Play Store' : 'Apple App Store';

  return {
    system: `You are an expert ${storeName} compliance auditor.`,
    user: `
Analyze code for ${storeName} compliance.

${sanitizeContext(context)}

FILES (${fileCount}):
${filesSummary}
`,
  };
}

/* ---------------- MAIN HANDLER ---------------- */

export async function POST(req: NextRequest) {
  const key = getClientKey(req);
  const count = rateLimitCache.get(key) || 0;

  if (count >= 5) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  rateLimitCache.set(key, count + 1);

  let tempDir: string | null = null;

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-'));

    const { filePath, fileName, provider, model, context } =
      await parseMultipartStream(req, tempDir);

    const ext = path.extname(fileName).toLowerCase();
    if (!['.ipa', '.apk', '.zip'].includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const extractDir = path.join(tempDir, 'extracted');
    await fs.mkdir(extractDir);

    await execFileAsync('unzip', ['-o', filePath, '-d', extractDir]);

    const files = await collectFiles(extractDir);

    if (!files.length) {
      return NextResponse.json({ error: 'No files found' }, { status: 400 });
    }

    const { system, user } = buildAuditPrompt(files, context, fileName);

    const abortController = new AbortController();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    return new Response(response.body, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (tempDir) fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
  }
}