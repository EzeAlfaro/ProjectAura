import React, { useState, useEffect, useRef } from 'react';
import { 
  Stage, 
  SubtitleChunk, 
  StageTakeaway, 
  StageQA, 
  SupportedLanguage, 
  TechTerm 
} from '../types.js';
import { 
  Volume2, 
  Radio, 
  BookOpen, 
  Sparkles, 
  Download, 
  HelpCircle, 
  ArrowDownCircle, 
  Clock, 
  Languages, 
  Maximize2,
  Minimize2,
  Terminal,
  Activity,
  Layers,
  Tag,
  Check,
  QrCode,
  Tv,
  Cpu
} from 'lucide-react';
import { getExportUrl } from '../services/api.js';
import { RackUnit, HexScrew } from './HardwareControls.js';

interface AudienceViewProps {
  stages: Stage[];
  selectedStageId: string;
  onSelectStage: (id: string) => void;
  selectedLang: SupportedLanguage;
  onSelectLang: (lang: SupportedLanguage) => void;
  chunks: SubtitleChunk[];
  takeaways: StageTakeaway[];
  suggestedQuestions: StageQA[];
  onOpenQrModal: () => void;
  executiveSummary?: string;
  intelModelUsed?: string;
  onTriggerDeepIntel?: () => void;
  isGeneratingIntel?: boolean;
  interimText?: string;
}

