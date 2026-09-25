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
  MAX_CHARS_PER_LINE: 42, // CEA-708 & BBC standard limit (2 lines ~80 chars)
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
  maxWords: 13,
  maxChars: 75,
  minWordsBeforeCut: 7,
};

/**
 * Phonetic Tech Normalizer (Spanglish IT Auto-Corrector)
 * Corrects Spanish phonetic misrecognitions of English IT technical terms
 * (e.g. "hitlab" -> "GitLab", "jijab" -> "GitHub", "cobernetes" -> "Kubernetes", "diploy" -> "deploy").
 */
export const PHONETIC_TECH_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Git & Platforms
  { pattern: /\b(hitlab|jitlab|git\s*lab|guid\s*lab|jit\s*lab|jilab|hit\s*lab)\b/gi, replacement: 'GitLab' },
  { pattern: /\b(jijab|gijab|git\s*jab|hit\s*hub|guid\s*hub|jit\s*hub)\b/gi, replacement: 'GitHub' },
  { pattern: /\b(gitops|git\s*ops)\b/gi, replacement: 'GitOps' },
  { pattern: /\b(pul\s*riquest|purriquest|pul\s*request|pull\s*riquest|pulrequest)\b/gi, replacement: 'Pull Request' },
  { pattern: /\b(merch|mersh|mergear|mergeado|mergiado)\b/gi, replacement: 'merge' },
  { pattern: /\b(comit|comits|comitear)\b/gi, replacement: 'commit' },
  { pattern: /\b(reposs|repos|repoz)\b/gi, replacement: 'repositorio' },

  // Containers, Cloud & Infrastructure
  { pattern: /\b(cobernetes|cuvernetes|cuvernetis|kubernetis|covernetes|cobernetis)\b/gi, replacement: 'Kubernetes' },
  { pattern: /\b(doquer|docte|docter|doquers)\b/gi, replacement: 'Docker' },
  { pattern: /\b(diploy|de\s*ploy|diployar|deployar|diploye|deploye)\b/gi, replacement: 'deploy' },
  { pattern: /\b(claster|clastes|clasters)\b/gi, replacement: 'cluster' },
  { pattern: /\b(claud|clau)\b/gi, replacement: 'Cloud' },
  { pattern: /\b(paiplain|pai\s*plain|payplain|pay\s*plain)\b/gi, replacement: 'pipeline' },
  { pattern: /\b(evepefe|e\s*b\s*p\s*f|e\s*ve\s*pe\s*fe)\b/gi, replacement: 'eBPF' },
  { pattern: /\b(silium|ciliun)\b/gi, replacement: 'Cilium' },
  { pattern: /\b(ansibl|ansible|anzible)\b/gi, replacement: 'Ansible' },
  { pattern: /\b(terrafom|terrafor|terrafon)\b/gi, replacement: 'Terraform' },
  { pattern: /\b(promitius|promitiu|prometeus)\b/gi, replacement: 'Prometheus' },
  { pattern: /\b(grefana|grafana)\b/gi, replacement: 'Grafana' },
  { pattern: /\b(otel|ou\s*tel)\b/gi, replacement: 'OpenTelemetry' },

  // Architecture, Web & Databases
  { pattern: /\b(baquen|vaquend|baquend|back\s*end)\b/gi, replacement: 'backend' },
  { pattern: /\b(fronen|fronten|front\s*end)\b/gi, replacement: 'frontend' },
  { pattern: /\b(posgres|posgre|posgrez|postgre)\b/gi, replacement: 'PostgreSQL' },
  { pattern: /\b(rredis|rediss)\b/gi, replacement: 'Redis' },
  { pattern: /\b(cafca|kafca)\b/gi, replacement: 'Kafka' },
  { pattern: /\b(grafql|graf\s*ql|grefql)\b/gi, replacement: 'GraphQL' },
  { pattern: /\b(llepec|yeperce|g\s*r\s*p\s*c)\b/gi, replacement: 'gRPC' },
  { pattern: /\b(nobase|node\s*js|no\s*yes|nout\s*yes)\b/gi, replacement: 'Node.js' },
  { pattern: /\b(paiton|paitom|paito)\b/gi, replacement: 'Python' },
  { pattern: /\b(ras|rasta)\s+(lang|lenguaje|código)?\b/gi, replacement: 'Rust' },
  { pattern: /\b(tai\s*escript|taiescript|type\s*script)\b/gi, replacement: 'TypeScript' },
  { pattern: /\b(veb\s*asembli|guasam|wasm)\b/gi, replacement: 'WebAssembly' },

  // AI & Community
  { pattern: /\b(llm|yeleeme|ele\s*ele\s*eme)\b/gi, replacement: 'LLM' },
  { pattern: /\b(yemini|yémini|geminis|yeminis)\b/gi, replacement: 'Gemini' },
  { pattern: /\b(deep\s*main|dipmain|dip\s*main)\b/gi, replacement: 'DeepMind' },
  { pattern: /\b(open\s*sors|opensors|open\s*sor)\b/gi, replacement: 'Open Source' },
  { pattern: /\b(sisarmy|sis\s*armi|sisarmi|cissarmy)\b/gi, replacement: 'Sysarmy' },
  { pattern: /\b(nerdiarla|nerdear\s*la|nerd\s*arla|nerd\s*diarla)\b/gi, replacement: 'Nerdearla' },
  { pattern: /\b(cones|konecs|conecs)\b/gi, replacement: 'Konex' }
];

export function normalizePhoneticTechTerms(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const rule of PHONETIC_TECH_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized;
}

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
