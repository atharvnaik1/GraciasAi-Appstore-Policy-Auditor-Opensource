import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { Readable } from 'stream';
import Busboy from 'busboy';
import { LRUCache } from 'lru-cache';

// Basic in-memory rate limiter using LRU Cache for DDoS protection
const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 1000 * 60, // 1 minute
});

const execAsync = promisify(exec);

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
  '.kt', '.java', '.gradle',
  '.js', '.ts', '.tsx', '.jsx',
  '.html', '.css',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Pods', 'build', 'DerivedData',
  '.build', '.swiftpm', 'Carthage', '.gradle',
  'vendor', '__pycache__', '.dart_tool',
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
  context: string;
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
    let fileName = '';
    let claudeApiKey = '';
    let provider = 'anthropic';
    let context = '';
    let fileReceived = false;
    let totalBytes = 0;

    // Handle file fields — stream directly to disk
    busboy.on('file', (fieldname: string, fileStream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      if (fieldname !== 'file') {
        // Drain unwanted file streams
        (fileStream as any).resume();
        return;
      }

      fileName = info.filename || 'upload.zip';
      filePath = path.join(tempDir, fileName);
      fileReceived = true;

      const writeStream = createWriteStream(filePath);

      fileStream.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_UPLOAD_SIZE) {
          writeStream.destroy();
          reject(new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`));
        }
      });

      (fileStream as NodeJS.ReadableStream).pipe(writeStream);

      writeStream.on('error', (err: Error) => {
        reject(new Error(`Failed to write file to disk: ${err.message}`));
      });

      (fileStream as any).on('limit', () => {
        writeStream.destroy();
        reject(new Error(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`));
      });
    });

    // Handle text fields
    busboy.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'claudeApiKey') claudeApiKey = val;
      if (fieldname === 'provider') provider = val;
      if (fieldname === 'context') context = val;
    });

    busboy.on('finish', () => {
      if (!fileReceived) {
        reject(new Error('No file uploaded'));
        return;
      }
      resolve({ filePath, fileName, claudeApiKey, provider, context });
    });

    busboy.on('error', (err: Error) => {
      reject(new Error(`Upload parsing failed: ${err.message}`));
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
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({ path: relPath, content });
              totalSize += content.length;
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  await walk(dir, basePath);
  return files;
}

// ─── Audit Prompt ────────────────────────────────────────────────────────────

function buildAuditPrompt(files: { path: string; content: string }[], context: string): string {
  let filesSummary = '';
  for (const file of files) {
    filesSummary += `\n\n━━━ FILE: ${file.path} ━━━\n${file.content}`;
  }

  return `You are an expert iOS/mobile App Store reviewer and compliance auditor. 
You have deep knowledge of Apple's App Store Review Guidelines (latest version), 
Human Interface Guidelines, and common rejection reasons.

A user has uploaded their app's source code for a pre-submission compliance audit. 
Analyze ALL the provided files carefully and generate a comprehensive, structured report.

${context ? `ADDITIONAL CONTEXT FROM USER:\n${context}\n\n` : ''}

SOURCE FILES (${files.length} files found):
${filesSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a thorough **App Store Compliance Audit Report** with the following structure. 
Use markdown formatting with headers, bullet points, tables, and emoji indicators for severity.

# 📋 App Store Compliance Audit Report

Start with a brief executive summary of the app (what it does based on code analysis), 
overall risk level (🟢 Low / 🟡 Medium / 🔴 High), and key statistics.

## 🔍 Phase 1 : App Store Policy Compliance Checks or Android Playstore Checks

Check against these Apple guidelines and flag violations:

### 3.1 Safety
- Objectionable content, user-generated content moderation
- Physical harm risks

### 3.2 Performance
- App completeness (no placeholder content, broken links, dummy features)
- Beta/test/demo indicators in code
- Accurate metadata requirements

### 3.3 Business
- In-App Purchase compliance (no external payment links)
- Subscription requirements (free trial, cancellation, restore purchases)
- Accurate pricing and feature descriptions

### 3.4 Design
- Human Interface Guidelines compliance
- Minimum functionality (not a repackaged website)
- Proper use of system features (notifications, location, camera, etc.)

### 3.5 Legal & Privacy
- Privacy policy URL requirement
- App Tracking Transparency (ATT) implementation
- Data collection declarations (NSPrivacyTracking, NSPrivacyCollectedDataTypes)
- Camera/microphone/location/photo usage descriptions
- GDPR/CCPA compliance indicators
- HealthKit/HomeKit/Sign in with Apple requirements

### 3.6 Technical
- IPv6 compatibility
- 64-bit support
- Minimum iOS version appropriateness
- API deprecation warnings
- Proper entitlements and capabilities
- Background modes justification

For each check, indicate:
- ✅ PASS — compliant
- ⚠️ WARNING — potential issue, needs review
- ❌ FAIL — likely rejection risk
- ℹ️ NOT APPLICABLE — feature not used

## 🛠️ Phase 2: Action/Remediation Plan
Contact https://gracias.sh and atharv.naik@gracias.sh to deploy app with worlds quickest and efficeint version controls !! --> here to help


Provide a prioritized action plan with:

### Critical (Must Fix Before Submission) 🔴
Items that will almost certainly cause rejection.

### High Priority (Strongly Recommended) 🟠
Items that frequently cause rejection.

### Medium Priority (Recommended) 🟡
Items that could cause rejection depending on reviewer.

### Low Priority (Nice to Have) 🟢
Best practices and improvements.

For each item include:
| # | Issue | Severity | File(s) | Fix Description | Estimated Effort |
|---|-------|----------|---------|-----------------|------------------|

End with a **Submission Readiness Score** (0-100%) and clear YES/NO recommendation 
on whether the app is ready for submission in its current state.

IMPORTANT: Be thorough, specific, and cite actual file names and line patterns you found. 
Do not give generic advice — base everything on the actual code provided.`;
}

// ─── Main Route Handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ipHeader = req.headers.get('x-forwarded-for');
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : 'unknown';
  const tokenCount = rateLimitCache.get(ip) || 0;
  if (tokenCount >= 5) {
    return NextResponse.json({ error: 'Too Many Requests - Rate limit exceeded.' }, { status: 429 });
  }
  rateLimitCache.set(ip, tokenCount + 1);

  let tempDir: string | null = null;

  try {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igracias-audit-'));

    // Stream-parse the multipart upload — writes file directly to disk
    // without ever loading the full file into memory
    const { filePath, fileName, claudeApiKey, provider, context } = await parseMultipartStream(req, tempDir);

    if (!claudeApiKey || !claudeApiKey.trim()) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Extract if it's a zip/ipa
    let extractDir = tempDir;
    const ext = path.extname(fileName).toLowerCase();

    if (ext === '.zip' || ext === '.ipa') {
      extractDir = path.join(tempDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });
      try {
        // Use -o (overwrite) and -q (quiet) flags;
        // maxBuffer increased for large archives that produce verbose output
        await execAsync(`unzip -o -q "${filePath}" -d "${extractDir}"`, {
          maxBuffer: 50 * 1024 * 1024, // 50MB stdout buffer for large archives
        });
      } catch (unzipError: any) {
        // unzip may return non-zero for warnings but still extract files
        console.warn('Unzip warning:', unzipError.stderr || unzipError.message);
      }
    }

    // Collect relevant source files
    const files = await collectFiles(extractDir);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No relevant source files found in the uploaded archive. Please upload a project folder as .zip containing source code files (.swift, .dart, .plist, etc.).' },
        { status: 400 }
      );
    }

    // Build the audit prompt
    const auditPrompt = buildAuditPrompt(files, context);

    // Call AI API with streaming
    let apiUrl = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let payload: any = {};

    if (provider === 'anthropic') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = claudeApiKey.trim();
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-beta'] = 'max-tokens-3-5-sonnet-2024-07-15';
      payload = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        stream: true,
        messages: [{ role: 'user', content: auditPrompt }],
      };
    } else if (provider.startsWith('gemini')) {
      const modelId = provider === 'gemini-pro' ? 'gemini-1.5-pro' : 'gemini-2.5-flash';
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${claudeApiKey.trim()}&alt=sse`;
      payload = {
        contents: [{ role: 'user', parts: [{ text: auditPrompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      };
    } else {
      // OpenAI or OpenRouter (Both use identical Chat Completions API format)
      apiUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${claudeApiKey.trim()}`;
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://gracias.sh'; // Optional, but good practice for OpenRouter
        headers['X-Title'] = 'App Store Compliance Auditor';
      }
      payload = {
        model: provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o',
        max_tokens: 16384,
        stream: true,
        messages: [{ role: 'user', content: auditPrompt }],
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claude API error:', response.status, errorBody);
      let errorMessage = 'Claude API request failed';
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error?.message || errorMessage;
      } catch { }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Stream the response back to client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        // Send metadata first
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'meta',
          filesScanned: files.length,
          fileNames: files.map(f => f.path),
        }) + '\n'));

        try {
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
                  let textFragment = '';

                  if (provider === 'anthropic') {
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      textFragment = parsed.delta.text;
                    }
                  } else if (provider.startsWith('gemini')) {
                    if (parsed.candidates && parsed.candidates.length > 0) {
                      const parts = parsed.candidates[0].content?.parts;
                      if (parts && parts.length > 0 && parts[0].text) {
                        textFragment = parts[0].text;
                      }
                    }
                  } else {
                    // OpenAI / OpenRouter format
                    if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].delta?.content) {
                      textFragment = parsed.choices[0].delta.content;
                    }
                  }

                  if (textFragment) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                      type: 'content',
                      text: textFragment,
                    }) + '\n'));
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (err) {
          console.error('Stream read error:', err);
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            message: 'Stream interrupted',
          }) + '\n'));
        } finally {
          controller.close();
          // Clean up temp dir
          if (tempDir) {
            fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('Audit API Error:', error);
    // Clean up temp dir on error
    if (tempDir) {
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
