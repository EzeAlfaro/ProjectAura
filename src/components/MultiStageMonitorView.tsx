import React, { useState, useEffect } from 'react';
import { 
  Stage, 
  SubtitleChunk, 
  SupportedLanguage, 
  TechTerm 
} from '../types.js';
import { 
  Radio, 
  Tv, 
  Sliders, 
  ExternalLink, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Activity, 
  Layers, 
  Download, 
  Mic, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Eye,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { WSClient } from '../services/websocket.js';

interface MultiStageMonitorViewProps {
  stages: Stage[];
  chunks: SubtitleChunk[];
  wsClient?: WSClient | null;
  onSelectStage: (stageId: string) => void;
  onSwitchToAdmin: (stageId?: string) => void;
  onOpenApiKeyModal?: () => void;
  geminiConfigured?: boolean;
  activeEngine?: 'gemini-cloud' | 'gemma-local' | 'native-offline';
}

export const MultiStageMonitorView: React.FC<MultiStageMonitorViewProps> = ({
  stages,
  chunks,
  wsClient,
  onSelectStage,
  onSwitchToAdmin,
  onOpenApiKeyModal,
  geminiConfigured = false,
  activeEngine = 'native-offline'
}) => {
  const [globalLang, setGlobalLang] = useState<SupportedLanguage>('es');
  const [stageLangs, setStageLangs] = useState<Record<string, SupportedLanguage>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('aura_multiview_stage_langs');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      'stage-1': 'es',
      'stage-2': 'en',
      'stage-3': 'pt'
    };
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [allStageChunks, setAllStageChunks] = useState<Record<string, SubtitleChunk[]>>({});

  const handleSetStageLang = (stageId: string, lang: SupportedLanguage) => {
    setStageLangs((prev) => {
      const next = { ...prev, [stageId]: lang };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('aura_multiview_stage_langs', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  const handleSetAllStagesLang = (lang: SupportedLanguage) => {
    setGlobalLang(lang);
    setStageLangs((prev) => {
      const next: Record<string, SupportedLanguage> = { ...prev };
      stages.forEach((s) => {
        next[s.id] = lang;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('aura_multiview_stage_langs', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Group chunks by stageId
  useEffect(() => {
    const map: Record<string, SubtitleChunk[]> = {};
    for (const stg of stages) {
      map[stg.id] = [];
    }
    for (const chunk of chunks) {
      const sId = chunk.stageId || 'stage-1';
      if (!map[sId]) map[sId] = [];
      if (!map[sId].some(c => c.id === chunk.id)) {
        map[sId].push(chunk);
      }
    }
    // Sort each stage's chunks by timestamp
    for (const sId in map) {
      map[sId].sort((a, b) => a.timestamp - b.timestamp);
    }
    setAllStageChunks(map);
  }, [chunks, stages]);

  // Listen to WebSocket messages across all stages if wildcard is active
  useEffect(() => {
    if (!wsClient || typeof (wsClient as any).onMessage !== 'function') return;
    const unsub = (wsClient as any).onMessage((msg: any) => {
      if (msg.type === 'caption' && msg.chunk) {
        const c: SubtitleChunk = msg.chunk;
        const sId = c.stageId || 'stage-1';
        setAllStageChunks(prev => {
          const list = prev[sId] || [];
          if (list.some(item => item.id === c.id)) return prev;
          return {
            ...prev,
            [sId]: [...list, c].slice(-30)
          };
        });
      } else if (msg.type === 'initial_state' && msg.allChunks) {
        setAllStageChunks(msg.allChunks);
      } else if (msg.type === 'emergency_clear' && msg.stageId) {
        setAllStageChunks(prev => ({
          ...prev,
          [msg.stageId]: []
        }));
      }
    });
    return unsub;
  }, [wsClient]);

  // Open all stages in separate browser tabs
  const handleOpenAllTabs = () => {
    stages.forEach((stg) => {
      const sLang = stageLangs[stg.id] || globalLang;
      window.open(`/?view=kiosk&stage=${stg.id}&lang=${sLang}`, '_blank');
    });
  };

  // Get text for a chunk based on selected language
  const getChunkText = (c: SubtitleChunk, lang: SupportedLanguage): string => {
    if (lang === 'en') return c.enText || c.originalText;
    if (lang === 'pt') return c.ptText || c.originalText;
    if (lang === 'es') return c.esText || c.originalText;
    return c.originalText || c.esText;
  };

  const totalChunksCount = Object.values(allStageChunks).reduce((acc, list) => acc + list.length, 0);
  const liveStagesCount = stages.filter(s => s.isLive || (s.audioLevel && s.audioLevel > 5)).length;

  // Real cost calculation: $0.00 for local/edge, or dynamic cloud rate based on actual streaming stages
  const getCostInfo = () => {
    if (activeEngine === 'gemini-cloud' && geminiConfigured) {
      if (liveStagesCount > 0) {
        return {
          label: 'COSTO CLOUD',
          value: `$${(liveStagesCount * 0.053).toFixed(3)}/h`,
          colorClass: 'text-emerald-400',
          badge: `${liveStagesCount} en vivo`
        };
      }
      return {
        label: 'COSTO CLOUD',
        value: '$0.00/h',
        colorClass: 'text-gray-400',
        badge: 'Standby'
      };
    }

    if (activeEngine === 'gemma-local') {
      return {
        label: 'COSTO',
        value: '$0.00',
        colorClass: 'text-[#00ff66]',
        badge: 'Gemma 2B Edge'
      };
    }

    return {
      label: 'COSTO',
      value: '$0.00',
      colorClass: 'text-[#00ff66]',
      badge: '100% Local / Gratis'
    };
  };

  const costInfo = getCostInfo();

  return (
    <div className="min-h-screen bg-[#06080e] text-white flex flex-col font-sans select-none pb-12">
      {/* ========================================================
          TOP MASTER CONTROL BAR (MULTIVIEWER TELEMETRY)
         ======================================================== */}
      <div className="bg-[#0b0e17] border-b border-[#1c2438] px-4 sm:px-6 py-2.5 relative z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Multiviewer Title & Live Indicator */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#121624] border border-[#232d45] shadow-inner text-[#00f5ff] shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-black text-white tracking-tight uppercase whitespace-nowrap">
                  VISOR MULTI-SALA // <span className="text-[#00f5ff]">MASTER MONITOR WALL</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 font-mono text-[10px] font-black tracking-wider flex items-center gap-1.5 uppercase shadow-[0_0_8px_rgba(16,185,129,0.2)] shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Monitoreo simultáneo de subtítulos en vivo en todas las salas del Konex
              </p>
            </div>
          </div>

          {/* Center: Live Stats Counters */}
          <div className="hidden lg:flex items-center gap-3 bg-[#070910] px-3.5 py-1.5 rounded-xl border border-[#1d263b] font-mono text-xs">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Activity className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>SALAS: <strong className="text-white">{stages.length}</strong></span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <Zap className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>CHUNKS: <strong className="text-white">{totalChunksCount}</strong></span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <span className="text-[#ffb800]">$</span>
              <span>{costInfo.label}: <strong className={costInfo.colorClass}>{costInfo.value}</strong></span>
              <span className="px-1.5 py-0.2 rounded bg-[#10141e] border border-[#202738] text-[9px] text-gray-400">
                {costInfo.badge}
              </span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${
                activeEngine === 'gemini-cloud' && geminiConfigured
                  ? 'bg-[#00f5ff] shadow-[0_0_6px_#00f5ff]'
                  : activeEngine === 'gemma-local'
                  ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]'
                  : 'bg-[#ffb800]'
              }`} />
              <span className="text-gray-400">MOTOR:</span>
              <strong className={
                activeEngine === 'gemini-cloud' && geminiConfigured
                  ? 'text-[#00f5ff]'
                  : activeEngine === 'gemma-local'
                  ? 'text-[#00ff66]'
                  : 'text-[#ffb800]'
              }>
                {activeEngine === 'gemini-cloud' && geminiConfigured
                  ? 'GEMINI CLOUD'
                  : activeEngine === 'gemma-local'
                  ? 'GEMMA EDGE'
                  : 'LOCAL'}
              </strong>
            </div>
          </div>

          {/* Right: Actions & Language Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Global Language Batch Preset */}
            <div className="flex items-center gap-1.5 bg-[#070910] px-2 py-1 rounded-lg border border-[#1d263b] font-mono text-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase hidden xl:inline">TODAS:</span>
              {[
                { id: 'es', flag: '🇦🇷', label: 'ES' },
                { id: 'en', flag: '🇬🇧', label: 'EN' },
                { id: 'pt', flag: '🇧🇷', label: 'PT' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => handleSetAllStagesLang(lang.id as SupportedLanguage)}
                  className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                    globalLang === lang.id
                      ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={`Cambiar todas las salas a ${lang.label}`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            {/* Open All Stages in Tabs */}
            <button
              onClick={handleOpenAllTabs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101422] hover:bg-[#182035] border border-[#232d45] hover:border-[#00f5ff] text-gray-200 hover:text-white font-mono text-xs font-bold transition-all"
              title="Abre cada una de las salas en una pestaña individual independiente del navegador"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span className="hidden sm:inline">ABRIR TODAS EN PESTAÑAS</span>
            </button>

            {/* Switch to Mesa Técnica */}
            <button
              onClick={() => onSwitchToAdmin()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b2b] hover:bg-[#1d273f] border border-[#ffb800]/40 text-[#ffb800] hover:text-white font-mono text-xs font-bold transition-all shadow-[0_0_8px_rgba(255,184,0,0.15)]"
              title="Volver a la Mesa Técnica para configurar micrófonos, ganancias o IA"
            >
              <Sliders className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>MESA TÉCNICA</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-[#101422] hover:bg-[#182035] border border-[#232d45] text-gray-300 hover:text-white transition-all"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa para el videowall'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================
          MULTI-STAGE MONITOR TILES GRID
         ======================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {stages.map((stg, index) => {
            const stageChunksList = allStageChunks[stg.id] || [];
            const recentChunks = stageChunksList.slice(-4);
            const latestChunk = recentChunks.length > 0 ? recentChunks[recentChunks.length - 1] : null;
            const hasRecentAudio = (stg.audioLevel && stg.audioLevel > 5) || (latestChunk && Date.now() - latestChunk.timestamp < 15000);

            return (
              <div 
                key={stg.id}
                className="bg-[#0b0e18] border-2 border-[#1c243a] hover:border-[#00f5ff]/60 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-200 group"
              >
                {/* Tile Header: Stage Identification */}
                <div className="bg-[#0e1220] border-b border-[#1c243a] p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#141a2c] border border-[#232e4c] font-mono text-xs font-bold text-[#00f5ff] flex items-center justify-center shrink-0">
                      0{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-sm font-black text-white uppercase tracking-tight" title={stg.name}>
                          {stg.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-mono text-[9px] font-bold shrink-0">
                          {stg.track || 'TRACK'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 truncate" title={`${stg.speaker || 'Orador'} — ${stg.talkTitle || 'Transmisión Oficial'}`}>
                        🎙️ {stg.speaker || 'Orador'} — {stg.talkTitle || 'Transmisión Oficial'}
                      </div>
                    </div>
                  </div>

                  {/* Online / Audio Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                      hasRecentAudio
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-950/50 text-amber-400 border border-amber-500/40'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${hasRecentAudio ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>{hasRecentAudio ? 'EN VIVO' : 'STANDBY'}</span>
                    </span>
                  </div>
                </div>

                {/* Subtitle Telemetry, Independent Language & Live Audio Meter */}
                <div className="px-3.5 py-2 bg-[#090c14] border-b border-[#171e30] flex items-center justify-between text-[11px] font-mono gap-2 flex-wrap">
                  {/* Assigned Audio Input Badge */}
                  <div className="flex items-center gap-1.5 text-gray-400 truncate max-w-[140px]">
                    <Mic className="w-3 h-3 text-[#00f5ff] shrink-0" />
                    <span className="truncate" title={stg.assignedDeviceLabel || 'Entrada de Audio Mini-PC'}>
                      {stg.assignedDeviceLabel || 'Audio Line-In'}
                    </span>
                  </div>

                  {/* Independent Language Selector per Stage */}
                  <div className="flex items-center gap-1 bg-[#070910] p-0.5 rounded-lg border border-[#1e273c] text-[10px] font-mono font-bold">
                    {[
                      { id: 'es', flag: '🇦🇷', label: 'ES' },
                      { id: 'en', flag: '🇬🇧', label: 'EN' },
                      { id: 'pt', flag: '🇧🇷', label: 'PT' }
                    ].map(l => {
                      const isSelected = (stageLangs[stg.id] || 'es') === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetStageLang(stg.id, l.id as SupportedLanguage);
                          }}
                          className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                            isSelected
                              ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_6px_rgba(0,245,255,0.4)]'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title={`Subtítulos de ${stg.name} en ${l.label}`}
                        >
                          <span>{l.flag}</span>
                          <span>{l.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Audio Level dBFS Meter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">VU:</span>
                    <div className="w-14 bg-[#121626] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-100 ${stg.audioLevel && stg.audioLevel > 80 ? 'bg-red-500' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, (stg.audioLevel || 0))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-300 w-6 text-right">
                      {stg.audioLevel ? `${stg.audioLevel}%` : '0%'}
                    </span>
                  </div>
                </div>

                {/* Live Subtitles Content Box */}
                <div className="p-4 flex-1 flex flex-col justify-end min-h-[190px] bg-[#070911] space-y-2.5">
                  {stageChunksList.length === 0 ? (
                    <div className="my-auto text-center py-6 text-gray-400 font-mono text-xs flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#121624] border border-[#232d45] flex items-center justify-center text-gray-400">
                        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                      </div>
                      <span>Esperando subtítulos en vivo en {stg.name}...</span>
                      <span className="text-[10px] text-gray-500">
                        Iniciá audio desde la Mesa Técnica o capturá el micrófono en Kiosk
                      </span>
                    </div>
                  ) : (
                    recentChunks.map((chunk, idx) => {
                      const isLatest = idx === recentChunks.length - 1;
                      const stageLang = stageLangs[stg.id] || globalLang || 'es';
                      const text = getChunkText(chunk, stageLang);

                      return (
                        <div 
                          key={chunk.id} 
                          className={`transition-all duration-200 rounded-lg p-2.5 ${
                            isLatest 
                              ? 'bg-[#101524] border border-[#00f5ff]/40 shadow-sm' 
                              : 'bg-transparent text-gray-400 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1">
                            <span className="text-[#00f5ff] font-bold">
                              {new Date(chunk.timestamp).toLocaleTimeString()}
                            </span>
                            {chunk.techTerms && chunk.techTerms.length > 0 && (
                              <div className="flex items-center gap-1">
                                {chunk.techTerms.slice(0, 2).map(tt => (
                                  <span key={tt.term} className="px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[9px] font-bold">
                                    {tt.term}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className={`font-sans leading-snug ${
                            isLatest 
                              ? 'text-white font-bold text-sm sm:text-base' 
                              : 'text-gray-400 text-xs sm:text-sm'
                          }`}>
                            "{text}"
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Tile Footer: Direct Launch & Export Actions */}
                <div className="bg-[#0b0e18] border-t border-[#1c243a] p-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    {/* Launch Kiosk in New Tab */}
                    <a
                      href={`/?view=kiosk&stage=${stg.id}&lang=${stageLangs[stg.id] || globalLang || 'es'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-[#121626] hover:bg-[#1a2238] border border-[#232f48] hover:border-[#00f5ff] rounded text-[11px] font-mono font-bold text-gray-200 hover:text-white flex items-center gap-1 transition-all"
                      title="Abrir Pantalla Kiosk / Proyector para esta sala en una nueva pestaña"
                    >
                      <Tv className="w-3 h-3 text-[#00f5ff]" />
                      <span>Kiosk</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>

                    {/* Launch OBS Overlay in New Tab */}
                    <a
                      href={`/overlay?stage=${stg.id}&lang=${stageLangs[stg.id] || globalLang || 'es'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-[#121626] hover:bg-[#1a2238] border border-[#232f48] hover:border-red-500 rounded text-[11px] font-mono font-bold text-gray-200 hover:text-white flex items-center gap-1 transition-all"
                      title="Abrir Señal Transparente para OBS Studio / vMix en una nueva pestaña"
                    >
                      <Tv className="w-3 h-3 text-red-400" />
                      <span>OBS</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>

                    {/* Launch Mobile Audience View in New Tab */}
                    <a
                      href={`/?view=audience&stage=${stg.id}&lang=${stageLangs[stg.id] || globalLang || 'es'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-[#121626] hover:bg-[#1a2238] border border-[#232f48] hover:border-emerald-500 rounded text-[11px] font-mono font-bold text-gray-200 hover:text-white flex items-center gap-1 transition-all"
                      title="Abrir Vista de Audiencia Móvil en una nueva pestaña"
                    >
                      <Smartphone className="w-3 h-3 text-emerald-400" />
                      <span>Móvil</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick Download SRT */}
                    <a
                      href={`/api/stages/${stg.id}/export/srt?lang=${stageLangs[stg.id] || globalLang || 'es'}`}
                      download={`nerdsub-${stg.id}-${stageLangs[stg.id] || globalLang || 'es'}.srt`}
                      className="p-1 rounded bg-[#101422] hover:bg-[#182035] border border-[#232d45] hover:border-emerald-400 text-gray-300 hover:text-emerald-400 transition-all"
                      title="Descargar subtítulos .SRT sincronizados de esta sala"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Switch to Admin View focused on this stage */}
                    <button
                      onClick={() => {
                        onSelectStage(stg.id);
                        onSwitchToAdmin(stg.id);
                      }}
                      className="px-2.5 py-1 bg-[#ffb800]/10 hover:bg-[#ffb800]/20 border border-[#ffb800]/40 rounded text-[11px] font-mono font-bold text-[#ffb800] hover:text-white transition-all flex items-center gap-1"
                      title="Abrir Mesa Técnica con esta sala seleccionada"
                    >
                      <Sliders className="w-3 h-3 text-[#ffb800]" />
                      <span>Controlar</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
