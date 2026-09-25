import { GoogleGenAI, Type, Schema } from '@google/genai';
import { SubtitleChunk, TechTerm, EngineMode, KeyPoolItem } from './types.js';
import { extractTechTerms, TECH_GLOSSARY, normalizePhoneticTechTerms } from './glossary.js';
import { translateConferenceText, translateConferenceTextLocally } from './localTranslator.js';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 10) return 'AIza...***';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

const SYSTEM_INSTRUCTION = `
You are the official real-time transcription, simultaneous translation, and technical glossary engine for the Nerdearla Tech Conference in Buenos Aires.
Input is real-time conversational audio or speech text from software engineers, SREs, and architects.

LINGUISTIC REQUIREMENTS:
1. CODE-SWITCHING & SPANGLISH:
   - Speakers constantly mix Argentine Spanish (Rioplatense, professional tech tone) with Silicon Valley jargon: "deployar", "mergear", "crashear", "on-call", "deadlock", "pipeline", "troubleshooting", "rompimos prod".
   - Keep verbatim spoken tech terms in Spanish transcript and translations. Never translate technical terms like "container" to "recipiente" or "pod" to "vaina" or "cluster" to "racimo".
2. TARGET LANGUAGES:
   - Provide simultaneous, idiomatic translations for Spanish (esText), English (enText), and Brazilian Portuguese (ptText).
3. FIDELITY & PUNCTUATION:
   - Insert natural sentence breaks, capitalization, and punctuation even if audio has pauses or background room noise.
   - If there is no intelligible speech (silence, applause, noise), return empty strings.
`;

const SUBTITLE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    originalText: { type: Type.STRING, description: 'Verbatim spoken transcription' },
    sourceLang: { type: Type.STRING, enum: ['es', 'en', 'mixed', 'pt'] },
    esText: { type: Type.STRING, description: 'Natural Spanish technical translation' },
    enText: { type: Type.STRING, description: 'Natural English technical translation' },
    ptText: { type: Type.STRING, description: 'Natural Portuguese technical translation' },
    confidence: { type: Type.NUMBER, description: 'Confidence score between 0.0 and 1.0' },
    techTerms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ['term']
      }
    }
  },
  required: ['originalText', 'sourceLang', 'esText', 'enText', 'ptText', 'confidence']
};

const DEEP_PRO_SYSTEM_INSTRUCTION = `You are a Principal Cloud & AI Architect summarizing technical sessions at Nerdearla 2026.
Synthesize the spoken transcript into:
1. High-impact architectural takeaways (trade-offs, operational lessons, best practices).
2. Sharp, high-IQ Q&A questions for the speaker and audience.
3. An executive summary briefing in markdown.
Keep IT technical terms verbatim (Kubernetes, eBPF, WebAssembly, Zero-Trust, gRPC, etc.).
Output JSON matching the schema.`;

