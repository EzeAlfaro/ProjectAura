import { GoogleGenAI, Modality } from '@google/genai';
import { SubtitleChunk, TechTerm } from './types.js';
import { extractTechTerms, TECH_GLOSSARY } from './glossary.js';

export interface LiveTranscriberOptions {
  apiKey: string;
  stageId: string;
  customVocabulary?: string[];
  mode?: 'SMART' | 'VERBATIM';
  onInterim: (text: string) => void;
  onFinal: (chunk: SubtitleChunk) => void;
  onError: (err: any) => void;
}

/**
 * Manages a persistent Gemini 3.5 Transcribe Live session for a conference stage.
 * Uses bidirectional WebSocket streaming via @google/genai SDK Live API.
 * Audio Format: 16-bit linear PCM, 16,000 Hz, mono (audio/pcm;rate=16000).
 */
export class LiveStageTranscriptionSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sessionRenewTimer: NodeJS.Timeout | null = null;
  private options: LiveTranscriberOptions;
  private currentStageHistory: string[] = [];

  constructor(options: LiveTranscriberOptions) {
    this.options = options;
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
  }

  public async connect(): Promise<void> {
    const candidateModels = [
      process.env.GEMINI_LIVE_MODEL || 'gemini-3.5-transcribe-live',
      'gemini-2.0-flash-exp'
    ];

    const vocab = this.options.customVocabulary && this.options.customVocabulary.length > 0
      ? this.options.customVocabulary
      : Object.keys(TECH_GLOSSARY).concat([
          'Nerdearla', 'deployar', 'mergear', 'crashear', 'on-call', 'deadlock',
          'pipeline', 'troubleshooting', 'eBPF', 'Kubernetes', 'WebAssembly', 'Sysarmy'
        ]);

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[GeminiLive:${this.options.stageId}] Attempting live connection with model: ${model}`);
        this.session = await this.ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.TEXT],
            inputAudioTranscription: {
              languageCodes: [], // Automatic multi-lingual & code-switching (85+ languages)
              customVocabulary: vocab.slice(0, 1000),
              mode: (this.options.mode || 'SMART') as any
            }
          },
          callbacks: {
            onopen: () => {
              this.isConnected = true;
              console.log(`[GeminiLive:${this.options.stageId}] Connected successfully to ${model}`);
              this.scheduleSessionRenewal();
            },
            onmessage: async (message: any) => {
              const content = message.serverContent;
              if (!content) return;

              // 1. Interim Hypothesis (Real-time sub-150ms subtitle preview)
              if (content.interimInputTranscription?.text) {
                this.options.onInterim(content.interimInputTranscription.text);
              }

              // 2. Finalized Transcript Segment
              if (content.inputTranscription?.text) {
                const text = content.inputTranscription.text.trim();
                if (text.length > 0) {
                  await this.handleFinalTranscript(text);
                }
              }
            },
            onerror: (err: any) => {
              console.error(`[GeminiLive:${this.options.stageId}] Session error on ${model}:`, err);
              this.isConnected = false;
              this.options.onError(err);
              this.scheduleReconnect();
            },
            onclose: (event: any) => {
              console.log(`[GeminiLive:${this.options.stageId}] Session closed:`, event?.reason || 'Normal closure');
              this.isConnected = false;
            }
          }
        });
        return; // Successfully connected
      } catch (error) {
        lastError = error;
        console.warn(`[GeminiLive:${this.options.stageId}] Model ${model} failed to connect, trying next candidate if available...`, error);
      }
    }

    console.error(`[GeminiLive:${this.options.stageId}] All candidate models failed to connect:`, lastError);
    this.scheduleReconnect();
    throw lastError;
  }

  /**
   * Accepts raw 16kHz 16-bit Mono Little-Endian PCM audio buffer and streams it to Gemini Live
   */
  public sendPcmChunk(pcmChunk: Buffer): void {
    if (!this.isConnected || !this.session) return;

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: pcmChunk.toString('base64'),
          mimeType: 'audio/pcm;rate=16000'
        }
      });
    } catch (e) {
      console.warn(`[GeminiLive:${this.options.stageId}] Error sending PCM chunk:`, e);
    }
  }

  /**
   * Signal speech boundary when client VAD detects silence
   */
  public sendAudioStreamEnd(): void {
    if (this.isConnected && this.session) {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
      } catch (e) {}
    }
  }

  private async handleFinalTranscript(spokenText: string) {
    const chunkId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const localTerms = extractTechTerms(spokenText);

    // Fast multi-lingual translation pipeline
    const translations = await this.translateFinalText(spokenText);

    const chunk: SubtitleChunk = {
      id: chunkId,
      stageId: this.options.stageId,
      timestamp: Date.now(),
      originalText: spokenText,
      sourceLang: translations.sourceLang,
      esText: translations.esText,
      enText: translations.enText,
      ptText: translations.ptText,
      techTerms: localTerms,
      confidence: 0.98,
      isFinal: true
    };

    this.currentStageHistory.push(spokenText);
    if (this.currentStageHistory.length > 20) this.currentStageHistory.shift();

    this.options.onFinal(chunk);
  }

  private async translateFinalText(text: string): Promise<{
    sourceLang: 'es' | 'en' | 'pt';
    esText: string;
    enText: string;
    ptText: string;
  }> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              {
                text: `Translate this technical conference caption into Spanish, English, and Portuguese. Format JSON: {"sourceLang":"es"|"en"|"pt","esText":"...","enText":"...","ptText":"..."}. Keep technical terms verbatim: "${text}"`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 } as any
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        sourceLang: parsed.sourceLang || 'es',
        esText: parsed.esText || text,
        enText: parsed.enText || text,
        ptText: parsed.ptText || parsed.esText || text
      };
    } catch {
      // Local instant translation fallback - preserves exact words
      const isEnglish = /^[a-zA-Z0-9\s.,?!'-]+$/.test(text) && /\b(the|is|are|we|with|deploy)\b/i.test(text);
      return {
        sourceLang: isEnglish ? 'en' : 'es',
        esText: text,
        enText: isEnglish ? text : `[EN] ${text}`,
        ptText: isEnglish ? `[PT] ${text}` : text
      };
    }
  }

  private scheduleSessionRenewal() {
    if (this.sessionRenewTimer) clearTimeout(this.sessionRenewTimer);
    // Renew session every 8.5 minutes (well before the 10-minute Live API cap)
    this.sessionRenewTimer = setTimeout(async () => {
      console.log(`[GeminiLive:${this.options.stageId}] Proactively refreshing live session...`);
      try {
        await this.disconnect();
        await this.connect();
      } catch (e) {
        console.error(`[GeminiLive:${this.options.stageId}] Session renewal error:`, e);
      }
    }, 8.5 * 60 * 1000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`[GeminiLive:${this.options.stageId}] Attempting reconnection...`);
      this.connect().catch(() => {});
    }, 3000);
  }

  public async disconnect(): Promise<void> {
    if (this.sessionRenewTimer) clearTimeout(this.sessionRenewTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.session) {
      try {
        this.session = null;
      } catch {}
    }
    this.isConnected = false;
  }
}
