export type SupportedLanguage = 'es' | 'en' | 'pt' | 'original';

export interface TechTerm {
  term: string;
  definition: string;
  category: 'cloud' | 'devops' | 'ai' | 'security' | 'database' | 'architecture' | 'language' | 'general';
}

export interface SubtitleChunk {
  id: string;
  stageId: string;
  timestamp: number;
  durationMs?: number;
  originalText: string;
  sourceLang: 'es' | 'en' | 'pt' | 'other';
  esText: string;
  enText: string;
  ptText: string;
  techTerms: TechTerm[];
  confidence: number;
  isFinal: boolean;
}

export interface Stage {
  id: string;
  name: string;
  track: string;
  speaker: string;
  talkTitle: string;
  description: string;
  isLive: boolean;
  currentAudioSource: 'mic' | 'file' | 'demo' | 'stream' | 'idle';
  audioLevel: number;
  audienceCount: number;
  latencyMs: number;
  detectedLang: 'es' | 'en' | 'pt';
  startedAt?: number;
}

export interface StageTakeaway {
  id: string;
  timestamp: number;
  bullet: string;
  category: string;
}

export interface StageQA {
  id: string;
  question: string;
  context: string;
  target: 'speaker' | 'audience';
}

export interface StageData {
  stage: Stage;
  chunks: SubtitleChunk[];
  takeaways: StageTakeaway[];
  suggestedQuestions: StageQA[];
  executiveSummary?: string;
  intelModelUsed?: string;
}

export type EngineMode = 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline';

export interface KeyPoolItem {
  id: string;
  maskedKey: string;
  addedAt: number;
  status: 'active' | 'standby' | 'rate_limited' | 'blocked' | 'invalid';
  requestsSuccess: number;
  requestsFailed: number;
  lastUsedAt?: number;
  lastError?: string;
  cooldownUntil?: number;
}

export interface EngineStatus {
  status: string;
  appName: string;
  version: string;
  geminiConfigured: boolean;
  gemmaAvailable: boolean;
  activeEngine: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  forcedEngine: EngineMode;
  keyPool: KeyPoolItem[];
  activeKeyMasked?: string;
  stagesCount: number;
  timestamp: number;
}
