import React, { useState } from 'react';
import { 
  Radio, 
  Tv, 
  Sliders, 
  KeyRound, 
  Sparkles, 
  Volume2, 
  QrCode, 
  Terminal, 
  Activity, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Calendar, 
  Palette,
  Menu,
  X,
  Mic,
  BookOpen,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile.js';

interface HeaderProps {
  currentView: 'audience' | 'admin' | 'overlay' | 'kiosk' | 'mic' | 'multiview';
  onSelectView: (view: 'audience' | 'admin' | 'overlay' | 'kiosk' | 'mic' | 'multiview') => void;
  geminiConfigured: boolean;
  gemmaAvailable?: boolean;
  activeEngine?: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  forcedEngine?: 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline';
  onOpenApiKeyModal: () => void;
  onOpenQrModal: () => void;
  onOpenVMixModal?: () => void;
  onOpenLogModal?: () => void;
  onOpenScheduleModal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenManualModal?: () => void;
  isConnected: boolean;
  activeStageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  geminiConfigured,
  gemmaAvailable,
  activeEngine = 'native-offline',
  forcedEngine = 'auto',
  onOpenApiKeyModal,
  onOpenQrModal,
  onOpenVMixModal,
  onOpenLogModal,
  onOpenScheduleModal,
  onOpenThemeModal,
  onOpenManualModal,
  isConnected,
  activeStageName,
}) => {
  const isMobile = useIsMobile(1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectMobileView = (view: 'audience' | 'admin' | 'overlay' | 'kiosk' | 'mic' | 'multiview') => {
    onSelectView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b-2 border-[#1c2333] bg-[#090b10] sticky top-0 z-40 select-none shadow-xl">
      
      {/* ========================================================
          MOBILE / TABLET COMPACT HEADER (< 1024px)
      ======================================================== */}
      {isMobile ? (
        <div className="px-3 py-2 flex items-center justify-between">
          {/* Brand & Tally */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#10131d] border border-[#222a3d]">
              <span className="text-base font-black text-[#00f5ff] font-mono">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-black text-white tracking-tight">
                  AURA
                </span>
                <span className="tally-lamp-live text-[8px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                  ON AIR
                </span>
              </div>
              <div className="text-[9px] font-mono text-gray-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00ff66]' : 'bg-red-500'}`} />
                <span className="truncate max-w-[120px]">{activeStageName || 'SALA 01'}</span>
              </div>
            </div>
          </div>

          {/* Quick Mobile Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Direct Switch to Emergency Mobile Mic */}
            <button
              onClick={() => onSelectView('mic')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
                currentView === 'mic'
                  ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-[#10141e] text-red-400 border-red-900/40 hover:border-red-500/50'
              }`}
              title="Micrófono Móvil de Emergencia"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="text-[11px]">MIC</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#161d2d] border border-[#232f48] text-white hover:bg-[#1e273b] transition-all"
              aria-label="Menú principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================
            DESKTOP STUDIO 19" RACK CONSOLE (>= 1024px)
        ======================================================== */
        <>
          {/* Top micro-chassis telemetry bar */}
          <div className="border-b border-[#141724] px-6 py-1 flex items-center justify-between text-[10px] font-mono text-[#64748b]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="rack-screw">✕</span>
                <span className="text-[#00f5ff] font-black tracking-wider">SYSARMY</span>
                <span className="text-[#334155]">/</span>
                <span className="text-white font-bold">AURA RACK-1000 PRO</span>
                <span className="text-[#334155]">/</span>
                <span className="text-[#64748b]">SER: #2026-TX</span>
                <span className="text-[#334155]">/</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[9px] font-mono font-bold" title="Herramienta creada por técnicos de escenario para técnicos de escenario">AV-CREW BUILT 🛠️</span>
              </div>
              <span className="text-[#334155]">|</span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Activity className="w-3 h-3 text-[#00ff66]" />
                <span>BUS: 48kHz → 16kHz PCM (LE)</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400">
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
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
                  <p className="text-[9px] font-mono text-[#64748b] tracking-wide">
                    BROADCAST ACCESSIBILITY & SIMULTANEOUS TRANSLATION
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Core Roles: AUDIENCIA, MESA TÉCNICA, MULTIVIEWER, TRANSMISIÓN */}
            <nav className="flex items-center bg-[#07090e] p-1 rounded-lg border border-[#1e2535] shadow-inner gap-1">
              {/* 1. AUDIENCIA */}
              <button
                onClick={() => onSelectView('audience')}
                className={`hardware-btn flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  currentView === 'audience' ? 'hardware-btn-active text-[#00f5ff]' : 'text-[#718096]'
                }`}
                title="Vista para asistentes en sala y celulares"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#00f5ff]" />
                <span>AUDIENCIA</span>
              </button>

              {/* 2. MESA TÉCNICA */}
              <button
                onClick={() => onSelectView('admin')}
                className={`hardware-btn flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  currentView === 'admin' ? 'hardware-btn-active text-[#ffb800]' : 'text-[#718096]'
                }`}
                title="Consola de Sonido AV: Vúmetros, Sound Check y Control de Salas"
              >
                <Sliders className="w-3.5 h-3.5 text-[#ffb800]" />
                <span>MESA TÉCNICA</span>
              </button>

              {/* 3. MULTIVIEWER (VISOR GENERAL) */}
              <button
                onClick={() => onSelectView('multiview')}
                className={`hardware-btn flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  currentView === 'multiview' ? 'hardware-btn-active text-purple-400' : 'text-[#718096]'
                }`}
                title="Visor General Multi-Sala: Muro de Monitoreo Centralizado de Subtítulos en Vivo para Control y Jurado"
              >
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>MULTIVIEWER</span>
              </button>

              {/* 4. TRANSMISIÓN & TV */}
              <button
                onClick={() => onSelectView('overlay')}
                className={`hardware-btn flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  currentView === 'overlay' ? 'hardware-btn-active text-[#ff1744]' : 'text-[#718096]'
                }`}
                title="Proyección de Sala (TV con QR) y Señal Limpia para OBS Studio"
              >
                <Tv className="w-3.5 h-3.5 text-[#ff1744]" />
                <span>TRANSMISIÓN & TV</span>
              </button>
            </nav>

            {/* Right Console Actions: Nueva Pestaña, Mic, vMix/OBS, Manual, Agenda, Temas, Motor AI */}
            <div className="flex items-center gap-2">
              {/* Quick Popout to New Tab */}
              <button
                onClick={() => {
                  const target = currentView === 'multiview' ? 'multiview' : currentView === 'overlay' ? 'overlay' : currentView === 'admin' ? 'admin' : 'kiosk';
                  window.open(`/?view=${target}`, '_blank');
                }}
                className="hardware-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono text-cyan-300 hover:text-white border border-[#232f48] bg-[#0c101c] hover:border-[#00f5ff] transition-all"
                title="Abrir la vista actual en una pestaña independiente del navegador para proyectores o segundo monitor"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#00f5ff]" />
                <span className="hidden xl:inline text-[11px] font-bold">NUEVA PESTAÑA</span>
              </button>
              {/* Micrófono Móvil de Emergencia */}
              <button
                onClick={() => onSelectView('mic')}
                className={`hardware-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  currentView === 'mic' ? 'text-red-400 border-red-500 bg-red-950/40' : 'text-gray-400 hover:text-white'
                }`}
                title="Micrófono inalámbrico de emergencia"
              >
                <Mic className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden xl:inline">MIC MÓVIL</span>
              </button>

              {/* Generador Links vMix / OBS */}
              {onOpenVMixModal && (
                <button
                  onClick={onOpenVMixModal}
                  className="hardware-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold text-[#00f5ff] hover:text-white border border-[#00f5ff]/30 bg-[#00f5ff]/10 hover:bg-[#00f5ff]/20 transition-all"
                  title="Generador de links y overlays por sala para vMix y OBS Studio"
                >
                  <Tv className="w-3.5 h-3.5 text-[#00f5ff]" />
                  <span className="hidden xl:inline">vMIX / OBS</span>
                </button>
              )}

              {/* Manual de Operaciones */}
              {onOpenManualModal && (
                <button
                  onClick={onOpenManualModal}
                  className="hardware-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold text-cyan-300 hover:text-white border border-[#222a3d] bg-[#10141e] transition-all"
                  title="Manual de Operaciones y Runbook Técnico (Bilingüe)"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden xl:inline">MANUAL</span>
                </button>
              )}

              {/* Agenda */}
              {onOpenScheduleModal && (
                <button
                  onClick={onOpenScheduleModal}
                  className="hardware-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold text-gray-300 hover:text-white border border-[#222a3d] bg-[#10141e] transition-all"
                  title="Agenda oficial de Nerdearla 2026"
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden xl:inline">AGENDA</span>
                </button>
              )}

              {/* Temas Visuales */}
              {onOpenThemeModal && (
                <button
                  onClick={onOpenThemeModal}
                  className="hardware-btn p-2 rounded text-gray-400 hover:text-amber-400 border border-[#222a3d] bg-[#10141e] transition-all"
                  title="Cambiar tema visual"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}

              {/* Logs */}
              {onOpenLogModal && (
                <button
                  onClick={onOpenLogModal}
                  className="hardware-btn p-2 rounded text-gray-400 hover:text-[#00f5ff] border border-[#222a3d] bg-[#10141e] transition-all"
                  title="Ver telemetría y logs del sistema"
                >
                  <Terminal className="w-3.5 h-3.5 text-[#00f5ff]" />
                </button>
              )}

              {/* Engine Status / API Key Modal */}
              <button
                onClick={onOpenApiKeyModal}
                className={`hardware-btn flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  activeEngine === 'gemini-cloud'
                    ? 'border-[#00f5ff]/60 text-[#00f5ff] bg-[#00f5ff]/10'
                    : activeEngine === 'gemma-local'
                    ? 'border-[#00ff66]/60 text-[#00ff66] bg-[#00ff66]/10'
                    : 'border-[#ffb800]/60 text-[#ffb800] bg-[#ffb800]/10'
                }`}
                title="Consola de Motores de IA y Llaves"
              >
                <span className={`w-2 h-2 rounded-full ${
                  activeEngine === 'gemini-cloud'
                    ? 'bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]'
                    : activeEngine === 'gemma-local'
                    ? 'bg-[#00ff66] shadow-[0_0_8px_#00ff66]'
                    : 'bg-[#ffb800]'
                }`} />
                <span>{activeEngine === 'gemini-cloud' ? 'GEMINI LIVE' : activeEngine === 'gemma-local' ? 'GEMMA' : 'LOCAL'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          MOBILE SLIDE-OVER DRAWER MENU
      ======================================================== */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end animate-fade-in">
          <div className="bg-[#0e121a] border-t-2 border-cyan-500 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#1c2436] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="font-mono font-extrabold text-base text-white">
                  PROJECT AURA • MENÚ
                </h3>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-[#161d2d] text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Sections */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                VISTAS DEL SISTEMA:
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectMobileView('audience')}
                  className={`p-3 rounded-xl border text-left font-mono text-xs font-bold flex items-center gap-2.5 transition-all ${
                    currentView === 'audience'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-sm'
                      : 'bg-[#121622] border-[#222a3d] text-gray-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Subtítulos en Vivo</span>
                </button>

                <button
                  onClick={() => handleSelectMobileView('mic')}
                  className={`p-3 rounded-xl border text-left font-mono text-xs font-bold flex items-center gap-2.5 transition-all ${
                    currentView === 'mic'
                      ? 'bg-red-950/80 border-red-500 text-red-300 shadow-sm'
                      : 'bg-[#121622] border-[#222a3d] text-gray-300'
                  }`}
                >
                  <Mic className="w-4 h-4 text-red-400 animate-pulse" />
                  <span>Micrófono Móvil</span>
                </button>

                <button
                  onClick={() => handleSelectMobileView('admin')}
                  className={`p-3 rounded-xl border text-left font-mono text-xs font-bold flex items-center gap-2.5 transition-all ${
                    currentView === 'admin'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-[#121622] border-[#222a3d] text-gray-300'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Mesa Técnica</span>
                </button>

                <button
                  onClick={() => handleSelectMobileView('kiosk')}
                  className={`p-3 rounded-xl border text-left font-mono text-xs font-bold flex items-center gap-2.5 transition-all ${
                    currentView === 'kiosk'
                      ? 'bg-green-950/80 border-green-400 text-green-300 shadow-sm'
                      : 'bg-[#121622] border-[#222a3d] text-gray-300'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-green-400" />
                  <span>Pantalla Sala</span>
                </button>
              </div>
            </div>

            {/* Quick Tools */}
            <div className="space-y-3 pt-1">
              <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                HERRAMIENTAS DE CONFERENCIA:
              </div>

              <div className="space-y-2">
                {onOpenVMixModal && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenVMixModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#121622] border border-[#00f5ff]/40 hover:border-[#00f5ff] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tv className="w-4 h-4 text-[#00f5ff]" />
                      <span className="text-[#00f5ff]">Links vMix / OBS Studio por Sala</span>
                    </div>
                    <span className="text-gray-500">→</span>
                  </button>
                )}

                {onOpenScheduleModal && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenScheduleModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>Agenda Nerdearla 2026 (16 Charlas)</span>
                    </div>
                    <span className="text-gray-500">→</span>
                  </button>
                )}

                {onOpenThemeModal && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenThemeModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <span>Cambiar Tema Visual (Skins)</span>
                    </div>
                    <span className="text-gray-500">→</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenQrModal();
                  }}
                  className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 text-[#00f5ff]" />
                    <span>Compartir Código QR</span>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>

                {onOpenLogModal && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLogModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-[#00f5ff]" />
                      <span>Telemetría y Registro de Logs</span>
                    </div>
                    <span className="text-gray-500">→</span>
                  </button>
                )}

                {onOpenManualModal && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenManualModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] hover:border-cyan-500/40 text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Manual de Operaciones & Despliegue (Bilingüe)</span>
                    </div>
                    <span className="text-gray-500">→</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenApiKeyModal();
                  }}
                  className="w-full p-3 rounded-xl bg-[#121622] border border-[#222a3d] text-left font-mono text-xs font-bold text-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    <span>Configurar Motor IA ({activeEngine})</span>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] font-mono text-gray-500 space-y-0.5">
              <div>Project Aura • Nerdearla Vibeathon 2026</div>
              <div className="text-cyan-400/80 font-bold">🛠️ Diseñado en el rack por operadores de escenario</div>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
