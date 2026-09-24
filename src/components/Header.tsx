import React from 'react';
import { Radio, Tv, Sliders, KeyRound, Sparkles, Volume2, QrCode, Terminal, Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentView: 'audience' | 'admin' | 'overlay';
  onSelectView: (view: 'audience' | 'admin' | 'overlay') => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
  onOpenQrModal: () => void;
  isConnected: boolean;
  activeStageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  geminiConfigured,
  onOpenApiKeyModal,
  onOpenQrModal,
  isConnected,
  activeStageName,
}) => {
  return (
    <header className="border-b border-[#1c2130] bg-[#090b10]/95 backdrop-blur-md sticky top-0 z-40 select-none">
      
      {/* Top micro-chassis telemetry bar */}
      <div className="border-b border-[#141722] px-4 sm:px-6 py-1 flex items-center justify-between text-[10px] font-mono text-[#64748b]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="text-[#00f5ff] font-bold">NERDSUB</span>
            <span>//</span>
            <span>SYSARMY_BROADCAST_SYSTEM_2026</span>
          </span>
          <span className="hidden md:inline text-[#334155]">|</span>
          <span className="hidden md:flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#00ff88]" />
            <span className="text-gray-300">AUDIO BUS: 48kHz → 16kHz PCM</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-gray-400">
            LOC: <strong className="text-gray-200">KONEX BUENOS AIRES</strong>
          </span>
          <span className="text-[#334155]">•</span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00ff88]' : 'bg-[#ff1744]'}`} />
            <span className={isConnected ? 'text-[#00ff88]' : 'text-[#ff1744]'}>
              {isConnected ? 'STREAM_SYNC_OK' : 'OFFLINE'}
            </span>
          </span>
        </div>
      </div>

      {/* Main Console Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Unit Ident */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#141824] border border-[#252c40] shadow-inner">
            <span className="text-lg font-black text-[#00f5ff] font-mono tracking-tighter">
              ⚡
            </span>
            <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#ff5500] ring-2 ring-[#090b10]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black tracking-tight text-white uppercase">
                NERD<span className="text-[#00f5ff]">SUB</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1c2233] text-[#00f5ff] border border-[#2d3752] font-bold tracking-widest uppercase">
                TX-26
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#64748b] hidden sm:block">
              REAL-TIME TECHNICAL CAPTIONING ENGINE
            </p>
          </div>
        </div>

        {/* Tactile Hardware Selector Switches */}
        <nav className="flex items-center bg-[#0d0f17] p-1 rounded-xl border border-[#1c2130] shadow-inner gap-1">
          <button
            onClick={() => onSelectView('audience')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              currentView === 'audience'
                ? 'bg-[#181d2a] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm shadow-[#00f5ff]/10'
                : 'text-[#64748b] hover:text-white hover:bg-[#141722]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>01 // AUDIENCIA</span>
          </button>

          <button
            onClick={() => onSelectView('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              currentView === 'admin'
                ? 'bg-[#181d2a] text-[#ffb700] border border-[#ffb700]/40 shadow-sm shadow-[#ffb700]/10'
                : 'text-[#64748b] hover:text-white hover:bg-[#141722]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>02 // CONTROL ROOM</span>
          </button>

          <button
            onClick={() => onSelectView('overlay')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              currentView === 'overlay'
                ? 'bg-[#181d2a] text-[#ff1744] border border-[#ff1744]/40 shadow-sm shadow-[#ff1744]/10'
                : 'text-[#64748b] hover:text-white hover:bg-[#141722]'
            }`}
            title="OBS / vMix Studio Transparent Overlay"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">03 // OBS OVERLAY</span>
          </button>
        </nav>

        {/* Right Console Actions: QR & Gemini Engine Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* QR Code Quick-Launch */}
          <button
            onClick={onOpenQrModal}
            className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white hover:border-[#00f5ff]/50"
            title="Generar QR para proyección en auditorio o celulares de los asistentes"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span className="hidden sm:inline">QR_SALA</span>
          </button>

          {/* Gemini AI Status Switch */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all ${
              geminiConfigured
                ? 'bg-[#00f5ff]/10 text-[#00f5ff] border-[#00f5ff]/30 hover:bg-[#00f5ff]/20'
                : 'bg-[#ff5500]/10 text-[#ff5500] border-[#ff5500]/30 hover:bg-[#ff5500]/20'
            }`}
            title="Configuración de Motor Gemini"
          >
            <span className={`w-2 h-2 rounded-full ${geminiConfigured ? 'bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]' : 'bg-[#ff5500]'}`} />
            <span className="hidden lg:inline">
              {geminiConfigured ? 'GEMINI_2.5_ONLINE' : 'SIMULATION_MODE'}
            </span>
            <KeyRound className="w-3 h-3 opacity-70" />
          </button>

        </div>

      </div>
    </header>
  );
};
