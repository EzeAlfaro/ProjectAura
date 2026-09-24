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
  QrCode
} from 'lucide-react';
import { getExportUrl } from '../services/api.js';

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
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'cinema'>('large');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'glossary' | 'takeaways' | 'qa' | 'export'>('glossary');
  const [selectedTerm, setSelectedTerm] = useState<TechTerm | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

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
            className="cursor-pointer inline-flex items-baseline mx-1 px-1.5 py-0.5 rounded bg-[#00f5ff]/10 text-[#00f5ff] border-b border-[#00f5ff]/60 hover:bg-[#00f5ff]/20 hover:border-[#00f5ff] transition-all font-mono font-medium text-[0.9em]"
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
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 transition-all ${isFocusMode ? 'fixed inset-0 z-50 bg-[#07080c] max-w-none p-6 sm:p-10' : ''}`}>
      
      {/* CHANNEL SELECTOR RACK (Matrix Switcher) */}
      {!isFocusMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0f17] border border-[#1c2130] p-3 rounded-2xl">
          
          {/* Stage Channel Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full lg:w-auto">
            <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider pl-1 hidden sm:inline">
              CHANNELS:
            </span>
            {stages.map((stage, idx) => {
              const isSelected = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  onClick={() => onSelectStage(stage.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-mono transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#181d2a] border border-[#00f5ff] text-white shadow-md shadow-[#00f5ff]/15'
                      : 'bg-[#11131a] border border-[#222636] text-[#64748b] hover:text-gray-200 hover:border-[#333a4f]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      stage.isLive ? 'bg-[#ff5500] animate-pulse shadow-[0_0_6px_#ff5500]' : 'bg-[#334155]'
                    }`}
                  />
                  <div className="text-left">
                    <div className="font-bold flex items-center gap-1.5 text-white">
                      <span className="text-[10px] text-[#00f5ff]">0{idx + 1}</span>
                      <span>{stage.name}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Matrix Language Switcher */}
          <div className="flex items-center gap-1.5 bg-[#11131a] p-1.5 rounded-xl border border-[#222636]">
            {[
              { id: 'original', code: 'ORIGINAL', flag: '🎙️' },
              { id: 'es', code: 'ES', flag: '🇦🇷' },
              { id: 'en', code: 'EN', flag: '🇺🇸' },
              { id: 'pt', code: 'PT', flag: '🇧🇷' },
            ].map((lang) => {
              const isSelected = selectedLang === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#00f5ff] text-[#07080c] shadow-sm font-bold'
                      : 'text-[#64748b] hover:text-white hover:bg-[#181d2a]'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.code}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons: Focus mode & QR Code */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQrModal}
              className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white"
              title="Abrir en celular o proyectar en pantalla de sala"
            >
              <QrCode className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span className="hidden sm:inline">QR_LINK</span>
            </button>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-[#00f5ff]"
              title="Modo cine sin distracciones"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">FULL_SCREEN</span>
            </button>
          </div>

        </div>
      )}

      {/* Stage Live Status Telemetry Bar */}
      {currentStage && !isFocusMode && (
        <div className="bg-[#0d0f17] border border-[#1c2130] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#ff5500]/15 text-[#ff5500] text-[10px] font-mono font-bold tracking-wider uppercase border border-[#ff5500]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] animate-ping" />
                ON_AIR // {currentStage.track}
              </span>
              <span className="text-xs font-mono text-[#64748b]">
                SPEAKER: <strong className="text-gray-200">{currentStage.speaker}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentStage.talkTitle}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#64748b] shrink-0 border-t md:border-t-0 md:border-l border-[#1c2130] pt-3 md:pt-0 md:pl-5">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">AUDIENCIA</div>
              <div className="text-white font-bold">{currentStage.audienceCount} CONECTADOS</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">LATENCIA</div>
              <div className="text-[#00ff88] font-bold">{currentStage.latencyMs || 340} ms</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#475569]">AUDIO VU</div>
              <div className="text-[#00f5ff] font-bold flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                {currentStage.audioLevel}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONSOLE GRID */}
      <div className={`grid grid-cols-1 ${isFocusMode ? '' : 'lg:grid-cols-12'} gap-5 items-start`}>
        
        {/* TELEPROMPTER / SUBTITLES CONTAINER */}
        <div className={`${isFocusMode ? 'w-full h-[90vh]' : 'lg:col-span-8 h-[640px]'} bg-[#0a0c13] border border-[#1c2130] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden`}>
          
          {/* Teleprompter Top Controller */}
          <div className="p-3 border-b border-[#1c2130] bg-[#0d0f17] flex items-center justify-between text-xs font-mono text-[#64748b]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]" />
              <span className="text-white font-bold tracking-tight">TELEPROMPTER_STREAM</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#141722] text-[#64748b]">
                {chunks.length} BLOCKS
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Typeface Size Toggle */}
              <div className="flex items-center bg-[#141722] rounded-lg p-0.5 border border-[#222636]">
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded ${fontSize === 'normal' ? 'bg-[#00f5ff] text-black font-bold' : 'text-[#64748b]'}`}
                >
                  A1
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded ${fontSize === 'large' ? 'bg-[#00f5ff] text-black font-bold' : 'text-[#64748b]'}`}
                >
                  A2
                </button>
                <button
                  onClick={() => setFontSize('cinema')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded ${fontSize === 'cinema' ? 'bg-[#00f5ff] text-black font-bold' : 'text-[#64748b]'}`}
                >
                  MAX
                </button>
              </div>

              {/* Auto Scroll Toggle */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors ${
                  autoScroll
                    ? 'bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30'
                    : 'bg-[#141722] text-[#64748b] border border-[#222636]'
                }`}
              >
                <ArrowDownCircle className="w-3 h-3" />
                <span>{autoScroll ? 'AUTO_SCROLL' : 'PAUSED'}</span>
              </button>

              {/* Focus mode exit button if in focus mode */}
              {isFocusMode && (
                <button
                  onClick={() => setIsFocusMode(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#ff1744]/15 text-[#ff1744] border border-[#ff1744]/40"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>SALIR_FOCUS</span>
                </button>
              )}
            </div>
          </div>

          {/* Subtitles Scrollable Area with Soft Edge Fade */}
          <div
            ref={subtitlesContainerRef}
            className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 dual-fade-mask"
          >
            {chunks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#64748b] p-6 space-y-3 font-mono">
                <Activity className="w-10 h-10 text-[#1c2130] animate-pulse" />
                <p className="text-xs tracking-wider uppercase">[ SINTONIZANDO ENLACE DE AUDIO CON GEMINI 2.5 ]</p>
                <p className="text-[11px] text-[#475569] max-w-sm">
                  Iniciá la prueba de audio desde el panel de control o seleccioná una sala activa.
                </p>
              </div>
            ) : (
              chunks.map((chunk, index) => {
                const isLatest = index === chunks.length - 1;
                const displayText = getDisplayText(chunk);

                return (
                  <div
                    key={chunk.id}
                    className={`transition-all ${
                      isLatest
                        ? 'opacity-100 transform translate-y-0'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748b] mb-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(chunk.timestamp).toLocaleTimeString()}</span>
                      <span>//</span>
                      <span className="uppercase text-[#00f5ff]">
                        {chunk.sourceLang} → {selectedLang.toUpperCase()}
                      </span>
                      {isLatest && (
                        <span className="flex items-center gap-1 text-[#ff5500] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] animate-ping" />
                          LIVE_STREAM
                        </span>
                      )}
                    </div>

                    <p className={`text-white font-sans ${getFontSizeClass()} ${isLatest ? 'text-shadow-sm font-medium' : 'text-gray-300'}`}>
                      {renderTextWithGlossaryHighlights(displayText, chunk.techTerms || [])}
                      {isLatest && <span className="inline-block w-2.5 h-5 ml-1 bg-[#00f5ff] animate-pulse" />}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SIDEBAR INTELLIGENCE RACK (Glossary, Takeaways, QA, Export) */}
        {!isFocusMode && (
          <div className="lg:col-span-4 bg-[#0a0c13] border border-[#1c2130] rounded-2xl flex flex-col h-[640px] shadow-2xl overflow-hidden">
            
            {/* Modular Sidebar Switcher Tabs */}
            <div className="grid grid-cols-4 p-1.5 bg-[#0d0f17] border-b border-[#1c2130] text-[10px] font-mono gap-1">
              <button
                onClick={() => setActiveSidebarTab('glossary')}
                className={`py-2 px-1 rounded-lg text-center font-bold transition-all ${
                  activeSidebarTab === 'glossary'
                    ? 'bg-[#181d2a] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                GLOSARIO
                {allDetectedTerms.length > 0 && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#00f5ff]">
                    {allDetectedTerms.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSidebarTab('takeaways')}
                className={`py-2 px-1 rounded-lg text-center font-bold transition-all ${
                  activeSidebarTab === 'takeaways'
                    ? 'bg-[#181d2a] text-[#8b5cf6] border border-[#8b5cf6]/40 shadow-sm'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                INSIGHTS
              </button>

              <button
                onClick={() => setActiveSidebarTab('qa')}
                className={`py-2 px-1 rounded-lg text-center font-bold transition-all ${
                  activeSidebarTab === 'qa'
                    ? 'bg-[#181d2a] text-[#ff1744] border border-[#ff1744]/40 shadow-sm'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                Q&A
              </button>

              <button
                onClick={() => setActiveSidebarTab('export')}
                className={`py-2 px-1 rounded-lg text-center font-bold transition-all ${
                  activeSidebarTab === 'export'
                    ? 'bg-[#181d2a] text-[#00ff88] border border-[#00ff88]/40 shadow-sm'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                EXPORT
              </button>
            </div>

            {/* Sidebar Content Display */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans bottom-fade-mask">
              
              {/* TAB 1: NERD-GLOSARIO */}
              {activeSidebarTab === 'glossary' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-[#64748b] bg-[#07080c] p-2.5 rounded-xl border border-[#1c2130]">
                    💡 <strong>NERD_GLOSSARY:</strong> Detección en vivo de términos DevOps, Cloud y arquitecturas complejas.
                  </div>

                  {selectedTerm && (
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-[#00f5ff] animate-fade-in relative">
                      <button
                        onClick={() => setSelectedTerm(null)}
                        className="absolute top-2 right-2 text-xs font-mono text-gray-400 hover:text-white"
                      >
                        [✕]
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#00f5ff] text-black">
                          {selectedTerm.category}
                        </span>
                        <h4 className="text-sm font-bold text-white">{selectedTerm.term}</h4>
                      </div>
                      <p className="text-xs text-gray-200 mt-2 leading-relaxed">
                        {selectedTerm.definition}
                      </p>
                    </div>
                  )}

                  {allDetectedTerms.length === 0 ? (
                    <div className="text-center py-12 text-[#64748b] text-xs font-mono">
                      [ SIN TÉRMINOS DETECTADOS AÚN ]
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allDetectedTerms.map((term) => (
                        <div
                          key={term.term}
                          onClick={() => setSelectedTerm(term)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedTerm?.term.toLowerCase() === term.term.toLowerCase()
                              ? 'bg-[#181d2a] border-[#00f5ff]'
                              : 'bg-[#0d0f17] border-[#1c2130] hover:border-[#00f5ff]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                              <span className="text-[#00f5ff]">⟩</span>
                              {term.term}
                            </span>
                            <span className="text-[8px] font-mono uppercase px-1 rounded bg-[#141722] text-[#8b5cf6]">
                              {term.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748b] line-clamp-2 leading-snug">
                            {term.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIVE TAKEAWAYS */}
              {activeSidebarTab === 'takeaways' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-[#64748b] bg-[#07080c] p-2.5 rounded-xl border border-[#1c2130]">
                    ⚡ <strong>LIVE_TAKEAWAYS:</strong> Síntesis generada en tiempo real por Gemini 2.5.
                  </div>

                  {takeaways.length === 0 ? (
                    <div className="text-center py-12 text-[#64748b] text-xs font-mono">
                      [ SINTETIZANDO PUNTOS CLAVE... ]
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {takeaways.map((takeaway) => (
                        <div
                          key={takeaway.id}
                          className="p-3 bg-[#0d0f17] border border-[#1c2130] rounded-xl flex items-start gap-2.5"
                        >
                          <span className="text-[#8b5cf6] font-mono font-bold">⟩</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-200 leading-relaxed">{takeaway.bullet}</p>
                            <span className="text-[9px] font-mono text-[#475569] uppercase mt-1 inline-block">
                              {takeaway.category} • {new Date(takeaway.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SMART Q&A */}
              {activeSidebarTab === 'qa' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-[#64748b] bg-[#07080c] p-2.5 rounded-xl border border-[#1c2130]">
                    ❓ <strong>AUDIENCE_QA:</strong> Preguntas técnicas para el cierre de la charla.
                  </div>

                  {suggestedQuestions.length === 0 ? (
                    <div className="text-center py-12 text-[#64748b] text-xs font-mono">
                      [ FORMULANDO PREGUNTAS TÉCNICAS... ]
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {suggestedQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 bg-[#0d0f17] border border-[#ff1744]/30 rounded-xl space-y-1"
                        >
                          <p className="text-xs font-semibold text-white leading-snug">
                            {q.question}
                          </p>
                          <p className="text-[10px] font-mono text-gray-400 italic">
                            Contexto: "{q.context}..."
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: EXPORT */}
              {activeSidebarTab === 'export' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-[#64748b] bg-[#07080c] p-2.5 rounded-xl border border-[#1c2130]">
                    💾 <strong>BROADCAST_EXPORT:</strong> Descarga de subtítulos en formatos estándar.
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <a
                      href={getExportUrl(selectedStageId, 'srt', selectedLang)}
                      download
                      className="p-3 bg-[#0d0f17] border border-[#1c2130] hover:border-[#00ff88] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">SRT SUBTITLES</span>
                      <span className="text-[9px] font-mono text-gray-500">Para video edit</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'vtt', selectedLang)}
                      download
                      className="p-3 bg-[#0d0f17] border border-[#1c2130] hover:border-[#00ff88] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">WEBVTT (.vtt)</span>
                      <span className="text-[9px] font-mono text-gray-500">HTML5 player</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'md', selectedLang)}
                      download
                      className="p-3 bg-[#0d0f17] border border-[#1c2130] hover:border-[#00ff88] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">MARKDOWN</span>
                      <span className="text-[9px] font-mono text-gray-500">Con resumen</span>
                    </a>

                    <a
                      href={getExportUrl(selectedStageId, 'txt', selectedLang)}
                      download
                      className="p-3 bg-[#0d0f17] border border-[#1c2130] hover:border-[#00ff88] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <Download className="w-4 h-4 text-[#00ff88] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono font-bold text-white">TEXTO PLANO</span>
                      <span className="text-[9px] font-mono text-gray-500">Simple txt</span>
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
