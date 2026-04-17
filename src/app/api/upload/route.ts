import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { Readable } from 'stream';
import Busboy from 'busboy';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;
  
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igracias-upload-'));
    
    const contentType = req.headers.get('content-type') || '';
    
    // Convert Web ReadableStream to Node.js Readable
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

    const parsed = await new Promise<{ fileName: string, fileId: string, type: 'ios' | 'android' }>((resolve, reject) => {
      const busboy = Busboy({
        headers: { 'content-type': contentType },
        limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
      });

      let fileName = '';
      let fileReceived = false;
      let writeFinished = false;
      let busboyFinished = false;
      let rejected = false;

      const tryResolve = () => {
        if (busboyFinished && writeFinished && !rejected) {
          const ext = path.extname(fileName).toLowerCase();
          resolve({ 
            fileName, 
            fileId: path.basename(tempDir!), 
            type: ext === '.apk' ? 'android' : 'ios' 
          });
        }
      };

      const safeReject = (err: Error) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      busboy.on('file', (fieldname, fileStream, info) => {
        if (fieldname !== 'file') {
          (fileStream as any).resume();
          return;
        }

        fileName = info.filename || 'upload.ipa';
        const filePath = path.join(tempDir!, fileName);
        fileReceived = true;

        const writeStream = createWriteStream(filePath);

        (fileStream as NodeJS.ReadableStream).pipe(writeStream);

        writeStream.on('finish', () => {
          writeFinished = true;
          tryResolve();
        });

        writeStream.on('error', (err) => {
          safeReject(err);
        });

        (fileStream as any).on('limit', () => {
          safeReject(new Error('File exceeds maximum size'));
        });
      });

      busboy.on('finish', () => {
        busboyFinished = true;
        if (!fileReceived) {
          safeReject(new Error('No file uploaded'));
        } else {
          tryResolve();
        }
      });

      busboy.on('error', safeReject);

      nodeStream.pipe(busboy);
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Upload Error:', error);
    if (tempDir) {
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
