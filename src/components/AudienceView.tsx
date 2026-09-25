import React, { useState, useEffect, useRef } from 'react';
import { 
  Stage, 
  SubtitleChunk, 
  StageTakeaway, 
  StageQA, 
  SupportedLanguage, 
  TechTerm,
  AudienceQuestion 
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
  Cpu,
  ThumbsUp,
  Send,
  Pin,
  MessageSquare,
  Mic
} from 'lucide-react';
import { getExportUrl } from '../services/api.js';
import { RackUnit, HexScrew } from './HardwareControls.js';
import { normalizePhoneticTechTerms } from '../utils/broadcastSegmenter.js';
import { ttsService } from '../services/ttsService.js';
import { WSClient } from '../services/websocket.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

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
  onOpenMobileMic?: () => void;
  executiveSummary?: string;
  intelModelUsed?: string;
  onTriggerDeepIntel?: () => void;
  isGeneratingIntel?: boolean;
  interimText?: string;
  wsClient?: WSClient | null;
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
  onOpenMobileMic,
  executiveSummary,
  intelModelUsed,
  onTriggerDeepIntel,
  isGeneratingIntel,
  interimText,
  wsClient,
}) => {
  const isMobile = useIsMobile(1024);
  const [mobileActiveTab, setMobileActiveTab] = useState<'prompter' | 'qa' | 'glossary' | 'takeaways'>('prompter');
  const [autoScroll, setAutoScroll] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'cinema'>('large');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'glossary' | 'takeaways' | 'qa' | 'export'>('glossary');
  const [selectedTerm, setSelectedTerm] = useState<TechTerm | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Accessible TTS (Voice for the Blind) State
  const [ttsState, setTtsState] = useState<{ enabled: boolean; isSpeaking: boolean; currentText: string }>({
    enabled: ttsService.isEnabled(),
    isSpeaking: false,
    currentText: ''
  });

  // Audience Q&A State
  const [audienceQuestions, setAudienceQuestions] = useState<AudienceQuestion[]>([]);
  const [pinnedQuestion, setPinnedQuestion] = useState<AudienceQuestion | null>(null);
  const [newQuestionAuthor, setNewQuestionAuthor] = useState<string>(() => {
    try {
      return localStorage.getItem('nerdsub_user_alias') || '';
    } catch (e) {
      return '';
    }
  });
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [isSubmittingQ, setIsSubmittingQ] = useState<boolean>(false);
  const [votedQuestionIds, setVotedQuestionIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nerdsub_voted_questions');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Subscribe to TTS changes
  useEffect(() => {
    const unsub = ttsService.subscribe(setTtsState);
    return unsub;
  }, []);

  // Fetch Audience Questions on Stage Change
  const fetchQuestions = React.useCallback(() => {
    fetch(`/api/stages/${selectedStageId}/questions`)
      .then(res => res.json())
      .then(data => {
        if (data.questions) setAudienceQuestions(data.questions);
        if (data.onStage) setPinnedQuestion(data.onStage);
        else setPinnedQuestion(null);
      })
      .catch(err => console.warn('[QA] Fetch error:', err));
  }, [selectedStageId]);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 8000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  const fallbackStage: Stage = {
    id: selectedStageId || 'stage-1',
    name: 'Escenario Principal',
    speaker: 'Conferencia en vivo',
    talkTitle: 'Nerdearla 2026 • Live Subtitles & Intelligence',
    description: 'Subtitulado oficial y traducción simultánea para conferencias técnicas.',
    track: 'Main Stage',
    isLive: true,
    currentAudioSource: 'mic',
    audienceCount: 1,
    detectedLang: 'es',
    latencyMs: 140,
    audioLevel: 0
  };
  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0] || fallbackStage;
  const subtitlesContainerRef = useRef<HTMLDivElement>(null);

  // Screen WakeLock: prevents attendee phone screen from sleeping while reading subtitles
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {}
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

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
    return normalizePhoneticTechTerms(raw);
  };

  // Automatic Speech Synthesis for Incoming Captions (TTS Accessibility)
  const lastSpokenChunkIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ttsState.enabled || chunks.length === 0) return;
    const latest = chunks[chunks.length - 1];
    if (latest && latest.id !== lastSpokenChunkIdRef.current) {
      lastSpokenChunkIdRef.current = latest.id;
      const textToSpeak = getDisplayText(latest);
      if (textToSpeak) {
        ttsService.speak(textToSpeak, selectedLang);
      }
    }
  }, [chunks, ttsState.enabled, selectedLang]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || isSubmittingQ) return;
    setIsSubmittingQ(true);
    try {
      const author = newQuestionAuthor.trim() || 'Asistente';
      try {
        localStorage.setItem('nerdsub_user_alias', author);
      } catch (err) {}

      if (wsClient) {
        wsClient.sendQASubmit(selectedStageId, author, newQuestionText.trim());
      } else {
        await fetch(`/api/stages/${selectedStageId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, text: newQuestionText.trim() })
        });
      }
      setNewQuestionText('');
      setTimeout(fetchQuestions, 400);
    } catch (err) {
      console.error('[QA] Error submitting question:', err);
    } finally {
      setIsSubmittingQ(false);
    }
  };

  const handleVoteQuestion = async (qId: string) => {
    if (votedQuestionIds.has(qId)) return;
    const nextSet = new Set(votedQuestionIds);
    nextSet.add(qId);
    setVotedQuestionIds(nextSet);
    try {
      localStorage.setItem('nerdsub_voted_questions', JSON.stringify(Array.from(nextSet)));
    } catch (err) {}

    // Optimistic UI update
    setAudienceQuestions(prev => prev.map(q => q.id === qId ? { ...q, votes: q.votes + 1 } : q));
    if (pinnedQuestion && pinnedQuestion.id === qId) {
      setPinnedQuestion({ ...pinnedQuestion, votes: pinnedQuestion.votes + 1 });
    }

    try {
      if (wsClient) {
        wsClient.sendQAVote(selectedStageId, qId);
      } else {
        await fetch(`/api/stages/${selectedStageId}/questions/${qId}/vote`, { method: 'POST' });
      }
    } catch (err) {
      console.error('[QA] Vote error:', err);
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
              if (isMobile) setMobileActiveTab('glossary');
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
      
      {/* MOBILE CONTROL HUD (< 1024px) */}
      {isMobile && !isFocusMode && (
        <div className="space-y-2.5">
          {/* Mobile Stage Selector Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {stages.map((stage, idx) => {
              const isSelected = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  onClick={() => onSelectStage(stage.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-[#121c2d] border-[#00f5ff] text-white shadow-[0_0_8px_rgba(0,245,255,0.3)]'
                      : 'bg-[#0d1017] border-[#1e2535] text-gray-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                  <span>0{idx + 1} {stage.name.replace(/Escenario\s*/i, '')}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Language Switcher Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'es', label: 'Español', flag: '🇦🇷' },
              { id: 'en', label: 'English', flag: '🇬🇧' },
              { id: 'pt', label: 'Português', flag: '🇧🇷' },
              { id: 'original', label: 'Original', flag: '🎙️' },
            ].map((lang) => {
              const isSelected = selectedLang === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center gap-1 border transition-all ${
                    isSelected
                      ? 'bg-[#121c2d] border-[#00f5ff] text-white shadow-[0_0_8px_rgba(0,245,255,0.3)]'
                      : 'bg-[#0d1017] border-[#1e2535] text-gray-400'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 border transition-all ${
                showOriginal
                  ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff]'
                  : 'bg-[#0d1017] border-[#1e2535] text-gray-400'
              }`}
            >
              DUAL {showOriginal ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Compact Speaker / Talk Card */}
          {currentStage && (
            <div className="bg-[#0b0e14] border border-[#1b2230] rounded-xl px-3 py-2 flex items-center justify-between text-xs font-mono">
              <div className="truncate mr-2">
                <span className="text-[#00f5ff] font-bold">{currentStage.speaker}: </span>
                <span className="text-gray-200">{currentStage.talkTitle}</span>
              </div>
              <span className="text-[10px] text-[#00ff66] font-bold shrink-0">{currentStage.latencyMs}ms</span>
            </div>
          )}

          {/* Mobile Segmented Module Switcher */}
          <div className="grid grid-cols-4 bg-[#0d1017] p-1 rounded-xl border border-[#1e2535] gap-1 text-xs font-mono font-bold">
            <button
              onClick={() => setMobileActiveTab('prompter')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileActiveTab === 'prompter'
                  ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>💬</span>
              <span>Subtítulos</span>
            </button>

            <button
              onClick={() => {
                setMobileActiveTab('qa');
                setActiveSidebarTab('qa');
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileActiveTab === 'qa'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>❓</span>
              <span>Q&A ({audienceQuestions.length})</span>
            </button>

            <button
              onClick={() => {
                setMobileActiveTab('glossary');
                setActiveSidebarTab('glossary');
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileActiveTab === 'glossary'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📖</span>
              <span>Glosario ({allDetectedTerms.length})</span>
            </button>

            <button
              onClick={() => {
                setMobileActiveTab('takeaways');
                setActiveSidebarTab('takeaways');
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                mobileActiveTab === 'takeaways'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>💡</span>
              <span>Claves</span>
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP UNIFIED STAGE & TRANSLATION HUD (>= 1024px) */}
      {!isMobile && currentStage && !isFocusMode && (
        <div className="bg-[#0b0e17]/90 backdrop-blur-md border border-[#1e2538] rounded-xl p-3 shadow-xl flex items-center justify-between gap-4">
          {/* Left: Active Talk & Stage Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Live Indicator Lamp */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/60 border border-red-500/40 text-red-400 font-mono text-[10px] font-bold shrink-0 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>VIVO</span>
            </div>

            {/* Stage Selector Pills */}
            <div className="flex items-center gap-1 shrink-0 bg-[#07090e] p-1 rounded-lg border border-[#1a202c]">
              {stages.map((st, idx) => {
                const isSelected = st.id === selectedStageId;
                return (
                  <button
                    key={st.id}
                    onClick={() => onSelectStage(st.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-[#121c2d] border border-[#00f5ff] text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    0{idx + 1} {st.name.replace(/Escenario\s*/i, '').replace(/Sala\s*/i, '')}
                  </button>
                );
              })}
            </div>

            {/* Talk Title & Speaker */}
            <div className="min-w-0 truncate hidden md:block">
              <div className="text-xs font-mono text-[#00f5ff] font-bold truncate">
                {currentStage.speaker}
              </div>
              <div className="text-sm font-bold text-white truncate max-w-md lg:max-w-xl">
                {currentStage.talkTitle}
              </div>
            </div>
          </div>

          {/* Right: Language Switcher & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Translation Pills */}
            <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1a202c]">
              {[
                { id: 'es', label: 'ES', flag: '🇦🇷' },
                { id: 'en', label: 'EN', flag: '🇬🇧' },
                { id: 'pt', label: 'PT', flag: '🇧🇷' },
                { id: 'original', label: 'ORIG', flag: '🎙️' },
              ].map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-[#00f5ff]/20 border border-[#00f5ff] text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all border ${
                  showOriginal
                    ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
                title="Modo Dual: original arriba y traducción abajo"
              >
                DUAL
              </button>
            </div>

            {/* Auxiliary Tools */}
            <button
              onClick={onOpenQrModal}
              className="p-2 rounded-lg bg-[#07090e] border border-[#1a202c] text-gray-300 hover:text-[#00f5ff] transition-all"
              title="QR para celular"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="p-2 rounded-lg bg-[#07090e] border border-[#1a202c] text-gray-300 hover:text-[#00f5ff] transition-all"
              title="Modo Cine Pantalla Completa"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN STUDIO LAYOUT: TELEPROMPTER & HARDWARE HUD */}
      <div className={`grid grid-cols-1 ${isFocusMode ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-4 items-start`}>
        
        {/* STUDIO TELEPROMPTER SCREEN (8 COLS or 12 in Cinema) */}
        {(!isMobile || mobileActiveTab === 'prompter') && (
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

              {/* Accessible Voice Readout (TTS for Blind / Low Vision Attendees) */}
              <button
                onClick={() => {
                  const next = ttsService.toggle();
                  if (next && chunks.length > 0) {
                    const latest = chunks[chunks.length - 1];
                    ttsService.speak(getDisplayText(latest), selectedLang);
                  }
                }}
                className={`hardware-btn px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                  ttsState.enabled
                    ? 'hardware-btn-active text-[#00ff66] border-[#00ff66] bg-[#00ff66]/15 shadow-[0_0_8px_rgba(0,255,102,0.3)] animate-pulse'
                    : 'text-[#64748b] hover:text-white'
                }`}
                title="Voz accesible: Lee los subtítulos en tiempo real para personas no videntes"
                aria-label="Activar audio descripción y lectura de subtítulos en voz alta"
                aria-pressed={ttsState.enabled}
              >
                <Volume2 className={`w-3 h-3 ${ttsState.isSpeaking ? 'text-[#00ff66] animate-bounce' : ''}`} />
                <span className="hidden sm:inline">VOZ ACCESIBLE</span>
                <span className="sm:hidden">TTS</span>
                <span className={`w-1.5 h-1.5 rounded-full ${ttsState.enabled ? 'bg-[#00ff66]' : 'bg-[#334155]'}`} />
              </button>

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

          {/* Accessible TTS Speaking Telemetry Strip */}
          {ttsState.enabled && ttsState.isSpeaking && (
            <div className="bg-[#00ff66]/10 border-b border-[#00ff66]/30 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs font-mono text-[#00ff66] animate-pulse">
              <div className="flex items-center gap-2 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0 animate-ping" />
                <span className="font-bold shrink-0">VOZ EN VIVO:</span>
                <span className="truncate text-gray-200">"{ttsState.currentText}"</span>
              </div>
              <button 
                onClick={() => ttsService.stop()} 
                className="shrink-0 text-[10px] text-gray-400 hover:text-white underline ml-2"
              >
                Pausar
              </button>
            </div>
          )}

          {/* Stage Pinned Question (Highlighted from Tech Booth) */}
          {pinnedQuestion && (
            <div className="bg-[#ffb800]/15 border-b-2 border-[#ffb800] p-3 sm:p-4 flex items-start gap-3 shadow-lg animate-in slide-in-from-top-2">
              <span className="text-xl sm:text-2xl pt-0.5">📌</span>
              <div className="flex-1 min-w-0 font-mono">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#ffb800] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffb800] animate-ping" />
                    PREGUNTA DEL PÚBLICO EN ESCENARIO
                  </span>
                  <span className="bg-[#ffb800]/20 px-2 py-0.5 rounded text-white border border-[#ffb800]/40">
                    ▲ {pinnedQuestion.votes} VOTOS
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                  "{pinnedQuestion.text}"
                </p>
                <div className="text-[10px] text-gray-400 mt-1">
                  Enviado por: <strong className="text-gray-200">{pinnedQuestion.author}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Teleprompter Display Glass with Dual Fade Mask */}
          <div
            ref={subtitlesContainerRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Subtítulos en vivo para accesibilidad"
            className={`p-4 sm:p-6 overflow-y-auto dual-fade-mask space-y-4 transition-all ${
              isFocusMode ? 'h-[75vh]' : isMobile ? 'h-[calc(100vh-290px)] min-h-[360px]' : 'h-[500px]'
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
                const prevChunk = index > 0 ? chunks[index - 1] : null;
                // Group thoughts that happened within 8 seconds of each other
                const isContinuation = prevChunk !== null && (chunk.timestamp - prevChunk.timestamp < 8000);

                return (
                  <div
                    key={chunk.id}
                    className={`transition-all duration-200 pl-3 py-1 ${
                      isLatest
                        ? 'border-l-2 border-[#00f5ff] bg-[#00f5ff]/5 rounded-r mt-2'
                        : isContinuation
                        ? 'border-l-2 border-transparent mt-1'
                        : 'border-l-2 border-[#1b2230] opacity-85 hover:opacity-100 mt-3 pt-1.5'
                    }`}
                  >
                    {/* Timestamp & Speaker Tag (Only shown at start of a new speech block) */}
                    {!isContinuation && (
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
                    )}

                    {/* Main Rendered Text with Spanglish Glossary Highlights */}
                    <div className={`${getFontSizeClass()} text-white font-sans tracking-wide leading-relaxed`}>
                      {renderTextWithGlossaryHighlights(displayText, chunk.techTerms || [])}
                    </div>

                    {/* Dual View: Display original speech alongside translation */}
                    {showOriginal && selectedLang !== 'original' && chunk.originalText && (
                      <div className="mt-1 pt-1 border-t border-[#1b2230]/40 flex items-baseline gap-2 text-xs font-mono text-[#94a3b8] italic">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#161d2a] text-[#38bdf8] font-bold not-italic shrink-0 border border-[#243046]">
                          SRC ({chunk.sourceLang.toUpperCase()})
                        </span>
                        <span className="leading-snug">{normalizePhoneticTechTerms(chunk.originalText)}</span>
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
              <span className="text-[#00ff66] font-bold">● ENGINE: GEMINI 3.5 TRANSCRIBE LIVE</span>
              <span>//</span>
              <span className="text-gray-300">MODALIDAD: AUDIO PCM LITTLE-ENDIAN</span>
            </div>
            <div>
              <span>ACCESSIBILITY WCAG AAA COMPLIANT</span>
            </div>
          </div>
        </div>
      )}

        {/* HARDWARE HUD SIDEBAR: GLOSSARY, TAKEAWAYS, Q&A, EXPORT (4 COLS) */}
        {!isFocusMode && (!isMobile || mobileActiveTab !== 'prompter') && (
          <div className={`lg:col-span-4 bg-[#080a0f] border-2 border-[#1c2333] rounded shadow-2xl flex flex-col ${isMobile ? 'h-[calc(100vh-290px)] min-h-[360px]' : 'h-[565px]'} overflow-hidden`}>
            
            {/* Hardware Module Switcher Tabs */}
            <div className="grid grid-cols-4 bg-[#0d1017] border-b border-[#181d2a] p-1 gap-1">
              <button
                onClick={() => {
                  setActiveSidebarTab('glossary');
                  if (isMobile) setMobileActiveTab('glossary');
                }}
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
                onClick={() => {
                  setActiveSidebarTab('takeaways');
                  if (isMobile) setMobileActiveTab('takeaways');
                }}
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
                onClick={() => {
                  setActiveSidebarTab('qa');
                  if (isMobile) setMobileActiveTab('qa');
                }}
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
                        ENGINE: {intelModelUsed?.toUpperCase() || 'GEMINI 3.5 PRO'}
                      </span>
                    </div>
                    {onTriggerDeepIntel && (
                      <button
                        onClick={onTriggerDeepIntel}
                        disabled={isGeneratingIntel}
                        className="hardware-btn px-2 py-1 rounded text-[10px] font-mono font-bold text-[#00f5ff] hover:border-[#00f5ff] transition-all flex items-center gap-1 disabled:opacity-50"
                        title="Ejecutar análisis profundo con Gemini 3.5 Pro"
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
                          RESUMEN EJECUTIVO (GEMINI 3.5 PRO)
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
                      Gemini 3.5 Pro sintetizará los conceptos clave y arquitectura de la charla periódicamente o al presionar Re-analizar.
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

              {/* TAB 3: LIVE AUDIENCE Q&A & UPVOTING */}
              {activeSidebarTab === 'qa' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                        PREGUNTAS DEL PÚBLICO (Q&A)
                      </span>
                      <span className="text-[9px] text-[#ffb800]">
                        {audienceQuestions.length} ENVIADAS • VOTACIÓN EN VIVO
                      </span>
                    </div>
                    <button
                      onClick={fetchQuestions}
                      className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 font-mono"
                      title="Refrescar preguntas"
                    >
                      <span>↻</span>
                      <span>ACTUALIZAR</span>
                    </button>
                  </div>

                  {/* Ask Question Form */}
                  <form onSubmit={handleSubmitQuestion} className="bg-[#0b0e14] border border-[#1b2230] rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newQuestionAuthor}
                        onChange={(e) => setNewQuestionAuthor(e.target.value)}
                        placeholder="Tu nombre o handle (opcional)..."
                        className="w-full bg-[#07090e] border border-[#1b2230] rounded px-2 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00f5ff]"
                      />
                    </div>
                    <textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Escribe tu pregunta técnica para el orador..."
                      rows={2}
                      className="w-full bg-[#07090e] border border-[#1b2230] rounded p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00f5ff] resize-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-gray-500">
                        Las más votadas suben al teleprompter del speaker
                      </span>
                      <button
                        type="submit"
                        disabled={!newQuestionText.trim() || isSubmittingQ}
                        className="hardware-btn px-3 py-1 rounded text-[10px] font-mono font-bold text-[#00f5ff] hover:text-black hover:bg-[#00f5ff] flex items-center gap-1 disabled:opacity-40 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSubmittingQ ? 'ENVIANDO...' : 'ENVIAR PREGUNTA'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Questions Feed */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {audienceQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-[11px] space-y-1">
                        <MessageSquare className="w-6 h-6 mx-auto text-gray-600 opacity-60" />
                        <p>No hay preguntas todavía. ¡Sé el primero en preguntar al speaker!</p>
                      </div>
                    ) : (
                      audienceQuestions.map((q) => {
                        const hasVoted = votedQuestionIds.has(q.id);
                        const isOnStage = q.status === 'on_stage';

                        return (
                          <div
                            key={q.id}
                            className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                              isOnStage
                                ? 'bg-[#ffb800]/15 border-[#ffb800] shadow-md shadow-[#ffb800]/10'
                                : 'bg-[#0c0f16] border-[#1b2230] hover:border-[#2b364c]'
                            }`}
                          >
                            {/* Upvote Button */}
                            <button
                              onClick={() => handleVoteQuestion(q.id)}
                              disabled={hasVoted}
                              className={`shrink-0 flex flex-col items-center justify-center w-9 py-1 rounded border text-xs font-mono font-bold transition-all ${
                                hasVoted
                                  ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff]'
                                  : 'bg-[#07090e] border-[#1e2535] text-gray-400 hover:border-[#00f5ff] hover:text-white'
                              }`}
                              title={hasVoted ? 'Ya votaste esta pregunta' : 'Votar esta pregunta'}
                            >
                              <span className="text-[10px] leading-none">▲</span>
                              <span className="text-[11px] leading-tight mt-0.5">{q.votes}</span>
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-bold text-gray-300 truncate">
                                  {q.author}
                                </span>
                                {isOnStage && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#ffb800] text-black shrink-0">
                                    EN PANTALLA
                                  </span>
                                )}
                              </div>
                              <p className="text-white text-[11px] leading-relaxed font-sans">
                                {q.text}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* AI Suggested Questions Accordion */}
                  {suggestedQuestions.length > 0 && (
                    <div className="pt-2 border-t border-[#1b2230]">
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide block mb-1.5">
                        SUGERIDAS POR GEMINI ({suggestedQuestions.length})
                      </span>
                      <div className="space-y-1.5">
                        {suggestedQuestions.slice(0, 3).map((q, idx) => (
                          <div
                            key={q.id || idx}
                            onClick={() => setNewQuestionText(q.question)}
                            className="p-2 bg-[#080a0f] border border-[#171b26] hover:border-[#00f5ff]/40 rounded cursor-pointer transition-all text-[11px] text-gray-300 hover:text-white"
                            title="Hacer clic para copiar al campo de pregunta"
                          >
                            <span className="text-[#ffb800] text-[9px] font-bold mr-1">✦</span>
                            {q.question}
                          </div>
                        ))}
                      </div>
                    </div>
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
