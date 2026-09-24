import React from 'react';
import { Radio, Tv, Sliders, KeyRound, Sparkles, Volume2, QrCode, Terminal, Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentView: 'audience' | 'admin' | 'overlay' | 'kiosk';
  onSelectView: (view: 'audience' | 'admin' | 'overlay' | 'kiosk') => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
  onOpenQrModal: () => void;
  onOpenVMixModal?: () => void;
  isConnected: boolean;
  activeStageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  geminiConfigured,
  onOpenApiKeyModal,
  onOpenQrModal,
  onOpenVMixModal,
  isConnected,
  activeStageName,
}) => {
  return (
    <header className="border-b-2 border-[#1c2333] bg-[#090b10] sticky top-0 z-40 select-none shadow-xl">
      
      {/* Top micro-chassis telemetry bar */}
      <div className="border-b border-[#141724] px-3 sm:px-6 py-1 flex items-center justify-between text-[10px] font-mono text-[#64748b]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="rack-screw">✕</span>
            <span className="text-[#00f5ff] font-black tracking-wider">SYSARMY</span>
            <span className="text-[#334155]">/</span>
            <span className="text-white font-bold">NERDSUB RACK-1000 PRO</span>
            <span className="text-[#334155]">/</span>
            <span className="text-[#64748b] hidden sm:inline">SER: #2026-TX</span>
          </div>
          <span className="hidden md:inline text-[#334155]">|</span>
          <span className="hidden md:flex items-center gap-1.5 text-gray-300">
            <Activity className="w-3 h-3 text-[#00ff66]" />
            <span>BUS: 48kHz → 16kHz PCM (LE)</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-gray-400">
            KONEX BUENOS AIRES // <strong className="text-gray-200">{activeStageName || 'STAGE 1'}</strong>
          </span>
          <span className="text-[#334155]">•</span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff66] shadow-[0_0_8px_#00ff66]' : 'bg-[#ff1744]'}`} />
            <span className={isConnected ? 'text-[#00ff66]' : 'text-[#ff1744]'}>
              {isConnected ? 'STREAM_SYNC_OK' : 'OFFLINE'}
            </span>
          </span>
          <span className="rack-screw">✕</span>
        </div>
      </div>

      {/* Main Console Faceplate */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Unit Ident & Tally Light */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-10 h-10 rounded bg-[#10131d] border-2 border-[#222a3d] shadow-inner">
              <span className="text-xl font-black text-[#00f5ff] font-mono">⚡</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black tracking-tight text-white uppercase">
                  PROJECT <span className="text-[#00f5ff]">AURA</span>
                </span>
                <span className="tally-lamp-live text-[9px] font-mono px-2 py-0.5 rounded font-black tracking-widest uppercase">
                  ON AIR
                </span>
              </div>
              <p className="text-[9px] font-mono text-[#64748b] hidden sm:block tracking-wide">
                DUAL-ENGINE BROADCAST ACCESSIBILITY // SYSARMY 2026
              </p>
            </div>
          </div>
        </div>

        {/* Physical Hardware Channel/View Selector Switches */}
        <nav className="flex items-center bg-[#07090e] p-1 rounded-lg border border-[#1e2535] shadow-inner gap-1">
          <button
            onClick={() => onSelectView('audience')}
            className={`hardware-btn flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              currentView === 'audience' ? 'hardware-btn-active text-[#00f5ff]' : 'text-[#718096]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>01 // AUDITORIO</span>
          </button>

          <button
            onClick={() => onSelectView('admin')}
            className={`hardware-btn flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              currentView === 'admin' ? 'hardware-btn-active text-[#ffb800]' : 'text-[#718096]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>02 // CONTROL ROOM</span>
          </button>

          <button
            onClick={() => onSelectView('overlay')}
            className={`hardware-btn flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              currentView === 'overlay' ? 'hardware-btn-active text-[#ff1744]' : 'text-[#718096]'
            }`}
            title="OBS / vMix Studio Transparent Overlay"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">03 // OVERLAY</span>
          </button>

          <button
            onClick={() => onSelectView('kiosk')}
            className={`hardware-btn flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              currentView === 'kiosk' ? 'hardware-btn-active text-[#00ff66]' : 'text-[#718096]'
            }`}
            title="Nodo Autónomo de Mini PC para Sala (Audio 3.5mm + Proyector de Sala)"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">04 // NODO SALA</span>
          </button>
        </nav>

        {/* Right Console Actions: vMix, QR & Gemini Engine Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* vMix & OBS Studio Integration Hub */}
          {onOpenVMixModal && (
            <button
              onClick={onOpenVMixModal}
              className="hardware-btn flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-xs font-mono font-bold text-[#ff1744] hover:border-[#ff1744] hover:bg-[#ff1744]/10 transition-all"
              title="Abrir panel de integración de URLs y configuración para vMix y OBS Studio"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">vMIX / OBS</span>
            </button>
          )}

          {/* QR Code Quick-Launch for Attendee Mobile Access */}
          <button
            onClick={onOpenQrModal}
            className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold text-gray-200 hover:text-white"
            title="Generar QR para proyección en auditorio o celulares de los asistentes"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span className="hidden sm:inline">QR_SALA</span>
          </button>

          {/* Gemini AI Status Switch */}
          <button
            onClick={onOpenApiKeyModal}
            className={`hardware-btn flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              geminiConfigured ? 'border-[#00f5ff]/60 text-[#00f5ff]' : 'border-[#ffb800]/60 text-[#ffb800]'
            }`}
            title="Configuración de Motor Gemini (Dual Engine: Flash 2.5 + Pro 2.5)"
          >
            <span className={`w-2 h-2 rounded-full ${geminiConfigured ? 'bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]' : 'bg-[#ffb800]'}`} />
            <span className="hidden lg:inline">
              {geminiConfigured ? 'DUAL: FLASH + PRO' : 'SIMULATION_MODE'}
            </span>
            <KeyRound className="w-3 h-3 opacity-70" />
          </button>

        </div>

      </div>
    </header>
  );
};
