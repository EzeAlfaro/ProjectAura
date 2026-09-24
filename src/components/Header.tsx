import React from 'react';
import { Radio, Tv, Sliders, KeyRound, Sparkles, Volume2 } from 'lucide-react';

interface HeaderProps {
  currentView: 'audience' | 'admin' | 'overlay';
  onSelectView: (view: 'audience' | 'admin' | 'overlay') => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
  isConnected: boolean;
  activeStageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  geminiConfigured,
  onOpenApiKeyModal,
  isConnected,
  activeStageName,
}) => {
  return (
    <header className="border-b border-[#2a344f] bg-[#0c0f17]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] p-[2px]">
            <div className="w-full h-full bg-[#0c0f17] rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] bg-clip-text text-transparent font-mono">
                ⚡
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                Nerd<span className="text-[#00f0ff]">Sub</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8b5cf6]/20 text-[#a855f7] border border-[#8b5cf6]/30 font-semibold">
                nerdearla 2026
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] hidden sm:block">
              Live Technical Subtitles & AI Translation at Scale
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center bg-[#141a29] p-1 rounded-xl border border-[#2a344f]">
          <button
            onClick={() => onSelectView('audience')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'audience'
                ? 'bg-[#00f0ff] text-[#0c0f17] font-semibold shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Audiencia</span>
          </button>

          <button
            onClick={() => onSelectView('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'admin'
                ? 'bg-[#8b5cf6] text-white font-semibold shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Control Room</span>
          </button>

          <button
            onClick={() => onSelectView('overlay')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'overlay'
                ? 'bg-[#ff007a] text-white font-semibold shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
            title="Modo transparente para OBS Studio o vMix"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">OBS Overlay</span>
          </button>
        </nav>

        {/* Status Indicators & Settings */}
        <div className="flex items-center gap-3">
          {/* Socket Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                : 'bg-red-950/40 text-red-400 border-red-800/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span className="hidden sm:inline">{isConnected ? 'LIVE' : 'DESCONECTADO'}</span>
          </div>

          {/* Gemini API Status Badge & Modal Trigger */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              geminiConfigured
                ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30 hover:bg-[#00f0ff]/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Configurar Gemini API Key"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-mono">
              {geminiConfigured ? 'Gemini 2.5 Flash' : 'Modo Simulación'}
            </span>
            <KeyRound className="w-3 h-3 opacity-70" />
          </button>
        </div>

      </div>
    </header>
  );
};
