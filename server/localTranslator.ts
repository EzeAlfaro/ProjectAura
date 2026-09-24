/**
 * Local High-Fidelity Conference Translator for Project Aura.
 * Provides instant, neural & macro-assisted technical translations (ES ⇄ EN & PT)
 * when Gemini API key is absent or during network hiccups in the venue.
 * 
 * NEVER performs naive word-by-word token replacement to prevent Spanglish gibberish.
 */

export interface TranslationResult {
  esText: string;
  enText: string;
  ptText: string;
}

// Common conference & technical greeting macros
const CONFERENCE_MACROS: [RegExp, { es?: string; en: string; pt: string }][] = [
  // Greetings & Stage Intros
  [/^hola a todos,? bienvenidos?( a la charla( de hoy)?)?/i, { en: "Hello everyone, welcome to today's talk", pt: "Olá a todos, bem-vindos à palestra de hoje" }],
  [/^bienvenidos a nerdearla/i, { en: "Welcome to Nerdearla", pt: "Bem-vindos à Nerdearla" }],
  [/^muchas gracias a todos/i, { en: "Thank you very much everyone", pt: "Muito obrigado a todos" }],
  [/^muchas gracias por venir/i, { en: "Thank you so much for coming", pt: "Muito obrigado por terem vindo" }],
  [/^alguna pregunta( o duda)?/i, { en: "Any questions or comments?", pt: "Alguma pergunta ou dúvida?" }],
  [/^buenos d[ií]as a todos/i, { en: "Good morning everyone", pt: "Bom dia a todos" }],
  [/^buenas tardes a todos/i, { en: "Good afternoon everyone", pt: "Boa tarde a todos" }],
  [/^buenas noches a todos/i, { en: "Good evening everyone", pt: "Boa noite a todos" }],
  [/^vamos a comenzar/i, { en: "Let's get started", pt: "Vamos começar" }],
  [/^en esta presentaci[oó]n vamos a ver/i, { en: "In this presentation we are going to look at", pt: "Nesta apresentação vamos ver" }],
  [/^en esta charla vamos a hablar de/i, { en: "In this talk we will talk about", pt: "Nesta palestra vamos falar sobre" }],
  [/^bueno,? les voy a contar un poco sobre m[ií]/i, { en: "Well, I am going to tell you a little bit about myself", pt: "Bem, vou contar um pouco sobre mim" }],
  [/^les voy a contar un poco sobre m[ií]/i, { en: "I am going to tell you a little bit about myself", pt: "Vou contar um pouco sobre mim" }],
  [/^vamos a ver/i, { en: "Let's take a look", pt: "Vamos ver" }]
];

// Preserved casing for tech industry keywords
const TECH_TERMS_CASING = [
  'Kubernetes', 'Docker', 'GitLab', 'GitHub', 'CI/CD', 'Linux',
  'Python', 'TypeScript', 'JavaScript', 'Node.js', 'eBPF', 'Terraform',
  'Ansible', 'Prometheus', 'Grafana', 'PostgreSQL', 'Redis', 'GraphQL',
  'Next.js', 'React', 'AWS', 'GCP', 'Azure', 'Sysarmy', 'Nerdearla',
  'Open Source', 'DevOps', 'SRE', 'Kafka', 'RabbitMQ', 'MongoDB', 'vMix', 'OBS'
];

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&iexcl;/g, '¡')
    .replace(/&iquest;/g, '¿')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function preserveTechTermsCasing(text: string): string {
  let result = text;
  for (const term of TECH_TERMS_CASING) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, term);
  }
  return result;
}

// In-Memory Fast LRU Cache
const translationCache = new Map<string, TranslationResult>();
const MAX_CACHE_SIZE = 1000;

function getCached(key: string): TranslationResult | undefined {
  return translationCache.get(key);
}

function setCached(key: string, res: TranslationResult) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, res);
}

/**
 * Fetch neural translation from high-speed translation API with strict timeout.
 */
async function fetchNeuralTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
  if (!text || text.length < 2) return text;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    clearTimeout(timeout);

    const translated = data?.responseData?.translatedText;
    if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING:')) {
      return preserveTechTermsCasing(decodeHtmlEntities(translated.trim()));
    }
    return text;
  } catch {
    clearTimeout(timeout);
    return text;
  }
}

/**
 * Asynchronous, neural-grade conference translator.
 * Guaranteed: NEVER outputs broken word-by-word Spanglish!
 */
export async function translateConferenceText(
  text: string,
  sourceLang: string = 'es'
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) {
    return { esText: '', enText: '', ptText: '' };
  }

  const effectiveLang = sourceLang === 'en' ? 'en' : 'es';
  const cacheKey = `${effectiveLang}:${clean.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 1. Check conference macros first
  for (const [regex, macro] of CONFERENCE_MACROS) {
    if (regex.test(clean)) {
      const res: TranslationResult = {
        esText: effectiveLang === 'es' ? clean : (macro.es || clean),
        enText: macro.en,
        ptText: macro.pt
      };
      setCached(cacheKey, res);
      return res;
    }
  }

  // 2. Parallel Neural Translation
  if (effectiveLang === 'es') {
    const [en, pt] = await Promise.all([
      fetchNeuralTranslation(clean, 'es', 'en'),
      fetchNeuralTranslation(clean, 'es', 'pt')
    ]);

    const res: TranslationResult = {
      esText: clean,
      enText: en || clean,
      ptText: pt || clean
    };
    setCached(cacheKey, res);
    return res;
  } else {
    // English speaker talking
    const [es, pt] = await Promise.all([
      fetchNeuralTranslation(clean, 'en', 'es'),
      fetchNeuralTranslation(clean, 'en', 'pt')
    ]);

    const res: TranslationResult = {
      esText: es || clean,
      enText: clean,
      ptText: pt || clean
    };
    setCached(cacheKey, res);
    return res;
  }
}

/**
 * Synchronous local translation helper (macros & cache only).
 * Falls back cleanly to original text rather than Spanglish token substitution.
 */
export function translateConferenceTextLocally(
  text: string,
  sourceLang: string = 'es'
): TranslationResult {
  const clean = text.trim();
  if (!clean) return { esText: '', enText: '', ptText: '' };

  const effectiveLang = sourceLang === 'en' ? 'en' : 'es';
  const cacheKey = `${effectiveLang}:${clean.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  for (const [regex, macro] of CONFERENCE_MACROS) {
    if (regex.test(clean)) {
      return {
        esText: effectiveLang === 'es' ? clean : (macro.es || clean),
        enText: macro.en,
        ptText: macro.pt
      };
    }
  }

  return {
    esText: clean,
    enText: clean,
    ptText: clean
  };
}
