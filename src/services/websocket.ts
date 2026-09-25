import { SubtitleChunk, Stage, StageTakeaway, StageQA, SupportedLanguage, StageData, AudienceQuestion } from '../types.js';

export interface WSCallbacks {
  onCaption?: (chunk: SubtitleChunk) => void;
  onTakeaways?: (takeaways: StageTakeaway[]) => void;
  onQuestions?: (questions: StageQA[]) => void;
  onAudioLevel?: (level: number) => void;
  onStagesUpdate?: (stages: Stage[]) => void;
  onInitialState?: (data: { stage: Stage; chunks: SubtitleChunk[]; takeaways: StageTakeaway[]; suggestedQuestions: StageQA[] }) => void;
  onStatusChange?: (connected: boolean) => void;
  onChunkDeleted?: (chunkId: string) => void;
  onRemoteReload?: (stageId: string) => void;
  onDeepIntel?: (data: { stageId: string; takeaways: StageTakeaway[]; suggestedQuestions: StageQA[]; executiveSummary: string; intelModelUsed: string }) => void;
  onInterim?: (data: { stageId: string; text: string }) => void;
  onQAUpdate?: (data: { stageId: string; question: AudienceQuestion; action: 'add' | 'vote' | 'status' }) => void;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private callbacks: WSCallbacks = {};
  private currentStageId: string = '';
  private currentLang: SupportedLanguage = 'original';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitlyClosed: boolean = false;
  private messageListeners: Set<(msg: any) => void> = new Set();

  constructor(callbacks: WSCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(stageId: string = '', lang: SupportedLanguage = 'original') {
    this.currentStageId = stageId || this.currentStageId;
    this.currentLang = lang;
    this.isExplicitlyClosed = false;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const adminToken =
      localStorage.getItem('nerdsub_admin_token') ||
      localStorage.getItem('aura_admin_token') ||
      new URLSearchParams(window.location.search).get('key') ||
      new URLSearchParams(window.location.search).get('token') ||
      '';

    const params = new URLSearchParams();
    if (this.currentStageId) params.set('stage', this.currentStageId);
    if (this.currentLang) params.set('lang', this.currentLang);
    if (adminToken) params.set('token', adminToken);
    const queryString = params.toString();
    const wsUrl = `${protocol}//${host}/ws${queryString ? `?${queryString}` : ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.callbacks.onStatusChange?.(true);
        this.send({
          type: 'subscribe',
          stageId: this.currentStageId,
          lang: this.currentLang
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'caption':
              this.callbacks.onCaption?.(msg.chunk);
              break;
            case 'takeaways':
              this.callbacks.onTakeaways?.(msg.takeaways);
              break;
            case 'questions':
              this.callbacks.onQuestions?.(msg.questions);
              break;
            case 'deep_intel':
              this.callbacks.onDeepIntel?.(msg);
              if (msg.takeaways) this.callbacks.onTakeaways?.(msg.takeaways);
              if (msg.suggestedQuestions) this.callbacks.onQuestions?.(msg.suggestedQuestions);
              break;
            case 'audio_level':
              this.callbacks.onAudioLevel?.(msg.level);
              break;
            case 'stages_update':
              this.callbacks.onStagesUpdate?.(msg.stages);
              break;
            case 'initial_state':
              this.callbacks.onInitialState?.(msg);
              break;
            case 'chunk_deleted':
              this.callbacks.onChunkDeleted?.(msg.chunkId);
              break;
            case 'remote_reload':
              this.callbacks.onRemoteReload?.(msg.stageId);
              break;
            case 'interim':
              this.callbacks.onInterim?.(msg);
              break;
            case 'qa_update':
              this.callbacks.onQAUpdate?.(msg);
              break;
          }

          // Notify any registered raw message listeners
          this.messageListeners.forEach((listener) => {
            try {
              listener(msg);
            } catch (err) {
              console.warn('[WSClient] Listener threw error:', err);
            }
          });
        } catch (err) {
          console.error('[WSClient] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onStatusChange?.(false);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[WSClient] Socket error:', error);
      };

    } catch (e) {
      console.error('[WSClient] Connection failed:', e);
      this.scheduleReconnect();
    }
  }

  public onMessage(handler: (msg: any) => void): () => void {
    this.messageListeners.add(handler);
    return () => {
      this.messageListeners.delete(handler);
    };
  }

  public setStage(stageId: string, lang?: SupportedLanguage) {
    this.currentStageId = stageId;
    if (lang) this.currentLang = lang;
    this.send({
      type: 'subscribe',
      stageId: this.currentStageId,
      lang: this.currentLang
    });
  }

  public setLanguage(lang: SupportedLanguage) {
    this.currentLang = lang;
    this.send({
      type: 'set_lang',
      lang: this.currentLang
    });
  }

  public sendAudioChunk(stageId: string, base64Audio: string, mimeType: string = 'audio/webm') {
    this.send({
      type: 'audio_chunk',
      stageId,
      base64Audio,
      mimeType
    });
  }

  public sendPcmChunk(stageId: string, pcmBase64: string) {
    this.send({
      type: 'pcm_audio_chunk',
      stageId,
      pcmBase64
    });
  }

  public sendLiveTranscript(stageId: string, text: string, sourceLang: string = 'es') {
    this.send({
      type: 'live_transcript',
      stageId,
      text,
      sourceLang
    });
  }

  public sendAudioLevel(stageId: string, level: number) {
    this.send({
      type: 'audio_level',
      stageId,
      level
    });
  }

  public deleteLastChunk(stageId: string) {
    this.send({
      type: 'delete_last_chunk',
      stageId
    });
  }

  public sendEmergencyClear(stageId: string) {
    this.send({
      type: 'emergency_clear',
      stageId
    });
  }

  public sendRemoteReload(stageId: string) {
    this.send({
      type: 'remote_reload',
      stageId
    });
  }

  public sendQASubmit(stageId: string, author: string, text: string) {
    this.send({
      type: 'qa_submit',
      stageId,
      author,
      text
    });
  }

  public sendQAVote(stageId: string, questionId: string) {
    this.send({
      type: 'qa_vote',
      stageId,
      questionId
    });
  }

  public sendQAStatus(stageId: string, questionId: string, status: AudienceQuestion['status']) {
    this.send({
      type: 'qa_status',
      stageId,
      questionId,
      status
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const adminToken =
        localStorage.getItem('nerdsub_admin_token') ||
        localStorage.getItem('aura_admin_token') ||
        '';
      if (adminToken && typeof data === 'object' && !data.adminToken) {
        data.adminToken = adminToken;
      }
      this.ws.send(JSON.stringify(data));
    }
  }

  private reconnectAttempts = 0;
  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    // Exponential backoff + Full Jitter (Sysarmy Event Resilience)
    const baseDelay = Math.min(8000, 1000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 5)));
    const jitter = Math.random() * 800;
    const delay = Math.round(baseDelay + jitter);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect(this.currentStageId, this.currentLang);
      }
    }, delay);
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
