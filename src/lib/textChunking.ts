interface TextChunkOptions {
  minChars?: number;
  maxChars?: number;
}

/**
 * Split text into chunks while preferring sentence boundaries and never
 * breaking words. Chunks are targeted to stay between minChars and maxChars.
 */
export function chunkTextByMeaning(
  text: string,
  options: TextChunkOptions = {}
): string[] {
  const minChars = options.minChars ?? 500;
  const maxChars = options.maxChars ?? 800;

  if (minChars <= 0 || maxChars <= 0 || minChars > maxChars) {
    throw new Error('Invalid chunk size options. Ensure 0 < minChars <= maxChars.');
  }

  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return [];

  // First split by sentence-like boundaries to preserve meaning.
  const sentences = splitIntoSentences(normalized);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;

    // If one sentence is too large, split it by words as a fallback.
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }

      const sentenceChunks = splitByWords(sentence, maxChars);
      for (const part of sentenceChunks) {
        if (part.length >= minChars || chunks.length === 0) {
          chunks.push(part);
        } else if (chunks[chunks.length - 1].length + 1 + part.length <= maxChars) {
          chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${part}`;
        } else {
          chunks.push(part);
        }
      }
      continue;
    }

    if (!current) {
      current = sentence;
      continue;
    }

    const candidate = `${current} ${sentence}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    // Finalize current if adding the next sentence would exceed max.
    chunks.push(current);
    current = sentence;
  }

  if (current) chunks.push(current);

  // Merge very small trailing chunks where possible.
  const merged: string[] = [];
  for (const chunk of chunks) {
    const prev = merged[merged.length - 1];
    if (prev && chunk.length < minChars && prev.length + 1 + chunk.length <= maxChars) {
      merged[merged.length - 1] = `${prev} ${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}

function splitIntoSentences(text: string): string[] {
  const result = text.match(/[^.!?\n]+(?:[.!?]+|$)/g);
  return (result ?? []).map((s) => s.trim()).filter(Boolean);
}

function splitByWords(text: string, maxChars: number): string[] {
  const words = text.split(' ').filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    // Handle words longer than maxChars by placing them in their own chunk.
    // This is the only case where a chunk may exceed maxChars.
    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(word);
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}