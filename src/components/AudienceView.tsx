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
  Layers, 
  ArrowDownCircle, 
  Clock, 
  Languages, 
  Type, 
  ExternalLink,
  Tag
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
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'glossary' | 'takeaways' | 'qa' | 'export'>('glossary');
  const [selectedTerm, setSelectedTerm] = useState<TechTerm | null>(null);

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
      case 'large':
        return 'text-lg md:text-xl leading-relaxed';
      case 'xlarge':
        return 'text-xl md:text-2xl leading-loose font-medium';
      case 'normal':
      default:
        return 'text-base md:text-lg leading-relaxed';
    }
  };

  const renderTextWithGlossaryHighlights = (text: string, terms: TechTerm[]) => {
    if (!terms || terms.length === 0) return text;

    // Build regex to match terms
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
            className="cursor-pointer inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/25 transition-colors font-medium text-[0.95em]"
            title={`Click para ver definición de ${matched.term}`}
          >
            {part}
            <Tag className="w-2.5 h-2.5 ml-1 opacity-70" />
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Stage Selection Tabs */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full sm:w-auto">
          {stages.map((stage) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <button
                key={stage.id}
                onClick={() => onSelectStage(stage.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#141a29] border-[#00f0ff] text-white shadow-lg shadow-[#00f0ff]/10'
                    : 'bg-[#0f1422] border-[#2a344f] text-[#94a3b8] hover:text-white hover:border-[#3a4768]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    stage.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                  }`}
                />
                <div className="text-left">
                  <div className="font-semibold text-white">{stage.name}</div>
                  <div className="text-[10px] text-[#94a3b8] truncate max-w-[140px]">
                    {stage.speaker}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Language Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-[#141a29] p-1.5 rounded-xl border border-[#2a344f]">
          <Languages className="w-3.5 h-3.5 text-[#94a3b8] ml-2 mr-1" />
          {[
            { id: 'original', label: 'Original', flag: '🎙️' },
            { id: 'es', label: 'Español', flag: '🇦🇷' },
            { id: 'en', label: 'English', flag: '🇺🇸' },
            { id: 'pt', label: 'Português', flag: '🇧🇷' },
          ].map((lang) => {
            const isSelected = selectedLang === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#00f0ff] text-[#0c0f17] font-bold shadow-sm'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#1b2236]'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>

        {/* QR Code Attendee & Auditorium Projector Button */}
        <button
          onClick={onOpenQrModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8b5cf6]/20 to-[#00f0ff]/20 border border-[#8b5cf6]/40 hover:border-[#00f0ff] text-white text-xs font-bold transition-all shadow-sm"
          title="Abrir en celular o proyectar en pantalla de sala"
        >
          <span className="text-sm">📱</span>
          <span>QR Sala & Celular</span>
        </button>
      </div>

      {/* Current Talk Info Banner */}
      {currentStage && (
        <div className="bg-[#141a29] border border-[#2a344f] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-[#00f0ff]/10 text-[#00f0ff] text-[10px] font-mono font-bold tracking-wider uppercase border border-[#00f0ff]/30">
                {currentStage.track}
              </span>
              {currentStage.isLive && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded-md animate-pulse">
                  EN VIVO
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {currentStage.talkTitle}
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Por <strong className="text-gray-300">{currentStage.speaker}</strong> • {currentStage.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#94a3b8] shrink-0 border-t md:border-t-0 md:border-l border-[#2a344f] pt-3 md:pt-0 md:pl-5">
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Audiencia</div>
              <div className="text-white font-bold">{currentStage.audienceCount} conectados</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Latencia</div>
              <div className="text-emerald-400 font-bold">{currentStage.latencyMs || 320} ms</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Audio</div>
              <div className="flex items-center gap-1 text-white font-bold">
                <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                {currentStage.audioLevel}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Subtitles Stream (Left 7 cols) & Tech Intelligence Panel (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Real-time Subtitles Feed */}
        <div className="lg:col-span-7 bg-[#141a29] border border-[#2a344f] rounded-2xl flex flex-col h-[600px] shadow-xl overflow-hidden">
          
          {/* Subtitles Header Controls */}
          <div className="p-3.5 border-b border-[#2a344f] bg-[#0f1422] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00f0ff] animate-pulse" />
              <span className="font-semibold text-white">Transcripción y Subtítulos en Vivo</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1b2236] text-[#94a3b8]">
                {chunks.length} segmentos
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Font Size Adjuster */}
              <div className="flex items-center bg-[#1b2236] rounded-lg p-0.5 border border-[#2a344f]">
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-0.5 text-[10px] rounded ${fontSize === 'normal' ? 'bg-[#00f0ff] text-black font-bold' : 'text-gray-400'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-0.5 text-xs rounded ${fontSize === 'large' ? 'bg-[#00f0ff] text-black font-bold' : 'text-gray-400'}`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize('xlarge')}
                  className={`px-2 py-0.5 text-sm rounded ${fontSize === 'xlarge' ? 'bg-[#00f0ff] text-black font-bold' : 'text-gray-400'}`}
                >
                  A++
                </button>
              </div>

              {/* Auto Scroll Toggle */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                  autoScroll
                    ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'bg-[#1b2236] text-gray-400 border border-[#2a344f]'
                }`}
                title={autoScroll ? 'Pausar auto-scroll' : 'Reanudar auto-scroll'}
              >
                <ArrowDownCircle className="w-3 h-3" />
                <span>{autoScroll ? 'Auto-scroll ON' : 'Pausado'}</span>
              </button>
            </div>
          </div>

          {/* Subtitles Scrollable Area */}
          <div
            ref={subtitlesContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          >
            {chunks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#94a3b8] p-6 space-y-3">
                <Volume2 className="w-12 h-12 text-[#2a344f] animate-pulse" />
                <p className="text-sm">Esperando stream de audio de la sala...</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  Iniciá la prueba de audio desde el panel de control o seleccioná una sala en vivo.
                </p>
              </div>
            ) : (
              chunks.map((chunk, index) => {
                const isLatest = index === chunks.length - 1;
                const displayText = getDisplayText(chunk);

                return (
                  <div
                    key={chunk.id}
                    className={`p-3.5 rounded-xl border transition-all animate-fade-in ${
                      isLatest
                        ? 'bg-[#1b2236]/90 border-[#00f0ff]/40 shadow-md'
                        : 'bg-[#141a29]/60 border-[#2a344f]/60 hover:border-[#3a4768]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] mb-1.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(chunk.timestamp).toLocaleTimeString()}</span>
                        <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-black/40 text-gray-400">
                          {chunk.sourceLang} → {selectedLang.toUpperCase()}
                        </span>
                      </div>
                      {isLatest && (
                        <span className="text-[10px] text-[#00f0ff] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
                          ÚLTIMO SEGMENTO
                        </span>
                      )}
                    </div>

                    <p className={`text-white ${getFontSizeClass()}`}>
                      {renderTextWithGlossaryHighlights(displayText, chunk.techTerms || [])}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Technical Intelligence Sidebar */}
        <div className="lg:col-span-5 bg-[#141a29] border border-[#2a344f] rounded-2xl flex flex-col h-[600px] shadow-xl overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="flex items-center border-b border-[#2a344f] bg-[#0f1422] p-1.5">
            <button
              onClick={() => setActiveSidebarTab('glossary')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'glossary'
                  ? 'bg-[#00f0ff] text-[#0c0f17] shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>NerdGlosario</span>
              {allDetectedTerms.length > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 rounded-full bg-black/30">
                  {allDetectedTerms.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab('takeaways')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'takeaways'
                  ? 'bg-[#8b5cf6] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Takeaways</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('qa')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'qa'
                  ? 'bg-[#ff007a] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Q&A</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('export')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'export'
                  ? 'bg-[#10b981] text-[#0c0f17] shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Sidebar Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* TAB 1: NERD-GLOSARIO */}
            {activeSidebarTab === 'glossary' && (
              <div className="space-y-3">
                <div className="text-xs text-[#94a3b8] bg-[#0c0f17] p-3 rounded-xl border border-[#2a344f]">
                  <p>
                    💡 <strong>NerdGlosario AI:</strong> Detección automática en tiempo real de jerga técnica, librerías, protocolos y arquitecturas mencionadas por el speaker.
                  </p>
                </div>

                {selectedTerm && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#00f0ff]/15 to-[#8b5cf6]/15 border-2 border-[#00f0ff] animate-fade-in relative">
                    <button
                      onClick={() => setSelectedTerm(null)}
                      className="absolute top-2 right-2 text-xs text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#00f0ff] text-black">
                        {selectedTerm.category}
                      </span>
                      <h4 className="text-base font-bold text-white">{selectedTerm.term}</h4>
                    </div>
                    <p className="text-xs text-gray-200 mt-2 leading-relaxed">
                      {selectedTerm.definition}
                    </p>
                  </div>
                )}

                {allDetectedTerms.length === 0 ? (
                  <div className="text-center py-12 text-[#94a3b8] text-xs">
                    No se han detectado términos aún. A medida que el speaker mencione tecnologías, aparecerán aquí.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {allDetectedTerms.map((term) => (
                      <div
                        key={term.term}
                        onClick={() => setSelectedTerm(term)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedTerm?.term.toLowerCase() === term.term.toLowerCase()
                            ? 'bg-[#1b2236] border-[#00f0ff]'
                            : 'bg-[#0f1422] border-[#2a344f] hover:border-[#00f0ff]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-[#00f0ff] font-mono">•</span>
                            {term.term}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1b2236] text-[#a855f7] border border-[#a855f7]/30">
                            {term.category}
                          </span>
                        </div>
                        <p className="text-xs text-[#94a3b8] line-clamp-2 leading-snug">
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
                <div className="text-xs text-[#94a3b8] bg-[#0c0f17] p-3 rounded-xl border border-[#2a344f]">
                  ✨ <strong>Live Key Takeaways:</strong> Resumen dinámico y puntos clave sintetizados en vivo mientras avanza la conferencia.
                </div>

                {takeaways.length === 0 ? (
                  <div className="text-center py-12 text-[#94a3b8] text-xs">
                    Generando puntos clave de la charla...
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {takeaways.map((takeaway) => (
                      <div
                        key={takeaway.id}
                        className="p-3 bg-[#0f1422] border border-[#2a344f] rounded-xl flex items-start gap-2.5 animate-fade-in"
                      >
                        <span className="text-[#8b5cf6] font-bold text-lg leading-none mt-0.5">•</span>
                        <div className="flex-1">
                          <p className="text-xs text-white leading-relaxed">{takeaway.bullet}</p>
                          <span className="text-[9px] font-mono text-gray-500 uppercase mt-1 inline-block">
                            {takeaway.category} • {new Date(takeaway.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SMART Q&A SUGGESTER */}
            {activeSidebarTab === 'qa' && (
              <div className="space-y-3">
                <div className="text-xs text-[#94a3b8] bg-[#0c0f17] p-3 rounded-xl border border-[#2a344f]">
                  ❓ <strong>Preguntas Sugeridas:</strong> Inspiración técnica para el bloque de preguntas y respuestas al finalizar la charla.
                </div>

                {suggestedQuestions.length === 0 ? (
                  <div className="text-center py-12 text-[#94a3b8] text-xs">
                    Analizando el discurso para formular preguntas inteligentes...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 bg-[#0f1422] border border-[#ff007a]/30 rounded-xl space-y-1.5 animate-fade-in"
                      >
                        <p className="text-xs font-semibold text-white leading-snug">
                          {q.question}
                        </p>
                        <p className="text-[10px] text-gray-400 italic">
                          Basado en: "{q.context}..."
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EXPORT */}
            {activeSidebarTab === 'export' && (
              <div className="space-y-4">
                <div className="text-xs text-[#94a3b8] bg-[#0c0f17] p-3 rounded-xl border border-[#2a344f]">
                  💾 <strong>Exportación Post-Charla:</strong> Descargá la transcripción completa en formatos estándar para accesibilidad, subtítulos o documentación.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={getExportUrl(selectedStageId, 'srt', selectedLang)}
                    download
                    className="p-3 bg-[#0f1422] border border-[#2a344f] hover:border-[#10b981] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <Download className="w-5 h-5 text-[#10b981] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Subtítulos SRT</span>
                    <span className="text-[10px] text-gray-500">SubRip Subtitle format</span>
                  </a>

                  <a
                    href={getExportUrl(selectedStageId, 'vtt', selectedLang)}
                    download
                    className="p-3 bg-[#0f1422] border border-[#2a344f] hover:border-[#10b981] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <Download className="w-5 h-5 text-[#10b981] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">WebVTT (.vtt)</span>
                    <span className="text-[10px] text-gray-500">HTML5 video player</span>
                  </a>

                  <a
                    href={getExportUrl(selectedStageId, 'md', selectedLang)}
                    download
                    className="p-3 bg-[#0f1422] border border-[#2a344f] hover:border-[#10b981] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <Download className="w-5 h-5 text-[#10b981] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Markdown (.md)</span>
                    <span className="text-[10px] text-gray-500">Con takeaways y Q&A</span>
                  </a>

                  <a
                    href={getExportUrl(selectedStageId, 'txt', selectedLang)}
                    download
                    className="p-3 bg-[#0f1422] border border-[#2a344f] hover:border-[#10b981] rounded-xl flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <Download className="w-5 h-5 text-[#10b981] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Texto Plano (.txt)</span>
                    <span className="text-[10px] text-gray-500">Transcripción simple</span>
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
