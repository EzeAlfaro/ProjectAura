import React, { useState, useEffect, useRef } from 'react';
import { 
  Stage, 
  SubtitleChunk, 
  SupportedLanguage, 
  TechTerm,
  AudienceQuestion,
  EventTalk 
} from '../types.js';
import { 
  Mic, 
  Square, 
  Tv, 
  QrCode, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Activity, 
  Cpu, 
  Radio, 
  Volume2, 
  ShieldCheck, 
  AlertCircle,
  Settings,
  X,
  Layers,
  ChevronDown,
  Sliders,
  Download,
  FileText,
  Key,
  Terminal,
  Calendar,
  Palette
} from 'lucide-react';
import { HardwareVuMeter, HardwareOscilloscope } from './HardwareControls.js';
import { WSClient } from '../services/websocket.js';
import QRCode from 'qrcode';
import { findBroadcastSplitIndex, formatBroadcastSubtitle, normalizePhoneticTechTerms } from '../utils/broadcastSegmenter.js';
import { uploadAudioChunk } from '../services/api.js';


interface StageKioskViewProps {
  stage?: Stage;
  stages: Stage[];
  onSelectStage: (id: string) => void;
  chunks: SubtitleChunk[];
  selectedLang: SupportedLanguage;
  onSelectLang: (lang: SupportedLanguage) => void;
  wsClient?: WSClient | null;
  onPushLiveTranscript?: (text: string, sourceLang?: string) => void;
  onExit?: () => void;
  geminiConfigured?: boolean;
  activeEngine?: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  onOpenApiKeyModal?: () => void;
  onOpenLogModal?: () => void;
  onOpenScheduleModal?: () => void;
  onOpenThemeModal?: () => void;
}

