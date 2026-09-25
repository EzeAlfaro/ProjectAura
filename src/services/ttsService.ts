import { SupportedLanguage } from '../types';

type TTSListener = (state: { enabled: boolean; isSpeaking: boolean; currentText: string }) => void;

class TTSService {
  private enabled: boolean = false;
  private isSpeaking: boolean = false;
  private currentText: string = '';
  private listeners: Set<TTSListener> = new Set();
  private queue: Array<{ text: string; lang: string }> = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private rate: number = 1.1; // Slightly faster to keep sync with live speakers

  constructor() {
    try {
      const saved = localStorage.getItem('aura_tts_enabled');
      if (saved === 'true') {
        this.enabled = true;
      }
    } catch (e) {
      // ignore
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('aura_tts_enabled', val ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
    if (!val) {
      this.stop();
    }
    this.notify();
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public subscribe(listener: TTSListener): () => void {
    this.listeners.add(listener);
    listener({ enabled: this.enabled, isSpeaking: this.isSpeaking, currentText: this.currentText });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = { enabled: this.enabled, isSpeaking: this.isSpeaking, currentText: this.currentText };
    this.listeners.forEach(fn => fn(state));
  }

  public speak(text: string, lang: SupportedLanguage = 'es') {
    if (!this.enabled || !this.isSupported() || !text || !text.trim()) return;

    // Clean text (remove brackets or technical symbols)
    const cleanText = text.replace(/\[.*?\]/g, '').replace(/https?:\/\/\S+/g, '').trim();
    if (!cleanText) return;

    // Avoid duplicate utterance if already spoken recently
    if (this.currentText === cleanText) return;

    const bcpLang = this.getBCP47(lang);

    // If queue is getting too long (more than 3 chunks behind live speech), drop older items
    if (this.queue.length > 2) {
      this.queue.splice(0, this.queue.length - 2);
    }

    this.queue.push({ text: cleanText, lang: bcpLang });
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (!this.enabled || this.queue.length === 0) {
      this.isSpeaking = false;
      this.currentText = '';
      this.notify();
      return;
    }

    const next = this.queue.shift();
    if (!next) return;

    this.isSpeaking = true;
    this.currentText = next.text;
    this.notify();

    try {
      const utterance = new SpeechSynthesisUtterance(next.text);
      utterance.lang = next.lang;
      utterance.rate = this.rate;
      utterance.pitch = 1.0;

      // Select high quality voice if available
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.startsWith(next.lang.slice(0, 2)));
      if (match) {
        utterance.voice = match;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        this.processQueue();
      };

      utterance.onerror = (e) => {
        console.warn('[TTS] Synthesis error:', e);
        this.currentUtterance = null;
        this.processQueue();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[TTS] Failed to speak:', e);
      this.isSpeaking = false;
      this.notify();
    }
  }

  public stop() {
    this.queue = [];
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.isSpeaking = false;
    this.currentText = '';
    this.currentUtterance = null;
    this.notify();
  }

  private getBCP47(lang: SupportedLanguage): string {
    switch (lang) {
      case 'en': return 'en-US';
      case 'pt': return 'pt-BR';
      case 'es':
      default: return 'es-ES';
    }
  }
}

export const ttsService = new TTSService();
