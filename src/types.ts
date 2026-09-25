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
  assignedDeviceId?: string;
  assignedDeviceLabel?: string;
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
  networkIp?: string;
  geminiConfigured: boolean;
  gemmaAvailable: boolean;
  activeEngine: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  forcedEngine: EngineMode;
  keyPool: KeyPoolItem[];
  activeKeyMasked?: string;
  stagesCount: number;
  timestamp: number;
}

export type ThemeId = 'broadcast-dark' | 'cyberpunk-konex' | 'high-contrast-aaa' | 'paper-light' | 'retro-crt';

export interface EventTalk {
  id: string;
  stageId: string;
  stageName: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  speaker: string;
  speakerRole: string;
  speakerCompany: string;
  title: string;
  track: string;
  language: 'es' | 'en' | 'mixed';
  level: 'Introductorio' | 'Intermedio' | 'Avanzado';
  description: string;
  tags: string[];
}

export interface AudienceQuestion {
  id: string;
  stageId: string;
  author: string;
  text: string;
  timestamp: number;
  votes: number;
  status: 'pending' | 'approved' | 'on_stage' | 'dismissed';
}

export type AudioSourceKind = 'mic' | 'tab' | 'youtube' | 'demo' | 'idle';

export interface StageAudioRouting {
  deviceId: string;
  deviceLabel: string;
  sourceKind: AudioSourceKind;
}

export type StageAudioRoutingMap = Record<string, StageAudioRouting>;
