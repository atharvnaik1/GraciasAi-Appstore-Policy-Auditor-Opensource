export type SourceFile = { path: string; content: string };

interface RetrievedChunk {
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  score: number;
  critical: boolean;
}

const RETRIEVAL_KEYWORDS = [
  'privacy', 'tracking', 'permission', 'data', 'user',
  'policy', 'consent', 'analytics', 'location', 'personal',
  'att', 'idfa', 'camera', 'microphone', 'photos', 'contacts',
  'healthkit', 'homekit', 'notification', 'background', 'gdpr', 'ccpa',
];

const CHUNK_TARGET_LINES = 120;
const CHUNK_OVERLAP_LINES = 24;
const MAX_CHUNK_CHARS = 5_000;
const MAX_RETRIEVED_CHUNKS = 80;
const MAX_PROMPT_CONTEXT_CHARS = 240_000;

function getBaseName(filePath: string): string {
  const normalized = (filePath || '').replace(/\\/g, '/');
  const parts = normalized.split('/');
  return (parts[parts.length - 1] || '').toLowerCase();
}

function isCriticalFilePath(filePath: string): boolean {
  const baseName = getBaseName(filePath);
  return (
    baseName === 'info.plist' ||
    baseName === 'privacyinfo.xcprivacy' ||
    baseName.endsWith('.entitlements') ||
    baseName.endsWith('.xcprivacy')
  );
}

function keywordScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const keyword of RETRIEVAL_KEYWORDS) {
    let idx = 0;
    while (true) {
      idx = lower.indexOf(keyword, idx);
      if (idx === -1) break;
      score += 1;
      idx += keyword.length;
    }
  }

  return score;
}

function chunkFile(file: SourceFile): RetrievedChunk[] {
  const lines = file.content.split('\n');
  const chunks: RetrievedChunk[] = [];

  if (lines.length === 0) return chunks;

  const step = Math.max(1, CHUNK_TARGET_LINES - CHUNK_OVERLAP_LINES);
  const critical = isCriticalFilePath(file.path);

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(lines.length, start + CHUNK_TARGET_LINES);
    if (end <= start) break;

    // Preserve line boundaries and indentation in chunks.
    let chunkText = lines.slice(start, end).join('\n');
    if (chunkText.length > MAX_CHUNK_CHARS) {
      chunkText = chunkText.slice(0, MAX_CHUNK_CHARS);
    }

    const textScore = keywordScore(chunkText);
    const pathScore = keywordScore(file.path) * 2;
    const criticalBonus = critical ? 30 : 0;

    chunks.push({
      path: file.path,
      content: chunkText,
      startLine: start + 1,
      endLine: end,
      score: textScore + pathScore + criticalBonus,
      critical,
    });

    if (end === lines.length) break;
  }

  return chunks;
}

export function buildRetrievedContext(files: SourceFile[]): { filesSummary: string; chunkCount: number; fileCount: number } {
  const allChunks = files.flatMap(chunkFile);
  const ranked = allChunks
    .filter(chunk => chunk.score > 0 || chunk.critical)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

  const candidates = ranked.length > 0 ? ranked : allChunks;
  const selected: RetrievedChunk[] = [];
  const seen = new Set<string>();
  const criticalFileIncluded = new Set<string>();
  let usedChars = 0;

  // Force-include at least one chunk from each critical file when possible.
  for (const chunk of candidates) {
    if (!chunk.critical || criticalFileIncluded.has(chunk.path)) continue;

    const dedupKey = `${chunk.path}:${chunk.startLine}:${chunk.endLine}`;
    if (seen.has(dedupKey)) continue;

    const nextSize = usedChars + chunk.content.length;
    if (nextSize > MAX_PROMPT_CONTEXT_CHARS) continue;

    selected.push(chunk);
    seen.add(dedupKey);
    criticalFileIncluded.add(chunk.path);
    usedChars = nextSize;

    if (selected.length >= MAX_RETRIEVED_CHUNKS) break;
  }

  for (const chunk of candidates) {
    if (selected.length >= MAX_RETRIEVED_CHUNKS) break;

    const dedupKey = `${chunk.path}:${chunk.startLine}:${chunk.endLine}`;
    if (seen.has(dedupKey)) continue;

    const nextSize = usedChars + chunk.content.length;
    if (nextSize > MAX_PROMPT_CONTEXT_CHARS) continue;

    selected.push(chunk);
    seen.add(dedupKey);
    usedChars = nextSize;
  }

  const selectedOrFallback = selected.length > 0 ? selected : candidates.slice(0, Math.min(candidates.length, 10));
  const selectedFiles = new Set(selectedOrFallback.map(chunk => chunk.path));

  let filesSummary = '';
  for (const chunk of selectedOrFallback) {
    filesSummary += `\n\n[FILE_CHUNK_START: ${chunk.path}:${chunk.startLine}-${chunk.endLine}]\n${chunk.content}\n[FILE_CHUNK_END: ${chunk.path}:${chunk.startLine}-${chunk.endLine}]`;
  }

  return {
    filesSummary,
    chunkCount: selectedOrFallback.length,
    fileCount: selectedFiles.size,
  };
}
