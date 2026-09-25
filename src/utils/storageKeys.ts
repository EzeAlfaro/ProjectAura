/**
 * Centralized typed localStorage keys for Project Aura.
 * Avoids magic strings, collisions, and fragmentation across components.
 */
export const STORAGE_KEYS = {
  USER_ALIAS: 'aura_user_alias',
  VOTED_QUESTIONS: 'aura_voted_questions',
  KIOSK_DEVICE_ID: 'aura_kiosk_device_id',
  KIOSK_DISPLAY_MODE: 'aura_kiosk_display_mode',
  THEME: 'aura_theme',
  TTS_ENABLED: 'aura_tts_enabled',
} as const;
