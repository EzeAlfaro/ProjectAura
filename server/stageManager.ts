import { WebSocket } from 'ws';
import { Stage, SubtitleChunk, StageTakeaway, StageQA, StageData, SupportedLanguage } from './types.js';
import { geminiService } from './geminiService.js';
import { SAMPLE_TALKS, SampleTalk } from './sampleAudios.js';
import { extractTechTerms } from './glossary.js';

export class StageManager {
  private stages: Map<string, Stage> = new Map();
  private stageChunks: Map<string, SubtitleChunk[]> = new Map();
  private stageTakeaways: Map<string, StageTakeaway[]> = new Map();
  private stageQuestions: Map<string, StageQA[]> = new Map();
  private stageSummaries: Map<string, string> = new Map();
  private stageIntelModel: Map<string, string> = new Map();
  private subscribers: Map<string, Set<{ ws: WebSocket; lang: SupportedLanguage }>> = new Map();
  private activeDemoTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultStages();
  }

  private initializeDefaultStages() {
    const defaultStages: Stage[] = [
      {
        id: 'stage-1',
        name: 'Escenario Principal',
        track: 'Keynotes & Arquitectura (EN / ES)',
        speaker: 'Micrófono de Operador en Vivo',
        talkTitle: 'Transmisión de Audio y Subtitulado en Vivo',
        description: 'Auditorio central para conferencias con transcripción en tiempo real y traducción simultánea.',
        isLive: false,
        currentAudioSource: 'idle',
        audioLevel: 0,
        audienceCount: 142,
        latencyMs: 0,
        detectedLang: 'es',
        startedAt: Date.now()
      },
      {
        id: 'stage-2',
        name: 'Escenario Cloud & DevOps',
        track: 'Sysarmy Track (ES)',
        speaker: 'Valeria Gómez (Principal SRE)',
        talkTitle: 'Resiliencia, Observabilidad y Cultura de Sistemas en Producción',
        description: 'Charlas de infraestructura, resiliencia y vivencias reales en producción.',
        isLive: false,
        currentAudioSource: 'idle',
        audioLevel: 0,
        audienceCount: 89,
        latencyMs: 0,
        detectedLang: 'es',
        startedAt: Date.now()
      },
      {
        id: 'stage-3',
        name: 'Escenario Data & AI',
        track: 'Machine Learning & LLMs',
        speaker: 'Federico Balbi (AI Researcher)',
        talkTitle: 'Desplegando Modelos Gemini y Gemma para Inferencia en Tiempo Real',
        description: 'Modelos de lenguaje, agentes autónomos y arquitecturas multimodales.',
        isLive: false,
        currentAudioSource: 'idle',
        audioLevel: 0,
        audienceCount: 34,
        latencyMs: 0,
        detectedLang: 'es'
      }
    ];

    for (const stage of defaultStages) {
      this.stages.set(stage.id, stage);
      this.stageChunks.set(stage.id, []);
      this.stageTakeaways.set(stage.id, []);
      this.stageQuestions.set(stage.id, []);
      this.stageSummaries.set(stage.id, '');
      this.stageIntelModel.set(stage.id, 'gemini-2.5-pro');
      this.subscribers.set(stage.id, new Set());
    }
  }

  public getStages(): Stage[] {
    return Array.from(this.stages.values());
  }

  public getStage(id: string): Stage | undefined {
    return this.stages.get(id);
  }

  public createStage(stageData: Partial<Stage>): Stage {
    const id = stageData.id || `stage-${Date.now()}`;
    const newStage: Stage = {
      id,
      name: stageData.name || 'Nuevo Escenario',
      track: stageData.track || 'Track General',
      speaker: stageData.speaker || 'Speaker',
      talkTitle: stageData.talkTitle || 'Charla Técnica',
      description: stageData.description || '',
      isLive: false,
      currentAudioSource: 'idle',
      audioLevel: 0,
      audienceCount: 0,
      latencyMs: 0,
      detectedLang: 'es',
      startedAt: Date.now()
    };

    this.stages.set(id, newStage);
    this.stageChunks.set(id, []);
    this.stageTakeaways.set(id, []);
    this.stageQuestions.set(id, []);
    this.stageSummaries.set(id, '');
    this.stageIntelModel.set(id, 'gemini-2.5-pro');
    this.subscribers.set(id, new Set());

    this.broadcastSystemUpdate();
    return newStage;
  }

  public getStageData(stageId: string): StageData | null {
    const stage = this.stages.get(stageId);
    if (!stage) return null;

    return {
      stage,
      chunks: (this.stageChunks.get(stageId) || []).slice(-50), // Last 50 chunks
      takeaways: this.stageTakeaways.get(stageId) || [],
      suggestedQuestions: this.stageQuestions.get(stageId) || [],
      executiveSummary: this.stageSummaries.get(stageId) || '',
      intelModelUsed: this.stageIntelModel.get(stageId) || 'gemini-2.5-pro'
    };
  }

  public subscribe(ws: WebSocket, stageId: string, lang: SupportedLanguage = 'original') {
    let subs = this.subscribers.get(stageId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(stageId, subs);
    }

    // Remove any previous registration for this socket
    for (const [sId, set] of this.subscribers.entries()) {
      for (const entry of Array.from(set)) {
        if (entry.ws === ws) {
          set.delete(entry);
          const stg = this.stages.get(sId);
          if (stg) stg.audienceCount = Math.max(0, stg.audienceCount - 1);
        }
      }
    }

    subs.add({ ws, lang });
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.audienceCount = subs.size;
    }

    // Send initial backlog of recent chunks
    const recentChunks = (this.stageChunks.get(stageId) || []).slice(-15);
    ws.send(JSON.stringify({
      type: 'initial_state',
      stage,
      chunks: recentChunks,
      takeaways: this.stageTakeaways.get(stageId) || [],
      suggestedQuestions: this.stageQuestions.get(stageId) || []
    }));

    this.broadcastSystemUpdate();
  }

  public unsubscribe(ws: WebSocket) {
    for (const [stageId, set] of this.subscribers.entries()) {
      for (const entry of Array.from(set)) {
        if (entry.ws === ws) {
          set.delete(entry);
          const stage = this.stages.get(stageId);
          if (stage) {
            stage.audienceCount = Math.max(0, set.size);
          }
        }
      }
    }
    this.broadcastSystemUpdate();
  }

  public setAudioLevel(stageId: string, level: number) {
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.audioLevel = Math.min(100, Math.max(0, Math.round(level)));
      this.broadcastToStage(stageId, {
        type: 'audio_level',
        stageId,
        level: stage.audioLevel
      });
    }
  }

  public async pushLiveTranscript(stageId: string, text: string, sourceLang: string = 'es') {
    const stage = this.stages.get(stageId);
    if (!stage) return;

    this.stopDemo(stageId);
    stage.isLive = true;
    stage.currentAudioSource = 'mic';
    const startTime = Date.now();

    const chunk = await geminiService.processLiveText(text, sourceLang, stageId);
    stage.latencyMs = Math.max(40, Date.now() - startTime);
    stage.detectedLang = chunk.sourceLang as any;

    this.addChunkToStage(stageId, chunk);
  }

  public async pushAudioChunk(stageId: string, audioBuffer: Buffer, mimeType: string) {
    const stage = this.stages.get(stageId);
    if (!stage) return;

    this.stopDemo(stageId);
    stage.isLive = true;
    stage.currentAudioSource = 'mic';
    const startTime = Date.now();

    const chunk = await geminiService.processAudioChunk(audioBuffer, mimeType, stageId);
    const latency = Date.now() - startTime;
    stage.latencyMs = latency;
    stage.detectedLang = chunk.sourceLang as 'es' | 'en' | 'pt';

    this.addChunkToStage(stageId, chunk);
  }

  public addChunkToStage(stageId: string, chunk: SubtitleChunk) {
    const chunks = this.stageChunks.get(stageId) || [];
    chunks.push(chunk);
    // Keep max 200 in memory to avoid heap leaks during 8-hour marathon
    if (chunks.length > 200) {
      chunks.shift();
    }
    this.stageChunks.set(stageId, chunks);

    // Analyze if we should extract takeaways locally
    this.updateTakeawaysAndQA(stageId, chunk);

    // Periodic Gemini 2.5 Pro Deep Intel synthesis (every 6 chunks)
    if (chunks.length >= 4 && chunks.length % 6 === 0) {
      this.triggerDeepIntel(stageId).catch(err => {
        console.warn(`[StageManager] Periodic Gemini Pro synthesis failed for ${stageId}:`, err);
      });
    }

    // Broadcast to audience and overlay clients
    this.broadcastToStage(stageId, {
      type: 'caption',
      chunk
    });
  }

  public async triggerDeepIntel(stageId: string): Promise<any> {
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Escenario ${stageId} no encontrado`);

    const chunks = this.stageChunks.get(stageId) || [];
    const transcriptText = chunks
      .map(c => c.originalText || c.esText || '')
      .filter(t => t.length > 5)
      .join(' ');

    const insights = await geminiService.generateDeepInsights(
      stage.talkTitle,
      stage.speaker,
      transcriptText || `${stage.talkTitle} - Conferencia técnica en Nerdearla 2026.`
    );

    if (insights.takeaways && insights.takeaways.length > 0) {
      const formattedTakeaways: StageTakeaway[] = insights.takeaways.map((t, idx) => ({
        id: `pro-tw-${Date.now()}-${idx}`,
        timestamp: Date.now(),
        bullet: t.bullet,
        category: t.category
      }));
      this.stageTakeaways.set(stageId, formattedTakeaways);
    }

    if (insights.questions && insights.questions.length > 0) {
      const formattedQA: StageQA[] = insights.questions.map((q, idx) => ({
        id: `pro-qa-${Date.now()}-${idx}`,
        question: q.question,
        context: q.context,
        target: q.target as any
      }));
      this.stageQuestions.set(stageId, formattedQA);
    }

    if (insights.executiveSummary) {
      this.stageSummaries.set(stageId, insights.executiveSummary);
    }
    this.stageIntelModel.set(stageId, insights.modelUsed);

    // Broadcast deep intel update to all connected clients
    this.broadcastToStage(stageId, {
      type: 'deep_intel',
      stageId,
      takeaways: this.stageTakeaways.get(stageId) || [],
      suggestedQuestions: this.stageQuestions.get(stageId) || [],
      executiveSummary: this.stageSummaries.get(stageId) || '',
      intelModelUsed: insights.modelUsed
    });

    return {
      success: true,
      stageId,
      takeaways: this.stageTakeaways.get(stageId),
      suggestedQuestions: this.stageQuestions.get(stageId),
      executiveSummary: this.stageSummaries.get(stageId),
      modelUsed: insights.modelUsed
    };
  }

  public deleteLastChunk(stageId: string): boolean {
    const chunks = this.stageChunks.get(stageId) || [];
    if (chunks.length > 0) {
      const removed = chunks.pop();
      this.stageChunks.set(stageId, chunks);
      this.broadcastToStage(stageId, {
        type: 'chunk_deleted',
        chunkId: removed?.id
      });
      return true;
    }
    return false;
  }

  public remoteReloadStage(stageId: string) {
    this.broadcastToStage(stageId, {
      type: 'remote_reload',
      stageId
    });
  }

  private updateTakeawaysAndQA(stageId: string, chunk: SubtitleChunk) {
    const takeaways = this.stageTakeaways.get(stageId) || [];
    const questions = this.stageQuestions.get(stageId) || [];

    // Simple rule-based heuristic extraction to guarantee fast updates
    if (chunk.techTerms.length > 0 && Math.random() > 0.4) {
      const mainTerm = chunk.techTerms[0];
      const textForTakeaway = chunk.esText || chunk.originalText || '';
      const newTakeaway: StageTakeaway = {
        id: `tw-${Date.now()}`,
        timestamp: Date.now(),
        bullet: `Uso de ${mainTerm.term}: ${textForTakeaway.slice(0, 100)}...`,
        category: mainTerm.category
      };

      if (!takeaways.some(t => t.bullet.includes(mainTerm.term))) {
        takeaways.push(newTakeaway);
        if (takeaways.length > 8) takeaways.shift();
        this.stageTakeaways.set(stageId, takeaways);

        this.broadcastToStage(stageId, {
          type: 'takeaways',
          takeaways
        });
      }

      // Generate suggested QA
      const newQA: StageQA = {
        id: `qa-${Date.now()}`,
        question: `¿Qué ventajas operativas observaron al implementar ${mainTerm.term} en producción frente a alternativas tradicionales?`,
        context: (chunk.originalText || '').slice(0, 80),
        target: 'speaker'
      };

      if (!questions.some(q => q.question.includes(mainTerm.term))) {
        questions.push(newQA);
        if (questions.length > 5) questions.shift();
        this.stageQuestions.set(stageId, questions);

        this.broadcastToStage(stageId, {
          type: 'questions',
          questions
        });
      }
    }
  }

  public startDemo(stageId: string, talkId: string = 'talk-en-k8s', resetHistory: boolean = true) {
    const talk = SAMPLE_TALKS[talkId] || SAMPLE_TALKS['talk-en-k8s'];
    const stage = this.stages.get(stageId);
    if (!stage) return;

    this.stopDemo(stageId);

    stage.isLive = true;
    stage.currentAudioSource = 'demo';
    stage.speaker = talk.speaker;
    stage.talkTitle = talk.title;
    stage.track = talk.track;
    stage.detectedLang = talk.sourceLang;
    stage.latencyMs = Math.floor(Math.random() * 80) + 280; // realistic 280-360ms

    if (resetHistory) {
      this.stageChunks.set(stageId, []);
      this.stageTakeaways.set(stageId, []);
      this.stageQuestions.set(stageId, []);
    }

    let currentIndex = 0;

    const playNext = () => {
      if (!stage.isLive) return;

      const item = talk.chunks[currentIndex];
      const chunkId = `chunk-${Date.now()}-${currentIndex}`;
      const terms = extractTechTerms(item.originalText);

      const chunk: SubtitleChunk = {
        id: chunkId,
        stageId,
        timestamp: Date.now(),
        originalText: item.originalText,
        sourceLang: talk.sourceLang,
        esText: item.esText || (item as any).es,
        enText: item.enText || (item as any).en,
        ptText: item.ptText || (item as any).pt,
        techTerms: terms,
        confidence: 0.98,
        isFinal: true
      };

      stage.audioLevel = Math.floor(Math.random() * 25) + 60;
      this.addChunkToStage(stageId, chunk);

      currentIndex = (currentIndex + 1) % talk.chunks.length;
      const delay = item.delayMs || 3500;

      const timer = setTimeout(playNext, delay);
      this.activeDemoTimers.set(stageId, timer);
    };

    playNext();
    this.broadcastSystemUpdate();
  }

  public stopDemo(stageId: string) {
    const timer = this.activeDemoTimers.get(stageId);
    if (timer) {
      clearTimeout(timer);
      this.activeDemoTimers.delete(stageId);
    }

    const stage = this.stages.get(stageId);
    if (stage) {
      stage.audioLevel = 0;
    }
  }

  public stopStage(stageId: string) {
    this.stopDemo(stageId);
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.isLive = false;
      stage.currentAudioSource = 'idle';
      stage.audioLevel = 0;
    }
    this.broadcastSystemUpdate();
  }

  public emergencyClear(stageId: string) {
    this.stageChunks.set(stageId, []);
    this.broadcastToStage(stageId, {
      type: 'emergency_clear',
      stageId
    });
  }

  private broadcastToStage(stageId: string, payload: any) {
    const subs = this.subscribers.get(stageId);
    if (!subs) return;

    const msg = JSON.stringify(payload);
    for (const { ws } of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }

  private broadcastSystemUpdate() {
    const payload = JSON.stringify({
      type: 'stages_update',
      stages: this.getStages()
    });

    for (const set of this.subscribers.values()) {
      for (const { ws } of set) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  /**
   * Export stage transcripts as SRT, VTT, or Markdown with true broadcast-standard epoch offsets
   */
  public exportTranscript(stageId: string, format: 'srt' | 'vtt' | 'txt' | 'md', lang: 'es' | 'en' | 'pt' | 'original' = 'es'): string {
    const stage = this.stages.get(stageId);
    const chunks = this.stageChunks.get(stageId) || [];
    const title = stage?.talkTitle || 'Nerdearla Session Transcript';
    const speaker = stage?.speaker || 'Speaker';
    const stageStart = stage?.startedAt || (chunks[0]?.timestamp ?? Date.now());

    if (format === 'srt') {
      return chunks.map((chunk, index) => {
        const text = this.getTextForLang(chunk, lang);
        const startOffsetMs = Math.max(0, chunk.timestamp - stageStart);
        // Dynamic reading speed duration: 15 chars/second (CEA-708 standard), clamped 1.8s - 5.5s
        let durationMs = Math.max(1800, Math.min(5500, Math.round((text.length / 15) * 1000)));
        if (index < chunks.length - 1) {
          const nextOffset = chunks[index + 1].timestamp - stageStart;
          if (nextOffset > startOffsetMs) {
            durationMs = Math.min(durationMs, nextOffset - startOffsetMs);
          }
        }
        const startTime = this.formatSRTTime(startOffsetMs);
        const endTime = this.formatSRTTime(startOffsetMs + durationMs);
        return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
      }).join('\n');
    }

    if (format === 'vtt') {
      const lines = ['WEBVTT', `NOTE Title: ${title}`, `NOTE Speaker: ${speaker}`, ''];
      chunks.forEach((chunk, index) => {
        const text = this.getTextForLang(chunk, lang);
        const startOffsetMs = Math.max(0, chunk.timestamp - stageStart);
        let durationMs = Math.max(1800, Math.min(5500, Math.round((text.length / 15) * 1000)));
        if (index < chunks.length - 1) {
          const nextOffset = chunks[index + 1].timestamp - stageStart;
          if (nextOffset > startOffsetMs) {
            durationMs = Math.min(durationMs, nextOffset - startOffsetMs);
          }
        }
        const startTime = this.formatVTTTime(startOffsetMs);
        const endTime = this.formatVTTTime(startOffsetMs + durationMs);
        lines.push(`${startTime} --> ${endTime}`);
        lines.push(text);
        lines.push('');
      });
      return lines.join('\n');
    }

    if (format === 'md') {
      const lines = [
        `# ${title}`,
        `**Speaker:** ${speaker} | **Evento:** Nerdearla 2026 | **Idioma:** ${lang.toUpperCase()}`,
        `**Fecha:** ${new Date().toLocaleDateString('es-AR')}`,
        '',
        '## 💡 Puntos Clave & Takeaways',
        ...(this.stageTakeaways.get(stageId) || []).map(t => `- **${t.category.toUpperCase()}**: ${t.bullet}`),
        '',
        '## ❓ Preguntas Sugeridas para el Speaker',
        ...(this.stageQuestions.get(stageId) || []).map(q => `- ${q.question}`),
        '',
        '## 📝 Transcripción Completa',
        ...chunks.map(chunk => `> **[${new Date(chunk.timestamp).toLocaleTimeString()}]** ${this.getTextForLang(chunk, lang)}`),
        ''
      ];
      return lines.join('\n');
    }

    // Default TXT
    return chunks.map(c => `[${new Date(c.timestamp).toLocaleTimeString()}] ${this.getTextForLang(c, lang)}`).join('\n');
  }

  private getTextForLang(chunk: SubtitleChunk, lang: 'es' | 'en' | 'pt' | 'original'): string {
    switch (lang) {
      case 'es': return chunk.esText || chunk.originalText;
      case 'en': return chunk.enText || chunk.originalText;
      case 'pt': return chunk.ptText || chunk.esText || chunk.originalText;
      case 'original':
      default:
        return chunk.originalText;
    }
  }

  private formatSRTTime(ms: number): string {
    const date = new Date(ms);
    const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  private formatVTTTime(ms: number): string {
    const date = new Date(ms);
    const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
}

export const stageManager = new StageManager();
