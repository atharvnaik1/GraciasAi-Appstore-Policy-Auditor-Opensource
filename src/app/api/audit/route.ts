import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { Readable } from 'stream';
import Busboy from 'busboy';
import { LRUCache } from 'lru-cache';

const execFileAsync = promisify(execFile);

// Basic in-memory rate limiter using LRU Cache for DDoS protection
const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 1000 * 60, // 1 minute
});


// Force Node.js runtime (not Edge) — required for file system + streaming
export const runtime = 'nodejs';

// Increase the max request duration for large uploads + Claude analysis
export const maxDuration = 300; // 5 minutes

const MAX_UPLOAD_SIZE = 150 * 1024 * 1024; // 150MB hard limit

const RELEVANT_EXTENSIONS = new Set([
  '.swift', '.dart', '.m', '.h', '.mm',
  '.plist', '.storyboard', '.xib', '.pbxproj',
  '.entitlements', '.json', '.xml', '.yaml', '.yml',
  '.md', '.txt', '.strings', '.xcprivacy',
  '.js', '.ts', '.tsx', '.jsx',
  '.html', '.css',
  '.java', '.kt', '.xml', '.gradle', '.pro' // Android extensions
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Pods', 'build', 'DerivedData',
  '.build', '.swiftpm', 'Carthage',
  'vendor', '__pycache__', '.dart_tool',
  // IPA-specific: skip compiled/binary directories inside .app bundles
  'Frameworks', 'PlugIns', '_CodeSignature', 'SC_Info',
  'Assets.car', 'Base.lproj',
  // APK-specific
  'META-INF', 'assets', 'res/raw'
]);

const MAX_FILE_SIZE = 50_000; // 50KB per individual source file
const MAX_TOTAL_CONTENT = 350_000; // 350KB total context (roughly ~90k tokens max)

// ─── Streaming Multipart Parser ──────────────────────────────────────────────
// Pipes file data directly to disk via busboy — never buffers entire file in memory.

interface ParsedUpload {
  filePath: string;
  fileName: string;
  claudeApiKey: string;
  provider: string;
  model: string;
  context: string;
  fileId?: string;
}

function parseMultipartStream(
  req: NextRequest,
  tempDir: string
): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers.get('content-type') || '';

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
    });

    let filePath = '';
    let fileId = '';
    let fileName = '';
    let claudeApiKey = '';
    let provider = 'anthropic';
    let model = '';
    let context = '';
    let fileReceived = false;
    let totalBytes = 0;
    let rejected = false;
    let writeFinished = false;
    let busboyFinished = false;

    const safeReject = (err: Error) => {
      if (!rejected) {
        rejected = true;
        reject(err);
      }
    };

    // Resolve only when both busboy is done AND the file has been fully written to disk
    const tryResolve = () => {
      if (busboyFinished && writeFinished && !rejected) {
        resolve({ filePath, fileName, claudeApiKey, provider, model, context });
      }
    };

    // Handle file fields — stream directly to disk
    busboy.on('file', (fieldname: string, fileStream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      if (fieldname !== 'file') {
        // Drain unwanted file streams
        (fileStream as any).resume();
        return;
      }

      fileName = info.filename || 'upload.ipa';
      filePath = path.join(tempDir, fileName);
      fileReceived = true;

      const writeStream = createWriteStream(filePath);

      fileStream.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_UPLOAD_SIZE) {
          (fileStream as any).unpipe(writeStream);
          writeStream.destroy();
          (fileStream as any).resume(); // drain remaining data
          safeReject(new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`));
        }
      });

      (fileStream as NodeJS.ReadableStream).pipe(writeStream);

      writeStream.on('finish', () => {
        writeFinished = true;
        tryResolve();
      });

      writeStream.on('error', (err: Error) => {
        safeReject(new Error(`Failed to write file to disk: ${err.message}`));
      });

      (fileStream as any).on('limit', () => {
        (fileStream as any).unpipe(writeStream);
        writeStream.destroy();
        (fileStream as any).resume();
        safeReject(new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`));
      });
    });

    // Handle text fields
    busboy.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'claudeApiKey') claudeApiKey = val;
      if (fieldname === 'provider') provider = val;
      if (fieldname === 'model') model = val;
      if (fieldname === 'context') context = val;
      if (fieldname === 'fileId') fileId = val;
      if (fieldname === 'fileName') fileName = val;
    });

    busboy.on('finish', () => {
      if (!fileReceived && !fileId) {
        safeReject(new Error('No file uploaded'));
        return;
      }
      if (!fileReceived && fileId) {
        filePath = path.join(os.tmpdir(), fileId, fileName);
        fileReceived = true;
        writeFinished = true;
      }
      busboyFinished = true;
      if (!filePath) {
        safeReject(new Error('No file uploaded'));
        return;
      }
      tryResolve();
    });

    busboy.on('error', (err: Error) => {
      safeReject(new Error(`Upload parsing failed: ${err.message}`));
    });

    // Convert the Web ReadableStream from fetch into a Node.js Readable and pipe to busboy
    const reader = req.body!.getReader();
    const nodeStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (err) {
          this.destroy(err as Error);
        }
      },
    });

    nodeStream.pipe(busboy);
  });
}

// ─── File Collection ─────────────────────────────────────────────────────────