export const StageKioskView: React.FC<StageKioskViewProps> = ({
  stage,
  stages,
  onSelectStage,
  chunks,
  selectedLang,
  onSelectLang,
  wsClient,
  onPushLiveTranscript,
  onExit,
  geminiConfigured = false,
  activeEngine = 'gemini-cloud',
  onOpenApiKeyModal,
  onOpenLogModal,
  onOpenScheduleModal,
  onOpenThemeModal,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [spokenLang, setSpokenLang] = useState<'es' | 'en'>(() => {
    return stage?.detectedLang === 'en' ? 'en' : 'es';
  });

  // Audience Q&A Pinned on Stage
  const [pinnedQuestion, setPinnedQuestion] = useState<AudienceQuestion | null>(null);

  // Live Conference Talk Schedule & Countdown
  const [scheduleInfo, setScheduleInfo] = useState<{ currentTalk?: EventTalk; remainingMinutes: number; progressPercent: number }>({
    remainingMinutes: 0,
    progressPercent: 0
  });

  useEffect(() => {
    const currentStageId = stage?.id || 'stage-1';
    const fetchKioskTelemetry = () => {
      fetch(`/api/stages/${currentStageId}/questions`)
        .then(res => res.json())
        .then(data => {
          if (data.onStage) setPinnedQuestion(data.onStage);
          else setPinnedQuestion(null);
        })
        .catch(err => console.warn('[Kiosk QA] Fetch error:', err));

      fetch(`/api/schedule/${currentStageId}/current`)
        .then(res => res.json())
        .then(data => {
          if (data) setScheduleInfo(data);
        })
        .catch(err => console.warn('[Kiosk Schedule] Fetch error:', err));
    };

    fetchKioskTelemetry();
    const timer = setInterval(fetchKioskTelemetry, 6000);
    return () => clearInterval(timer);
  }, [stage?.id]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem('nerdsub_kiosk_device_id') || '';
  });
  const [audioError, setAudioError] = useState<string | null>(null);
  const [inputSourceKind, setInputSourceKind] = useState<'mic' | 'tab'>('mic');
  const [currentDbfs, setCurrentDbfs] = useState(-60);
  const [isClipping, setIsClipping] = useState(false);
  const [liveInterimText, setLiveInterimText] = useState('');
  const [showQrCorner, setShowQrCorner] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'cinema'>('large');
  
  // Display Mode: Classic Broadcast Subtitles (1-2 lines) vs Scrolling Teleprompter
  const [displayMode, setDisplayMode] = useState<'classic' | 'prompter'>(() => {
    return (localStorage.getItem('nerdsub_kiosk_display_mode') as any) || 'classic';
  });

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [watchdogStatus, setWatchdogStatus] = useState<'healthy' | 'recovering'>('healthy');
  const [deviceChangeNotice, setDeviceChangeNotice] = useState<string | null>(null);
  const [localChunks, setLocalChunks] = useState<SubtitleChunk[]>([]);

  // Audio & Speech Recognition Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tabSliceTimerRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const prompterContainerRef = useRef<HTMLDivElement | null>(null);
  const restartTimerRef = useRef<any>(null);
  const committedCharsRef = useRef(0);
  const silenceFlushTimerRef = useRef<any>(null);
  const lastCommittedTextRef = useRef<string>('');
  const lastCommittedTimeRef = useRef<number>(0);

  // Generate Corner QR Code
  useEffect(() => {
    if (stage) {
      const shareUrl = `${window.location.origin}/?stage=${stage.id}&lang=${selectedLang}`;
      QRCode.toDataURL(shareUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrCodeDataUrl).catch(console.warn);
    }
  }, [stage?.id, selectedLang]);

  // Audio Device Enumeration and Hardware Hot-Plug listener
  useEffect(() => {
    refreshAudioDevices();

    const handleDeviceChange = async () => {
      console.log('[Audio Hot-Plug] Se detectó conexión/desconexión de dispositivo de audio');
      setDeviceChangeNotice('¡Hardware de audio actualizado (USB / Jack detectado)!');
      setTimeout(() => setDeviceChangeNotice(null), 3000);
      await refreshAudioDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      stopIngest();
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, []);

  // Listen for backend system alerts (e.g. Gemini 403 API_KEY_SERVICE_BLOCKED)
  useEffect(() => {
    if (!wsClient) return;
    const unsub = wsClient.onMessage((msg: any) => {
      if (msg.type === 'system_alert') {
        setAudioError(msg.message || 'Alerta del motor de transcripción');
      }
    });
    return unsub;
  }, [wsClient]);

  // Save display mode
  useEffect(() => {
    localStorage.setItem('nerdsub_kiosk_display_mode', displayMode);
  }, [displayMode]);

  // Save selected device
  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem('nerdsub_kiosk_device_id', selectedDeviceId);
    }
  }, [selectedDeviceId]);

  // Screen WakeLock: Keeps Kiosk screen and Mini PC awake 24/7 during conference
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
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Auto-scroll in prompter mode
  useEffect(() => {
    if (displayMode === 'prompter' && prompterContainerRef.current) {
      prompterContainerRef.current.scrollTop = prompterContainerRef.current.scrollHeight;
    }
  }, [chunks, liveInterimText, displayMode]);

  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioInputs = devices.filter((d) => d.kind === 'audioinput');

      if (audioInputs.length === 0 || audioInputs.every((d) => !d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((d) => d.kind === 'audioinput');
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }

      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        // Auto-prioritize Line-In / Jack 3.5mm / USB Audio Interface
        const preferred = audioInputs.find((d) => 
          /line|jack|realtek|usb|scarlett|rode|shure|behringer|external|mezcla/i.test(d.label)
        );
        setSelectedDeviceId(preferred ? preferred.deviceId : audioInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Device scan warning:', e);
    }
  };

  const commitPhrase = (phrase: string, lang: 'es' | 'en') => {
    const raw = phrase.trim();
    if (!raw) return;
    const clean = normalizePhoneticTechTerms(raw);

    // Strict client-side deduplication (reject if exact same phrase within 4s)
    const now = Date.now();
    if (
      lastCommittedTextRef.current.toLowerCase() === clean.toLowerCase() &&
      now - lastCommittedTimeRef.current < 4000
    ) {
      console.log('[Kiosk] Dropped duplicate phrase commit:', clean);
      return;
    }

    lastCommittedTextRef.current = clean;
    lastCommittedTimeRef.current = now;

    // 1. Instant 0ms Native Local Display: Show subtitle on screen immediately!
    const optimisticChunk: SubtitleChunk = {
      id: `local-${now}`,
      stageId: stage?.id || 'stage-1',
      timestamp: now,
      originalText: clean,
      sourceLang: lang,
      esText: clean,
      enText: clean,
      ptText: clean,
      techTerms: [],
      confidence: 0.99,
      isFinal: true
    };
    setLocalChunks((prev) => [...prev.slice(-15), optimisticChunk]);

    if (onPushLiveTranscript) {
      onPushLiveTranscript(clean, lang);
    } else if (stage) {
      fetch(`/api/stages/${stage.id}/live-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, sourceLang: lang })
      }).catch(console.error);
    }
  };

  /**
   * Broadcast-Grade SpeechRecognition factory.
   * Chunks long continuous speech into coherent 10-14 word broadcast subtitles.
   * Natural breath pause timer (1400ms) prevents fragmented single-word cards.
   */
  const createAndStartRecognition = (overrideLang?: 'es' | 'en') => {
    if (!isRecordingRef.current) return;

    // Clean up previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAudioError('Navegador sin Web Speech API nativa. Recomendado: Google Chrome o Microsoft Edge para captura directa en navegador.');
      return;
    }

    const targetLang = overrideLang || spokenLang;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = targetLang === 'en' ? 'en-US' : 'es-AR';

      recognition.onresult = (event: any) => {
        // Clear any pending silence timer
        if (silenceFlushTimerRef.current) {
          clearTimeout(silenceFlushTimerRef.current);
          silenceFlushTimerRef.current = null;
        }

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';

          if (res.isFinal) {
            // Commit any remaining uncommitted words from this utterance
            const finalRemaining = transcript.substring(committedCharsRef.current).trim();
            if (finalRemaining && finalRemaining.length > 1) {
              commitPhrase(finalRemaining, targetLang);
            }
            committedCharsRef.current = 0;
            setLiveInterimText('');
            return;
          }

          if (transcript) {
            // Guard against speech engine rewrites where transcript is shorter than committed
            if (committedCharsRef.current > transcript.length) {
              committedCharsRef.current = 0;
            }

            // Broadcast phrase chunking: 10-14 words (never cut prematurely at 5 words!)
            while (true) {
              const uncommitted = transcript.substring(committedCharsRef.current).trimStart();
              if (!uncommitted) break;

              const splitPos = findBroadcastSplitIndex(uncommitted, {
                maxWords: 14,
                maxChars: 75,
                minWordsBeforeCut: 8,
              });

              if (splitPos === null) break;

              const chunkText = uncommitted.substring(0, splitPos).trim();
              if (!chunkText) break;

              // Commit this broadcast-ready phrase immediately!
              commitPhrase(chunkText, targetLang);

              // Advance committed offset
              const matchIdx = transcript.indexOf(chunkText, committedCharsRef.current);
              if (matchIdx !== -1) {
                committedCharsRef.current = matchIdx + chunkText.length;
              } else {
                committedCharsRef.current += splitPos;
              }
            }

            const remaining = transcript.substring(committedCharsRef.current).trim();
            setLiveInterimText(normalizePhoneticTechTerms(remaining));

            // Natural acoustic pause detection: 1400ms of silence flushes any finished thought
            if (remaining.length > 0) {
              silenceFlushTimerRef.current = setTimeout(() => {
                const toFlush = transcript.substring(committedCharsRef.current).trim();
                if (toFlush && (toFlush.split(/\s+/).length >= 3 || /[.!?]$/.test(toFlush))) {
                  commitPhrase(toFlush, targetLang);
                  committedCharsRef.current = transcript.length;
                  setLiveInterimText('');
                }
              }, 1400);
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[Kiosk Recognition Error]', e.error);
        if (e.error === 'not-allowed') {
          setAudioError('Permiso de micrófono no otorgado en el navegador');
        }
      };

      recognition.onend = () => {
        if (silenceFlushTimerRef.current) {
          clearTimeout(silenceFlushTimerRef.current);
          silenceFlushTimerRef.current = null;
        }
        committedCharsRef.current = 0;
        setLiveInterimText('');

        // Natural end or silence pause: re-arm a fresh instance smoothly
        if (isRecordingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              createAndStartRecognition(targetLang);
            }
          }, 150);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setWatchdogStatus('healthy');
    } catch (err: any) {
      console.warn('SpeechRecognition initialization error:', err);
      if (isRecordingRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) createAndStartRecognition(targetLang);
        }, 1000);
      }
    }
  };

  const handleSpokenLangChange = (newLang: 'es' | 'en') => {
    setSpokenLang(newLang);
    if (isRecordingRef.current) {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) createAndStartRecognition(newLang);
      }, 100);
    }
  };

  const startIngest = async (deviceIdToUse?: string, forceKind?: 'mic' | 'tab') => {
    try {
      setAudioError(null);
      setLiveInterimText('');
      isRecordingRef.current = true;

      const kind = forceKind || inputSourceKind;
      let stream: MediaStream;

      if (kind === 'tab') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Drop the video track: we only need pristine digital audio
        stream.getVideoTracks().forEach((t) => t.stop());
        if (stream.getAudioTracks().length === 0) {
          throw new Error('No se detectó audio en la pestaña. Tildá la opción "Compartir audio de la pestaña" en la ventana de Chrome.');
        }
      } else {
        const deviceId = deviceIdToUse || selectedDeviceId;
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Could not grab specific device, falling back to default input:', err);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const meterInterval = setInterval(() => {
        if (!analyserRef.current) {
          clearInterval(meterInterval);
          return;
        }
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        let max = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128);
          if (v > max) max = v;
        }
        const norm = max / 128;
        const db = norm > 0 ? Math.round(20 * Math.log10(norm)) : -60;
        setCurrentDbfs(db);
        setIsClipping(db >= -1);
      }, 80);

      // Launch ingest engine based on source kind
      if (kind === 'tab') {
        // Route tab audio to speaker output so operator can monitor what is playing
        try {
          source.connect(audioCtx.destination);
        } catch (e) {
          console.warn('[TabAudio] Could not route audio to speaker output:', e);
        }

        let mimeType = 'audio/webm;codecs=opus';
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
        }

        // Discrete slice recorder: each slice is an independent, valid WebM container with full EBML header
        const recordTabSlice = () => {
          if (!isRecordingRef.current || !mediaStreamRef.current) return;
          try {
            const mr = new MediaRecorder(mediaStreamRef.current, { mimeType });
            mediaRecorderRef.current = mr;
            const sliceBlobs: Blob[] = [];

            mr.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                sliceBlobs.push(event.data);
              }
            };

            mr.onstop = async () => {
              if (!isRecordingRef.current) return;
              const completeBlob = new Blob(sliceBlobs, { type: mimeType });
              if (completeBlob.size > 2000) {
                try {
                  setLiveInterimText('Procesando audio digital con Gemini 3.5...');
                  await uploadAudioChunk(stage?.id || 'stage-1', completeBlob);
                  setLiveInterimText('');
                  setAudioError(null);
                } catch (e: any) {
                  console.warn('[TabAudio] Error al enviar chunk a Gemini:', e);
                  setLiveInterimText('');
                  setAudioError(e.message || 'Error al procesar audio de la pestaña');
                }
              }

              // Chain next discrete slice
              if (isRecordingRef.current) {
                recordTabSlice();
              }
            };

            mr.start();

            // Record in discrete 3500ms slices so every chunk has valid container headers
            tabSliceTimerRef.current = setTimeout(() => {
              if (mr.state === 'recording') {
                mr.stop();
              }
            }, 3500);
          } catch (e) {
            console.error('[TabAudio] Error al iniciar slice recorder:', e);
          }
        };

        recordTabSlice();
      } else {
        // Microphone Ingest via Web Speech API (low latency)
        createAndStartRecognition();
      }

      setIsRecording(true);
    } catch (err: any) {
      setAudioError(`Error al inicializar entrada de audio: ${err.message}`);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopIngest = () => {
    isRecordingRef.current = false;
    setLiveInterimText('');

    if (tabSliceTimerRef.current) {
      clearTimeout(tabSliceTimerRef.current);
      tabSliceTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (silenceFlushTimerRef.current) {
      clearTimeout(silenceFlushTimerRef.current);
      silenceFlushTimerRef.current = null;
    }
    committedCharsRef.current = 0;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setCurrentDbfs(-60);
    setIsClipping(false);
  };

  const handleDeviceSwitch = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (isRecording) {
      stopIngest();
      setTimeout(() => {
        startIngest(newDeviceId);
      }, 200);
    }
  };

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

  const getAdaptiveFontClass = (text: string) => {
    const len = text.length;
    if (len <= 45) {
      return 'text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight';
    }
    if (len <= 80) {
      return 'text-xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-normal';
    }
    return 'text-lg sm:text-2xl lg:text-3xl font-semibold leading-normal';
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'cinema':
        return 'text-3xl sm:text-4xl lg:text-6xl leading-tight font-black tracking-tight';
      case 'large':
        return 'text-2xl sm:text-3xl lg:text-4xl leading-snug font-bold';
      case 'normal':
      default:
        return 'text-lg sm:text-xl lg:text-2xl leading-relaxed font-semibold';
    }
  };

  const getDeviceBadge = (label: string) => {
    if (/usb|rode|focusrite|scarlett|behringer|shure|samson|blue/i.test(label)) return '🔌 USB';
    if (/line|jack|realtek|rear|line-in/i.test(label)) return '🎧 JACK 3.5';
    return '🎤 MIC';
  };

  const activeDeviceLabel = audioDevices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Entrada Predeterminada';

  // Merge server chunks with optimistic local chunks for 0ms zero-lag instant feedback
  const effectiveChunks = React.useMemo(() => {
    if (localChunks.length === 0) return chunks;
    const combined = [...chunks];
    for (const lc of localChunks) {
      const alreadyInServer = chunks.some(
        (sc) => Math.abs(sc.timestamp - lc.timestamp) < 6000 ||
        sc.originalText.toLowerCase().trim() === lc.originalText.toLowerCase().trim()
      );
      if (!alreadyInServer) {
        combined.push(lc);
      }
    }
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [chunks, localChunks]);

  // In Classic mode, take only the last 2 chunks
  const classicChunks = effectiveChunks.slice(-2);

  // Group chunks into coherent multi-word thoughts for clean teleprompter reading (Never display 1-word cards)
  const prompterGroups = React.useMemo(() => {
    const raw = effectiveChunks.slice(-10);
    const groups: { id: string; text: string; isLatest: boolean }[] = [];
    let currentText = '';
    let currentId = '';

    for (let i = 0; i < raw.length; i++) {
      const text = getDisplayText(raw[i]).trim();
      if (!text) continue;

      // Duplicate guard
      if (currentText.toLowerCase().includes(text.toLowerCase()) && text.length > 5) {
        continue;
      }

      if (!currentText) {
        currentText = text;
        currentId = raw[i].id;
      } else if (currentText.split(/\s+/).length < 9 && !/[.!?]$/.test(currentText)) {
        // Append short fragment to current thought
        currentText = `${currentText} ${text}`;
      } else {
        groups.push({ id: currentId, text: currentText, isLatest: false });
        currentText = text;
        currentId = raw[i].id;
      }
    }

    if (currentText) {
      groups.push({ id: currentId, text: currentText, isLatest: true });
    }

    return groups.slice(-4);
  }, [chunks, selectedLang]);


  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#06080d] text-white flex flex-col overflow-hidden select-none font-sans">
      
      {/* Top Professional Telemetry & Control Bar */}
      <div className="bg-[#0b0e14] border-b-2 border-[#1c2333] px-3 sm:px-4 py-2 flex items-center justify-between z-30 shadow-md">
        
        {/* Left: Stage Ident & Quick Hardware Input Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-[#00ff66] shadow-[0_0_10px_#00ff66] animate-pulse' : 'bg-[#ff1744]'}`} />
            <span className="font-mono text-xs sm:text-sm font-black text-white uppercase tracking-wider hidden sm:inline">
              NODO SALA //
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-[#00f5ff] uppercase truncate max-w-[140px] sm:max-w-none">
              {stage?.name || 'ESCENARIO'}
            </span>
          </div>

          {/* Quick Hardware Audio Source Selector (USB / Jack / Speaker Mic) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#1c2333]">
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceSwitch(e.target.value)}
              className="px-2 py-1 bg-[#10141e] border border-[#222a3d] rounded text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#00f5ff] max-w-[160px] sm:max-w-xs truncate"
              title="Cambiar dispositivo de entrada de audio (Jack 3.5mm, Placa USB, Micrófono de orador)"
            >
              {audioDevices.length === 0 ? (
                <option value="">Entrada de Audio Predeterminada</option>
              ) : (
                audioDevices.map((d, index) => (
                  <option key={d.deviceId || index} value={d.deviceId}>
                    {getDeviceBadge(d.label)} • {d.label || `Entrada ${index + 1}`}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={refreshAudioDevices}
              className="p-1 rounded bg-[#10141e] hover:bg-[#1a2030] border border-[#222a3d] text-gray-400 hover:text-[#00f5ff] transition-all"
              title="Escanear nuevos dispositivos USB o cables conectados"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Live Meter & Display Mode Switcher */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Audio VU meter */}
          <div className="flex items-center gap-2 bg-[#06080d] px-2.5 py-1 rounded border border-[#1b2230] font-mono text-xs">
            <span className="text-[10px] text-gray-400">VU:</span>
            <div className="w-20 bg-[#121622] h-2 rounded overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${isClipping ? 'bg-[#ff1744]' : 'bg-[#00ff66]'}`}
                style={{ width: `${Math.min(100, Math.max(0, ((currentDbfs + 60) / 60) * 100))}%` }}
              />
            </div>
            <span className={`text-[9px] ${isClipping ? 'text-[#ff1744] font-bold' : 'text-gray-400'}`}>
              {currentDbfs} dB
            </span>
          </div>

          {/* Display Mode Switcher: Clásico vs Teleprómpter */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230] text-[10px] font-mono font-bold">
            <button
              onClick={() => setDisplayMode('classic')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                displayMode === 'classic'
                  ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Modo Subtítulo Clásico: Muestra solo 1 o 2 líneas grandes y limpias tipo cine/escenario"
            >
              <Tv className="w-3 h-3" />
              <span>SUBTÍTULO CLÁSICO</span>
            </button>

            <button
              onClick={() => setDisplayMode('prompter')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                displayMode === 'prompter'
                  ? 'bg-[#141b29] text-[#00ff66] border border-[#00ff66]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Modo Teleprómpter: Muestra el historial corrido de los últimos subtítulos emitidos"
            >
              <Layers className="w-3 h-3" />
              <span>TELEPRÓMPTER</span>
            </button>
          </div>

          {/* Spoken Language Selector (Orador ES / EN) */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230] text-[10px] font-mono font-bold" title="Idioma en que habla el orador al micrófono">
            <span className="text-[9px] text-[#64748b] px-1.5 hidden xl:inline">ORADOR:</span>
            <button
              onClick={() => handleSpokenLangChange('es')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                spokenLang === 'es'
                  ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Orador habla en Español (transcripción es-AR)"
            >
              <span>🇪🇸 ES</span>
            </button>
            <button
              onClick={() => handleSpokenLangChange('en')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                spokenLang === 'en'
                  ? 'bg-[#141b29] text-[#00ff66] border border-[#00ff66]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Speaker speaks in English (transcription en-US)"
            >
              <span>🇬🇧 EN</span>
            </button>
          </div>

          {/* Subtitle Output Language Selector (Traducción en pantalla) */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230] text-[10px] font-mono font-bold" title="Idioma en que se muestran los subtítulos en esta pantalla">
            <span className="text-[9px] text-[#00f5ff] px-1.5 hidden lg:inline font-bold">SUBTÍTULO:</span>
            <button
              onClick={() => onSelectLang('es')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                selectedLang === 'es'
                  ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Mostrar subtítulos en Español"
            >
              <span>🇦🇷 ES</span>
            </button>
            <button
              onClick={() => onSelectLang('en')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                selectedLang === 'en'
                  ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Mostrar subtítulos traducidos al Inglés"
            >
              <span>🇬🇧 EN</span>
            </button>
            <button
              onClick={() => onSelectLang('pt')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                selectedLang === 'pt'
                  ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Mostrar subtítulos traducidos al Portugués"
            >
              <span>🇧🇷 PT</span>
            </button>
          </div>

        </div>

        {/* Right: Stream Actions & Settings Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Audio Input Mode Toggle: Mic/Line vs Tab/Stream */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230] text-[10px] font-mono font-bold">
            <button
              onClick={() => {
                if (isRecording) stopIngest();
                setInputSourceKind('mic');
              }}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                inputSourceKind === 'mic'
                  ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-[0_0_8px_rgba(0,245,255,0.2)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Entrada física: Micrófono o Consola (Jack 3.5mm / USB Audio Interface)"
            >
              <Mic className="w-3 h-3" />
              <span>MIC / JACK</span>
            </button>
            <button
              onClick={() => {
                if (isRecording) stopIngest();
                setInputSourceKind('tab');
              }}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                inputSourceKind === 'tab'
                  ? 'bg-[#141b29] text-[#ffba00] border border-[#ffba00]/40 shadow-[0_0_8px_rgba(255,186,0,0.2)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Entrada digital: Pestaña del navegador / Video de YouTube de Nerdearla"
            >
              <Tv className="w-3 h-3" />
              <span>PESTAÑA</span>
            </button>
          </div>

          {/* Main Ingest Start/Stop Button */}
          {isRecording ? (
            <button
              onClick={stopIngest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff1744] hover:bg-[#ff1744]/90 text-white font-mono text-xs font-bold rounded shadow-[0_0_10px_#ff1744] animate-pulse"
            >
              <Square className="w-3.5 h-3.5" />
              <span>DETENER_ENTRADA</span>
            </button>
          ) : (
            <button
              onClick={() => startIngest()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-mono text-xs font-black rounded shadow-[0_0_12px_rgba(0,245,255,0.4)] transition-all"
            >
              {inputSourceKind === 'tab' ? <Tv className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{inputSourceKind === 'tab' ? 'CAPTURAR_PESTAÑA' : 'ARMAR_ENTRADA'}</span>
            </button>
          )}

          {/* Toggle QR Corner */}
          <button
            onClick={() => setShowQrCorner(!showQrCorner)}
            className={`p-1.5 rounded border text-xs font-mono transition-all ${showQrCorner ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#090c14] border-[#1e2535] text-gray-400'}`}
            title="Mostrar / Ocultar QR para celulares en pantalla"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Quick Download SRT for Stage Technician */}
          <a
            href={`/api/stages/${stage?.id || 'stage-1'}/export/srt?lang=${selectedLang}`}
            download={`nerdsub-${stage?.id || 'stage-1'}-${selectedLang}.srt`}
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#090c14] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#00ff66]/50 text-gray-400 hover:text-[#00ff66] font-mono text-[10px] font-bold transition-all"
            title="Descargar subtítulos .SRT sincronizados para YouTube de esta charla"
          >
            <Download className="w-3.5 h-3.5 text-[#00ff66]" />
            <span className="hidden md:inline">.SRT</span>
          </a>

          {/* Engine / API Key Trigger */}
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] font-bold border transition-all ${
                geminiConfigured
                  ? 'bg-[#00f5ff]/10 border-[#00f5ff]/40 text-[#00f5ff] hover:bg-[#00f5ff]/20'
                  : 'bg-[#ffba00]/10 border-[#ffba00]/40 text-[#ffba00] hover:bg-[#ffba00]/20'
              }`}
              title="Configurar Gemini API Key, Cola de Keys o cambiar motor de IA"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeEngine === 'gemini-cloud'
                  ? 'GEMINI 3.5'
                  : activeEngine === 'gemma-local'
                  ? 'GEMMA 2B'
                  : 'NATIVO 0MS'}
              </span>
              <span className={`w-2 h-2 rounded-full ${geminiConfigured ? 'bg-[#00ff66]' : 'bg-[#ffba00]'}`} />
            </button>
          )}

          {/* Live Talk Countdown */}
          {scheduleInfo.remainingMinutes > 0 && (
            <div 
              onClick={onOpenScheduleModal}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] font-bold cursor-pointer hover:bg-cyan-900/60 transition-all"
              title="Tiempo restante para la charla actual. Clic para ver la agenda completa."
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>⏱️ {scheduleInfo.remainingMinutes}M RESTANTES</span>
            </div>
          )}

          {/* Conference Schedule & Agenda */}
          {onOpenScheduleModal && (
            <button
              onClick={onOpenScheduleModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] font-bold border border-[#222a3d] hover:border-cyan-500/40 bg-[#10141e] text-gray-300 hover:text-white transition-all"
              title="Ver agenda completa de charlas de Nerdearla 2026"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">AGENDA</span>
            </button>
          )}

          {/* Theme & Skins Switcher */}
          {onOpenThemeModal && (
            <button
              onClick={onOpenThemeModal}
              className="p-1.5 rounded font-mono text-[11px] font-bold border border-[#222a3d] hover:border-amber-500/40 bg-[#10141e] text-amber-400 hover:text-white transition-all"
              title="Cambiar tema visual (Rack Pro-AV, Cyberpunk, Alto Contraste AAA, Daylight, Retro CRT)"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}

          {/* Real-time Telemetry & Log Viewer */}
          {onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] font-bold border border-[#222a3d] hover:border-[#00f5ff]/40 bg-[#10141e] text-gray-300 hover:text-[#00f5ff] transition-all"
              title="Ver telemetría y registro de errores en vivo (Logs)"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span className="hidden sm:inline">LOGS</span>
            </button>
          )}

          {/* Config Drawer Toggle */}
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="p-1.5 rounded bg-[#090c14] border border-[#1e2535] text-gray-400 hover:text-white"
            title="Configuración de sala y hardware"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Return to Control Room / Admin View */}
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#10141e] hover:bg-[#1a2030] border border-[#222a3d] text-gray-300 hover:text-white font-mono text-[11px] transition-all"
              title="Volver a la Mesa Técnica (Control Room)"
            >
              <Sliders className="w-3.5 h-3.5 text-[#ffb800]" />
              <span className="hidden sm:inline">CONTROL ROOM</span>
            </button>
          )}
        </div>

      </div>

      {/* Hot-Plug Notification Toast */}
      {deviceChangeNotice && (
        <div className="bg-[#00ff66]/15 border-b border-[#00ff66]/40 px-4 py-1.5 text-center text-xs font-mono text-[#00ff66] flex items-center justify-center gap-2 animate-fade-in z-20">
          <Activity className="w-3.5 h-3.5" />
          <span>{deviceChangeNotice}</span>
        </div>
      )}

      {/* Tab Audio Notice if Gemini is not configured */}
      {inputSourceKind === 'tab' && !geminiConfigured && (
        <div className="bg-[#ffba00]/15 border-b border-[#ffba00]/40 px-4 py-2 text-center text-xs font-mono text-[#ffba00] flex items-center justify-center gap-3 z-20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            El <strong>Modo Pestaña</strong> captura audio digital del navegador y requiere una Gemini API Key configurada para transcribir con Gemini 3.5.
          </span>
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className="px-2.5 py-1 bg-[#ffba00] text-black font-black rounded hover:bg-[#ffba00]/90 transition-all text-[11px]"
            >
              CONFIGURAR API KEY
            </button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {audioError && (
        <div className="bg-[#ff1744]/20 border-b border-[#ff1744]/40 px-4 py-2 text-center text-xs font-mono text-[#ff1744] flex items-center justify-center gap-2 z-20">
          <AlertCircle className="w-4 h-4" />
          <span>{audioError}</span>
        </div>
      )}

      {/* On-Stage Pinned Audience Question Banner */}
      {pinnedQuestion && (
        <div className="bg-[#ffb800]/20 border-b-2 border-[#ffb800] px-6 py-4 flex items-start gap-4 shadow-2xl z-20 animate-in slide-in-from-top-2">
          <span className="text-3xl pt-1">❓</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold text-[#ffb800] uppercase mb-1">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffb800] animate-ping" />
                PREGUNTA DEL PÚBLICO FIJADA POR LA MESA TÉCNICA
              </span>
              <span className="bg-[#ffb800]/30 px-2.5 py-0.5 rounded text-white border border-[#ffb800]/60 font-black">
                ▲ {pinnedQuestion.votes} VOTOS
              </span>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-sans leading-tight">
              "{pinnedQuestion.text}"
            </p>
            <div className="text-xs font-mono text-gray-300 mt-2">
              Enviada por: <strong className="text-white">{pinnedQuestion.author}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MAIN SCREEN CONTENT (DUAL-MODE: CLÁSICO vs PROMPTER)
         ======================================================== */}
      
      {/* MODE 1: SUBTÍTULO CLÁSICO (CINEMA BANNER) */}
      {displayMode === 'classic' && (
        <div className="flex-1 flex flex-col justify-end items-center p-6 sm:p-12 pb-16 relative max-w-6xl mx-auto w-full">
          
          {classicChunks.length === 0 && !liveInterimText ? (
            <div className="m-auto text-center space-y-4 max-w-lg">
              <div className="w-16 h-16 rounded-full bg-[#111520] border-2 border-[#00f5ff]/30 flex items-center justify-center mx-auto text-[#00f5ff]">
                <Tv className="w-8 h-8 animate-pulse" />
              </div>
              <div className="font-mono text-2xl font-black text-gray-200 uppercase">
                {stage?.name || 'ESCENARIO PRINCIPAL'}
              </div>
              <p className="font-mono text-xs text-gray-400 leading-relaxed">
                {inputSourceKind === 'tab' ? (
                  <>
                    MODO PESTAÑA ACTIVO • Presioná <strong className="text-[#00f5ff]">"CAPTURAR_PESTAÑA"</strong> para capturar el audio digital de otra pestaña (ej. YouTube, streaming de Nerdearla). Asegurate de tildar <em>"Compartir audio de la pestaña"</em> en Chrome.
                  </>
                ) : (
                  <>
                    MODO SUBTÍTULO CLÁSICO ACTIVO • Presioná <strong className="text-[#00f5ff]">"ARMAR_ENTRADA"</strong> arriba para transmitir desde el Jack 3.5mm o dispositivo USB conectado. Los subtítulos aparecerán en grande y centrados aquí.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="w-full space-y-3 text-center">
              
              {/* Previous line (subtle and visible for context) */}
              {classicChunks.length > 1 && !liveInterimText && (
                <div className="text-gray-400 opacity-60 text-lg sm:text-xl lg:text-2xl font-medium tracking-wide max-w-4xl mx-auto break-words">
                  {getDisplayText(classicChunks[classicChunks.length - 2])}
                </div>
              )}

              {/* Active subtitle box with high contrast broadcast styling (Full text, adaptive wrap) */}
              <div 
                className="bg-black/90 backdrop-blur-md border-2 border-white/20 rounded-2xl sm:rounded-3xl px-6 py-5 sm:px-10 sm:py-7 shadow-2xl transition-all max-w-5xl mx-auto w-full min-h-[90px] flex items-center justify-center text-center"
                style={{
                  boxShadow: '0 10px 40px rgba(0,0,0,0.85), 0 0 25px rgba(0,245,255,0.1)'
                }}
              >
                {liveInterimText ? (
                  <p 
                    className={`${getAdaptiveFontClass(liveInterimText)} text-[#00f5ff] drop-shadow-md max-w-4xl break-words`}
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,245,255,0.45)' }}
                  >
                    <span>{liveInterimText}</span>
                    <span className="inline-block w-2.5 h-5 bg-[#00f5ff] ml-2 animate-pulse align-middle rounded-sm" />
                  </p>
                ) : (
                  <p 
                    className={`${getAdaptiveFontClass(classicChunks.length > 0 ? getDisplayText(classicChunks[classicChunks.length - 1]) : '')} text-white drop-shadow-md max-w-4xl break-words`}
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
                  >
                    {classicChunks.length > 0 ? getDisplayText(classicChunks[classicChunks.length - 1]) : ''}
                  </p>
                )}
              </div>

              {/* Discreet Telemetry & Language Tag */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-mono tracking-wider uppercase">
                <span className="text-[#94a3b8] font-bold">{stage?.speaker || 'TALK'}</span>
                <span className="text-[#334155]">•</span>
                <span className="text-[#00f5ff] font-bold bg-[#00f5ff]/10 px-2 py-0.5 rounded border border-[#00f5ff]/30">
                  SUBTÍTULOS: {selectedLang === 'en' ? 'ENGLISH (EN)' : selectedLang === 'pt' ? 'PORTUGUÊS (PT)' : selectedLang === 'original' ? 'ORIGINAL' : 'ESPAÑOL (ES)'}
                </span>
                <span className="text-[#334155]">•</span>
                <span className="text-gray-400">
                  MIC: {spokenLang.toUpperCase()}
                </span>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODE 2: TELEPRÓMPTER / HISTORIAL SCROLL */}
      {displayMode === 'prompter' && (
        <div 
          ref={prompterContainerRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 p-6 sm:p-12 overflow-y-auto space-y-6 relative flex flex-col justify-end max-w-6xl mx-auto w-full"
        >
          {chunks.length === 0 && !liveInterimText ? (
            <div className="m-auto text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-full bg-[#111520] border-2 border-[#00f5ff]/30 flex items-center justify-center mx-auto text-[#00f5ff]">
                <Layers className="w-8 h-8 animate-pulse" />
              </div>
              <div className="font-mono text-xl font-bold text-gray-200 uppercase">
                {stage?.name || 'ESCENARIO PRINCIPAL'}
              </div>
              <p className="font-mono text-xs text-gray-400 leading-relaxed">
                MODO TELEPRÓMPTER • Los subtítulos correrán en orden cronológico a medida que hable el speaker.
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {prompterGroups.map((group) => {
                return (
                  <div
                    key={group.id}
                    className={`p-5 rounded-2xl transition-all duration-300 ${
                      group.isLatest
                        ? 'bg-black/80 border-l-4 border-[#00f5ff] text-white shadow-2xl backdrop-blur-md'
                        : 'opacity-60 text-gray-300'
                    }`}
                  >
                    <p 
                      className={`${getFontSizeClass()} tracking-wide leading-relaxed`}
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
                    >
                      {group.text}
                    </p>
                  </div>
                );
              })}

              {/* In-Flight Live Interim Speech Words */}
              {liveInterimText && (
                <div className="p-5 rounded-2xl border-l-4 border-[#00f5ff] bg-[#00f5ff]/15 animate-fade-in shadow-xl backdrop-blur-sm">
                  <p className={`${getFontSizeClass()} text-[#00f5ff] font-bold tracking-wide leading-relaxed`}>
                    "{liveInterimText}"
                    <span className="inline-block w-2.5 h-6 bg-[#00f5ff] ml-2 animate-pulse align-middle rounded-sm" />
                  </p>
                </div>
              )}
            </div>

          )}
        </div>
      )}

      {/* Floating Corner QR Code (Attendees can scan directly from stage screen) */}
      {showQrCorner && qrCodeDataUrl && (
        <div className="fixed bottom-6 right-6 z-40 bg-black/90 backdrop-blur-md border border-[#232b3d] p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto">
          <img 
            src={qrCodeDataUrl} 
            alt="QR Subtítulos en celular" 
            className="w-18 h-18 rounded-lg bg-white p-1"
          />
          <div className="font-mono text-left">
            <span className="text-[10px] text-[#00f5ff] font-bold block uppercase tracking-wider">
              📱 SEGUÍ EN TU CELULAR
            </span>
            <span className="text-xs font-bold text-white block">
              ES / EN / PT
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">
              Escaneá el código QR
            </span>
          </div>
        </div>
      )}

      {/* Config Drawer for Room Technician */}
      {showConfigDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0d1017] border-l-2 border-[#1c2333] z-50 p-5 shadow-2xl space-y-4 font-mono text-xs overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#181d2a] pb-3">
            <span className="font-bold text-[#00f5ff] flex items-center gap-1.5 uppercase">
              <Settings className="w-4 h-4" />
              CONFIGURACIÓN NODO SALA
            </span>
            <button onClick={() => setShowConfigDrawer(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Presentation Style */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">MODO DE PRESENTACIÓN:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setDisplayMode('classic')}
                className={`py-1.5 rounded border text-center uppercase font-bold ${
                  displayMode === 'classic' ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                Subtítulo Clásico
              </button>
              <button
                onClick={() => setDisplayMode('prompter')}
                className={`py-1.5 rounded border text-center uppercase font-bold ${
                  displayMode === 'prompter' ? 'bg-[#141b29] border-[#00ff66] text-[#00ff66]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                Teleprómpter
              </button>
            </div>
          </div>

          {/* Room Switcher */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">SALA ASIGNADA A ESTA MINI PC:</label>
            <select
              value={stage?.id}
              onChange={(e) => onSelectStage(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Audio Input Source Kind */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">TIPO DE ENTRADA DE AUDIO:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  if (isRecording) stopIngest();
                  setInputSourceKind('mic');
                }}
                className={`py-1.5 rounded border text-center uppercase font-bold flex items-center justify-center gap-1.5 ${
                  inputSourceKind === 'mic' ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                Mic / Consola
              </button>
              <button
                onClick={() => {
                  if (isRecording) stopIngest();
                  setInputSourceKind('tab');
                }}
                className={`py-1.5 rounded border text-center uppercase font-bold flex items-center justify-center gap-1.5 ${
                  inputSourceKind === 'tab' ? 'bg-[#141b29] border-[#ffba00] text-[#ffba00]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Pestaña / YouTube
              </button>
            </div>
          </div>

          {/* Audio Input Device Switcher */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-400 uppercase">DISPOSITIVO DE AUDIO (JACK / USB / MIC):</label>
              <button onClick={refreshAudioDevices} className="text-[9px] text-[#00f5ff] hover:underline">
                ESCANEAR
              </button>
            </div>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceSwitch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white text-[11px]"
            >
              {audioDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {getDeviceBadge(d.label)} • {d.label || `Entrada ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Language for On-Stage Display */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">IDIOMA EN PANTALLA DE SALA (SUBTÍTULOS):</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'es', label: '🇦🇷 ES' },
                { id: 'en', label: '🇬🇧 EN' },
                { id: 'pt', label: '🇧🇷 PT' },
                { id: 'original', label: '🌐 ORIG' }
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelectLang(l.id as SupportedLanguage)}
                  className={`py-1 rounded border text-center uppercase font-bold text-xs ${
                    selectedLang === l.id ? 'bg-[#00f5ff] border-[#00f5ff] text-black font-black' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">TAMAÑO DE TIPOGRAFÍA (PROYECTOR):</label>
            <div className="grid grid-cols-3 gap-1">
              {(['normal', 'large', 'cinema'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`py-1 rounded border text-center uppercase font-bold ${
                    fontSize === sz ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                  }`}
                >
                  {sz === 'cinema' ? 'Cine (XL)' : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Post-Talk Subtitle Export */}
          <div className="space-y-1.5 pt-2 border-t border-[#181d2a]">
            <label className="text-[10px] text-gray-400 uppercase flex items-center gap-1.5">
              <Download className="w-3 h-3 text-[#00ff66]" />
              EXPORTACIÓN POST-CHARLA (YOUTUBE / ARCHIVO):
            </label>
            <div className="grid grid-cols-3 gap-1">
              <a
                href={`/api/stages/${stage?.id || 'stage-1'}/export/srt?lang=${selectedLang}`}
                download={`nerdsub-${stage?.id || 'stage-1'}-${selectedLang}.srt`}
                className="py-1.5 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#00ff66] text-center font-bold text-gray-300 hover:text-[#00ff66] transition-all flex items-center justify-center gap-1 text-[11px]"
                title="Subtítulos sincronizados .SRT para YouTube"
              >
                <Download className="w-3 h-3 text-[#00ff66]" />
                .SRT
              </a>
              <a
                href={`/api/stages/${stage?.id || 'stage-1'}/export/vtt?lang=${selectedLang}`}
                download={`nerdsub-${stage?.id || 'stage-1'}-${selectedLang}.vtt`}
                className="py-1.5 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#00f5ff] text-center font-bold text-gray-300 hover:text-[#00f5ff] transition-all flex items-center justify-center gap-1 text-[11px]"
                title="Subtítulos estándar WebVTT"
              >
                <FileText className="w-3 h-3 text-[#00f5ff]" />
                .VTT
              </a>
              <a
                href={`/api/stages/${stage?.id || 'stage-1'}/export/txt?lang=${selectedLang}`}
                download={`nerdsub-${stage?.id || 'stage-1'}-${selectedLang}.txt`}
                className="py-1.5 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#ffba00] text-center font-bold text-gray-300 hover:text-[#ffba00] transition-all flex items-center justify-center gap-1 text-[11px]"
                title="Transcripción en texto plano UTF-8"
              >
                <FileText className="w-3 h-3 text-[#ffba00]" />
                .TXT
              </a>
            </div>
          </div>

          {/* Self-Healing Watchdog Status */}
          <div className="p-3 bg-[#07090e] border border-[#171b26] rounded space-y-1.5 text-[10px]">
            <span className="text-[#00ff66] font-bold block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              WATCHDOG ZERO-RUSTDESK: ACTIVO
            </span>
            <div className="text-gray-400">Estado de Motor: <span className="text-white uppercase">{watchdogStatus}</span></div>
            <div className="text-gray-400">Hot-plug USB: <span className="text-white">Detectando en vivo</span></div>
            <div className="text-gray-500 pt-1 border-t border-[#181d2a]">
              Las pausas del orador son respetadas normalmente sin congelar la sesión. Si la Mesa Técnica envía un F5 remoto, la pantalla se recarga sola.
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