export const AudienceView: React.FC<AudienceViewProps> = ({
  stages,
  selectedStageId,
  onSelectStage,
  selectedLang,
  onSelectLang,
  chunks,
  takeaways,
  suggestedQuestions,
  onOpenQrModal,
  executiveSummary,
  intelModelUsed,
  onTriggerDeepIntel,
  isGeneratingIntel,
  interimText,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'cinema'>('large');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'glossary' | 'takeaways' | 'qa' | 'export'>('glossary');
  const [selectedTerm, setSelectedTerm] = useState<TechTerm | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];
  const subtitlesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new captions arrive
  useEffect(() => {
    if (autoScroll && subtitlesContainerRef.current) {
      subtitlesContainerRef.current.scrollTop = subtitlesContainerRef.current.scrollHeight;
    }
  }, [chunks, autoScroll]);

  // Aggregate all unique technical terms detected in this talk
  const allDetectedTerms = React.useMemo(() => {
    const termMap = new Map<string, TechTerm>();
    for (const chunk of chunks) {
      for (const term of chunk.techTerms || []) {
        if (!termMap.has(term.term.toLowerCase())) {
          termMap.set(term.term.toLowerCase(), term);
        }
      }
    }
    return Array.from(termMap.values());
  }, [chunks]);

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

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'cinema':
        return 'text-2xl sm:text-3xl lg:text-4xl leading-snug font-medium tracking-normal';
      case 'large':
        return 'text-lg sm:text-xl lg:text-2xl leading-relaxed font-normal';
      case 'normal':
      default:
        return 'text-base sm:text-lg leading-relaxed';
    }
  };

  const renderTextWithGlossaryHighlights = (text: string, terms: TechTerm[]) => {
    if (!terms || terms.length === 0) return text;

    const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);
    const pattern = new RegExp(`\\b(${sortedTerms.map(t => escapeRegExp(t.term)).join('|')})\\b`, 'gi');
    const parts = text.split(pattern);

    return parts.map((part, i) => {
      const matched = terms.find((t) => t.term.toLowerCase() === part.toLowerCase());
      if (matched) {
        return (
          <span
            key={i}
            onClick={() => {
              setSelectedTerm(matched);
              setActiveSidebarTab('glossary');
            }}
            className="cursor-pointer inline-flex items-baseline mx-1 px-1.5 py-0.5 rounded smd-chip text-[#00f5ff] border border-[#00f5ff]/40 hover:bg-[#00f5ff]/15 hover:border-[#00f5ff] transition-all font-mono font-bold text-[0.88em]"
            title={`Definición de ${matched.term}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4 transition-all ${isFocusMode ? 'fixed inset-0 z-50 bg-[#07090e] max-w-none p-4 sm:p-8' : ''}`}>
      
      {/* 19" RACK CHASSIS: STAGE MATRIX & AUDIO BUS ROUTING */}
      {!isFocusMode && (
        <RackUnit
          unitId="RACK_01"
          uHeight="1U"
          title="CONSOLA DE ESCENARIOS Y MATRIZ DE TRADUCCIÓN"
          subTitle="Selección de sala en vivo y conmutación instantánea de idioma de salida"
          rightBadge={
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenQrModal}
                className="hardware-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold text-gray-200 hover:text-white"
                title="Abrir en celular o proyectar en pantalla de sala"
              >
                <QrCode className="w-3.5 h-3.5 text-[#00f5ff]" />
                <span className="hidden sm:inline">QR_SALA</span>
              </button>

              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="hardware-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold text-gray-200 hover:text-[#00f5ff]"
                title="Modo cine sin distracciones para proyección"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CINE_HUD</span>
              </button>
            </div>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Stage Channel Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full lg:w-auto">
              <span className="text-[9px] font-mono font-bold text-[#64748b] uppercase tracking-wider pl-1 hidden sm:inline">
                CHANNELS:
              </span>
              {stages.map((stage, idx) => {
                const isSelected = stage.id === selectedStageId;
                return (
                  <button
                    key={stage.id}
                    onClick={() => onSelectStage(stage.id)}
                    className={`hardware-btn flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all shrink-0 ${
                      isSelected ? 'hardware-btn-active text-white border-[#00f5ff]' : 'text-[#718096]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stage.isLive ? 'bg-[#ff1744] shadow-[0_0_6px_#ff1744] animate-pulse' : 'bg-[#2b3347]'
                      }`}
                    />
                    <div className="text-left flex items-center gap-1.5">
                      <span className="text-[10px] text-[#00f5ff]">0{idx + 1}</span>
                      <span>{stage.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hardware Language Bus Rocker Switches */}
            <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded border border-[#1a202c]">
              {[
                { id: 'original', code: 'RAW // SOURCE', flag: '🎙️' },
                { id: 'es', code: 'ES // ESPAÑOL', flag: '🇦🇷' },
                { id: 'en', code: 'EN // ENGLISH', flag: '🇺🇸' },
                { id: 'pt', code: 'PT // PORTUGUÊS', flag: '🇧🇷' },
              ].map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                    className={`hardware-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      isSelected
                        ? 'hardware-btn-active text-[#00f5ff] border-[#00f5ff]'
                        : 'text-[#64748b] hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </RackUnit>
      )}

      {/* Stage Live Status Telemetry Bar */}
      {currentStage && !isFocusMode && (
        <div className="bg-[#0b0e14] border border-[#1b2230] rounded p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="tally-lamp-live px-2 py-0.5 rounded text-[9px] font-mono font-black tracking-widest uppercase">
                ON AIR // {currentStage.track}
              </span>
              <span className="text-xs font-mono text-[#64748b]">
                SPEAKER: <strong className="text-white">{currentStage.speaker}</strong>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {currentStage.talkTitle}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#64748b] shrink-0 border-t md:border-t-0 md:border-l border-[#1b2230] pt-2 md:pt-0 md:pl-4">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">AUDIENCIA</div>
              <div className="text-white font-bold">{currentStage.audienceCount} CONECTADOS</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">LATENCIA</div>
              <div className="text-[#00ff66] font-bold">{currentStage.latencyMs}ms</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">IDIOMA IN</div>
              <div className="text-[#00f5ff] font-bold uppercase">{currentStage.detectedLang}</div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN STUDIO LAYOUT: TELEPROMPTER & HARDWARE HUD */}
      <div className={`grid grid-cols-1 ${isFocusMode ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-4 items-start`}>
        
        {/* STUDIO TELEPROMPTER SCREEN (8 COLS or 12 in Cinema) */}
        <div className={`${isFocusMode ? 'lg:col-span-12' : 'lg:col-span-8'} bg-[#080a0f] border-2 border-[#1c2333] rounded shadow-2xl flex flex-col overflow-hidden`}>
          
          {/* Teleprompter Faceplate Control Strip */}
          <div className="bg-[#0d1017] border-b border-[#181d2a] px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                <span className="font-bold text-white uppercase text-[11px]">STUDIO_PROMPTER</span>
              </div>
              <span className="text-[#334155] hidden sm:inline">|</span>
              <span className="text-[10px] text-[#64748b] hidden sm:inline">
                BUFFER: {chunks.length} CAPTIONS
              </span>
            </div>

            {/* Typography & Autoscroll Hardware Controls */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230]">
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontSize === 'normal' ? 'bg-[#182030] text-[#00f5ff]' : 'text-[#64748b]'}`}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontSize === 'large' ? 'bg-[#182030] text-[#00f5ff]' : 'text-[#64748b]'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('cinema')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontSize === 'cinema' ? 'bg-[#182030] text-[#00f5ff]' : 'text-[#64748b]'}`}
                >
                  A+
                </button>
              </div>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`hardware-btn px-2 py-1 rounded text-[10px] font-bold ${autoScroll ? 'text-[#00ff66]' : 'text-[#64748b]'}`}
                title="Pausar o reanudar el auto-scroll de subtítulos"
              >
                {autoScroll ? 'SCROLL: ON' : 'SCROLL: OFF'}
              </button>

              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={`hardware-btn px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  showOriginal
                    ? 'hardware-btn-active text-[#00f5ff] border-[#00f5ff] bg-[#00f5ff]/10'
                    : 'text-[#64748b] hover:text-white'
                }`}
                title="Mostrar transcripción original junto a la traducción (Modo Dual)"
              >
                DUAL: {showOriginal ? 'ON' : 'OFF'}
              </button>

              {isFocusMode && (
                <button
                  onClick={() => setIsFocusMode(false)}
                  className="hardware-btn px-2 py-1 rounded text-[10px] font-bold text-gray-300 hover:text-white"
                >
                  <Minimize2 className="w-3 h-3 inline mr-1" />
                  SALIR
                </button>
              )}
            </div>
          </div>

          {/* Teleprompter Display Glass with Dual Fade Mask */}
          <div
            ref={subtitlesContainerRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Subtítulos en vivo para accesibilidad"
            className={`p-4 sm:p-6 overflow-y-auto dual-fade-mask space-y-4 transition-all ${
              isFocusMode ? 'h-[75vh]' : 'h-[500px]'
            }`}
          >
            {chunks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#111520] border border-[#232b3d] flex items-center justify-center text-[#00f5ff]">
                  <Tv className="w-6 h-6 animate-pulse" />
                </div>
                <div className="font-mono text-sm font-bold text-gray-300">
                  SALA CONECTADA // ESPERANDO AUDIO EN VIVO
                </div>
                <p className="text-xs font-mono text-[#64748b] max-w-md">
                  El operador de sala iniciará la transmisión o podés lanzar una demo de prueba desde el Control Room.
                </p>
              </div>
            ) : (
              chunks.map((chunk, index) => {
                const isLatest = index === chunks.length - 1;
                const displayText = getDisplayText(chunk);

                return (
                  <div
                    key={chunk.id}
                    className={`transition-all duration-200 border-l-2 pl-3 py-1 ${
                      isLatest
                        ? 'border-[#00f5ff] bg-[#00f5ff]/5 rounded-r'
                        : 'border-[#1b2230] opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Timestamp & Speaker Tag */}
                    <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-[#64748b]">
                      <span className="text-[#00f5ff]">
                        [{new Date(chunk.timestamp).toLocaleTimeString()}]
                      </span>
                      <span>SPEAKER: {currentStage?.speaker || 'TALK'}</span>
                      {chunk.sourceLang && (
                        <span className="px-1 py-0.2 bg-[#121622] rounded text-[#8b5cf6] border border-[#232b3d]">
                          {chunk.sourceLang.toUpperCase()}
                        </span>
                      )}
                      {chunk.confidence && (
                        <span className="text-[#00ff66]">
                          {Math.round(chunk.confidence * 100)}% CONF
                        </span>
                      )}
                    </div>

                    {/* Main Rendered Text with Spanglish Glossary Highlights */}
                    <div className={`${getFontSizeClass()} text-white font-sans tracking-wide leading-relaxed`}>
                      {renderTextWithGlossaryHighlights(displayText, chunk.techTerms || [])}
                    </div>

                    {/* Dual View: Display original speech alongside translation */}
                    {showOriginal && selectedLang !== 'original' && chunk.originalText && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#1b2230]/60 flex items-baseline gap-2 text-xs font-mono text-[#94a3b8] italic">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#161d2a] text-[#38bdf8] font-bold not-italic shrink-0 border border-[#243046]">
                          SRC ({chunk.sourceLang.toUpperCase()})
                        </span>
                        <span className="leading-snug">{chunk.originalText}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Real-time Speculative Interim Preview from Gemini 3.5 Live */}
            {interimText && (
              <div className="border-l-2 border-amber-400 bg-amber-400/5 rounded-r pl-3 py-2 animate-pulse transition-all">
                <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-bold uppercase tracking-wider">GEMINI 3.5 LIVE // PREVIEW EN TIEMPO REAL:</span>
                </div>
                <div className="text-amber-200 font-mono italic text-sm sm:text-base leading-relaxed">
                  {interimText}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Teleprompter Telemetry Ticker */}
          <div className="bg-[#0b0e14] border-t border-[#181d2a] px-3 sm:px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#64748b]">
            <div className="flex items-center gap-2">
              <span className="text-[#00ff66] font-bold">● ENGINE: GEMINI 2.5 FLASH</span>
              <span>//</span>
              <span className="text-gray-300">MODALIDAD: AUDIO PCM LITTLE-ENDIAN</span>
            </div>
            <div>
              <span>ACCESSIBILITY WCAG AAA COMPLIANT</span>
            </div>
          </div>
        </div>

        {/* HARDWARE HUD SIDEBAR: GLOSSARY, TAKEAWAYS, Q&A, EXPORT (4 COLS) */}
        {!isFocusMode && (
          <div className="lg:col-span-4 bg-[#080a0f] border-2 border-[#1c2333] rounded shadow-2xl flex flex-col h-[565px] overflow-hidden">
            
            {/* Hardware Module Switcher Tabs */}
            <div className="grid grid-cols-4 bg-[#0d1017] border-b border-[#181d2a] p-1 gap-1">
              <button
                onClick={() => setActiveSidebarTab('glossary')}
                className={`py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center gap-0.5 ${
                  activeSidebarTab === 'glossary'
                    ? 'hardware-btn-active text-[#00f5ff]'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>GLOSARIO</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('takeaways')}
                className={`py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center gap-0.5 ${
                  activeSidebarTab === 'takeaways'
                    ? 'hardware-btn-active text-[#00ff66]'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>PUNTOS</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('qa')}
                className={`py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center gap-0.5 ${
                  activeSidebarTab === 'qa'
                    ? 'hardware-btn-active text-[#ffb800]'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Q&A</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('export')}
                className={`py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center gap-0.5 ${
                  activeSidebarTab === 'export'
                    ? 'hardware-btn-active text-white'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-mono text-xs">
              
              {/* TAB 1: TECHNICAL GLOSSARY HUD */}
              {activeSidebarTab === 'glossary' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">
                      TÉRMINOS DETECTADOS ({allDetectedTerms.length})
                    </span>
                    <span className="text-[9px] text-[#00f5ff]">SPANGLISH RADAR</span>
                  </div>

                  {selectedTerm && (
                    <div className="p-3 bg-[#0d1017] border border-[#00f5ff]/40 rounded space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#00f5ff] text-sm">{selectedTerm.term}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a2233] text-gray-300 uppercase">
                          {selectedTerm.category}
                        </span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        {selectedTerm.definition}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {allDetectedTerms.length === 0 ? (
                      <div className="text-center py-8 text-[#64748b] text-[11px]">
                        Los términos técnicos que mencione el speaker aparecerán acá con su definición instantánea.
                      </div>
                    ) : (
                      allDetectedTerms.map((t) => (
                        <div
                          key={t.term}
                          onClick={() => setSelectedTerm(t)}
                          className={`p-2 bg-[#0c0f16] border rounded cursor-pointer transition-all flex items-center justify-between ${
                            selectedTerm?.term === t.term ? 'border-[#00f5ff] bg-[#121722]' : 'border-[#1b2230] hover:border-[#2b364c]'
                          }`}
                        >
                          <span className="font-bold text-white">{t.term}</span>
                          <span className="text-[9px] text-[#64748b] uppercase">[{t.category}]</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE AI KEY TAKEAWAYS & GEMINI PRO BRIEFING */}
              {activeSidebarTab === 'takeaways' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                        PUNTOS CLAVE & BRIEFING EJECUTIVO
                      </span>
                      <span className="text-[9px] text-[#00f5ff] font-mono">
                        ENGINE: {intelModelUsed?.toUpperCase() || 'GEMINI 2.5 PRO'}
                      </span>
                    </div>
                    {onTriggerDeepIntel && (
                      <button
                        onClick={onTriggerDeepIntel}
                        disabled={isGeneratingIntel}
                        className="hardware-btn px-2 py-1 rounded text-[10px] font-mono font-bold text-[#00f5ff] hover:border-[#00f5ff] transition-all flex items-center gap-1 disabled:opacity-50"
                        title="Ejecutar análisis profundo con Gemini 2.5 Pro"
                      >
                        <Sparkles className={`w-3 h-3 ${isGeneratingIntel ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingIntel ? 'SINTETIZANDO...' : 'RE-ANALIZAR (PRO)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Executive Summary Card if available */}
                  {executiveSummary && (
                    <div className="p-3 bg-[#0a101d] border border-[#00f5ff]/30 rounded space-y-1.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-[#00f5ff] uppercase flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          RESUMEN EJECUTIVO (GEMINI 2.5 PRO)
                        </span>
                        <span className="text-[8px] font-mono px-1 rounded bg-[#00f5ff]/20 text-[#00f5ff]">
                          DEEP REASONING
                        </span>
                      </div>
                      <p className="text-white text-xs leading-relaxed font-sans">
                        {executiveSummary}
                      </p>
                    </div>
                  )}

                  {takeaways.length === 0 ? (
                    <div className="text-center py-8 text-[#64748b] text-[11px]">
                      Gemini 2.5 Pro sintetizará los conceptos clave y arquitectura de la charla periódicamente o al presionar Re-analizar.
                    </div>
                  ) : (
                    takeaways.map((item, idx) => (
                      <div key={item.id || idx} className="p-2.5 bg-[#0c0f16] border border-[#1b2230] rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#00ff66] font-bold">
                            INSIGHT #{idx + 1}
                          </span>
                          <span className="text-[8px] font-mono text-[#64748b] uppercase">
                            [{item.category || 'TECH'}]
                          </span>
                        </div>
                        <div className="text-white text-[11px] leading-relaxed">
                          {item.bullet}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SUGGESTED Q&A QUESTIONS */}
              {activeSidebarTab === 'qa' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">
                      PREGUNTAS SUGERIDAS (Q&A)
                    </span>
                    <span className="text-[9px] text-[#ffb800]">PARA EL FINAL</span>
                  </div>

                  {suggestedQuestions.length === 0 ? (
                    <div className="text-center py-8 text-[#64748b] text-[11px]">
                      Preguntas técnicas inteligentes sugeridas por la IA para hacerle al orador.
                    </div>
                  ) : (
                    suggestedQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="p-2.5 bg-[#0c0f16] border border-[#1b2230] rounded space-y-1">
                        <div className="text-[9px] text-[#ffb800] font-bold">
                          PREGUNTA #{idx + 1}
                        </div>
                        <div className="text-white text-[11px] leading-relaxed font-semibold">
                          {q.question}
                        </div>
                        {q.context && (
                          <div className="text-[9px] text-[#64748b]">
                            Contexto: {q.context}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: EXPORT / RECORDING DOWNLOAD */}
              {activeSidebarTab === 'export' && (
                <div className="space-y-3">
                  <div className="border-b border-[#1b2230] pb-2">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">
                      DESCARGAR SUBTÍTULOS Y TRANSCRIPCIÓN
                    </span>
                    <p className="text-[10px] text-[#64748b]">
                      Formatos estándar de video y documentación listos para producción
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={getExportUrl(selectedStageId, 'srt', selectedLang)}
                      download
                      className="p-3 bg-[#0d1017] border border-[#1b2230] hover:border-[#00f5ff] rounded flex flex-col items-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00f5ff] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">SUBTÍTULOS .SRT</span>
                      <span className="text-[9px] font-mono text-gray-500">Para YouTube / Premiere</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'vtt', selectedLang)}
                      download
                      className="p-3 bg-[#0d1017] border border-[#1b2230] hover:border-[#00f5ff] rounded flex flex-col items-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00f5ff] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">WEB .VTT</span>
                      <span className="text-[9px] font-mono text-gray-500">Para HTML5 Video Player</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'md', selectedLang)}
                      download
                      className="p-3 bg-[#0d1017] border border-[#1b2230] hover:border-[#00ff88] rounded flex flex-col items-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">RESUMEN .MD</span>
                      <span className="text-[9px] font-mono text-gray-500">Notas para GitHub / Blog</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'txt', selectedLang)}
                      download
                      className="p-3 bg-[#0d1017] border border-[#1b2230] hover:border-[#00ff88] rounded flex flex-col items-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">TEXTO .TXT</span>
                      <span className="text-[9px] font-mono text-gray-500">Transcripción completa</span>
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
