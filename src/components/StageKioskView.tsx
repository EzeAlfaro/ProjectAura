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
    try {
      const routing = localStorage.getItem('aura_stage_audio_routing');
      if (routing) {
        const parsed = JSON.parse(routing);
        const stageKey = stage?.id;
        if (stageKey && parsed[stageKey]?.deviceId) {
          return parsed[stageKey].deviceId;
        }
      }
    } catch (e) {}
    return localStorage.getItem('nerdsub_kiosk_device_id') || '';
  });

  useEffect(() => {
    try {
      const routing = localStorage.getItem('aura_stage_audio_routing');
      if (routing) {
        const parsed = JSON.parse(routing);
        const stageKey = stage?.id;
        if (stageKey && parsed[stageKey]?.deviceId) {
          setSelectedDeviceId(parsed[stageKey].deviceId);
          return;
        }
      }
      if (stage?.assignedDeviceId) {
        setSelectedDeviceId(stage.assignedDeviceId);
        return;
      }
    } catch (e) {}
  }, [stage?.id, stage?.assignedDeviceId]);
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
  const [tabVideoStream, setTabVideoStream] = useState<MediaStream | null>(null);
  const [micGainDb, setMicGainDb] = useState<number>(3.5); // Default +3.5dB Boost
  const gainNodeRef = useRef<GainNode | null>(null);

  const handleGainChange = (newDb: number) => {
    setMicGainDb(newDb);
    if (gainNodeRef.current) {
      const linear = Math.pow(10, newDb / 20);
      gainNodeRef.current.gain.value = linear;
    }
  };

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
    if (!wsClient || typeof (wsClient as any).onMessage !== 'function') return;
    const unsub = wsClient.onMessage((msg: any) => {
      if (msg.type === 'system_alert') {
        setAudioError(msg.message || 'Alerta del motor de transcripción');
      }
    });
    return unsub;
  }, [wsClient]);

  // Fullscreen state and change listener
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Auto-dismiss audioError after 8 seconds
  useEffect(() => {
    if (audioError) {
      const timer = setTimeout(() => {
        setAudioError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [audioError]);

  // Clear audioError when new valid chunks arrive
  useEffect(() => {
    if (chunks.length > 0 && audioError) {
      const last = chunks[chunks.length - 1];
      if (last.esText || last.originalText) {
        setAudioError(null);
      }
    }
  }, [chunks.length]);

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

    // 1. Instant 0ms Native Local Display: Only add optimistic chunk if viewer is watching the spoken language or original
    // NEVER inject raw spoken language into enText or ptText when translating!
    if (selectedLang === lang || selectedLang === 'original') {
      const optimisticChunk: SubtitleChunk = {
        id: `local-${now}`,
        stageId: stage?.id || 'stage-1',
        timestamp: now,
        originalText: clean,
        sourceLang: lang,
        esText: lang === 'es' ? clean : '',
        enText: lang === 'en' ? clean : '',
        ptText: (lang as string) === 'pt' ? clean : '',
        techTerms: [],
        confidence: 0.99,
        isFinal: true
      };
      setLocalChunks((prev) => [...prev.slice(-15), optimisticChunk]);
    }

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
        const vTracks = stream.getVideoTracks();
        if (vTracks.length > 0) {
          const vStream = new MediaStream([vTracks[0]]);
          setTabVideoStream(vStream);
          vTracks[0].onended = () => {
            setTabVideoStream(null);
          };
        }
        if (stream.getAudioTracks().length === 0) {
          throw new Error('No se detectó audio en la pestaña. Tildá la opción "Compartir audio de la pestaña" en la ventana de Chrome.');
        }
      } else {
        const deviceId = deviceIdToUse || selectedDeviceId;
        if (deviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: deviceId } }
            });
          } catch (exactErr) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { ideal: deviceId } }
              });
            } catch (idealErr) {
              console.warn('[StageKioskView] Could not grab specific device, falling back to default input:', idealErr);
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      const linearGain = Math.pow(10, micGainDb / 20);
      gainNode.gain.value = linearGain;
      gainNodeRef.current = gainNode;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(gainNode);
      gainNode.connect(analyser);

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
        // Route tab audio through gain to speaker output so operator can monitor
        try {
          gainNode.connect(audioCtx.destination);
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
                  setLiveInterimText('Procesando audio digital con Gemini Live...');
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
    gainNodeRef.current = null;
    setTabVideoStream(null);
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
        return chunk.esText || (chunk.sourceLang === 'es' || !chunk.sourceLang ? chunk.originalText : '');
      case 'en':
        return chunk.enText || (chunk.sourceLang === 'en' ? chunk.originalText : '');
      case 'pt':
        return chunk.ptText || (chunk.sourceLang === 'pt' ? chunk.originalText : '');
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

  // In Classic mode, format into 1 or 2 broadcast subtitle lines without orphan fragments
  const classicDisplay = React.useMemo(() => {
    const validChunks = effectiveChunks.filter((c) => getDisplayText(c).trim().length > 0);
    if (validChunks.length === 0) return { current: '' };

    const last = validChunks[validChunks.length - 1];
    let current = getDisplayText(last).trim();

    if (validChunks.length > 1) {
      const prev = validChunks[validChunks.length - 2];
      const prevText = getDisplayText(prev).trim();
      const currentWords = current.split(/\s+/).length;

      // If current is an orphan (< 4 words), merge them into one unified subtitle!
      if (currentWords < 4 && Math.abs(last.timestamp - prev.timestamp) < 12000) {
        current = `${prevText} ${current}`;
      }
    }

    return { current };
  }, [effectiveChunks, selectedLang]);

  // Group chunks into coherent multi-word thoughts for clean teleprompter reading (Never display 1-word cards)
  const prompterGroups = React.useMemo(() => {
    const validChunks = effectiveChunks.filter((c) => getDisplayText(c).trim().length > 0);
    const raw = validChunks.slice(-10);
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

      const incomingWords = text.split(/\s+/).length;
      const currentWords = currentText ? currentText.split(/\s+/).length : 0;

      if (!currentText) {
        currentText = text;
        currentId = raw[i].id;
      } else if (incomingWords < 4 || (currentWords < 9 && !/[.!?]$/.test(currentText)) || currentWords < 5) {
        // Merge short fragments into the current card so cards never have orphan 1-3 words
        currentText = `${currentText} ${text}`;
      } else {
        groups.push({ id: currentId, text: currentText, isLatest: false });
        currentText = text;
        currentId = raw[i].id;
      }
    }

    if (currentText) {
      if (groups.length > 0 && currentText.split(/\s+/).length < 4) {
        // Merge orphan trailing fragment (< 4 words) into the last group instead of making an abrupt 2-word card!
        const lastGroup = groups[groups.length - 1];
        lastGroup.text = `${lastGroup.text} ${currentText}`;
        lastGroup.isLatest = true;
      } else {
        groups.push({ id: currentId, text: currentText, isLatest: true });
      }
    }

    return groups.slice(-4);
  }, [effectiveChunks, selectedLang]);


  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#06080d] text-white flex flex-col overflow-hidden select-none font-sans">
      
      {/* Top Broadcast Telemetry & Control Bar */}
      <div className="bg-[#0b0e14] border-b-2 border-[#1c2333] px-3 sm:px-5 py-2 flex items-center justify-between z-30 shadow-lg gap-2">
        
        {/* Left: Sala & Speaker Info */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-[#00ff66] shadow-[0_0_10px_#00ff66] animate-pulse' : 'bg-[#ffb800]'}`} />
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isRecording ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400' : 'bg-amber-950/60 border-amber-700/60 text-amber-400'}`}>
              {isRecording ? 'EN VIVO' : 'STANDBY'}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs sm:text-sm font-black text-[#00f5ff] uppercase tracking-wide truncate">
              {stage?.name || 'ESCENARIO PRINCIPAL'}
            </span>
            {scheduleInfo.currentTalk && (
              <button
                onClick={() => onOpenScheduleModal?.()}
                className="hidden xl:flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#10141e] px-2 py-0.5 rounded border border-[#1e2535] hover:border-cyan-500/40 truncate max-w-sm transition-all"
                title="Clic para ver la agenda oficial de Nerdearla"
              >
                <span className="text-[#ffb800] shrink-0">🎙️</span>
                <span className="truncate">{scheduleInfo.currentTalk.speaker} — {scheduleInfo.currentTalk.title}</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Stage Presentation Mode & Subtitle Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher: Clásico vs Prompter */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#1b2230] text-[11px] font-mono font-bold">
            <button
              onClick={() => setDisplayMode('classic')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                displayMode === 'classic'
                  ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Modo Clásico: 1 o 2 líneas grandes tipo cine"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CLÁSICO</span>
            </button>
            <button
              onClick={() => setDisplayMode('prompter')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                displayMode === 'prompter'
                  ? 'bg-[#141b29] text-[#00ff66] border border-[#00ff66]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Modo Teleprómpter: Historial continuo en vivo"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PROMPTER</span>
            </button>
          </div>

          {/* Subtitle Language Switcher: ES / EN / PT */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#1b2230] text-[11px] font-mono font-bold">
            {[
              { id: 'es', flag: '🇦🇷', label: 'ES' },
              { id: 'en', flag: '🇬🇧', label: 'EN' },
              { id: 'pt', flag: '🇧🇷', label: 'PT' }
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => onSelectLang(lang.id as SupportedLanguage)}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                  selectedLang === lang.id
                    ? 'bg-[#00f5ff] text-black font-black shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                    : 'text-[#64748b] hover:text-white'
                }`}
                title={`Subtítulos en pantalla en ${lang.label}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Ingest Action & Hardware Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Input Source Selector Toggle: Mic vs Tab */}
          <div className="hidden sm:flex items-center bg-[#07090e] p-0.5 rounded-lg border border-[#1b2230] text-[10px] font-mono font-bold">
            <button
              onClick={() => {
                if (isRecording) stopIngest();
                setInputSourceKind('mic');
              }}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                inputSourceKind === 'mic'
                  ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Entrada física: Micrófono / Interfaz USB / Jack 3.5mm"
            >
              <Mic className="w-3 h-3" />
              <span>MIC</span>
            </button>
            <button
              onClick={() => {
                if (isRecording) stopIngest();
                setInputSourceKind('tab');
              }}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                inputSourceKind === 'tab'
                  ? 'bg-[#141b29] text-[#ffba00] border border-[#ffba00]/40 shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Entrada digital: Pestaña con audio de YouTube"
            >
              <Tv className="w-3 h-3" />
              <span>PESTAÑA</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {isRecording ? (
            <button
              onClick={stopIngest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff1744] hover:bg-[#ff1744]/90 text-white font-mono text-xs font-bold rounded-lg shadow-[0_0_12px_#ff1744] animate-pulse transition-all"
              title="Detener captura de audio"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>DETENER</span>
            </button>
          ) : (
            <button
              onClick={() => startIngest()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-mono text-xs font-black rounded-lg shadow-[0_0_12px_rgba(0,245,255,0.4)] transition-all hover:scale-105 active:scale-95"
              title={inputSourceKind === 'tab' ? 'Capturar audio y video de pestaña' : 'Iniciar transcripción por micrófono'}
            >
              {inputSourceKind === 'tab' ? <Tv className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{inputSourceKind === 'tab' ? 'CAPTURAR' : 'TRANSCRIBIR'}</span>
            </button>
          )}

          {/* Engine Pill */}
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition-all ${
                geminiConfigured
                  ? 'bg-[#00f5ff]/10 border-[#00f5ff]/40 text-[#00f5ff] hover:bg-[#00f5ff]/20'
                  : 'bg-[#ffba00]/10 border-[#ffba00]/40 text-[#ffba00] hover:bg-[#ffba00]/20'
              }`}
              title="Configurar Gemini API Key o cambiar motor de IA"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{activeEngine === 'gemini-cloud' ? 'GEMINI' : activeEngine === 'gemma-local' ? 'GEMMA' : 'NATIVO'}</span>
              <span className={`w-2 h-2 rounded-full ${geminiConfigured ? 'bg-[#00ff66]' : 'bg-[#ffba00]'}`} />
            </button>
          )}

          {/* Countdown Pill */}
          {scheduleInfo.remainingMinutes > 0 && (
            <button
              onClick={() => onOpenScheduleModal?.()}
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] font-bold hover:bg-cyan-900/60 transition-all"
              title="Tiempo restante para la charla actual"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>⏱️ {scheduleInfo.remainingMinutes}m</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#10141e] hover:bg-[#182030] border border-[#222a3d] text-gray-300 hover:text-white transition-all"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa para proyector'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Return to Control Room / Admin View */}
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#10141e] hover:bg-[#1a2030] border border-[#222a3d] text-gray-300 hover:text-white font-mono text-[11px] transition-all"
              title="Volver a la Mesa Técnica (Control Room)"
            >
              <Sliders className="w-3.5 h-3.5 text-[#ffb800]" />
              <span className="hidden xl:inline">CONTROL ROOM</span>
            </button>
          )}

          {/* Config / Tools Drawer Toggle Button */}
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
              showConfigDrawer
                ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff]'
                : 'bg-[#10141e] hover:bg-[#182030] border-[#222a3d] text-gray-300 hover:text-white'
            }`}
            title="Abrir menú de herramientas, entradas de audio, ganancia y exportación"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AJUSTES</span>
          </button>
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
            El <strong>Modo Pestaña</strong> captura audio digital del navegador y requiere una Gemini API Key configurada para transcribir con Gemini Live (3.5 / 3.8 Flash).
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

      {/* Error Banner with Dismiss */}
      {audioError && (
        <div className="bg-[#ff1744]/20 border-b border-[#ff1744]/40 px-4 py-2 text-center text-xs font-mono text-[#ff1744] flex items-center justify-between gap-3 z-20 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
          <button
            onClick={() => setAudioError(null)}
            className="p-1 hover:bg-[#ff1744]/30 rounded text-gray-300 hover:text-white transition-all shrink-0"
            title="Descartar alerta"
          >
            <X className="w-4 h-4" />
          </button>
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
          LIVE TAB VIDEO FEED (YOUTUBE / PRESENTATION MONITOR)
         ======================================================== */}
      {tabVideoStream && (
        <div className="px-4 sm:px-8 pt-3 max-w-3xl mx-auto w-full animate-fade-in shrink-0">
          <div className="relative rounded-2xl overflow-hidden border-2 border-[#00f5ff]/40 shadow-2xl bg-black aspect-video max-h-[260px] sm:max-h-[320px] mx-auto group">
            <video
              ref={(el) => {
                if (el && el.srcObject !== tabVideoStream) {
                  el.srcObject = tabVideoStream;
                }
              }}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain bg-black"
            />
            <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/50 text-[10px] font-mono font-bold text-red-400 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>● LIVE TAB FEED // NERDEARLA STREAM</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-[#00f5ff] border border-[#00f5ff]/30">
              AUDIO DIGITAL PCM SINCRONIZADO
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
          
          <div className="w-full space-y-4 text-center">
            
            {/* Active subtitle box with high contrast broadcast styling (Full text, adaptive wrap) */}
            <div 
              className="bg-black/90 backdrop-blur-md border-2 border-white/20 rounded-2xl sm:rounded-3xl px-6 py-5 sm:px-10 sm:py-7 shadow-2xl max-w-5xl mx-auto w-full min-h-[110px] flex items-center justify-center text-center"
              style={{
                boxShadow: '0 10px 40px rgba(0,0,0,0.85), 0 0 25px rgba(0,245,255,0.1)'
              }}
            >
              {classicDisplay.current ? (
                <p 
                  className={`${getAdaptiveFontClass(classicDisplay.current)} text-white drop-shadow-md max-w-4xl break-words`}
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
                >
                  {classicDisplay.current}
                </p>
              ) : (liveInterimText && (selectedLang === spokenLang || selectedLang === 'original')) ? (
                <p 
                  className={`${getAdaptiveFontClass(liveInterimText)} text-[#00f5ff] drop-shadow-md max-w-4xl break-words`}
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,245,255,0.45)' }}
                >
                  <span>{liveInterimText}</span>
                  <span className="inline-block w-2.5 h-5 bg-[#00f5ff] ml-2 animate-pulse align-middle rounded-sm" />
                </p>
              ) : (
                <p className="text-gray-400 font-mono text-sm sm:text-base">
                  {isRecording 
                    ? '🎙️ Escuchando audio... (los subtítulos aparecerán aquí)'
                    : 'Standby • Presioná TRANSCRIBIR o CAPTURAR arriba para iniciar'}
                </p>
              )}
            </div>

            {/* Static Telemetry & Language Tag (Fixed height, never shifts layout) */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-mono tracking-wider uppercase h-6">
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
          {prompterGroups.length === 0 ? (
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
                        ? 'bg-black/90 border-l-4 border-[#00f5ff] text-white shadow-2xl backdrop-blur-md'
                        : 'bg-[#0d121c]/80 border-l-4 border-transparent text-gray-200'
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
              <button onClick={refreshAudioDevices} className="text-[9px] text-[#00f5ff] hover:underline flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                <span>ESCANEAR</span>
              </button>
            </div>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceSwitch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white text-[11px]"
            >
              {audioDevices.length === 0 ? (
                <option value="">Entrada de Audio Predeterminada</option>
              ) : (
                audioDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {getDeviceBadge(d.label)} • {d.label || `Entrada ${i + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* VU Meter & Mic Gain Boost */}
          <div className="space-y-1.5 p-3 bg-[#07090e] border border-[#1b2230] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 uppercase font-bold">NIVEL & GANANCIA (VU METER):</span>
              <span className={`text-[10px] font-bold ${isClipping ? 'text-[#ff1744]' : 'text-gray-300'}`}>
                {currentDbfs} dBFS
              </span>
            </div>
            <div className="w-full bg-[#121622] h-2.5 rounded overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${isClipping ? 'bg-[#ff1744]' : 'bg-[#00ff66]'}`}
                style={{ width: `${Math.min(100, Math.max(0, ((currentDbfs + 60) / 60) * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] text-gray-400">BOOST DIGITAL:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: '0dB', val: 0 },
                  { label: '+3.5dB', val: 3.5 },
                  { label: '+6dB', val: 6 },
                  { label: '+12dB', val: 12 }
                ].map((b) => (
                  <button
                    key={b.val}
                    onClick={() => handleGainChange(b.val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      micGainDb === b.val
                        ? 'bg-[#ffb800] text-black font-black shadow-[0_0_8px_rgba(255,184,0,0.4)]'
                        : 'bg-[#10141e] text-gray-400 hover:text-white border border-[#222a3d]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spoken Language (Orador) */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">IDIOMA HABLADO POR EL ORADOR:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSpokenLangChange('es')}
                className={`py-1.5 rounded border text-center uppercase font-bold flex items-center justify-center gap-1.5 ${
                  spokenLang === 'es' ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                <span>🇪🇸 Español (es-AR)</span>
              </button>
              <button
                onClick={() => handleSpokenLangChange('en')}
                className={`py-1.5 rounded border text-center uppercase font-bold flex items-center justify-center gap-1.5 ${
                  spokenLang === 'en' ? 'bg-[#141b29] border-[#00ff66] text-[#00ff66]' : 'bg-[#07090e] border-[#1e2535] text-gray-400'
                }`}
              >
                <span>🇬🇧 English (en-US)</span>
              </button>
            </div>
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

          {/* Conference Tools & Overlays */}
          <div className="space-y-1.5 pt-2 border-t border-[#181d2a]">
            <label className="text-[10px] text-gray-400 uppercase">HERRAMIENTAS & ACCESOS:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShowQrCorner(!showQrCorner)}
                className={`p-2 rounded border text-left flex items-center gap-2 font-bold transition-all ${
                  showQrCorner ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]' : 'bg-[#07090e] border-[#1e2535] text-gray-300'
                }`}
                title="Mostrar u ocultar código QR en la esquina para la audiencia móvil"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span className="truncate">{showQrCorner ? 'QR Pantalla: ON' : 'QR Pantalla: OFF'}</span>
              </button>

              {onOpenScheduleModal && (
                <button
                  onClick={onOpenScheduleModal}
                  className="p-2 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-cyan-500/40 text-gray-300 hover:text-white flex items-center gap-2 font-bold transition-all"
                  title="Ver agenda completa de charlas oficiales"
                >
                  <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">Agenda Charlas</span>
                </button>
              )}

              {onOpenThemeModal && (
                <button
                  onClick={onOpenThemeModal}
                  className="p-2 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-amber-500/40 text-gray-300 hover:text-white flex items-center gap-2 font-bold transition-all"
                  title="Cambiar skins y temas visuales"
                >
                  <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Temas Visuales</span>
                </button>
              )}

              {onOpenLogModal && (
                <button
                  onClick={onOpenLogModal}
                  className="p-2 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#00f5ff]/40 text-gray-300 hover:text-[#00f5ff] flex items-center gap-2 font-bold transition-all"
                  title="Ver telemetría y logs técnicos en vivo"
                >
                  <Terminal className="w-4 h-4 text-[#00f5ff] shrink-0" />
                  <span className="truncate">Logs & Telemetría</span>
                </button>
              )}

              {onOpenApiKeyModal && (
                <button
                  onClick={onOpenApiKeyModal}
                  className="p-2 rounded bg-[#07090e] hover:bg-[#141b29] border border-[#1e2535] hover:border-[#00f5ff]/40 text-gray-300 hover:text-[#00f5ff] flex items-center gap-2 font-bold transition-all col-span-2"
                  title="Gestionar API Keys, rotación y modelos de IA"
                >
                  <Key className="w-4 h-4 text-[#ffba00] shrink-0" />
                  <span className="truncate">Configurar API Key / Modelos de IA</span>
                </button>
              )}
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
