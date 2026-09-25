import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
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
  onSelectLang,
  onExit,
  interimText,
}) => {
  const [urlParams, setUrlParams] = useState({
    theme: 'dark-bar', // 'dark-bar' or 'floating'
    mode: 'overlay',   // 'overlay' (transparent OBS) or 'tv' (auditorium projection screen with QR)
    lines: 2,
    size: 'large',     // 'normal', 'large', 'xl'
    delayMs: 0,
  });

  const [delayedChunks, setDelayedChunks] = useState<SubtitleChunk[]>([]);
  const [isFadedOut, setIsFadedOut] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') || 'dark-bar';
    const mode = params.get('mode') === 'tv' || params.get('tv') !== null || window.location.pathname.includes('/tv') ? 'tv' : 'overlay';
    const lines = parseInt(params.get('lines') || (mode === 'tv' ? '3' : '2'), 10);
    const size = params.get('size') || (mode === 'tv' ? 'xl' : 'large');
    const delayMs = Math.max(0, parseInt(params.get('delay') || '0', 10));
    setUrlParams({ theme, mode, lines, size, delayMs });

    // In TV mode, dark background. In Overlay mode, transparent for OBS chroma/alpha
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = mode === 'tv' ? '#030712' : 'transparent';

    // Generate audience QR code for TV mode
    if (mode === 'tv') {
      const audienceUrl = `${window.location.origin}/?stage=${stage?.id || 'stage-1'}`;
      QRCode.toDataURL(audienceUrl, { margin: 1, width: 180, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(console.warn);
    }

    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, [stage?.id]);

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
    <div className={`fixed inset-0 w-screen h-screen ${urlParams.mode === 'tv' ? 'bg-[#030712]' : 'bg-transparent'} pointer-events-none flex flex-col justify-end p-8 sm:p-12 z-50 overflow-hidden font-sans`}>
      
      {/* TV Screen Top-Left Talk & Speaker Banner */}
      {urlParams.mode === 'tv' && stage && (
        <div className="fixed top-6 left-6 z-50 max-w-lg bg-[#0d131f]/95 border border-white/15 p-4 rounded-2xl shadow-2xl pointer-events-auto backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00f5ff]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">{stage.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-300">{stage.track}</span>
          </div>
          <h2 className="text-white text-lg font-bold mt-1 line-clamp-2 leading-tight">
            {stage.talkTitle || 'Transmisión Oficial'}
          </h2>
          <div className="text-gray-300 text-sm font-medium mt-0.5">
            Orador: <span className="text-white font-semibold">{stage.speaker}</span>
          </div>
        </div>
      )}

      {/* TV Screen Top-Right Audience QR Code Banner */}
      {urlParams.mode === 'tv' && qrDataUrl && (
        <div className="fixed top-6 right-6 z-50 bg-[#0d131f]/95 border border-[#00f5ff]/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-auto backdrop-blur-md">
          <img src={qrDataUrl} alt="Audience QR" className="w-20 h-20 rounded-xl bg-white p-1 shadow-inner" />
          <div className="text-left font-mono">
            <div className="text-xs font-bold text-[#00f5ff] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
              SALA EN VIVO
            </div>
            <div className="text-[11px] text-gray-200 font-semibold mt-0.5">Escaneá con tu celular</div>
            <div className="text-[10px] text-gray-400">Subtítulos & Audio A11y</div>
            <div className="text-[9px] text-[#ffb800] mt-1 font-bold">ES • EN • PT</div>
          </div>
        </div>
      )}

      {/* Optional Operator Exit Button (Hover/Pointer Enabled) */}
      {onExit && (
        <button
          onClick={onExit}
          className={`fixed ${urlParams.mode === 'tv' ? 'bottom-4 right-4' : 'top-4 right-4'} pointer-events-auto px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white/70 hover:text-white border border-white/20 font-mono text-xs shadow-lg transition-all flex items-center gap-1.5 z-50`}
          title="Salir del Overlay y volver a la consola de control"
        >
          <span>✕ SALIR DE VISTA</span>
        </button>
      )}

      {/* Broadcast Subtitle Container pinned to bottom center */}
      <div className={`w-full ${urlParams.mode === 'tv' ? 'max-w-6xl' : 'max-w-5xl'} mx-auto flex flex-col items-center`}>
        
        {/* Speaker & Stage subtle badge (Overlay mode) */}
        {urlParams.mode !== 'tv' && stage && (
          <div className="mb-2 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white text-xs font-mono shadow-lg pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-[#00f0ff]">{stage.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-200">{stage.speaker}</span>

            {/* Language Switcher Pills */}
            <div className="flex items-center gap-1 ml-1 bg-white/10 p-0.5 rounded-md text-[10px]">
              {(['es', 'en', 'pt'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onSelectLang && onSelectLang(l)}
                  className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${
                    selectedLang === l ? 'bg-[#00f5ff] text-black shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                  title={`Cambiar a ${l.toUpperCase()}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Lines Toggle (1 or 2 lines) */}
            <button
              onClick={() => setUrlParams((prev) => ({ ...prev, lines: prev.lines === 1 ? 2 : 1 }))}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all font-bold"
              title="Alternar entre 1 sola línea (solo lo último hablado) o 2 líneas continuas"
            >
              {urlParams.lines === 1 ? '1 LÍNEA' : '2 LÍNEAS'}
            </button>
          </div>
        )}

        {/* Captions Box */}
        <div className={`w-full ${urlParams.mode === 'tv' ? 'bg-[#0a0f1d]/90 border-2 border-white/20 p-6 sm:p-8 rounded-3xl' : 'bg-black/85 border border-white/15 p-5 sm:p-6 rounded-2xl'} backdrop-blur-md shadow-2xl text-center`}>
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