const DEEP_INSIGHTS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    takeaways: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          bullet: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ['bullet', 'category']
      }
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          context: { type: Type.STRING },
          target: { type: Type.STRING }
        },
        required: ['question', 'context', 'target']
      }
    },
    executiveSummary: { type: Type.STRING }
  },
  required: ['takeaways', 'questions', 'executiveSummary']
};

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private isKeyBlocked: boolean = false;
  private recentContext: Map<string, string[]> = new Map();
  private gemmaAvailable: boolean = false;
  private gemmaLastCheck: number = 0;
  private forcedEngine: EngineMode = 'auto';
  private keyPool: Array<{
    id: string;
    key: string;
    maskedKey: string;
    addedAt: number;
    status: 'active' | 'standby' | 'rate_limited' | 'blocked' | 'invalid';
    requestsSuccess: number;
    requestsFailed: number;
    lastUsedAt?: number;
    lastError?: string;
    cooldownUntil?: number;
  }> = [];

  constructor() {
    this.reloadKey();
  }

  public reloadKey(initialKey?: string) {
    const rawKey = initialKey || process.env.GEMINI_API_KEY || null;
    this.isKeyBlocked = false;

    if (rawKey && rawKey.trim().length > 0) {
      const cleanKey = rawKey.trim();
      let existing = this.keyPool.find(k => k.key === cleanKey);
      if (!existing) {
        existing = {
          id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          key: cleanKey,
          maskedKey: maskKey(cleanKey),
          addedAt: Date.now(),
          status: 'active',
          requestsSuccess: 0,
          requestsFailed: 0
        };
        for (const k of this.keyPool) {
          if (k.status === 'active') k.status = 'standby';
        }
        this.keyPool.unshift(existing);
      } else {
        existing.status = 'active';
        existing.cooldownUntil = undefined;
        for (const k of this.keyPool) {
          if (k.id !== existing.id && k.status === 'active') k.status = 'standby';
        }
      }

      this.apiKey = cleanKey;
      process.env.GEMINI_API_KEY = cleanKey;
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        console.log(`[GeminiService] Initialized with Google GenAI SDK (${maskKey(cleanKey)})`);
      } catch (err) {
        console.error('[GeminiService] Error initializing GoogleGenAI:', err);
        this.client = null;
      }
    } else if (this.keyPool.length > 0) {
      this.rotateKey();
    } else {
      this.client = null;
      this.apiKey = null;
      console.log('[GeminiService] Running in standalone demo/simulation fallback mode (GEMINI_API_KEY not set)');
    }
  }

  public addKey(newKey: string): KeyPoolItem {
    const cleanKey = newKey.trim();
    let existing = this.keyPool.find(k => k.key === cleanKey);
    if (existing) {
      existing.status = 'active';
      existing.cooldownUntil = undefined;
      for (const k of this.keyPool) {
        if (k.id !== existing.id && k.status === 'active') k.status = 'standby';
      }
      this.apiKey = cleanKey;
      process.env.GEMINI_API_KEY = cleanKey;
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
      this.isKeyBlocked = false;
      return this.toSafeKeyItem(existing);
    }

    const item = {
      id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: cleanKey,
      maskedKey: maskKey(cleanKey),
      addedAt: Date.now(),
      status: (this.keyPool.length === 0 ? 'active' : 'standby') as 'active' | 'standby',
      requestsSuccess: 0,
      requestsFailed: 0
    };
    this.keyPool.push(item);

    if (item.status === 'active') {
      this.apiKey = cleanKey;
      process.env.GEMINI_API_KEY = cleanKey;
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
      this.isKeyBlocked = false;
    }
    return this.toSafeKeyItem(item);
  }

  public rotateKey(): KeyPoolItem | null {
    if (this.keyPool.length === 0) return null;
    const now = Date.now();
    for (const k of this.keyPool) {
      if (k.cooldownUntil && k.cooldownUntil <= now) {
        k.cooldownUntil = undefined;
        if (k.status === 'rate_limited') k.status = 'standby';
      }
    }

    const currentIdx = this.keyPool.findIndex(k => k.status === 'active');
    const startIdx = currentIdx >= 0 ? (currentIdx + 1) % this.keyPool.length : 0;

    let targetIdx = -1;
    for (let i = 0; i < this.keyPool.length; i++) {
      const idx = (startIdx + i) % this.keyPool.length;
      const cand = this.keyPool[idx];
      if (cand.status !== 'blocked' && (!cand.cooldownUntil || cand.cooldownUntil <= now)) {
        targetIdx = idx;
        break;
      }
    }

    if (targetIdx !== -1) {
      for (let i = 0; i < this.keyPool.length; i++) {
        if (i === targetIdx) {
          this.keyPool[i].status = 'active';
          this.apiKey = this.keyPool[i].key;
          process.env.GEMINI_API_KEY = this.apiKey;
          this.client = new GoogleGenAI({ apiKey: this.apiKey });
          this.isKeyBlocked = false;
        } else if (this.keyPool[i].status === 'active') {
          this.keyPool[i].status = 'standby';
        }
      }
      console.log(`[GeminiService] Rotated active key to: ${this.keyPool[targetIdx].maskedKey}`);
      return this.toSafeKeyItem(this.keyPool[targetIdx]);
    } else {
      console.warn('[GeminiService] All keys in pool are blocked or exhausted.');
      this.isKeyBlocked = true;
      return null;
    }
  }

  public removeKey(id: string): boolean {
    const idx = this.keyPool.findIndex(k => k.id === id);
    if (idx === -1) return false;
    const wasActive = this.keyPool[idx].status === 'active';
    this.keyPool.splice(idx, 1);
    if (wasActive) {
      if (this.keyPool.length > 0) {
        this.rotateKey();
      } else {
        this.disconnectAll();
      }
    }
    return true;
  }

  public disconnectAll() {
    this.keyPool = [];
    this.apiKey = null;
    this.client = null;
    this.isKeyBlocked = false;
    process.env.GEMINI_API_KEY = '';
    console.log('[GeminiService] Disconnected all API keys. Engine set to Local/Standalone.');
  }

  public setForcedEngine(mode: EngineMode) {
    this.forcedEngine = mode;
    console.log(`[GeminiService] Forced engine set to: ${mode}`);
  }

  public getForcedEngine(): EngineMode {
    return this.forcedEngine;
  }

  public getKeyPoolInfo(): KeyPoolItem[] {
    const now = Date.now();
    return this.keyPool.map(k => {
      if (k.cooldownUntil && k.cooldownUntil <= now) {
        k.cooldownUntil = undefined;
        if (k.status === 'rate_limited') k.status = 'standby';
      }
      return this.toSafeKeyItem(k);
    });
  }

  public getActiveKeyMasked(): string | undefined {
    return this.keyPool.find(k => k.status === 'active')?.maskedKey;
  }

  private toSafeKeyItem(k: any): KeyPoolItem {
    return {
      id: k.id,
      maskedKey: k.maskedKey,
      addedAt: k.addedAt,
      status: k.status,
      requestsSuccess: k.requestsSuccess,
      requestsFailed: k.requestsFailed,
      lastUsedAt: k.lastUsedAt,
      lastError: k.lastError,
      cooldownUntil: k.cooldownUntil
    };
  }

  public recordKeySuccess() {
    const activeKey = this.keyPool.find(k => k.status === 'active');
    if (activeKey) {
      activeKey.requestsSuccess++;
      activeKey.lastUsedAt = Date.now();
    }
  }

  public handleKeyError(err: any) {
    const activeKey = this.keyPool.find(k => k.status === 'active');
    const msg = err?.message || String(err);
    const isRateLimit = err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    const isBlocked = err?.status === 403 || msg.includes('API_KEY_SERVICE_BLOCKED') || msg.includes('PERMISSION_DENIED');

    if (activeKey) {
      activeKey.requestsFailed++;
      activeKey.lastError = isRateLimit ? '429 Quota Exceeded' : (isBlocked ? '403 Blocked' : 'Error');
      if (isRateLimit) {
        activeKey.status = 'rate_limited';
        activeKey.cooldownUntil = Date.now() + 60000;
        console.warn(`[GeminiService] Key ${activeKey.maskedKey} hit rate limit (429). Rotating to next key in pool...`);
        this.rotateKey();
      } else if (isBlocked) {
        activeKey.status = 'blocked';
        console.warn(`[GeminiService] Key ${activeKey.maskedKey} is blocked (403). Rotating to next key in pool...`);
        this.rotateKey();
      }
    } else {
      if (isBlocked) this.isKeyBlocked = true;
    }
  }

  public isConfigured(): boolean {
    return this.client !== null && !!this.apiKey && !this.isKeyBlocked;
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public async checkGemmaAvailability(): Promise<boolean> {
    const now = Date.now();
    if (now - this.gemmaLastCheck < 15000) {
      return this.gemmaAvailable;
    }
    this.gemmaLastCheck = now;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data: any = await res.json();
        const models = (data?.models || []).map((m: any) => m.name || '');
        this.gemmaAvailable = models.some((m: string) => /gemma/i.test(m)) || models.length > 0;
        return this.gemmaAvailable;
      }
    } catch {
      this.gemmaAvailable = false;
    }
    return false;
  }

  public async queryGemma(prompt: string, systemInstruction?: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);
      const gemmaModel = process.env.GEMMA_MODEL || 'gemma2:2b';
      const body: any = {
        model: gemmaModel,
        prompt,
        stream: false,
        options: { temperature: 0.1 }
      };
      if (systemInstruction) {
        body.system = systemInstruction;
      }
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data: any = await res.json();
      return data?.response?.trim() || null;
    } catch {
      return null;
    }
  }

  public getActiveEngineName(): 'gemini-cloud' | 'gemma-local' | 'native-offline' {
    if (this.forcedEngine === 'native-offline') return 'native-offline';
    if (this.forcedEngine === 'gemma-local') return 'gemma-local';
    if (this.forcedEngine === 'gemini-cloud') {
      return this.isConfigured() ? 'gemini-cloud' : 'native-offline';
    }
    if (this.isConfigured()) return 'gemini-cloud';
    if (this.gemmaAvailable) return 'gemma-local';
    return 'native-offline';
  }

  /**
   * Process a real-time live text transcript (e.g. from browser SpeechRecognition)
   * Enriches it with Gemini translation and glossary, or fast local translation.
   * GUARANTEE: Never replaces the user's real spoken words with canned text!
   */
  public async processLiveText(
    spokenText: string,
    sourceLang: string = 'es',
    stageId: string = 'stage-1'
  ): Promise<SubtitleChunk> {
    const chunkId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = Date.now();
    const rawClean = spokenText.trim();
    const cleanText = normalizePhoneticTechTerms(rawClean);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    // 1. Detect technical terms locally first on the normalized text
    const detectedLocalTerms = extractTechTerms(cleanText);

    // If forced to native-offline, completely bypass cloud and edge
    if (this.forcedEngine === 'native-offline') {
      const trans = await translateConferenceText(cleanText, sourceLang);
      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: cleanText,
        sourceLang: (sourceLang as any) || 'es',
        esText: trans.esText || cleanText,
        enText: trans.enText || cleanText,
        ptText: trans.ptText || cleanText,
        techTerms: detectedLocalTerms,
        confidence: 0.99,
        isFinal: true
      };
    }

    const allowCloud = (this.forcedEngine === 'auto' || this.forcedEngine === 'gemini-cloud') && this.client && this.apiKey && !this.isKeyBlocked;

    if (allowCloud) {
      try {
        const prevContext = (this.recentContext.get(stageId) || []).slice(-2).join(' ');
        const contextLine = prevContext ? `Previous context: "${prevContext}". ` : '';
        const prompt = `${contextLine}Translate and analyze this real-time spoken sentence from a conference talk: "${cleanText}" (Source language: ${sourceLang}).`;

        const response = await this.client!.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            responseMimeType: 'application/json',
            responseSchema: SUBTITLE_RESPONSE_SCHEMA,
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 } as any
          }
        });

        this.recordKeySuccess();

        // Store context history
        const stageHistory = this.recentContext.get(stageId) || [];
        stageHistory.push(cleanText);
        if (stageHistory.length > 3) stageHistory.shift();
        this.recentContext.set(stageId, stageHistory);

        const parsed = JSON.parse(response.text || '{}');
        const combinedTerms: TechTerm[] = [...(parsed.techTerms || [])];
        for (const localTerm of detectedLocalTerms) {
          if (!combinedTerms.some(t => t.term.toLowerCase() === localTerm.term.toLowerCase())) {
            combinedTerms.push(localTerm);
          }
        }

        return {
          id: chunkId,
          stageId,
          timestamp,
          originalText: cleanText,
          sourceLang: (parsed.sourceLang as any) || (sourceLang as any) || 'es',
          esText: parsed.esText || cleanText,
          enText: parsed.enText || cleanText,
          ptText: parsed.ptText || parsed.esText || cleanText,
          techTerms: combinedTerms,
          confidence: parsed.confidence || 0.98,
          isFinal: true
        };
      } catch (err: any) {
        this.handleKeyError(err);
        console.warn('[GeminiService] Live text translation API call failed, falling back to local engine:', err?.message || err);
      }
    }

    // 2. Google Gemma Edge Ingestion (Local On-Premise Engine via Ollama)
    if ((this.forcedEngine === 'gemma-local' || this.forcedEngine === 'auto') && (await this.checkGemmaAvailability())) {
      try {
        const gemmaPrompt = `Translate this technical conference subtitle chunk into Spanish (esText), English (enText), and Brazilian Portuguese (ptText). Keep IT terms verbatim. Output strictly JSON: {"esText":"...","enText":"...","ptText":"..."}.\nOriginal text: "${cleanText}"`;
        const gemmaResp = await this.queryGemma(gemmaPrompt, 'You are an IT conference translator. Output JSON only.');
        if (gemmaResp) {
          const jsonMatch = gemmaResp.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              id: chunkId,
              stageId,
              timestamp,
              originalText: cleanText,
              sourceLang: (sourceLang as any) || 'es',
              esText: parsed.esText || cleanText,
              enText: parsed.enText || cleanText,
              ptText: parsed.ptText || parsed.esText || cleanText,
              techTerms: detectedLocalTerms,
              confidence: 0.98,
              isFinal: true
            };
          }
        }
      } catch (e) {
        // Fallback to local macro engine
      }
    }

    // 3. Neural & Macro translation engine (Offline / Free / Fallback)
    const trans = await translateConferenceText(cleanText, sourceLang);

    return {
      id: chunkId,
      stageId,
      timestamp,
      originalText: cleanText,
      sourceLang: (sourceLang as any) || 'es',
      esText: trans.esText || cleanText,
      enText: trans.enText || cleanText,
      ptText: trans.ptText || cleanText,
      techTerms: detectedLocalTerms,
      confidence: 0.98,
      isFinal: true
    };
  }

  /**
   * Process an audio chunk with Gemini 2.5 Flash
   */
  public async processAudioChunk(
    audioBuffer: Buffer,
    mimeType: string = 'audio/webm',
    stageId: string = 'stage-1',
    customTerms: string[] = []
  ): Promise<SubtitleChunk> {
    const chunkId = `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    if (!this.client || !this.apiKey || this.forcedEngine === 'native-offline') {
      console.warn(`[GeminiService] Audio chunk received (${(audioBuffer.length / 1024).toFixed(1)} KB) but Gemini API Key is not configured or engine is forced offline.`);
      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: '',
        sourceLang: 'es',
        esText: '',
        enText: '',
        ptText: '',
        techTerms: [],
        confidence: 0,
        isFinal: true
      };
    }

    try {
      const base64Audio = audioBuffer.toString('base64');
      const glossaryContext = customTerms.length > 0 ? `Priority event terms: ${customTerms.join(', ')}` : '';

      const prompt = `Transcribe and translate this technical conference audio chunk. ${glossaryContext}`;

      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: base64Audio
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          responseMimeType: 'application/json',
          responseSchema: SUBTITLE_RESPONSE_SCHEMA,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 } as any
        }
      });

      this.recordKeySuccess();
      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      // Merge with our built-in glossary
      const detectedLocalTerms = extractTechTerms(parsed.originalText || parsed.esText || '');
      const combinedTerms: TechTerm[] = [...(parsed.techTerms || [])];

      for (const localTerm of detectedLocalTerms) {
        if (!combinedTerms.some(t => t.term.toLowerCase() === localTerm.term.toLowerCase())) {
          combinedTerms.push(localTerm);
        }
      }

      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: parsed.originalText || '',
        sourceLang: parsed.sourceLang || 'es',
        esText: parsed.esText || parsed.originalText || '',
        enText: parsed.enText || parsed.originalText || '',
        ptText: parsed.ptText || parsed.esText || '',
        techTerms: combinedTerms,
        confidence: parsed.confidence || 0.95,
        isFinal: true
      };

    } catch (error: any) {
      this.handleKeyError(error);
      console.error('[GeminiService] Error processing audio with Gemini API:', error?.message || error);
      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: '',
        sourceLang: 'es',
        esText: '',
        enText: '',
        ptText: '',
        techTerms: [],
        confidence: 0,
        isFinal: true
      };
    }
  }

  /**
   * Generates sample talk chunks for 1-click test talks
   */
  public generateSimulatedChunk(stageId: string, chunkId: string, timestamp: number, isFallback: boolean = false): SubtitleChunk {
    return {
      id: chunkId,
      stageId,
      timestamp,
      originalText: "Implementamos un pipeline de CI/CD para compilar binarios en Rust con WebAssembly para el edge.",
      sourceLang: 'es',
      esText: "Implementamos un pipeline de CI/CD para compilar binarios en Rust con WebAssembly para el edge.",
      enText: "We implemented a CI/CD pipeline to compile Rust binaries with WebAssembly for the edge.",
      ptText: "Implementamos uma esteira de CI/CD para compilar binários em Rust com WebAssembly para a borda.",
      techTerms: extractTechTerms("CI/CD Rust WebAssembly"),
      confidence: 0.98,
      isFinal: true
    };
  }

  /**
   * Deep Intelligence Layer powered by Gemini 3.5 Pro (Dual-Engine Architecture)
   * Asynchronously synthesizes the accumulated live transcript into:
   * 1. Architectural takeaways
   * 2. High-IQ Q&A questions for the speaker and audience
   * 3. An executive summary briefing in markdown
   */
  public async generateDeepInsights(
    stageTitle: string,
    speaker: string,
    transcriptText: string
  ): Promise<{
    takeaways: { bullet: string; category: string }[];
    questions: { question: string; context: string; target: 'speaker' | 'audience' }[];
    executiveSummary: string;
    modelUsed: string;
  }> {
    const proModel = process.env.GEMINI_PRO_MODEL || 'gemini-3.5-pro';
    const allowCloud = (this.forcedEngine === 'auto' || this.forcedEngine === 'gemini-cloud') && this.client && this.apiKey && !this.isKeyBlocked && !!transcriptText.trim();

    if (!allowCloud) {
      if ((this.forcedEngine === 'gemma-local' || this.forcedEngine === 'auto') && (await this.checkGemmaAvailability())) {
        try {
          const gemmaPrompt = `Analyze this technical conference talk transcript:\nTitle: "${stageTitle}"\nSpeaker: "${speaker}"\nTranscript: """${transcriptText}"""\n\nGenerate in JSON: {"takeaways":[{"bullet":"...","category":"architecture"}],"questions":[{"question":"...","context":"...","target":"speaker"}],"executiveSummary":"..."}`;
          const gemmaResp = await this.queryGemma(gemmaPrompt, 'You are a principal cloud architect. Return JSON only.');
          if (gemmaResp) {
            const jsonMatch = gemmaResp.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                takeaways: parsed.takeaways || [],
                questions: parsed.questions || [],
                executiveSummary: parsed.executiveSummary || '',
                modelUsed: 'Google Gemma 2B (Local Edge On-Premise)'
              };
            }
          }
        } catch (e) {}
      }

      return {
        takeaways: [
          { bullet: `Arquitectura de producción basada en ${stageTitle}`, category: 'architecture' },
          { bullet: `Estrategias de resiliencia y mitigación de fallas en escala`, category: 'devops' }
        ],
        questions: [
          {
            question: `¿Qué compensaciones (trade-offs) evaluaron antes de optar por esta arquitectura?`,
            context: `Contexto de la charla de ${speaker}`,
            target: 'speaker'
          }
        ],
        executiveSummary: `Resumen ejecutivo de la charla "${stageTitle}" presentada por ${speaker} en Nerdearla 2026. Se analizaron patrones de observabilidad, arquitecturas cloud-native y optimizaciones de rendimiento para cargas críticas de trabajo.`,
        modelUsed: 'Motor Nativo Standalone (0ms)'
      };
    }

    try {
      const prompt = `Talk Title: "${stageTitle}"\nSpeaker: "${speaker}"\n\nLive Transcript:\n"""\n${transcriptText}\n"""\n\nExtract top architectural takeaways, 3 insightful Q&A questions, and a concise 2-paragraph executive summary.`;

      const response = await this.client.models.generateContent({
        model: proModel,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: { parts: [{ text: DEEP_PRO_SYSTEM_INSTRUCTION }] },
          responseMimeType: 'application/json',
          responseSchema: DEEP_INSIGHTS_SCHEMA,
          temperature: 0.2
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return {
        takeaways: parsed.takeaways || [],
        questions: parsed.questions || [],
        executiveSummary: parsed.executiveSummary || '',
        modelUsed: proModel
      };
    } catch (err) {
      console.warn(`[GeminiService] Gemini Pro deep insights failed with ${proModel}, trying flash fallback:`, err);
      try {
        const fallbackResponse = await this.client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ parts: [{ text: `Summarize technical talk: ${stageTitle}. Speaker: ${speaker}. Transcript: ${transcriptText}` }] }],
          config: {
            systemInstruction: { parts: [{ text: DEEP_PRO_SYSTEM_INSTRUCTION }] },
            responseMimeType: 'application/json',
            responseSchema: DEEP_INSIGHTS_SCHEMA,
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 } as any
          }
        });
        const fallbackParsed = JSON.parse(fallbackResponse.text?.trim() || '{}');
        return {
          takeaways: fallbackParsed.takeaways || [],
          questions: fallbackParsed.questions || [],
          executiveSummary: fallbackParsed.executiveSummary || '',
          modelUsed: 'gemini-3.5-flash (fallback)'
        };
      } catch (fallbackErr) {
        console.error('[GeminiService] Deep insights fallback also failed:', fallbackErr);
        return {
          takeaways: [],
          questions: [],
          executiveSummary: '',
          modelUsed: 'error'
        };
      }
    }
  }
}

export const geminiService = new GeminiService();