async function collectFiles(dir: string, basePath: string = ''): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  let totalSize = 0;

  async function walk(currentDir: string, relativePath: string) {
    if (totalSize > MAX_TOTAL_CONTENT) return;

    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (totalSize > MAX_TOTAL_CONTENT) break;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(fullPath, relPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (RELEVANT_EXTENSIONS.has(ext)) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size < MAX_FILE_SIZE) {
              const buf = await fs.readFile(fullPath);
              // Skip binary files
              if (buf[0] === 0x62 && buf[1] === 0x70 && buf[2] === 0x6C && buf[3] === 0x69 && buf[4] === 0x73 && buf[5] === 0x74) {
                continue; 
              }
              const checkLen = Math.min(buf.length, 512);
              let isBinary = false;
              for (let i = 0; i < checkLen; i++) {
                if (buf[i] === 0) { isBinary = true; break; }
              }
              if (isBinary) continue;

              const content = buf.toString('utf-8');
              files.push({ path: relPath, content });
              totalSize += content.length;
            }
          } catch { }
        }
      }
    }
  }

  await walk(dir, basePath);
  return files;
}

// ─── Audit Prompt ────────────────────────────────────────────────────────────

function buildAuditPrompt(files: { path: string; content: string }[], context: string, isAndroid: boolean): { system: string; user: string } {
  let filesSummary = '';
  for (const file of files) {
    filesSummary += `\n\n[FILE_START: ${file.path}]\n${file.content}\n[FILE_END: ${file.path}]`;
  }

  const platform = isAndroid ? "Android Play Store" : "Apple App Store";
  const guidelineType = isAndroid ? "Google Play Store Policy" : "Apple App Store Review Guidelines";

  const system = `You are an expert ${platform} reviewer and compliance auditor. You have deep knowledge of ${guidelineType}, developer policies, and common rejection reasons.

Your task is to analyze source code files provided by the user and generate a compliance audit report. Base your analysis ONLY on the actual code provided.

You MUST follow the exact markdown structure specified. Every compliance check must use the blockquote format with STATUS, Guideline, Finding, File(s), and Action fields.`;

  const user = `Analyze the following ${files.length} source files for **${platform}** policy compliance.
${context ? `\nUser-provided context:\n> ${context}\n` : ''}
SOURCE FILES:
${filesSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a thorough **${platform} Compliance Audit Report**. Follow the structure below:

# ${platform} Compliance Audit Report

## Phase 1: Policy Compliance Checks

${isAndroid ? `
### 1. Permissions & Privacy
- Sensitive permissions (SMS, Call Logs, Location, etc.)
- Data Safety disclosures
- Privacy policy requirements

### 2. Monetization & Ads
- Billing system compliance
- Ad placement and content policies

### 3. User Safety & Security
- Malware and deceptive behavior
- User-generated content
` : `
### 1. Safety (Guideline 1.1–1.5)
### 2. Performance (Guideline 2.1–2.5)
### 3. Business (Guideline 3.1–3.2)
### 4. Design (Guideline 4.1–4.7)
### 5. Legal & Privacy (Guideline 5.1–5.4)
`}

---

## Phase 2: Remediation Plan
[Structured table with Severity, Issue, File, and Fix]

## Submission Readiness
[Score and Verdict]
`;

  return { system, user };
}

// ─── Main Route Handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ipHeader = req.headers.get('x-forwarded-for');
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : 'unknown';
  const tokenCount = rateLimitCache.get(ip) || 0;
  if (tokenCount >= 5) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  rateLimitCache.set(ip, tokenCount + 1);

  let tempDir: string | null = null;

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igracias-audit-'));
    const { filePath, fileName, claudeApiKey, provider, model, context } = await parseMultipartStream(req, tempDir);

    const isAndroid = fileName.toLowerCase().endsWith('.apk');
    const isIOS = fileName.toLowerCase().endsWith('.ipa');

    if (!isAndroid && !isIOS) {
      return NextResponse.json({ error: 'Only .ipa or .apk files are accepted.' }, { status: 400 });
    }

    const extractDir = path.join(tempDir, 'extracted');
    await fs.mkdir(extractDir, { recursive: true });
    
    // Use appropriate extraction tool
    const extractCmd = isAndroid ? 'unzip' : 'unzip'; // Both are zip archives
    await execFileAsync(extractCmd, ['-o', '-q', filePath, '-d', extractDir]);

    const files = await collectFiles(extractDir);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No source files found for analysis.' }, { status: 400 });
    }

    const { system: systemPrompt, user: userPrompt } = buildAuditPrompt(files, context, isAndroid);

    // Call AI API (Generic Implementation)
    let apiUrl = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let payload: any = {};

    if (provider === 'anthropic') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = claudeApiKey;
      headers['anthropic-version'] = '2023-06-01';
      payload = {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      };
    } else {
        // Fallback for OpenAI/Gemini/OpenRouter (Simplified for brevity)
        return NextResponse.json({ error: 'Simplified mode: use Anthropic for full Android support.' }, { status: 400 });
    }

    const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(payload) });

    if (!response.ok) return NextResponse.json({ error: 'AI request failed' }, { status: response.status });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        controller.enqueue(encoder.encode(JSON.stringify({ type: 'meta', filesScanned: files.length }) + '\n'));

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.delta?.text || '';
                  if (text) controller.enqueue(encoder.encode(JSON.stringify({ type: 'content', text }) + '\n'));
                } catch { }
            }
          }
        }
        controller.close();
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error: any) {
    console.error('Audit API Error:', error);
    if (tempDir) fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
