import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT) || 3001,
    wsPath: process.env.WS_PATH || '/ws',
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '50mb',
    maxAudioUploadBytes: Number(process.env.MAX_AUDIO_UPLOAD_BYTES) || 25 * 1024 * 1024,
    corsOrigin: process.env.CORS_ORIGIN || '*',
    seedMockData: process.env.SEED_MOCK_DATA !== 'false',
    persistConfigToDisk: process.env.PERSIST_CONFIG_TO_DISK === 'true',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    liveModel: process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp',
    flashModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    proModel: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
    fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash').split(',').map(m => m.trim()),
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    gemmaModel: process.env.GEMMA_MODEL || 'gemma2:2b',
    keyCooldownMs: Number(process.env.KEY_COOLDOWN_MS) || 60000,
    liveSessionRenewMs: Number(process.env.LIVE_SESSION_RENEW_MS) || 8.5 * 60 * 1000,
    liveReconnectDelayMs: Number(process.env.LIVE_RECONNECT_DELAY_MS) || 3000,
  },
  audio: {
    pcmThresholdBytes: Number(process.env.PCM_BUFFER_THRESHOLD_BYTES) || 64000, // ~2.0s 16kHz PCM
    sampleRate: Number(process.env.AUDIO_SAMPLE_RATE) || 16000,
    silenceDurationMs: Number(process.env.VAD_SILENCE_MS) || 800,
    prefixPaddingMs: Number(process.env.VAD_PREFIX_PADDING_MS) || 100,
    maxStageChunksInMemory: Number(process.env.MAX_STAGE_CHUNKS) || 200,
    deepIntelChunkInterval: Number(process.env.DEEP_INTEL_INTERVAL) || 6,
  },
  translation: {
    apiUrl: process.env.TRANSLATION_API_URL || 'https://api.mymemory.translated.net/get',
    contactEmail: process.env.TRANSLATION_CONTACT_EMAIL || 'support@projectaura.io',
    httpTimeoutMs: Number(process.env.TRANSLATION_TIMEOUT_MS) || 1800,
    maxCacheSize: Number(process.env.TRANSLATION_CACHE_SIZE) || 1000,
  },
  storage: {
    logDir: process.env.LOG_DIR || path.resolve(process.cwd(), 'server', 'logs'),
    logFileName: process.env.LOG_FILE_NAME || 'aura.log',
    stagesConfigPath: process.env.STAGES_CONFIG_PATH || path.resolve(process.cwd(), 'config', 'stages.json'),
    scheduleConfigPath: process.env.SCHEDULE_CONFIG_PATH || path.resolve(process.cwd(), 'config', 'schedule.json'),
  },
  event: {
    name: process.env.EVENT_NAME || 'Nerdearla 2026',
    city: process.env.EVENT_CITY || 'Buenos Aires',
    venue: process.env.EVENT_VENUE || 'Ciudad Cultural Konex',
  }
};
