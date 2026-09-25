/**
 * Frontend dynamic environment and runtime origin resolution.
 * Prevents hardcoding localhost, ports, or fixed fallback URLs.
 */
export const APP_CONFIG = {
  get apiBase(): string {
    return import.meta.env.VITE_API_URL || '/api';
  },
  get wsUrl(): string {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    if (typeof window === 'undefined') return 'ws://localhost:3001/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  },
  get publicOrigin(): string {
    if (import.meta.env.VITE_PUBLIC_URL) return import.meta.env.VITE_PUBLIC_URL;
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3000';
  },
  get eventName(): string {
    return import.meta.env.VITE_EVENT_NAME || 'Nerdearla 2026';
  },
  get venueName(): string {
    return import.meta.env.VITE_VENUE_NAME || 'Ciudad Cultural Konex';
  }
};
