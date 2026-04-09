interface RankChunkOptions {
  maxKeywords?: number;
  minKeywordLength?: number;
}

export interface RankedChunk<T = string> {
  chunk: T;
  score: number;
  matchedKeywords: string[];
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
  'were', 'will', 'with', 'your', 'you', 'app', 'ios'
]);

/**
 * Rank text chunks by relevance to a query using keyword matching.
 * The score combines keyword coverage and frequency in each chunk.
 */
export function rankTextChunksByKeywordRelevance<T>(
  chunks: T[],
  query: string,
  getText: (chunk: T) => string,
  options: RankChunkOptions = {}
): RankedChunk<T>[] {
  const maxKeywords = options.maxKeywords ?? 20;
  const minKeywordLength = options.minKeywordLength ?? 2;

  const queryKeywords = extractKeywords(query, maxKeywords, minKeywordLength);
  if (queryKeywords.length === 0) {
    return chunks.map((chunk) => ({
      chunk,
      score: 0,
      matchedKeywords: [],
    }));
  }

  const ranked = chunks.map((chunk) => {
    const text = normalizeText(getText(chunk));
    const matched: string[] = [];
    let frequencyScore = 0;

    for (const keyword of queryKeywords) {
      const count = countWholeWordOccurrences(text, keyword);
      if (count > 0) {
        matched.push(keyword);
        frequencyScore += count;
      }
    }

    const coverage = matched.length / queryKeywords.length;
    const normalizedFrequency = Math.min(frequencyScore / queryKeywords.length, 1);

    // Weight coverage higher than raw count so broad matches rank first.
    const score = Number((coverage * 0.7 + normalizedFrequency * 0.3).toFixed(4));

    return {
      chunk,
      score,
      matchedKeywords: matched,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.matchedKeywords.length - a.matchedKeywords.length;
  });

  return ranked;
}

function extractKeywords(query: string, maxKeywords: number, minKeywordLength: number): string[] {
  const tokens = normalizeText(query)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= minKeywordLength)
    .filter((token) => !DEFAULT_STOP_WORDS.has(token));

  const unique = Array.from(new Set(tokens));
  return unique.slice(0, maxKeywords);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWholeWordOccurrences(text: string, keyword: string): number {
  const escaped = escapeRegExp(keyword);
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}