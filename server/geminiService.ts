import { GoogleGenAI, Type, Schema } from '@google/genai';
import { SubtitleChunk, TechTerm } from './types.js';
import { extractTechTerms, TECH_GLOSSARY } from './glossary.js';

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
  private recentContext: Map<string, string[]> = new Map();

  constructor() {
    this.reloadKey();
  }

  public reloadKey() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        console.log('[GeminiService] Initialized with Google GenAI SDK');
      } catch (err) {
        console.error('[GeminiService] Error initializing GoogleGenAI:', err);
        this.client = null;
      }
    } else {
      this.client = null;
      console.log('[GeminiService] Running in standalone demo/simulation fallback mode (GEMINI_API_KEY not set)');
    }
  }

  public isConfigured(): boolean {
    return this.client !== null && !!this.apiKey;
  }

  public getApiKey(): string | null {
    return this.apiKey;
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
    const cleanText = spokenText.trim();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-transcribe-live';

    // 1. Detect technical terms locally first
    const detectedLocalTerms = extractTechTerms(cleanText);

    if (this.client && this.apiKey) {
      try {
        const prevContext = (this.recentContext.get(stageId) || []).slice(-2).join(' ');
        const contextLine = prevContext ? `Previous context: "${prevContext}". ` : '';
        const prompt = `${contextLine}Translate and analyze this real-time spoken sentence from a conference talk: "${cleanText}" (Source language: ${sourceLang}).`;

        const response = await this.client.models.generateContent({
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
      } catch (err) {
        console.warn('[GeminiService] Live text translation API call failed, using local translation:', err);
      }
    }

    // Local instant translation fallback - PRESERVES EXACT USER WORDS
    const isSpanish = sourceLang === 'es' || !/[a-zA-Z]{4,}/.test(cleanText);
    return {
      id: chunkId,
      stageId,
      timestamp,
      originalText: cleanText,
      sourceLang: isSpanish ? 'es' : 'en',
      esText: cleanText,
      enText: isSpanish ? `[EN] ${cleanText}` : cleanText,
      ptText: isSpanish ? `[PT] ${cleanText}` : cleanText,
      techTerms: detectedLocalTerms,
      confidence: 0.96,
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
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-transcribe-live';

    if (!this.client || !this.apiKey) {
      // API Key not configured message - inform user honestly
      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: `[Audio recibido: ${(audioBuffer.length / 1024).toFixed(1)} KB]`,
        sourceLang: 'es',
        esText: `[Audio recibido: ${(audioBuffer.length / 1024).toFixed(1)} KB — Configura tu Gemini API Key en el botón superior o habla para transcribir en vivo]`,
        enText: `[Audio chunk received: ${(audioBuffer.length / 1024).toFixed(1)} KB]`,
        ptText: `[Áudio recebido: ${(audioBuffer.length / 1024).toFixed(1)} KB]`,
        techTerms: [],
        confidence: 0.9,
        isFinal: true
      };
    }

    try {
      const base64Audio = audioBuffer.toString('base64');
      const glossaryContext = customTerms.length > 0 ? `Priority event terms: ${customTerms.join(', ')}` : '';

      const prompt = `Transcribe and translate this technical conference audio chunk. ${glossaryContext}`;

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
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

    } catch (error) {
      console.error('[GeminiService] Error processing audio with Gemini API:', error);
      return {
        id: chunkId,
        stageId,
        timestamp,
        originalText: `[Audio chunk: ${(audioBuffer.length / 1024).toFixed(1)} KB - Error decodificando audio en API]`,
        sourceLang: 'es',
        esText: `[Audio recibido - Error en decodificación de API Gemini]`,
        enText: `[Audio received - Error decoding in Gemini API]`,
        ptText: `[Áudio recebido - Erro na API Gemini]`,
        techTerms: [],
        confidence: 0.5,
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
   * Deep Intelligence Layer powered by Gemini 2.5 Pro (Dual-Engine Architecture)
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
    const proModel = process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';

    if (!this.client || !this.apiKey || !transcriptText.trim()) {
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
        modelUsed: 'heuristic-fallback'
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
          model: 'gemini-2.5-flash',
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
          modelUsed: 'gemini-2.5-flash (fallback)'
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
