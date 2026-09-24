import React, { useEffect, useState } from 'react';
import { SubtitleChunk, SupportedLanguage, Stage } from '../types.js';

interface OBSOverlayViewProps {
  stage?: Stage;
  chunks: SubtitleChunk[];
  selectedLang: SupportedLanguage;
  onSelectLang?: (lang: SupportedLanguage) => void;
}

export const OBSOverlayView: React.FC<OBSOverlayViewProps> = ({
  stage,
  chunks,
  selectedLang,
}) => {
  const [urlParams, setUrlParams] = useState({
    theme: 'dark-bar', // 'dark-bar' or 'floating'
    lines: 2,
    size: 'large', // 'normal', 'large', 'xl'
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') || 'dark-bar';
    const lines = parseInt(params.get('lines') || '2', 10);
    const size = params.get('size') || 'large';
    setUrlParams({ theme, lines, size });
  }, []);

  const getDisplayText = (chunk: SubtitleChunk): string => {
    switch (selectedLang) {
      case 'es':
        return chunk.esText || chunk.originalText;
      case 'en':
        return chunk.enText || chunk.originalText;
      case 'pt':
        return chunk.ptText || chunk.esText || chunk.originalText;
      case 'original':
      default:
        return chunk.originalText;
    }
  };

  // Get last N chunks for the overlay
  const recentChunks = chunks.slice(-urlParams.lines);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent pointer-events-none flex flex-col justify-end p-8 sm:p-12 z-50 overflow-hidden font-sans">
      
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
                    className={`font-semibold tracking-wide transition-all ${
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
        </div>

        {/* Nerdearla Logo Watermark for Broadcast */}
        <div className="mt-3 flex items-center gap-1.5 opacity-60 text-[10px] font-mono text-white tracking-widest uppercase">
          <span>⚡ NERDSUB AI</span>
          <span>•</span>
          <span>NERDEARLA 2026 LIVE</span>
        </div>

      </div>

    </div>
  );
};
