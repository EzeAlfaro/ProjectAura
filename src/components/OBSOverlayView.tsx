import React, { useEffect, useState } from 'react';
import { SubtitleChunk, SupportedLanguage, Stage } from '../types.js';
import { formatBroadcastSubtitle } from '../utils/broadcastSegmenter.js';

interface OBSOverlayViewProps {
  stage?: Stage;
  chunks: SubtitleChunk[];
  selectedLang: SupportedLanguage;
  onSelectLang?: (lang: SupportedLanguage) => void;
  onExit?: () => void;
  interimText?: string;
}

export const OBSOverlayView: React.FC<OBSOverlayViewProps> = ({
  stage,
  chunks,
  selectedLang,
  onExit,
  interimText,
}) => {
  const [urlParams, setUrlParams] = useState({
    theme: 'dark-bar', // 'dark-bar' or 'floating'
    lines: 2,
    size: 'large', // 'normal', 'large', 'xl'
    delayMs: 0,
  });

  const [delayedChunks, setDelayedChunks] = useState<SubtitleChunk[]>([]);
  const [isFadedOut, setIsFadedOut] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') || 'dark-bar';
    const lines = parseInt(params.get('lines') || '2', 10);
    const size = params.get('size') || 'large';
    const delayMs = Math.max(0, parseInt(params.get('delay') || '0', 10));
    setUrlParams({ theme, lines, size, delayMs });

    // Ensure OBS browser source background is 100% transparent
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  // Broadcast Delay Buffer (Caption.Ninja & StreamText pattern for video lip-sync)
  // and Auto-Clear after 5.5s of acoustic silence (EIA-608 / CEA-708 standard)
  useEffect(() => {
    if (chunks.length === 0) {
      setDelayedChunks([]);
      return;
    }

    const delayTimer = setTimeout(() => {
      setDelayedChunks(chunks);
      setIsFadedOut(false);
    }, urlParams.delayMs);

    // Auto-clear after 5.5 seconds of silence so subtitles don't stay frozen on screen
    const autoClearTimer = setTimeout(() => {
      setIsFadedOut(true);
    }, urlParams.delayMs + 5500);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(autoClearTimer);
    };
  }, [chunks, urlParams.delayMs]);

  const getDisplayText = (chunk: SubtitleChunk): string => {
    let raw = '';
    switch (selectedLang) {
      case 'es':
        raw = chunk.esText || chunk.originalText;
        break;
      case 'en':
        raw = chunk.enText || chunk.originalText;
        break;
      case 'pt':
        raw = chunk.ptText || chunk.esText || chunk.originalText;
        break;
      case 'original':
      default:
        raw = chunk.originalText;
        break;
    }
    // CEA-708 standard: max ~12 words per card
    return formatBroadcastSubtitle(raw, 12);
  };

  // Get last N chunks for the overlay
  const recentChunks = isFadedOut ? [] : delayedChunks.slice(-urlParams.lines);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent pointer-events-none flex flex-col justify-end p-8 sm:p-12 z-50 overflow-hidden font-sans">
      
      {/* Optional Operator Exit Button (Hover/Pointer Enabled) */}
      {onExit && (
        <button
          onClick={onExit}
          className="fixed top-4 right-4 pointer-events-auto px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white/70 hover:text-white border border-white/20 font-mono text-xs shadow-lg transition-all flex items-center gap-1.5"
          title="Salir del Overlay y volver a la consola de control"
        >
          <span>✕ SALIR DE OVERLAY</span>
        </button>
      )}

      {/* Broadcast Subtitle Container pinned to bottom center */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Speaker & Stage subtle badge */}
        {stage && (
          <div className="mb-2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-[#00f0ff]">{stage.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-200">{stage.speaker}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 uppercase">
              {selectedLang}
            </span>
          </div>
        )}

        {/* Captions Box */}
        <div className="w-full bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-center">
          {recentChunks.length === 0 ? (
            <div className="text-gray-400 text-lg font-mono tracking-wide animate-pulse">
              [ Conectado a la sala • Esperando subtítulos en vivo ]
            </div>
          ) : (
            <div className="space-y-2">
              {recentChunks.map((chunk, i) => {
                const isLatest = i === recentChunks.length - 1;
                return (
                  <p
                    key={chunk.id}
                    className={`font-semibold tracking-wide transition-all break-words ${
                      isLatest
                        ? 'text-white text-2xl sm:text-3xl leading-snug drop-shadow-md'
                        : 'text-gray-400 text-xl sm:text-2xl leading-normal opacity-85'
                    }`}
                    style={{
                      textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.9)'
                    }}
                  >
                    {getDisplayText(chunk)}
                  </p>
                );
              })}
            </div>
          )}

          {/* Real-time speculative interim preview from Gemini 3.5 Live */}
          {interimText && (
            <div className="mt-3 pt-2 border-t border-amber-500/20 text-amber-300 font-mono italic text-lg sm:text-xl drop-shadow-md animate-pulse">
              <span className="text-amber-400 text-sm font-sans mr-2">▶</span>
              {interimText}
            </div>
          )}
        </div>

        {/* Watermark for Broadcast */}
        <div className="mt-3 flex items-center gap-1.5 opacity-60 text-[10px] font-mono text-white tracking-widest uppercase">
          <span>⚡ PROJECT AURA</span>
          <span>•</span>
          <span>NERDEARLA 2026 LIVE</span>
        </div>

      </div>

    </div>
  );
};
