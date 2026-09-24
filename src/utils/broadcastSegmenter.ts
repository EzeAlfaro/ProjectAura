/**
 * Broadcast Subtitle Segmenter (Pacing & Windowing Engine)
 * 
 * Standard Broadcast Captioning Rules (BBC, Netflix, EBU-TT, CEA-608):
 * - Max 1-2 lines per subtitle card
 * - Max ~35-42 characters per line (~8-10 words per card)
 * - Paced continuously so speech appears in < 1.5s instead of giant lagging blocks.
 */

const SPANISH_CONNECTORS = new Set([
  'y', 'e', 'o', 'u', 'pero', 'que', 'porque', 'cuando', 'entonces', 
  'para', 'donde', 'como', 'con', 'por', 'si', 'ya', 'así', 'asi',
  'con lo que', 'de modo que', 'de repente', 'mientras', 'aunque'
]);

const ENGLISH_CONNECTORS = new Set([
  'and', 'or', 'but', 'that', 'because', 'when', 'then', 'so',
  'for', 'where', 'how', 'with', 'by', 'if', 'which', 'while', 'although'
]);

export const BROADCAST_STANDARDS = {
  MAX_CHARS_PER_LINE: 37, // CEA-708 & BBC standard limit
  MAX_LINES: 2,
  READING_CPS: 16,        // 16 characters per second (~170 WPM)
  AUTO_CLEAR_TIMEOUT_MS: 5500, // 5.5s silence = fade out
};

export interface SegmenterConfig {
  maxWords?: number;
  maxChars?: number;
  minWordsBeforeCut?: number;
}

const DEFAULT_CONFIG: Required<SegmenterConfig> = {
  maxWords: 7,
  maxChars: 44,
  minWordsBeforeCut: 4,
};

/**
 * Finds a natural break point in speech text.
 * Returns the character index to slice at, or null if the text is still too short to cut.
 */
export function findBroadcastSplitIndex(
  text: string, 
  config: SegmenterConfig = {}
): number | null {
  const { maxWords, maxChars, minWordsBeforeCut } = { ...DEFAULT_CONFIG, ...config };
  
  if (!text || text.trim().length === 0) return null;

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  // If text is short, check for explicit punctuation (period, question, exclamation, comma)
  const punctMatch = trimmed.search(/[.?!,;:]\s/);
  if (punctMatch !== -1) {
    const textBeforePunct = trimmed.substring(0, punctMatch);
    const wordsBeforePunct = textBeforePunct.split(/\s+/).length;
    if (wordsBeforePunct >= minWordsBeforeCut) {
      // Cut right after the punctuation mark
      return punctMatch + 1;
    }
  }

  // If word count or character length threshold is reached
  if (words.length >= maxWords || trimmed.length >= maxChars) {
    // Scan backwards from maxWords to find a natural connector to break *before*
    const startScan = Math.min(words.length - 1, maxWords);
    const endScan = Math.max(minWordsBeforeCut, maxWords - 3);

    for (let i = startScan; i >= endScan; i--) {
      const w = words[i].toLowerCase().replace(/[^a-záéíóúñ]/g, '');
      if (SPANISH_CONNECTORS.has(w) || ENGLISH_CONNECTORS.has(w)) {
        // Break *before* this connector word
        const wordsBefore = words.slice(0, i).join(' ');
        return wordsBefore.length;
      }
    }

    // No connector found; break after target word count (default 7-8 words)
    const targetWordIndex = Math.min(words.length - 1, maxWords);
    const wordsBefore = words.slice(0, targetWordIndex).join(' ');
    return wordsBefore.length;
  }

  return null;
}

/**
 * Formats a subtitle for broadcast display.
 * Guarantees that 100% of spoken words are preserved without loss or ellipsis truncation.
 */
export function formatBroadcastSubtitle(text: string, _maxDisplayWords?: number): string {
  if (!text) return '';
  return text.trim();
}
