export interface SourceFile {
  path: string;
  content: string;
}

export interface TextChunk {
  filePath: string;
  chunkText: string;
}

export interface RankedChunk {
  chunk: TextChunk;
  score: number;
}

export interface ChunkTextOptions {
  minChars?: number;
  maxChars?: number;
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
  'were', 'will', 'with', 'your', 'you', 'app', 'ios'
]);

export function normalizeChunkText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkText(text: string, options: ChunkTextOptions = {}): string[] {
  const minChars = options.minChars ?? 500;
  const maxChars = options.maxChars ?? 800;

  if (minChars <= 0 || maxChars <= 0 || minChars > maxChars) {
    throw new Error('Invalid chunk size options. Ensure 0 < minChars <= maxChars.');
  }

  const normalized = normalizeChunkText(text);
  if (!normalized) return [];

  const parts = normalized
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    if (part.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }

      const longParts = splitLongChunk(part, maxChars);
      for (const longPart of longParts) {
        pushOrMergeSmallChunk(chunks, longPart, minChars, maxChars);
      }
      continue;
    }

    if (!current) {
      current = part;
      continue;
    }

    const candidate = `${current}\n\n${part}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = part;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return mergeTinyTrailingChunks(chunks, minChars, maxChars);
}

function splitLongChunk(text: string, maxChars: number): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (line.length <= maxChars) {
      current = line;
    } else {
      const words = line.split(' ').filter(Boolean);
      let linePart = '';
      for (const word of words) {
        const wordCandidate = linePart ? `${linePart} ${word}` : word;
        if (wordCandidate.length <= maxChars) {
          linePart = wordCandidate;
        } else {
          if (linePart) chunks.push(linePart);
          linePart = word;
        }
      }
      if (linePart) {
        current = linePart;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function pushOrMergeSmallChunk(chunks: string[], chunk: string, minChars: number, maxChars: number) {
  if (!chunk) return;

  if (chunks.length > 0 && chunk.length < minChars) {
    const previous = chunks[chunks.length - 1];
    const merged = `${previous}\n${chunk}`;
    if (merged.length <= maxChars) {
      chunks[chunks.length - 1] = merged;
      return;
    }
  }

  chunks.push(chunk);
}

function mergeTinyTrailingChunks(chunks: string[], minChars: number, maxChars: number): string[] {
  const merged: string[] = [];

  for (const chunk of chunks) {
    const previous = merged[merged.length - 1];
    if (previous && chunk.length < minChars) {
      const candidate = `${previous}\n${chunk}`;
      if (candidate.length <= maxChars) {
        merged[merged.length - 1] = candidate;
        continue;
      }
    }

    merged.push(chunk);
  }

  return merged;
}

export function scoreChunk(chunkText: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const frequencyMap = buildWordFrequencyMap(chunkText);
  const uniqueMatches = new Set<string>();
  let totalMatches = 0;

  for (const keyword of keywords) {
    const count = frequencyMap.get(keyword) ?? 0;
    if (count > 0) {
      uniqueMatches.add(keyword);
      totalMatches += count;
    }
  }

  const coverageScore = uniqueMatches.size / keywords.length;
  const frequencyScore = Math.min(totalMatches / keywords.length, 1);

  return Number((coverageScore * 0.7 + frequencyScore * 0.3).toFixed(4));
}

export function rankChunks(chunks: TextChunk[], query: string): RankedChunk[] {
  const keywords = extractKeywords(query);
  const ranked = chunks.map((chunk) => ({
    chunk,
    score: scoreChunk(`${chunk.filePath} ${chunk.chunkText}`, keywords),
  }));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.chunk.chunkText.length - a.chunk.chunkText.length;
  });

  return ranked;
}

export function getPriorityChunks(chunks: TextChunk[], priorityPatterns: string[]): TextChunk[] {
  const normalizedPatterns = priorityPatterns.map((pattern) => pattern.toLowerCase());
  return chunks.filter((chunk) => {
    const normalizedPath = chunk.filePath.toLowerCase();
    for (const pattern of normalizedPatterns) {
      if (normalizedPath.endsWith(pattern)) return true;
    }
    return false;
  });
}

export function dedupeChunks(chunks: TextChunk[]): TextChunk[] {
  const seen = new Set<string>();
  const deduped: TextChunk[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.filePath}\u0000${chunk.chunkText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chunk);
  }

  return deduped;
}

export function mergePriorityAndRankedChunks(
  priorityChunks: TextChunk[],
  rankedChunks: TextChunk[],
  maxChunks: number
): TextChunk[] {
  const merged = dedupeChunks([...priorityChunks, ...rankedChunks]);
  if (merged.length <= maxChunks) return merged;
  return merged.slice(0, maxChunks);
}

export function buildContext(chunks: TextChunk[], maxContextLength: number): string {
  let context = '';

  for (const chunk of chunks) {
    const block = `\nFILE: ${chunk.filePath}\n${chunk.chunkText}\n`;
    if (context.length + block.length > maxContextLength) {
      break;
    }
    context += block;
  }

  return context;
}

export function createFileChunks(
  files: SourceFile[],
  options: ChunkTextOptions = {}
): TextChunk[] {
  const allChunks: TextChunk[] = [];

  for (const file of files) {
    const chunkTexts = chunkText(file.content, options);
    const chunksToUse = chunkTexts.length > 0 ? chunkTexts : [normalizeChunkText(file.content)];

    for (const chunkText of chunksToUse) {
      if (!chunkText) continue;
      allChunks.push({
        filePath: file.path,
        chunkText,
      });
    }
  }

  return allChunks;
}

function normalizeForScoring(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\n ]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function buildWordFrequencyMap(text: string): Map<string, number> {
  const words = normalizeForScoring(text)
    .split(/\s+/)
    .filter(Boolean);

  const frequencyMap = new Map<string, number>();
  for (const word of words) {
    const current = frequencyMap.get(word) ?? 0;
    frequencyMap.set(word, current + 1);
  }

  return frequencyMap;
}

function extractKeywords(query: string): string[] {
  const tokens = normalizeForScoring(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2)
    .filter((token) => !DEFAULT_STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).slice(0, 24);
}
