import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, 
  TechTerm,
  SubtitleChunk,
  AudienceQuestion,
  StageAudioRouting,
  StageAudioRoutingMap,
  AudioSourceKind
} from '../types.js';
import { 
  Sliders, 
  Mic, 
  Square, 
  Play, 
  Upload, 
  Plus, 
  Volume2, 
  Radio, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Sparkles, 
  Activity,
  Layers,
  Cpu,
  Settings2,
  HardDrive,
  Check,
  RefreshCw,
  Gauge,
  Terminal,
  VolumeX,
  Volume1,
  Send,
  Trash2,
  Tv,
  MessageSquare,
  Download,
  ShieldAlert,
  Lock,
  Unlock,
  Timer,
  RotateCcw,
  ShieldCheck,
  Languages,
  Pin,
  ThumbsUp,
  Key,
  Video,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { 
  triggerDemo, 
  stopStage, 
  uploadAudioChunk, 
  addGlossaryTerm, 
  fetchGlossary,
  getAdminToken,
  setAdminToken,
  deleteStageApi,
  clearStageQuestionsApi,
  seedStageQuestionsApi,
  getStageAudioRouting,
  saveStageAudioRouting,
  updateStageApi,
  emergencyClearApi
} from '../services/api.js';
import { 
  RackUnit, 
  HardwareVuMeter, 
  HardwareOscilloscope, 
  HexScrew 
} from './HardwareControls.js';
import { WSClient } from '../services/websocket.js';
import { findBroadcastSplitIndex, formatBroadcastSubtitle, normalizePhoneticTechTerms } from '../utils/broadcastSegmenter.js';
import { AddStageModal } from './AddStageModal.js';

interface AdminViewProps {
  stages: Stage[];
  onSelectStage: (id: string) => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
  onOpenVMixModal?: () => void;
  chunks?: SubtitleChunk[];
  wsClient?: WSClient | null;
  onPushLiveTranscript?: (text: string, sourceLang?: string) => void;
  onSwitchView?: (view: 'audience' | 'admin' | 'overlay' | 'kiosk' | 'mic' | 'multiview') => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  stages,
  onSelectStage,
  geminiConfigured,
  onOpenApiKeyModal,
  onOpenVMixModal,
  chunks = [],
  wsClient,
  onPushLiveTranscript,
  onSwitchView,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'stage-1');
  const selectedStage = stages.find(s => s.id === selectedStageId) || stages[0];
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micSourceLang, setMicSourceLang] = useState<'es' | 'en'>('es');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [glossaryTerms, setGlossaryTerms] = useState<TechTerm[]>([]);
  const [remoteReloadFeedback, setRemoteReloadFeedback] = useState<string | null>(null);

  // YouTube Video Demo State & Presets
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>('IdOO3R_1F08'); // Default: Pelado Nerd K8s
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState<string>('');
  const [customVideoTitle, setCustomVideoTitle] = useState<string>('');
  const [customVideoSpeaker, setCustomVideoSpeaker] = useState<string>('');
  const [isCustomVideo, setIsCustomVideo] = useState<boolean>(false);
  const [customVideoFeedback, setCustomVideoFeedback] = useState<string | null>(null);
  const [activeSyncDemoKey, setActiveSyncDemoKey] = useState<string | null>('talk-yt-peladonerd');
  const [isDemoSyncRunning, setIsDemoSyncRunning] = useState<boolean>(false);

  // Tab Audio Streaming State (Direct Browser Audio Capture for YouTube/Video)
  const [isTabAudioCapturing, setIsTabAudioCapturing] = useState<boolean>(false);
  const tabAudioStreamRef = useRef<MediaStream | null>(null);
  const tabAudioContextRef = useRef<AudioContext | null>(null);
  const tabWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const tabMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tabTargetStageIdRef = useRef<string | null>(null);

  // Audio Patchbay & Routing Matrix State (Rack 02)
  const [stageAudioSource, setStageAudioSource] = useState<Record<string, 'mic' | 'stream' | 'demo' | 'idle'>>({});
  const [stageMicDevice, setStageMicDevice] = useState<Record<string, string>>({});
  const [youtubeTargetStageId, setYoutubeTargetStageId] = useState<string>(stages[0]?.id || 'stage-1');
  const [syncingYoutubeStageId, setSyncingYoutubeStageId] = useState<string | null>(null);

  const extractYoutubeId = (urlOrId: string): string | null => {
    const clean = urlOrId.trim();
    if (!clean) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const handleLoadCustomYoutube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = extractYoutubeId(customYoutubeUrl);
    if (!id) {
      window.alert('Enlace de YouTube no reconocido. Ingresá una URL válida como https://www.youtube.com/watch?v=... o https://youtu.be/...');
      return;
    }

    const titleToUse = customVideoTitle.trim() || 'Video YouTube en Vivo';
    const speakerToUse = customVideoSpeaker.trim() || 'Orador Invitado';
    const targetStageId = youtubeTargetStageId || selectedStageId;

    setYoutubeVideoId(id);
    setIsCustomVideo(true);
    setActiveSyncDemoKey(null); // CRITICAL: Clear Pelado Nerd demo key for custom videos!

    try {
      // 1. Stop any currently running demo on the target stage
      await handleStopStage(targetStageId);

      // 2. Clear old demo subtitle chunks on the target stage so no previous text lingers
      await emergencyClearApi(targetStageId);

      // 3. Update the stage title and speaker immediately in backend & across all clients
      await updateStageApi(targetStageId, {
        talkTitle: titleToUse,
        speaker: speakerToUse,
        track: 'Video en Vivo'
      });

      setCustomVideoFeedback(`¡Video cargado! Sala "${targetStageId}" configurada con "${titleToUse}" (${speakerToUse}).`);
      setTimeout(() => setCustomVideoFeedback(null), 5000);
    } catch (err: any) {
      console.warn('Error updating stage for custom video:', err);
      setCustomVideoFeedback(`Video cargado. (Aviso: ${err.message})`);
      setTimeout(() => setCustomVideoFeedback(null), 5000);
    }
  };

  const YOUTUBE_NERDEARLA_TALKS = [
    {
      id: 'IdOO3R_1F08',
      demoKey: 'talk-yt-peladonerd',
      title: 'Pelado Nerd - Kubernetes en Prod',
      speaker: 'Pablo Fredrikson',
      tag: 'K8S & CLOUD',
      color: '#00f5ff'
    },
    {
      id: 'sIprvJ2i1lg',
      demoKey: 'talk-yt-argorollouts',
      title: 'Lucas Blanco - Argo Rollouts',
      speaker: 'Lucas Blanco',
      tag: 'DEVOPS & CI/CD',
      color: '#00ff66'
    },
    {
      id: 'iqVGWI1Y880',
      demoKey: 'talk-yt-testingk8s',
      title: 'Carlos Gauto - Testing K8s & Chaos',
      speaker: 'Carlos Gauto',
      tag: 'SRE & CHAOS',
      color: '#ffb800'
    }
  ];

  const handleSelectPresetTalk = async (t: typeof YOUTUBE_NERDEARLA_TALKS[0]) => {
    setIsCustomVideo(false);
    setYoutubeVideoId(t.id);
    setActiveSyncDemoKey(t.demoKey);

    const targetStageId = youtubeTargetStageId || selectedStageId;
    try {
      await updateStageApi(targetStageId, {
        talkTitle: t.title,
        speaker: t.speaker,
        track: t.tag
      });
      if (isDemoSyncRunning) {
        await handleTriggerDemo(targetStageId, t.demoKey);
      }
    } catch (err: any) {
      console.warn('Error selecting preset talk:', err);
    }
  };

  // Audience Q&A Moderation State
  const [adminQuestions, setAdminQuestions] = useState<AudienceQuestion[]>([]);
  const [qaFilter, setQaFilter] = useState<'all' | 'on_stage' | 'pending' | 'approved'>('all');

  const fetchAdminQuestions = React.useCallback(() => {
    fetch(`/api/stages/${selectedStageId}/questions`)
      .then(res => res.json())
      .then(data => {
        if (data.questions) setAdminQuestions(data.questions);
      })
      .catch(err => console.warn('[Admin QA] Fetch error:', err));
  }, [selectedStageId]);

  useEffect(() => {
    fetchAdminQuestions();
    const interval = setInterval(fetchAdminQuestions, 6000);
    return () => clearInterval(interval);
  }, [fetchAdminQuestions]);

  const handleUpdateQuestionStatus = async (qId: string, status: AudienceQuestion['status']) => {
    try {
      if (wsClient) {
        wsClient.sendQAStatus(selectedStageId, qId, status);
      } else {
        await fetch(`/api/stages/${selectedStageId}/questions/${qId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      }
      // Optimistic local update
      setAdminQuestions(prev => prev.map(q => {
        if (status === 'on_stage' && q.id !== qId && q.status === 'on_stage') {
          return { ...q, status: 'approved' };
        }
        return q.id === qId ? { ...q, status } : q;
      }));
    } catch (err) {
      console.error('[Admin QA] Status update error:', err);
    }
  };
  
  // Audio Devices & Hardware Diagnostics
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Persistent Per-Stage Audio Routing Matrix (aura_stage_audio_routing)
  const [stageRouting, setStageRouting] = useState<StageAudioRoutingMap>(() => getStageAudioRouting());
  const activeStreamingStageRef = useRef<string | null>(null);

  const updateStageAudioAssignment = (stageId: string, deviceId: string, customLabel?: string) => {
    const matchedDev = audioDevices.find((d) => d.deviceId === deviceId);
    const label = customLabel || matchedDev?.label || (deviceId ? `Dispositivo (${deviceId.slice(0, 8)}...)` : 'Sin asignar');
    
    setStageRouting((prev) => {
      const current = prev[stageId] || { sourceKind: 'idle' };
      const updated: StageAudioRoutingMap = {
        ...prev,
        [stageId]: {
          deviceId,
          deviceLabel: label,
          sourceKind: current.sourceKind || 'idle',
        },
      };
      saveStageAudioRouting(updated);
      return updated;
    });
  };

  const updateStageSourceKind = (stageId: string, sourceKind: AudioSourceKind) => {
    setStageRouting((prev) => {
      const current = prev[stageId] || {
        deviceId: '',
        deviceLabel: 'Sin asignar',
        sourceKind: 'idle',
      };
      const updated: StageAudioRoutingMap = {
        ...prev,
        [stageId]: {
          ...current,
          sourceKind,
        },
      };
      saveStageAudioRouting(updated);
      return updated;
    });
  };

  const handleDeviceChange = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    updateStageAudioAssignment(selectedStageId, newDeviceId);
  };

  const handleSelectStage = (stageId: string) => {
    if (stageId === selectedStageId) return;

    // Clean state transition: if mic streaming is active on previous stage, stop it cleanly
    if (isRecordingRef.current) {
      console.log(`[AudioRouting] Clean transition: stopping active mic stream on [${selectedStageId}] before switching to [${stageId}]`);
      stopMicStreaming(selectedStageId);
    }

    if (soundCheckStreamRef.current) {
      stopSoundCheck();
      setIsSoundChecking(false);
    }

    setSelectedStageId(stageId);
    onSelectStage(stageId);
  };

  // Synchronize selectedDeviceId when switching stages or when audio devices load
  useEffect(() => {
    const stageConfig = stageRouting[selectedStageId];
    if (stageConfig?.deviceId) {
      setSelectedDeviceId(stageConfig.deviceId);
    } else if (audioDevices.length > 0) {
      // Allocate discrete input if multiple are connected, fallback to first
      const stageIdx = stages.findIndex((s) => s.id === selectedStageId);
      const chosenDev = audioDevices[stageIdx >= 0 && stageIdx < audioDevices.length ? stageIdx : 0];
      const devId = chosenDev.deviceId;
      const label = chosenDev.label || `Entrada de Audio ${stageIdx + 1}`;
      setSelectedDeviceId(devId);
      updateStageAudioAssignment(selectedStageId, devId, label);
    }
  }, [selectedStageId, audioDevices]);

  const [hardwareStats, setHardwareStats] = useState({
    audioContextSupported: true,
    mediaRecorderSupported: true,
    sampleRate: 48000,
    hasMicrophoneConnected: false,
  });

  // Sound Check Pre-flight state
  const [isSoundChecking, setIsSoundChecking] = useState(false);
  const [soundCheckProgress, setSoundCheckProgress] = useState(0);
  const [soundCheckResult, setSoundCheckResult] = useState<{
    peakDb: number;
    avgDb: number;
    status: 'optimal' | 'low' | 'clipping';
  } | null>(null);

  // Metering state
  const [currentDbfs, setCurrentDbfs] = useState(-60);
  const [isClipping, setIsClipping] = useState(false);

  // Custom term form state
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newCategory, setNewCategory] = useState<TechTerm['category']>('devops');
  const [formSuccess, setFormSuccess] = useState(false);

  // Real-time Voice Recognition & Prompter state
  const [liveInterimText, setLiveInterimText] = useState('');
  const [manualText, setManualText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);

  // Audio Recording & Speech Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const soundCheckStreamRef = useRef<MediaStream | null>(null);
  const soundCheckAudioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const committedCharsRef = useRef(0);
  const silenceFlushTimerRef = useRef<any>(null);

  // Broadcast Operator Security Lock & Auth Token
  const [isConsoleLocked, setIsConsoleLocked] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [adminToken, setAdminTokenState] = useState<string>(() => getAdminToken());

  // Audio Pipeline Watchdog & Session Rotation (Sysarmy 8-Minute Auto-Heal Watchdog)
  const [sessionUptimeSeconds, setSessionUptimeSeconds] = useState(0);
  const [rotationCount, setRotationCount] = useState(0);
  const [watchdogStatus, setWatchdogStatus] = useState<'NOMINAL' | 'ROTATING'>('NOMINAL');
  const sessionTimerRef = useRef<any>(null);

  const formatUptime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const triggerWatchdogRotation = () => {
    setWatchdogStatus('ROTATING');
    setRotationCount((prev) => prev + 1);
    console.log('[Project Aura] 8-Minute Watchdog rotation triggered: refreshing speech recognition buffer...');

    // Transparently restart recognition to clear browser Web Speech / MediaRecorder buffers
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    setTimeout(() => {
      setWatchdogStatus('NOMINAL');
    }, 1200);
  };

  const guardAction = (action: () => void, label: string) => {
    if (isConsoleLocked) {
      setLockNotice(`Acción "${label}" bloqueada por el cerrojo de producción. Desbloquea la consola de operador arriba.`);
      setTimeout(() => setLockNotice(null), 3500);
      return;
    }
    action();
  };

  useEffect(() => {
    if (isRecording) {
      setSessionUptimeSeconds(0);
      sessionTimerRef.current = setInterval(() => {
        setSessionUptimeSeconds((prev) => {
          const next = prev + 1;
          // Auto-rotation every 8 minutes (480 seconds)
          if (next > 0 && next % 480 === 0) {
            triggerWatchdogRotation();
          }
          return next;
        });
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      setSessionUptimeSeconds(0);
      setWatchdogStatus('NOMINAL');
    }

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    fetchGlossary().then(setGlossaryTerms);
    refreshAudioDevices();
    checkHardwareCompatibility();

    const hasSpeech = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechApiAvailable(hasSpeech);

    return () => {
      stopMicStreaming();
      stopSoundCheck();
      stopTabAudioCapture();
    };
  }, []);

  const checkHardwareCompatibility = () => {
    const hasAudioCtx = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
    const hasMediaRec = typeof window !== 'undefined' && 'MediaRecorder' in window;
    let sr = 48000;
    if (hasAudioCtx) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        sr = ctx.sampleRate;
        ctx.close();
      } catch (e) {}
    }

    setHardwareStats({
      audioContextSupported: hasAudioCtx,
      mediaRecorderSupported: hasMediaRec,
      sampleRate: sr,
      hasMicrophoneConnected: false,
    });
  };

  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setAudioError('MediaDevices API no disponible en este navegador');
        return;
      }

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
      setHardwareStats((prev) => ({
        ...prev,
        hasMicrophoneConnected: audioInputs.length > 0,
      }));

      // Synchronize and seed stage audio routing with enumerated physical devices
      setStageRouting((prev) => {
        let hasChanges = false;
        const updated = { ...prev };

        stages.forEach((stg, index) => {
          const existing = updated[stg.id];
          if (!existing || !existing.deviceId) {
            // Allocate distinct input if multiple are available (e.g. Mic 1 for Stage 1, Mic 2 for Stage 2)
            const dev = audioInputs[index < audioInputs.length ? index : 0];
            if (dev) {
              updated[stg.id] = {
                deviceId: dev.deviceId,
                deviceLabel: dev.label || `Entrada de Audio ${index + 1}`,
                sourceKind: existing?.sourceKind || 'idle',
              };
              hasChanges = true;
            }
          } else {
            // Update device label if it was previously empty or changed in system
            const matched = audioInputs.find((d) => d.deviceId === existing.deviceId);
            if (matched && matched.label && matched.label !== existing.deviceLabel) {
              updated[stg.id] = {
                ...existing,
                deviceLabel: matched.label,
              };
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          saveStageAudioRouting(updated);
        }
        return updated;
      });

      // Synchronize stageMicDevice helper state for backward compatibility
      setStageMicDevice((prev) => {
        const next = { ...prev };
        stages.forEach((stg, i) => {
          const fromRouting = stageRouting[stg.id]?.deviceId;
          if (fromRouting) {
            next[stg.id] = fromRouting;
          } else if (!next[stg.id] && audioInputs.length > 0) {
            next[stg.id] = audioInputs[i % audioInputs.length].deviceId;
          }
        });
        return next;
      });

      const currentRouting = stageRouting[selectedStageId];
      if (currentRouting?.deviceId) {
        setSelectedDeviceId(currentRouting.deviceId);
      } else if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err: any) {
      console.warn('Error escaneando dispositivos:', err);
    }
  };

  // Pre-flight 4-second sound check
  const startSoundCheck = async () => {
    try {
      setAudioError(null);
      setIsSoundChecking(true);
      setSoundCheckProgress(0);
      setSoundCheckResult(null);

      const targetDeviceId = stageRouting[selectedStageId]?.deviceId || selectedDeviceId;
      let stream: MediaStream;
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: targetDeviceId } },
          });
        } catch (exactErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { ideal: targetDeviceId } },
            });
          } catch (idealErr) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      soundCheckStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      soundCheckAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let peakValue = 0;
      let totalValue = 0;
      let sampleCount = 0;

      const intervalMs = 100;
      const totalSteps = 40; // 4 seconds total
      let currentStep = 0;

      const checkInterval = setInterval(() => {
        currentStep++;
        setSoundCheckProgress(Math.round((currentStep / totalSteps) * 100));

        analyser.getByteTimeDomainData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          const val = Math.abs(dataArray[i] - 128);
          if (val > peakValue) peakValue = val;
          totalValue += val;
          sampleCount++;
        }

        if (currentStep >= totalSteps) {
          clearInterval(checkInterval);
          stopSoundCheck();

          const normPeak = peakValue / 128;
          const peakDb = normPeak > 0 ? Math.round(20 * Math.log10(normPeak)) : -60;
          const normAvg = (totalValue / sampleCount) / 128;
          const avgDb = normAvg > 0 ? Math.round(20 * Math.log10(normAvg)) : -60;

          let status: 'optimal' | 'low' | 'clipping' = 'optimal';
          if (peakDb >= -1) status = 'clipping';
          else if (peakDb < -22) status = 'low';

          setSoundCheckResult({ peakDb, avgDb, status });
          setIsSoundChecking(false);
        }
      }, intervalMs);
    } catch (err: any) {
      setAudioError(`Fallo al iniciar prueba de nivel: ${err.message}`);
      setIsSoundChecking(false);
    }
  };

  const stopSoundCheck = () => {
    if (soundCheckStreamRef.current) {
      soundCheckStreamRef.current.getTracks().forEach((t) => t.stop());
      soundCheckStreamRef.current = null;
    }
    if (soundCheckAudioCtxRef.current) {
      soundCheckAudioCtxRef.current.close().catch(() => {});
      soundCheckAudioCtxRef.current = null;
    }
  };

  const commitAdminPhrase = (phrase: string, lang: 'es' | 'en', overrideStageId?: string) => {
    const raw = phrase.trim();
    if (!raw) return;
    const clean = normalizePhoneticTechTerms(raw);
    const targetStage = overrideStageId || activeStreamingStageRef.current || selectedStageId;

    if (onPushLiveTranscript && targetStage === selectedStageId) {
      onPushLiveTranscript(clean, lang);
    } else {
      fetch(`/api/stages/${targetStage}/live-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, sourceLang: lang })
      }).catch(console.error);
    }
  };

  /**
   * Broadcast-Grade SpeechRecognition factory for Mesa Técnica.
   * Chunks long continuous speech into coherent 10-14 word broadcast subtitles.
   * Natural breath pause timer (1200ms) prevents fragmented single-word cards.
   */
  const createAndStartAdminRecognition = (overrideLang?: 'es' | 'en') => {
    if (!isRecordingRef.current) return;

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
    if (!SpeechRecognition) return;

    const targetLang = overrideLang || micSourceLang;

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
            if (finalRemaining) {
              commitAdminPhrase(finalRemaining, targetLang);
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

            // Broadcast phrase chunking: 10-14 words for natural subtitle reading rhythm
            while (true) {
              const uncommitted = transcript.substring(committedCharsRef.current).trimStart();
              if (!uncommitted) break;

              const splitPos = findBroadcastSplitIndex(uncommitted, {
                maxWords: 13,
                maxChars: 75,
                minWordsBeforeCut: 7,
              });

              if (splitPos === null) break;

              const chunkText = uncommitted.substring(0, splitPos).trim();
              if (!chunkText) break;

              // Commit this broadcast-ready phrase immediately!
              commitAdminPhrase(chunkText, targetLang);

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

            // Natural acoustic pause detection: 1200ms of silence flushes any finished thought
            if (remaining.length > 0) {
              silenceFlushTimerRef.current = setTimeout(() => {
                const toFlush = transcript.substring(committedCharsRef.current).trim();
                if (toFlush) {
                  commitAdminPhrase(toFlush, targetLang);
                  committedCharsRef.current = transcript.length;
                  setLiveInterimText('');
                }
              }, 1200);
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[Admin SpeechRecognition Error]', e.error);
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

        if (isRecordingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              createAndStartAdminRecognition(targetLang);
            }
          }, 150);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Admin SpeechRecognition initialization error:', err);
      if (isRecordingRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) createAndStartAdminRecognition(targetLang);
        }, 1000);
      }
    }
  };

  const handleMicSourceLangChange = (newLang: 'es' | 'en') => {
    setMicSourceLang(newLang);
    if (isRecordingRef.current) {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) createAndStartAdminRecognition(newLang);
      }, 100);
    }
  };

  const startMicStreaming = async () => {
    try {
      setAudioError(null);
      setLiveInterimText('');
      isRecordingRef.current = true;
      activeStreamingStageRef.current = selectedStageId;

      // Clean state transition: ensure previous audio stream is stopped before opening a new one
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      // 1. Resolve assigned deviceId for the current stage
      const assignedRouting = stageRouting[selectedStageId];
      const targetDeviceId = assignedRouting?.deviceId || stageMicDevice[selectedStageId] || selectedDeviceId;

      // Pro-AV constraint hierarchy: exact deviceId -> ideal deviceId -> default audio
      let stream: MediaStream;
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: targetDeviceId },
            },
          });
          console.log(`[AudioRouting] Streaming started for stage [${selectedStageId}] with EXACT deviceId: ${targetDeviceId}`);
        } catch (exactErr) {
          console.warn(`[AudioRouting] Exact device constraint failed for ${targetDeviceId}, attempting IDEAL fallback:`, exactErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { ideal: targetDeviceId },
              },
            });
            console.log(`[AudioRouting] Streaming started for stage [${selectedStageId}] with IDEAL deviceId fallback: ${targetDeviceId}`);
          } catch (idealErr) {
            console.warn('[AudioRouting] Ideal device constraint failed, falling back to default audio input:', idealErr);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Update persistent routing state to 'mic'
      updateStageSourceKind(selectedStageId, 'mic');
      setStageAudioSource((prev) => ({ ...prev, [selectedStageId]: 'mic' }));

      // Metering interval
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

      // 2. Launch high-fidelity 16kHz PCM AudioWorklet for Gemini 3.5 Live streaming
      const targetStageId = selectedStageId;
      if (audioCtx.audioWorklet) {
        try {
          await audioCtx.audioWorklet.addModule('/worklets/pcm-processor.js');
          const workletNode = new AudioWorkletNode(audioCtx, 'streaming-pcm-resampler');
          workletNode.port.onmessage = (event) => {
            if (event.data?.type === 'pcm_chunk' && event.data.buffer) {
              const bytes = new Uint8Array(event.data.buffer);
              let binary = '';
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = window.btoa(binary);
              if (wsClient) {
                wsClient.sendPcmChunk(targetStageId, base64);
              }
            }
          };
          source.connect(workletNode);
          workletNodeRef.current = workletNode;
          console.log(`[AdminView] High-fidelity 16kHz PCM AudioWorklet connected for stage ${targetStageId}`);
        } catch (e) {
          console.warn('[AdminView] AudioWorklet init warning (fallback to WebSpeech/MediaRecorder):', e);
        }
      }

      // 3. Launch resilient speech recognition
      createAndStartAdminRecognition();

      // 4. MediaRecorder chunk backup
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (event.data && event.data.size > 0 && !SpeechRec) {
          try {
            await uploadAudioChunk(targetStageId, event.data);
          } catch (e: any) {
            console.warn('Audio chunk upload failed:', e);
          }
        }
      };

      mediaRecorder.start(4000);
      setIsRecording(true);
    } catch (err: any) {
      setAudioError(`No se pudo acceder al micrófono: ${err.message}`);
      setIsRecording(false);
      isRecordingRef.current = false;
      activeStreamingStageRef.current = null;
    }
  };

  const stopMicStreaming = (stageIdToStop?: string) => {
    isRecordingRef.current = false;
    const stageId = stageIdToStop || activeStreamingStageRef.current || selectedStageId;
    activeStreamingStageRef.current = null;
    setLiveInterimText('');

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

    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch (e) {}
      workletNodeRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setCurrentDbfs(-60);
    setIsClipping(false);

    if (stageId) {
      updateStageSourceKind(stageId, 'idle');
      setStageAudioSource((prev) => ({ ...prev, [stageId]: 'idle' }));
    }
  };

  const handleQuickUpdateStageTalk = async (targetStageId: string, talkTitle: string, speaker: string) => {
    try {
      await updateStageApi(targetStageId, {
        talkTitle: talkTitle.trim() || 'Charla Técnica en Vivo',
        speaker: speaker.trim() || 'Orador Invitado'
      });
      setCustomVideoFeedback(`¡Título y orador actualizados en ${targetStageId}!`);
      setTimeout(() => setCustomVideoFeedback(null), 3500);
    } catch (err: any) {
      setAudioError(`Error al actualizar charla: ${err.message}`);
    }
  };

  const startTabAudioCapture = async (targetStageId: string) => {
    try {
      setAudioError(null);
      stopTabAudioCapture();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Tu navegador no soporta captura de audio de pantalla/pestaña (getDisplayMedia).');
      }

      // Request screen/tab sharing with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error(
          'No se detectó pista de audio. Al compartir la pestaña de YouTube en Chrome, asegurate de activar la casilla "Compartir audio de la pestaña" en el cuadro de diálogo.'
        );
      }

      tabAudioStreamRef.current = stream;
      tabTargetStageIdRef.current = targetStageId;
      setIsTabAudioCapturing(true);

      audioTracks[0].onended = () => {
        stopTabAudioCapture();
      };
      if (stream.getVideoTracks().length > 0) {
        stream.getVideoTracks()[0].onended = () => {
          stopTabAudioCapture();
        };
      }

      // Mark stage as live with stream source
      updateStageSourceKind(targetStageId, 'youtube');
      setStageAudioSource((prev) => ({ ...prev, [targetStageId]: 'stream' }));
      updateStageApi(targetStageId, { isLive: true, currentAudioSource: 'stream' }).catch(() => {});

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      tabAudioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // AudioWorklet resampler for 16kHz linear PCM streaming to Gemini Live
      if (audioCtx.audioWorklet) {
        try {
          await audioCtx.audioWorklet.addModule('/worklets/pcm-processor.js');
          const workletNode = new AudioWorkletNode(audioCtx, 'streaming-pcm-resampler');
          workletNode.port.onmessage = (event) => {
            if (event.data?.type === 'pcm_chunk' && event.data.buffer) {
              const bytes = new Uint8Array(event.data.buffer);
              let binary = '';
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = window.btoa(binary);
              if (wsClient) {
                wsClient.sendPcmChunk(targetStageId, base64);
              }
            }
          };
          source.connect(workletNode);
          tabWorkletNodeRef.current = workletNode;
        } catch (e) {
          console.warn('[AdminView] Tab AudioWorklet init error, using fallback:', e);
        }
      }

      // MediaRecorder fallback chunk ingest
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      tabMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          try {
            await uploadAudioChunk(targetStageId, event.data);
          } catch (e) {
            console.warn('[AdminView] Tab chunk upload failed:', e);
          }
        }
      };
      mediaRecorder.start(4000);
    } catch (err: any) {
      console.error('startTabAudioCapture error:', err);
      setAudioError(err.message || 'Error al capturar audio de pestaña');
      setIsTabAudioCapturing(false);
      tabTargetStageIdRef.current = null;
    }
  };

  const stopTabAudioCapture = () => {
    const targetStageId = tabTargetStageIdRef.current;
    if (tabAudioStreamRef.current) {
      tabAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      tabAudioStreamRef.current = null;
    }
    if (tabWorkletNodeRef.current) {
      try {
        tabWorkletNodeRef.current.disconnect();
      } catch (e) {}
      tabWorkletNodeRef.current = null;
    }
    if (tabMediaRecorderRef.current && tabMediaRecorderRef.current.state !== 'inactive') {
      try {
        tabMediaRecorderRef.current.stop();
      } catch (e) {}
      tabMediaRecorderRef.current = null;
    }
    if (tabAudioContextRef.current) {
      tabAudioContextRef.current.close().catch(() => {});
      tabAudioContextRef.current = null;
    }
    setIsTabAudioCapturing(false);
    tabTargetStageIdRef.current = null;

    if (targetStageId) {
      updateStageSourceKind(targetStageId, 'idle');
      setStageAudioSource((prev) => ({ ...prev, [targetStageId]: 'idle' }));
      updateStageApi(targetStageId, { isLive: false, currentAudioSource: 'idle' }).catch(() => {});
    }
  };

  const handleSendManualText = (textToSend?: string) => {
    const text = (textToSend || manualText).trim();
    if (!text) return;
    setIsSendingManual(true);

    if (onPushLiveTranscript) {
      onPushLiveTranscript(text);
    } else {
      fetch(`/api/stages/${selectedStageId}/live-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: 'es' })
      }).catch(console.error);
    }

    if (!textToSend) setManualText('');
    setTimeout(() => setIsSendingManual(false), 300);
  };

  const handleDeleteLastChunk = async () => {
    try {
      if (wsClient) {
        wsClient.deleteLastChunk(selectedStageId);
      } else {
        await fetch(`/api/stages/${selectedStageId}/chunks/last`, {
          method: 'DELETE'
        });
      }
    } catch (err: any) {
      console.warn('Failed to delete last chunk:', err);
    }
  };

  const handleEmergencyClear = async () => {
    try {
      if (wsClient) {
        wsClient.sendEmergencyClear(selectedStageId);
      } else {
        await fetch(`/api/stages/${selectedStageId}/emergency-clear`, {
          method: 'POST'
        });
      }
    } catch (err: any) {
      console.warn('Failed to emergency clear:', err);
    }
  };

  const handleRemoteReloadNode = async (stageId: string, stageName: string) => {
    try {
      if (wsClient) {
        wsClient.sendRemoteReload(stageId);
      } else {
        await fetch(`/api/stages/${stageId}/remote-reload`, { method: 'POST' });
      }
      setRemoteReloadFeedback(`¡Comando F5 emitido a la Mini PC de ${stageName}!`);
      setTimeout(() => setRemoteReloadFeedback(null), 3500);
    } catch (err: any) {
      console.warn('Remote reload error:', err);
    }
  };

  const handleTriggerDemo = async (stageId: string, demoKey?: string | null) => {
    try {
      if (!demoKey) {
        // Custom video - don't run canned demo simulation!
        return;
      }
      if (isRecording && selectedStageId === stageId) {
        stopMicStreaming(stageId);
      }
      if (isTabAudioCapturing) {
        stopTabAudioCapture();
      }
      setIsDemoSyncRunning(true);
      if (demoKey === activeSyncDemoKey) {
        setSyncingYoutubeStageId(stageId);
        updateStageSourceKind(stageId, 'youtube');
      } else {
        updateStageSourceKind(stageId, 'demo');
      }
      setStageAudioSource((prev) => ({
        ...prev,
        [stageId]: demoKey === activeSyncDemoKey ? 'stream' : 'demo'
      }));
      await triggerDemo(stageId, demoKey);
      if (wsClient) {
        wsClient.setStage(stageId);
      }
    } catch (err: any) {
      setAudioError(`Error al activar demo: ${err.message}`);
      setIsDemoSyncRunning(false);
      setSyncingYoutubeStageId(null);
      updateStageSourceKind(stageId, 'idle');
    }
  };

  const handleStopStage = async (stageId: string) => {
    try {
      if (syncingYoutubeStageId === stageId || youtubeTargetStageId === stageId) {
        setIsDemoSyncRunning(false);
        setSyncingYoutubeStageId(null);
      }
      if (tabTargetStageIdRef.current === stageId || youtubeTargetStageId === stageId) {
        stopTabAudioCapture();
      }
      updateStageSourceKind(stageId, 'idle');
      setStageAudioSource((prev) => ({ ...prev, [stageId]: 'idle' }));
      await stopStage(stageId);
      if (isRecording && (selectedStageId === stageId || activeStreamingStageRef.current === stageId)) {
        stopMicStreaming(stageId);
      }
    } catch (err: any) {
      setAudioError(`Error al detener escenario: ${err.message}`);
    }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm || !newDefinition) return;

    await addGlossaryTerm({
      term: newTerm.trim(),
      definition: newDefinition.trim(),
      category: newCategory,
    });

    const updated = await fetchGlossary();
    setGlossaryTerms(updated);
    setNewTerm('');
    setNewDefinition('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 2000);
  };

  const isSecureContext = typeof window !== 'undefined' 
    ? (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    : true;

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];
  const youtubeTargetStage = stages.find((s) => s.id === youtubeTargetStageId) || currentStage;

  const getEffectiveSource = (stage: Stage): 'mic' | 'stream' | 'demo' | 'idle' => {
    if (isRecording && selectedStageId === stage.id) return 'mic';
    if ((isDemoSyncRunning && youtubeTargetStage.id === stage.id) || syncingYoutubeStageId === stage.id) return 'stream';
    const routingSource = stageRouting[stage.id]?.sourceKind;
    if (routingSource === 'youtube') return 'stream';
    if (routingSource === 'mic' || routingSource === 'demo' || routingSource === 'idle') return routingSource;
    if (stageAudioSource[stage.id]) return stageAudioSource[stage.id];
    if (stage.currentAudioSource === 'stream') return 'stream';
    if (stage.currentAudioSource === 'demo') return 'demo';
    if (stage.currentAudioSource === 'mic') return 'mic';
    return 'idle';
  };

  const handleAssignDeviceToStage = (stageId: string, deviceId: string) => {
    updateStageAudioAssignment(stageId, deviceId);
    setStageMicDevice((prev) => ({ ...prev, [stageId]: deviceId }));
    if (stageId === selectedStageId) {
      setSelectedDeviceId(deviceId);
    }
  };

  const handleActivateMicForStage = (stageId: string) => {
    handleSelectStage(stageId);
    const assignedDev = stageRouting[stageId]?.deviceId || stageMicDevice[stageId] || selectedDeviceId;
    if (assignedDev) {
      setSelectedDeviceId(assignedDev);
    }
    updateStageSourceKind(stageId, 'mic');
    setStageAudioSource((prev) => ({ ...prev, [stageId]: 'mic' }));
    startMicStreaming();
  };

  const handleSelectStageSource = async (stageId: string, source: 'mic' | 'stream' | 'demo' | 'idle') => {
    const kind: AudioSourceKind = source === 'stream' ? 'youtube' : source;
    updateStageSourceKind(stageId, kind);
    setStageAudioSource((prev) => ({ ...prev, [stageId]: source }));
    if (source === 'mic') {
      handleSelectStage(stageId);
      const assignedDev = stageRouting[stageId]?.deviceId || stageMicDevice[stageId] || selectedDeviceId;
      if (assignedDev) {
        setSelectedDeviceId(assignedDev);
      }
    } else if (source === 'stream') {
      setYoutubeTargetStageId(stageId);
      setSyncingYoutubeStageId(stageId);
      if (isRecording && selectedStageId === stageId) {
        stopMicStreaming(stageId);
      }
      await handleTriggerDemo(stageId, activeSyncDemoKey);
    } else if (source === 'demo') {
      if (isRecording && selectedStageId === stageId) {
        stopMicStreaming(stageId);
      }
      const demoKey = stageId === 'stage-1' ? 'talk-en-k8s' : 'talk-es-devops';
      await handleTriggerDemo(stageId, demoKey);
    } else if (source === 'idle') {
      if (isRecording && selectedStageId === stageId) {
        stopMicStreaming(stageId);
      }
      if (syncingYoutubeStageId === stageId) {
        setSyncingYoutubeStageId(null);
        setIsDemoSyncRunning(false);
      }
      await handleStopStage(stageId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4">
      
      {/* INSECURE CONTEXT / HTTP LAN SECURITY ALERT */}
      {!isSecureContext && (
        <div className="p-4 bg-gradient-to-r from-amber-950/80 to-[#121622] border-2 border-amber-500/70 rounded-xl text-amber-200 font-mono text-sm shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-pulse">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>ALERTA DE SEGURIDAD DEL NAVEGADOR: HTTP DETECTADO EN RED LOCAL</span>
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              Google Chrome y los navegadores modernos bloquean el micrófono y las interfaces de audio fuera de <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">localhost</code> a menos que la conexión use <strong>HTTPS</strong>.
            </p>
          </div>
          <a
            href={typeof window !== 'undefined' ? window.location.href.replace(/^http:/, 'https:') : '#'}
            className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs rounded uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>ACTIVAR HTTPS Y DESBLOQUEAR MIC</span>
          </a>
        </div>
      )}

      {/* QUICK STAGE SWITCHER BAR (MULTI-SALA INTUITIVO) */}
      <div className="bg-[#0b0e15] border-2 border-[#1c2333] rounded-xl p-3 flex flex-col gap-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-1.5 uppercase">
              <Radio className="w-4 h-4 text-[#00f5ff]" />
              CONTROL DE SALAS:
            </span>
            <span className="text-xs font-mono text-gray-400">
              (Haz clic en cualquier sala para conmutar la transmisión)
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {stages.map((stg, index) => {
              const isSelected = stg.id === selectedStageId;
              return (
                <button
                  key={stg.id}
                  onClick={() => handleSelectStage(stg.id)}
                  className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-[#121c2d] border-[#00f5ff] text-white shadow-[0_0_12px_rgba(0,245,255,0.25)]'
                      : 'bg-[#07090e] border-[#1e2535] text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${stg.isLive ? 'bg-[#ff1744] animate-pulse shadow-[0_0_6px_#ff1744]' : 'bg-[#2a3449]'}`} />
                  <span>CH 0{index + 1}: {stg.name}</span>
                  {stageRouting[stg.id]?.deviceId && (
                    <span className="px-1.5 py-0.5 rounded bg-[#101522] border border-[#20293d] text-[9px] text-[#00f5ff] flex items-center gap-1">
                      <Mic className="w-2.5 h-2.5" />
                      <span className="max-w-[70px] truncate">{stageRouting[stg.id]?.deviceLabel || 'Mic'}</span>
                    </span>
                  )}
                  {stg.audienceCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] text-[#00ff66]">
                      {stg.audienceCount} 👤
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUICK POPOUT & MULTIVIEWER ACTION ROW */}
        <div className="w-full pt-2.5 border-t border-[#1c2333] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">ACCESOS RÁPIDOS // SALA:</span>
            <span className="font-bold text-[#00f5ff] uppercase px-2 py-0.5 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00f5ff] animate-ping" />
              {selectedStage?.name || selectedStageId}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => window.open(`/?view=kiosk&stage=${selectedStageId}`, '_blank')}
              className="px-2.5 py-1 rounded bg-[#0e1626] hover:bg-[#15233d] border border-[#00f5ff]/40 text-[#00f5ff] font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Abre la pantalla de confianza del escenario en una nueva pestaña"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>↗ KIOSK ESCENARIO</span>
            </button>

            <button
              onClick={() => window.open(`/?view=overlay&stage=${selectedStageId}&lang=es&theme=vmix`, '_blank')}
              className="px-2.5 py-1 rounded bg-[#1e111a] hover:bg-[#2b1725] border border-[#ff1744]/40 text-[#ff1744] font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Abre el overlay transparente para OBS Studio o vMix"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>↗ OVERLAY OBS/vMIX</span>
            </button>

            <button
              onClick={() => window.open(`/?stage=${selectedStageId}`, '_blank')}
              className="px-2.5 py-1 rounded bg-[#0d1e16] hover:bg-[#142e22] border border-[#00ff66]/40 text-[#00ff66] font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Abre la vista web para asistentes y teléfonos móviles"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>↗ MÓVIL AUDIENCIA</span>
            </button>

            <div className="h-4 w-px bg-[#2a3449] mx-1" />

            {onSwitchView && (
              <button
                onClick={() => onSwitchView('multiview')}
                className="px-2.5 py-1 rounded bg-[#2e1065]/60 hover:bg-[#2e1065] border border-[#a855f7] text-[#c084fc] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Conmuta al monitor maestro multiviewer con todas las salas en vivo"
              >
                <Layers className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>👁️ MULTIVIEWER GENERAL</span>
              </button>
            )}

            <button
              onClick={() => {
                stages.forEach((stg) => {
                  window.open(`/?view=kiosk&stage=${stg.id}`, '_blank');
                });
              }}
              className="px-2 py-1 rounded bg-[#10141e] hover:bg-[#1a2233] border border-gray-700 text-gray-300 hover:text-white flex items-center gap-1 transition-all"
              title="Abre todas las salas en pestañas separadas del navegador para pruebas simultáneas"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>ABRIR TODAS ({stages.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 19" RACK UNIT 01: MASTER PRODUCTION DESK & TELEMETRY */}
      <RackUnit


        unitId="RACK_01"
        uHeight="1U"
        title="MASTER PRODUCTION DESK // BROADCAST TELEMETRY"
        subTitle="Control central de audio, latencias de streaming y motor Gemini 2.5 Flash"
        rightBadge={
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap justify-end">
            {isRecording && (
              <div className="px-2 py-1 rounded bg-[#07090e] border border-[#1b2230] flex items-center gap-1.5 text-gray-300">
                <Timer className="w-3.5 h-3.5 text-[#00f5ff] animate-pulse" />
                <span>UPTIME: {formatUptime(sessionUptimeSeconds)}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  watchdogStatus === 'ROTATING' 
                    ? 'bg-[#00f5ff]/20 text-[#00f5ff] animate-ping'
                    : 'bg-[#00ff66]/15 text-[#00ff66]'
                }`}>
                  {watchdogStatus === 'ROTATING' ? 'ROTATING...' : `WATCHDOG 8M (#${rotationCount})`}
                </span>
                <button
                  onClick={triggerWatchdogRotation}
                  title="Rotar buffer de streaming manualmente (Sysarmy 8-Min Auto-Heal)"
                  className="p-0.5 hover:text-[#00f5ff] text-gray-500 transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <div className="px-2.5 py-1 rounded bg-[#07090e] border border-[#1b2230] flex items-center gap-1.5 text-gray-300">
              <Cpu className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>HARDWARE: {hardwareStats.sampleRate / 1000} kHz</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#07090e] border border-[#1b2230] flex items-center gap-1.5 text-gray-300">
              <Activity className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>INPUTS: {audioDevices.length} MICS</span>
            </div>
            <button
              onClick={() => {
                const current = getAdminToken();
                const entered = window.prompt(
                  'Token de Operador Técnico (ADMIN_TOKEN):\nIngresá el token definido en el servidor para autorizar comandos técnicos.',
                  current
                );
                if (entered !== null) {
                  const clean = entered.trim();
                  setAdminToken(clean);
                  setAdminTokenState(clean);
                  if (clean) {
                    setLockNotice('Token de operador actualizado y activo.');
                  } else {
                    setLockNotice('Token de operador eliminado (Modo Abierto).');
                  }
                  setTimeout(() => setLockNotice(null), 3000);
                }
              }}
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all text-xs font-mono font-bold ${
                adminToken
                  ? 'bg-[#00f5ff]/15 border-[#00f5ff]/50 text-[#00f5ff] shadow-[0_0_8px_rgba(0,245,255,0.2)]'
                  : 'bg-[#10141e] border-[#202738] text-gray-400 hover:text-white hover:border-[#00f5ff]'
              }`}
              title={adminToken ? 'Token de operador ACTIVO (click para editar/remover)' : 'Sin token de operador (click para configurar ADMIN_TOKEN)'}
            >
              <Key className={`w-3.5 h-3.5 ${adminToken ? 'text-[#00f5ff]' : 'text-gray-400'}`} />
              <span>{adminToken ? 'OPERADOR: AUTH' : 'OPERADOR: OPEN'}</span>
            </button>
            <button
              onClick={() => setIsConsoleLocked(!isConsoleLocked)}
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all text-xs font-mono font-bold ${
                isConsoleLocked
                  ? 'bg-[#ffb800]/15 border-[#ffb800]/50 text-[#ffb800] shadow-[0_0_8px_rgba(255,184,0,0.2)]'
                  : 'bg-[#10141e] border-[#202738] text-gray-400 hover:text-white hover:border-[#00ff66]'
              }`}
              title={isConsoleLocked ? 'Consola BLOQUEADA (click para desbloquear)' : 'Consola DESBLOQUEADA (click para proteger)'}
            >
              {isConsoleLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#ffb800]" />
                  <span>CONSOLA: BLOQUEADA</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#00ff66]" />
                  <span>CERROJO: LIBRE</span>
                </>
              )}
            </button>
          </div>
        }
      >
        {lockNotice && (
          <div className="mb-3 p-2 bg-[#ffb800]/15 border border-[#ffb800]/50 rounded text-[#ffb800] text-xs font-mono flex items-center gap-2 animate-bounce">
            <Lock className="w-4 h-4 shrink-0 text-[#ffb800]" />
            <span>{lockNotice}</span>
          </div>
        )}
        {/* HARDWARE INTERFACE CALIBRATION MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#07090e] p-3 rounded border border-[#171b26]">
          {/* Audio Input Device Dropdown (6 cols) */}
          <div className="md:col-span-6 space-y-1">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748b]">
                <Pin className="w-3 h-3 text-[#00f5ff]" />
                <span>DISPOSITIVO_DE_ENTRADA // SALA: <strong className="text-[#00f5ff]">{currentStage?.name?.toUpperCase()}</strong></span>
              </label>
              <button
                onClick={refreshAudioDevices}
                className="text-[9px] font-mono text-[#00f5ff] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> ESCANEAR
              </button>
            </div>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0d1017] border border-[#222a3d] rounded text-xs text-white focus:outline-none focus:border-[#00f5ff] font-mono"
            >
              {audioDevices.length === 0 ? (
                <option value="">(No se detectaron dispositivos de audio físicos)</option>
              ) : (
                audioDevices.map((d, index) => {
                  const assignedOtherStage = stages.find(
                    (s) => s.id !== selectedStageId && stageRouting[s.id]?.deviceId === d.deviceId
                  );
                  return (
                    <option key={d.deviceId || index} value={d.deviceId}>
                      {d.label || `Entrada de Audio Frecuencia ${index + 1}`}
                      {assignedOtherStage ? ` [En uso por: ${assignedOtherStage.name}]` : ''}
                    </option>
                  );
                })
              )}
            </select>
            <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span className="flex items-center gap-1">
                <span>ESTADO:</span>
                <span className="text-[#00ff66] font-bold">
                  {(stageRouting[selectedStageId]?.sourceKind || 'IDLE').toUpperCase()}
                </span>
              </span>
              <span className="text-[#00f5ff]/70">
                ASIGNACIÓN PERSISTENTE (LOCALSTORAGE)
              </span>
            </div>
          </div>

          {/* Sound Check Trigger & Result (6 cols) */}
          <div className="md:col-span-6 flex flex-col justify-end space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={startSoundCheck}
                disabled={isSoundChecking || isRecording}
                className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold text-[#00f5ff] hover:border-[#00f5ff]"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{isSoundChecking ? `CALIBRANDO (${soundCheckProgress}%)...` : 'PRUEBA_DE_NIVEL (4s)'}</span>
              </button>

              {soundCheckResult && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                    soundCheckResult.status === 'optimal'
                      ? 'bg-[#00ff66]/15 text-[#00ff66] border-[#00ff66]/40'
                      : soundCheckResult.status === 'clipping'
                      ? 'bg-[#ff1744]/15 text-[#ff1744] border-[#ff1744]/40'
                      : 'bg-[#ffb800]/15 text-[#ffb800] border-[#ffb800]/40'
                  }`}
                >
                  <span>PEAK: {soundCheckResult.peakDb} dBFS • {soundCheckResult.status.toUpperCase()}</span>
                </div>
              )}
            </div>

            {isSoundChecking && (
              <div className="w-full bg-[#121622] h-1.5 rounded overflow-hidden">
                <div
                  className="bg-[#00f5ff] h-full transition-all duration-100"
                  style={{ width: `${soundCheckProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </RackUnit>

      {/* 19" RACK UNIT 02: AUDIO ROUTING MATRIX // MULTI-STAGE BROADCAST PATCHBAY */}
      <RackUnit
        unitId="RACK_02"
        uHeight="2U"
        title="MATRIZ DE RUTEO DE AUDIO & PATCHBAY // MULTI-STAGE AUDIO ROUTING MATRIX"
        subTitle="Asignación directa de fuentes de audio por sala (Micrófono, YouTube Stream, Demo Oficial, Mute), patchbay de interfaces USB y vúmetros independientes con tally lamp"
        rightBadge={
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-[#0d111a] border border-[#1e273a] text-gray-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${stages.some(s => s.isLive) ? 'bg-[#ff1744] animate-pulse shadow-[0_0_6px_#ff1744]' : 'bg-gray-600'}`} />
              <span>{stages.filter((s) => s.isLive).length} / {stages.length} SALAS AL AIRE</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/40 text-[#00f5ff] font-bold hidden sm:inline-flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              PATCHBAY ACTIVO
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {stages.map((stage, idx) => {
            const isSelected = stage.id === selectedStageId;
            const effectiveSource = getEffectiveSource(stage);
            const isMicRecordingThisStage = isRecording && selectedStageId === stage.id;
            const assignedDevice = stageRouting[stage.id]?.deviceId || stageMicDevice[stage.id] || (stage.id === selectedStageId ? selectedDeviceId : '');
            const isYouTubeLiveOnThisStage = effectiveSource === 'stream' && (isDemoSyncRunning || stage.isLive);

            return (
              <div
                key={stage.id}
                onClick={() => handleSelectStage(stage.id)}
                className={`bg-[#07090e] rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between p-3.5 space-y-3 relative overflow-hidden ${
                  isSelected
                    ? 'border-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.18)] bg-[#090d16]'
                    : 'border-[#171d29] hover:border-[#273349]'
                }`}
              >
                {/* 1. Header: Channel ID, Track Badge, Stage Name & Tally Lamp */}
                <div className="flex items-center justify-between border-b border-[#181f2f] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-[#101522] text-[#00f5ff] border border-[#20293d]">
                      CH 0{idx + 1}
                    </span>
                    <div>
                      <div className="font-mono font-black text-xs text-white uppercase tracking-wide flex items-center gap-1.5">
                        <span>{stage.name}</span>
                        {isSelected && (
                          <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40">
                            SELECCIONADA
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-[#64748b] block truncate">
                        {stage.track || 'TRACK GENERAL'}
                      </span>
                    </div>
                  </div>

                  {/* BROADCAST TALLY LAMP */}
                  <div
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-black flex items-center gap-1.5 border transition-all ${
                      stage.isLive
                        ? 'bg-[#ff1744] text-white border-[#ff4d6d] shadow-[0_0_12px_#ff1744] animate-pulse'
                        : 'bg-[#0e121a] text-gray-500 border-[#1c2332]'
                    }`}
                    title={stage.isLive ? 'Sala emitiendo señal al aire' : 'Sala en espera (Standby)'}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stage.isLive ? 'bg-white shadow-[0_0_6px_white]' : 'bg-gray-600'
                      }`}
                    />
                    <span>{stage.isLive ? 'ON AIR' : 'STANDBY'}</span>
                  </div>
                </div>

                {/* 2. Talk info strip */}
                <div className="bg-[#05070c] p-2 rounded-lg border border-[#141a27] space-y-0.5 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-gray-200 truncate" title={stage.talkTitle}>
                      {stage.talkTitle || 'Sin charla programada'}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = window.prompt(`Nuevo título de charla para ${stage.name}:`, stage.talkTitle || '');
                        if (newTitle !== null) {
                          const newSpeaker = window.prompt(`Nuevo orador / expositor para ${stage.name}:`, stage.speaker || '');
                          if (newSpeaker !== null) {
                            handleQuickUpdateStageTalk(stage.id, newTitle, newSpeaker);
                          }
                        }
                      }}
                      className="text-[9px] font-mono text-[#00f5ff] hover:text-white hover:underline shrink-0 flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/30"
                      title="Editar título y orador de esta sala"
                    >
                      <span>✏️ EDITAR</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b]">
                    <span className="truncate">{stage.speaker || 'Orador'}</span>
                    {stage.audienceCount > 0 && (
                      <span className="text-[#00ff66] font-bold shrink-0">
                        {stage.audienceCount} 👤
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Audio Source Selector (Patchbay Matrix Buttons) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-gray-400 font-bold uppercase flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#00f5ff]" />
                      FUENTE DE AUDIO // PATCH:
                    </span>
                    <span
                      className={`font-bold uppercase px-1 py-0.2 rounded text-[8px] border ${
                        effectiveSource === 'mic'
                          ? 'bg-[#00f5ff]/15 text-[#00f5ff] border-[#00f5ff]/40'
                          : effectiveSource === 'stream'
                          ? 'bg-[#ff3366]/15 text-[#ff3366] border-[#ff3366]/40'
                          : effectiveSource === 'demo'
                          ? 'bg-[#ffb800]/15 text-[#ffb800] border-[#ffb800]/40'
                          : 'bg-gray-800/60 text-gray-400 border-gray-700'
                      }`}
                    >
                      {effectiveSource}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                    {/* [🎤 Micrófono] */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStageSource(stage.id, 'mic');
                      }}
                      className={`p-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        effectiveSource === 'mic'
                          ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff] shadow-[0_0_10px_rgba(0,245,255,0.3)] ring-1 ring-[#00f5ff]'
                          : 'bg-[#0b0e15] border-[#1c2436] text-gray-400 hover:text-white hover:border-[#2b374e]'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5 text-[#00f5ff]" />
                      <span>Micrófono</span>
                    </button>

                    {/* [📺 YouTube Stream] */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStageSource(stage.id, 'stream');
                      }}
                      className={`p-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        effectiveSource === 'stream'
                          ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366] shadow-[0_0_10px_rgba(255,51,102,0.3)] ring-1 ring-[#ff3366]'
                          : 'bg-[#0b0e15] border-[#1c2436] text-gray-400 hover:text-white hover:border-[#2b374e]'
                      }`}
                    >
                      <Tv className="w-3.5 h-3.5 text-[#ff3366]" />
                      <span>YouTube</span>
                    </button>

                    {/* [✨ Demo Oficial] */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStageSource(stage.id, 'demo');
                      }}
                      className={`p-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        effectiveSource === 'demo'
                          ? 'bg-[#ffb800]/20 border-[#ffb800] text-[#ffb800] shadow-[0_0_10px_rgba(255,184,0,0.3)] ring-1 ring-[#ffb800]'
                          : 'bg-[#0b0e15] border-[#1c2436] text-gray-400 hover:text-white hover:border-[#2b374e]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#ffb800]" />
                      <span>Demo Talk</span>
                    </button>

                    {/* [🔇 Mute / Idle] */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStageSource(stage.id, 'idle');
                      }}
                      className={`p-1.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                        effectiveSource === 'idle'
                          ? 'bg-[#1b2230] border-gray-500 text-gray-300 shadow-inner ring-1 ring-gray-600'
                          : 'bg-[#0b0e15] border-[#1c2436] text-gray-500 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                      <span>Mute / Idle</span>
                    </button>
                  </div>
                </div>

                {/* 4. If Mic is selected: Audio Device Dropdown for this room */}
                {effectiveSource === 'mic' && (
                  <div
                    className="p-2.5 bg-[#05070c] border border-[#1e273a] rounded-lg space-y-1.5 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="font-bold text-[#00f5ff] flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        DISPOSITIVO MIC ASIGNADO:
                      </span>
                      <button
                        onClick={refreshAudioDevices}
                        className="text-[8px] text-gray-400 hover:text-[#00f5ff] flex items-center gap-0.5"
                        title="Volver a escanear entradas de audio"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> ESCANEAR
                      </button>
                    </div>

                    <select
                      value={assignedDevice}
                      onChange={(e) => handleAssignDeviceToStage(stage.id, e.target.value)}
                      className="w-full px-2 py-1 bg-[#090c13] border border-[#222c40] rounded text-[11px] font-mono text-white focus:outline-none focus:border-[#00f5ff]"
                    >
                      {audioDevices.length === 0 ? (
                        <option value="">(No hay entradas físicas detectadas)</option>
                      ) : (
                        audioDevices.map((d, dIdx) => (
                          <option key={d.deviceId || dIdx} value={d.deviceId}>
                            {d.label ? `[INT 0${dIdx + 1}] ${d.label}` : `Micrófono / Entrada ${dIdx + 1}`}
                          </option>
                        ))
                      )}
                    </select>

                    <div className="flex items-center justify-between pt-1 text-[9px] font-mono">
                      <span className="text-gray-400 flex items-center gap-1">
                        <span>PREAMP:</span>
                        {isMicRecordingThisStage ? (
                          <span className="text-[#00ff66] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping" />
                            AL AIRE
                          </span>
                        ) : (
                          <span className="text-gray-500">ARMADO</span>
                        )}
                      </span>

                      {isMicRecordingThisStage ? (
                        <button
                          onClick={() => stopMicStreaming()}
                          className="px-2 py-0.5 rounded bg-[#ff1744]/20 border border-[#ff1744]/50 text-[#ff1744] font-bold hover:bg-[#ff1744]/30 transition-colors"
                        >
                          DETENER MIC
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateMicForStage(stage.id)}
                          className="px-2 py-0.5 rounded bg-[#00f5ff]/20 border border-[#00f5ff]/50 text-[#00f5ff] font-bold hover:bg-[#00f5ff]/30 transition-colors"
                        >
                          TRANSMITIR MIC
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. If YouTube Stream is selected: YouTube Live Feed pill */}
                {effectiveSource === 'stream' && (
                  <div
                    className="p-2 bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-lg text-[9px] font-mono space-y-1 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[#ff3366] font-bold">
                      <span className="flex items-center gap-1">
                        <Tv className="w-3 h-3" />
                        STREAMING YOUTUBE
                      </span>
                      {isYouTubeLiveOnThisStage && (
                        <span className="px-1.5 py-0.2 rounded bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
                          EMITIENDO
                        </span>
                      )}
                    </div>
                    <div className="text-white font-bold truncate">
                      {YOUTUBE_NERDEARLA_TALKS.find((t) => t.demoKey === activeSyncDemoKey)?.title ||
                        'Video YouTube Sincronizado'}
                    </div>
                  </div>
                )}

                {/* 6. Independent VU Meter per Room */}
                <div className="space-y-1">
                  <HardwareVuMeter
                    levelPercent={
                      isMicRecordingThisStage
                        ? Math.min(100, Math.max(0, ((currentDbfs + 60) / 60) * 100))
                        : stage.audioLevel
                    }
                    label={`POST_FADER // ${effectiveSource.toUpperCase()}`}
                    peakDb={
                      isMicRecordingThisStage
                        ? currentDbfs
                        : -36 + (stage.audioLevel / 100) * 36
                    }
                    isClipping={
                      isMicRecordingThisStage
                        ? isClipping
                        : stage.audioLevel >= 92
                    }
                  />
                  <div className="flex items-center justify-between text-[8px] font-mono text-[#475569] px-0.5">
                    <span>AUD: {stage.audienceCount}</span>
                    <span>LAT: {stage.latencyMs}ms</span>
                    <span>LANG: {(stage.detectedLang || 'es').toUpperCase()}</span>
                  </div>
                </div>

                {/* 7. Bottom Hardware Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#171d29] font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStageId(stage.id);
                      onSelectStage(stage.id);
                    }}
                    className={`hardware-btn py-1 px-2 rounded text-center font-bold transition-all ${
                      isSelected
                        ? 'bg-[#00f5ff]/15 border-[#00f5ff] text-[#00f5ff]'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'SALA_ACTIVA' : 'INSPECCIONAR'}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      guardAction(() => handleSelectStageSource(stage.id, 'idle'), 'DETENER CANAL');
                    }}
                    className="hardware-btn py-1 px-2 rounded text-center font-bold text-[#ff1744] hover:bg-[#ff1744]/15 border-[#ff1744]/30"
                  >
                    STOP_SALA
                  </button>
                </div>
              </div>
            );
          })}

          {/* DYNAMIC PROVISIONING CARD FOR ANY EVENT IN THE WORLD */}
          <div
            onClick={() => setShowAddStageModal(true)}
            className="bg-[#07090e]/60 hover:bg-[#0b0f17] rounded-xl border-2 border-dashed border-[#202738] hover:border-[#00f5ff]/60 p-4 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group min-h-[160px]"
            title="Conectar Mini PC o crear un nuevo escenario para cualquier evento"
          >
            <div className="w-10 h-10 rounded-full bg-[#111624] border border-[#232d42] group-hover:border-[#00f5ff] flex items-center justify-center text-[#00f5ff] transition-all">
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-white group-hover:text-[#00f5ff] transition-colors uppercase block">
                + PROVISIONAR SALA
              </span>
              <span className="text-[10px] font-mono text-[#64748b] block mt-0.5">
                Conectar Mini PC o crear nuevo canal
              </span>
            </div>
          </div>
        </div>
      </RackUnit>

      {/* 19" RACK UNIT 03: LIVE INGESTION & REALTIME TRANSMITTER */}
      {currentStage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Audio Ingestion Console (7 cols) */}
          <div className="lg:col-span-7 bg-[#090b10] border-2 border-[#1c2333] rounded p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#181d2a] pb-2.5">
              <div>
                <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  AUDIO_ROUTING // TARGET: {currentStage.name.toUpperCase()}
                </span>
                <p className="text-[10px] font-mono text-[#64748b]">
                  Control de transmisión directa por micrófono de sala o archivo de audio
                </p>
              </div>

              {currentStage.isLive && (
                <button
                  onClick={() => handleStopStage(currentStage.id)}
                  className="px-2.5 py-1 bg-[#ff1744]/15 hover:bg-[#ff1744]/25 border border-[#ff1744]/40 text-[#ff1744] text-xs font-mono font-bold rounded transition-colors"
                >
                  DISARM_STAGE
                </button>
              )}
            </div>

            {/* Live Mic Transmitter with Oscilloscope */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-[#00f5ff]" />
                    <span>TRANSMISIÓN_EN_VIVO (MIC_INPUT)</span>
                  </div>
                  <p className="text-[10px] font-mono text-[#64748b]">
                    Transmite audio en tiempo real directamente al motor multimodal de Gemini
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Spoken Language Toggle: ES vs EN */}
                  <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1b2230] text-[10px] font-mono font-bold">
                    <button
                      onClick={() => handleMicSourceLangChange('es')}
                      className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                        micSourceLang === 'es'
                          ? 'bg-[#141b29] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                          : 'text-[#64748b] hover:text-white'
                      }`}
                      title="Orador habla en Español (transcripción es-AR)"
                    >
                      <span>🇪🇸 ES</span>
                    </button>
                    <button
                      onClick={() => handleMicSourceLangChange('en')}
                      className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                        micSourceLang === 'en'
                          ? 'bg-[#141b29] text-[#00ff66] border border-[#00ff66]/40 shadow-sm'
                          : 'text-[#64748b] hover:text-white'
                      }`}
                      title="Speaker speaks in English (transcription en-US)"
                    >
                      <span>🇬🇧 EN</span>
                    </button>
                  </div>

                  {isRecording ? (
                    <button
                      onClick={() => stopMicStreaming()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff1744] hover:bg-[#ff1744]/90 text-white text-xs font-mono font-bold rounded transition-all animate-pulse shadow-[0_0_10px_#ff1744]"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>DETENER_AIRE</span>
                    </button>
                  ) : (
                    <button
                      onClick={startMicStreaming}
                      className="hardware-btn-active flex items-center gap-1.5 px-3 py-1.5 bg-[#141b29] text-[#00f5ff] text-xs font-mono font-bold rounded transition-all"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>TRANSMITIR_MIC</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CRT Phosphor Oscilloscope & Calibrated dBFS Bar */}
              {isRecording && (
                <div className="space-y-2 pt-1">
                  <HardwareOscilloscope
                    analyserNode={analyserRef.current}
                    sampleRate={hardwareStats.sampleRate}
                    height={55}
                  />

                  <HardwareVuMeter
                    levelPercent={Math.min(100, Math.max(0, ((currentDbfs + 60) / 60) * 100))}
                    label="MIC_PREAMP_BUS"
                    peakDb={currentDbfs}
                    isClipping={isClipping}
                  />
                </div>
              )}

              {audioError && (
                <div className="p-2 bg-[#ff1744]/15 border border-[#ff1744]/40 rounded text-[#ff1744] text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{audioError}</span>
                </div>
              )}
            </div>

            {/* 1-Click Nerdearla Talk Demos */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded space-y-2">
              <span className="text-xs font-mono font-bold text-[#ffb800] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                DEMOS_OFICIALES_NERDEARLA (1-CLICK TEST)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-midudev')}
                  className="hardware-btn p-2 rounded text-left transition-all hover:border-[#00f5ff]"
                >
                  <div className="text-[9px] font-mono text-[#00f5ff] font-bold">KEYNOTE (ES)</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">IA & Programación</div>
                  <div className="text-[9px] font-mono text-[#64748b]">midudev</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-en-thor')}
                  className="hardware-btn p-2 rounded text-left transition-all hover:border-[#38bdf8]"
                >
                  <div className="text-[9px] font-mono text-[#38bdf8] font-bold">AGENTS (EN)</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Multilingual Agents</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Thor Schaeff</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-en-k8s')}
                  className="hardware-btn p-2 rounded text-left transition-all hover:border-[#00f5ff]"
                >
                  <div className="text-[9px] font-mono text-[#00f5ff] font-bold">CLOUD (EN)</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">K8s & eBPF</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Alex Rivera</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-devops')}
                  className="hardware-btn p-2 rounded text-left transition-all hover:border-[#00ff66]"
                >
                  <div className="text-[9px] font-mono text-[#00ff66] font-bold">DEVOPS (ES)</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Sysarmy CI/CD</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Valeria Gómez</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-ai')}
                  className="hardware-btn p-2 rounded text-left transition-all hover:border-[#ffb800]"
                >
                  <div className="text-[9px] font-mono text-[#ffb800] font-bold">DATA & AI (ES)</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Gemini Live Audio</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Federico Balbi</div>
                </button>
              </div>
            </div>

            {/* REPRODUCTOR YOUTUBE & DEMOS DE CHARLAS NERDEARLA */}
            <div className="p-3.5 bg-[#07090e] border-2 border-[#1c2436] rounded-xl space-y-3.5 shadow-xl">
              {/* Header with Live Tally & Output Target Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171b26] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-[#ff1744]/20 border border-[#ff1744]/40">
                    <Video className="w-4 h-4 text-[#ff1744]" />
                  </span>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#00f5ff] uppercase tracking-wider block">
                      REPRODUCTOR DE VIDEO YOUTUBE // DEMOS NERDEARLA
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      Transmisión de charlas de referencia con subtitulado y traducción multimodal en tiempo real
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[10px] text-gray-400">DESTINO ACTUAL:</span>
                  <span className="px-2 py-0.5 rounded bg-[#00f5ff]/15 border border-[#00f5ff]/40 text-[#00f5ff] font-bold">
                    {youtubeTargetStage.name.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 1. EXPLICIT SALA DE DESTINO SELECTOR (BROADCAST MATRIX TARGET) */}
              <div className="p-3 bg-[#0a0d15] border-2 border-[#1c2538] rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#ffb800]" />
                    <span className="text-xs font-mono font-bold text-[#ffb800] uppercase tracking-wider">
                      SALA DE DESTINO DE TRANSMISIÓN // STREAM TARGET MATRIX:
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">
                    SALA CONECTADA:{' '}
                    <span className="text-white font-bold">{youtubeTargetStage.name.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono">
                  {stages.map((stg, i) => {
                    const isTarget = stg.id === youtubeTargetStage.id;
                    const isStageLive = stg.isLive;
                    const isStageReceivingStream =
                      (isDemoSyncRunning && youtubeTargetStage.id === stg.id) ||
                      syncingYoutubeStageId === stg.id;

                    return (
                      <button
                        key={stg.id}
                        type="button"
                        onClick={() => {
                          setYoutubeTargetStageId(stg.id);
                          if (isDemoSyncRunning) {
                            handleTriggerDemo(stg.id, activeSyncDemoKey);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                          isTarget
                            ? 'bg-[#121c2d] border-[#00f5ff] text-white shadow-[0_0_12px_rgba(0,245,255,0.3)] ring-1 ring-[#00f5ff]'
                            : 'bg-[#07090e] border-[#182030] text-gray-400 hover:text-white hover:border-[#2b3850]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-[#00f5ff]">CH 0{i + 1}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isStageReceivingStream
                                ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66] animate-ping'
                                : isStageLive
                                ? 'bg-[#ff1744] shadow-[0_0_6px_#ff1744] animate-pulse'
                                : 'bg-[#293348]'
                            }`}
                          />
                        </div>
                        <div className="text-xs font-bold truncate text-white">{stg.name}</div>
                        <div className="text-[9px] text-[#64748b] truncate mt-0.5">
                          {isStageReceivingStream ? '● STREAM ACTIVO' : stg.track || 'Track'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. UNMISTAKABLE LIVE BANNER WHEN ACTIVE */}
              {(isDemoSyncRunning ||
                (youtubeTargetStage.isLive && youtubeTargetStage.currentAudioSource === 'stream') ||
                syncingYoutubeStageId === youtubeTargetStage.id) && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-[#06140d] to-[#070a10] border-2 border-[#00ff66] rounded-xl text-white font-mono shadow-[0_0_20px_rgba(0,255,102,0.3)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-4 w-4 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00ff66] shadow-[0_0_10px_#00ff66]"></span>
                    </span>
                    <div>
                      <div className="font-mono font-black text-xs sm:text-sm text-[#00ff66] tracking-wide">
                        🟢 EMITIENDO VIDEO Y SUBTÍTULOS EN: {youtubeTargetStage.name.toUpperCase()} (ES / EN / PT)
                      </div>
                      <div className="text-[11px] text-gray-300 font-sans mt-0.5">
                        Transmisión activa hacia {youtubeTargetStage.name}. Mirá los subtítulos proyectándose en vivo en el Teleprompter y en vMix / OBS.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-[#00f5ff]/50 text-[#00f5ff] text-[10px] font-bold">
                      ES
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-[#38bdf8]/50 text-[#38bdf8] text-[10px] font-bold">
                      EN
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-[#00ff66]/50 text-[#00ff66] text-[10px] font-bold">
                      PT
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Preloaded Real Nerdearla Talks Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 block font-bold">
                  CHARLAS OFICIALES NERDEARLA (PREAJUSTES):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {YOUTUBE_NERDEARLA_TALKS.map((t) => {
                    const isSelected = !isCustomVideo && youtubeVideoId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectPresetTalk(t)}
                        className={`p-2.5 rounded-lg text-left transition-all border font-mono ${
                          isSelected
                            ? 'bg-[#121c2d] border-[#00f5ff] text-white shadow-[0_0_8px_rgba(0,245,255,0.3)]'
                            : 'bg-[#0a0d14] border-[#1b2230] text-gray-400 hover:text-white hover:border-gray-500'
                        }`}
                      >
                        <div className="text-[9px] font-bold" style={{ color: t.color }}>{t.tag}</div>
                        <div className="text-xs font-bold truncate mt-0.5">{t.title}</div>
                        <div className="text-[9px] text-[#64748b]">{t.speaker}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Custom YouTube URL & Talk Metadata Form */}
              <form onSubmit={handleLoadCustomYoutube} className="p-3 bg-[#0a0d14] border border-[#1c2438] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#00f5ff]" />
                    <span>CARGAR VIDEO O STREAM PROPIO:</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#00f5ff] bg-[#00f5ff]/10 px-2 py-0.5 rounded border border-[#00f5ff]/20">
                    SALA DE DESTINO: {youtubeTargetStage.name.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customYoutubeUrl}
                    onChange={(e) => setCustomYoutubeUrl(e.target.value)}
                    placeholder="URL de YouTube (ej: https://www.youtube.com/watch?v=... o https://youtu.be/...)"
                    className="flex-1 bg-[#0b0e15] border border-[#1e2535] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customVideoTitle}
                    onChange={(e) => setCustomVideoTitle(e.target.value)}
                    placeholder="Título del Video / Charla (ej: 'Arquitectura Cloud 2026')"
                    className="bg-[#0b0e15] border border-[#1e2535] rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]"
                  />
                  <input
                    type="text"
                    value={customVideoSpeaker}
                    onChange={(e) => setCustomVideoSpeaker(e.target.value)}
                    placeholder="Orador / Canal (ej: 'Ingeniería Sysarmy')"
                    className="bg-[#0b0e15] border border-[#1e2535] rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] font-mono text-gray-400">
                    {isCustomVideo ? (
                      <span className="text-emerald-400 font-bold">✓ Modo video personalizado activo (sin textos pregrabados)</span>
                    ) : (
                      <span>Cargá tu propio video y transcribilo en tiempo real</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#141b29] hover:bg-[#1e273b] border border-[#00f5ff] text-[#00f5ff] text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-all shadow-[0_0_10px_rgba(0,245,255,0.2)] hover:shadow-[0_0_15px_rgba(0,245,255,0.4)]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>CARGAR VIDEO Y ACTUALIZAR SALA</span>
                  </button>
                </div>

                {customVideoFeedback && (
                  <div className="text-[11px] font-mono text-[#00ff66] bg-[#00ff66]/10 border border-[#00ff66]/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#00ff66]" />
                    <span>{customVideoFeedback}</span>
                  </div>
                )}
              </form>

              {/* Active Talk Header Bar */}
              <div className="flex items-center justify-between text-xs font-mono bg-[#0d121c] p-2.5 rounded-lg border border-[#1b2538]">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[#00f5ff] font-bold">EN SALA ({youtubeTargetStage.name}):</span>
                  <span className="text-white font-bold truncate">
                    {isCustomVideo
                      ? (customVideoTitle || youtubeTargetStage.talkTitle || 'Video YouTube en Vivo')
                      : (youtubeTargetStage.talkTitle || 'Charla')}
                  </span>
                  <span className="text-gray-400 truncate">
                    • {isCustomVideo
                      ? (customVideoSpeaker || youtubeTargetStage.speaker || 'Orador')
                      : (youtubeTargetStage.speaker || 'Orador')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newTitle = window.prompt(`Nuevo título para ${youtubeTargetStage.name}:`, youtubeTargetStage.talkTitle || '');
                    if (newTitle !== null) {
                      const newSpeaker = window.prompt(`Nuevo orador para ${youtubeTargetStage.name}:`, youtubeTargetStage.speaker || '');
                      if (newSpeaker !== null) {
                        handleQuickUpdateStageTalk(youtubeTargetStage.id, newTitle, newSpeaker);
                      }
                    }
                  }}
                  className="text-[10px] text-[#00f5ff] hover:text-white hover:underline shrink-0 px-2 py-0.5 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/30 ml-2"
                >
                  ✏️ Renombrar
                </button>
              </div>

              {/* Embedded 16:9 YouTube Player */}
              <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-[#1c2436] bg-black shadow-inner">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`}
                  title="Nerdearla Talk YouTube Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Sync Controls & External Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* If custom video: offer real tab audio capture & mic streaming */}
                  {isCustomVideo || !activeSyncDemoKey ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (isTabAudioCapturing) {
                            stopTabAudioCapture();
                          } else {
                            startTabAudioCapture(youtubeTargetStage.id);
                          }
                        }}
                        className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg flex items-center gap-2 transition-all ${
                          isTabAudioCapturing
                            ? 'bg-[#ff1744] hover:bg-[#ff1744]/90 text-white shadow-[0_0_15px_rgba(255,23,68,0.5)] animate-pulse'
                            : 'hardware-btn-active bg-[#141b29] text-[#00ff66] hover:shadow-[0_0_15px_rgba(0,255,102,0.4)] border border-[#00ff66]/60'
                        }`}
                        title="Captura el audio de la pestaña de Chrome donde suena el video y transcríbelo en tiempo real"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {isTabAudioCapturing
                            ? `🛑 DETENER AUDIO EN ${youtubeTargetStage.name.toUpperCase()}`
                            : `🔊 CAPTURAR AUDIO DEL VIDEO (PESTAÑA)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording && selectedStageId === youtubeTargetStage.id) {
                            stopMicStreaming(youtubeTargetStage.id);
                          } else {
                            handleSelectStage(youtubeTargetStage.id);
                            startMicStreaming();
                          }
                        }}
                        className={`hardware-btn px-3 py-2 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                          isRecording && selectedStageId === youtubeTargetStage.id
                            ? 'bg-[#ff1744] text-white shadow-[0_0_10px_rgba(255,23,68,0.5)]'
                            : 'text-gray-300 hover:text-white border border-[#232c40]'
                        }`}
                        title="Usa el micrófono o entrada de línea para transcribir el audio del video hacia este escenario"
                      >
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {isRecording && selectedStageId === youtubeTargetStage.id
                            ? '🛑 DETENER MIC'
                            : '🎤 MICRÓFONO / ENTRADA'}
                        </span>
                      </button>
                    </>
                  ) : (
                    /* Preset talk: allow demo simulation sync or live capture */
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          if (isDemoSyncRunning) {
                            await handleStopStage(youtubeTargetStage.id);
                            setIsDemoSyncRunning(false);
                            setSyncingYoutubeStageId(null);
                          } else {
                            await handleTriggerDemo(youtubeTargetStage.id, activeSyncDemoKey);
                          }
                        }}
                        className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg flex items-center gap-2 transition-all ${
                          isDemoSyncRunning
                            ? 'bg-[#ff1744] hover:bg-[#ff1744]/90 text-white shadow-[0_0_15px_rgba(255,23,68,0.5)] animate-pulse'
                            : 'hardware-btn-active bg-[#141b29] text-[#00f5ff] hover:shadow-[0_0_15px_rgba(0,245,255,0.4)] border border-[#00f5ff]/60'
                        }`}
                        title={`Inicia el flujo de subtítulos y traducción simultánea para esta charla en ${youtubeTargetStage.name}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {isDemoSyncRunning
                            ? `🛑 DETENER EN ${youtubeTargetStage.name.toUpperCase()}`
                            : `🚀 SINCRONIZAR DEMO EN ${youtubeTargetStage.name.toUpperCase()}`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isTabAudioCapturing) {
                            stopTabAudioCapture();
                          } else {
                            startTabAudioCapture(youtubeTargetStage.id);
                          }
                        }}
                        className="hardware-btn px-2.5 py-2 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 rounded-lg flex items-center gap-1.5 transition-all border border-emerald-500/30"
                        title="Capturar el audio real que reproduce el video en la pestaña del navegador"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>AUDIO REAL (PESTAÑA)</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await handleStopStage(youtubeTargetStage.id);
                      stopTabAudioCapture();
                      await emergencyClearApi(youtubeTargetStage.id);
                    }}
                    className="hardware-btn px-2.5 py-2 text-xs font-mono font-bold text-gray-400 hover:text-red-400 rounded-lg flex items-center gap-1 transition-all"
                    title={`Detener y limpiar subtítulos en ${youtubeTargetStage.name}`}
                  >
                    <Square className="w-3 h-3" />
                    <span>DETENER Y LIMPIAR</span>
                  </button>
                </div>

                <a
                  href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir en YouTube ↗</span>
                </a>
              </div>

              <div className="text-[10px] font-mono text-[#64748b] bg-[#05070a] p-3 rounded-lg border border-[#141724] leading-relaxed space-y-1">
                <div className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Transcripción en Tiempo Real de Videos con Gemini Live:</span>
                </div>
                <div>
                  • <strong className="text-emerald-400">Captura de Pestaña:</strong> Hacé clic en <strong className="text-white">"Capturar Audio del Video (Pestaña)"</strong>, seleccioná la pestaña donde se reproduce YouTube y marcá <span className="text-cyan-300">"Compartir audio de la pestaña"</span>. El audio original es procesado en vivo a 16kHz PCM y transcripto por Gemini sin ningún texto hardcodeado.
                </div>
                <div>
                  • <strong className="text-cyan-400">Micrófono / Entrada de Sonido:</strong> Si el audio del video sale por parlantes o por una placa virtual (Stereo Mix / VB-Cable), hacé clic en <strong className="text-white">"Micrófono / Entrada"</strong> para enviarlo directo a la sala.
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#00ff66]" />
                  <span>SUBIR ARCHIVO DE AUDIO LOCAL</span>
                </div>
                <p className="text-[9px] font-mono text-[#64748b]">
                  Soporta .mp3, .wav, .webm
                </p>
              </div>

              <label className="hardware-btn cursor-pointer px-3 py-1.5 rounded text-xs font-mono font-bold text-gray-200 hover:text-white">
                <span>ELEGIR_ARCHIVO</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await uploadAudioChunk(currentStage.id, file);
                    }
                  }}
                />
              </label>
            </div>

          </div>

          {/* Terminal Style Glossary Injector (5 cols) */}
          <div className="lg:col-span-5 bg-[#090b10] border-2 border-[#1c2333] rounded p-4 space-y-3 shadow-xl">
            <div className="border-b border-[#181d2a] pb-2.5">
              <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                GLOSSARY_CLI // INYECTOR_EN_VIVO
              </span>
              <p className="text-[10px] font-mono text-[#64748b]">
                Inyectá términos prioritarios directamente al contexto de Gemini
              </p>
            </div>

            <form onSubmit={handleAddTerm} className="space-y-2.5 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-[#64748b] mb-1">
                  PARAM: --term
                </label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="ej. Cilium, Kafka, ArgoCD"
                  className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white focus:outline-none focus:border-[#00f5ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748b] mb-1">
                  PARAM: --category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white focus:outline-none focus:border-[#00f5ff]"
                >
                  <option value="cloud">cloud</option>
                  <option value="devops">devops</option>
                  <option value="ai">ai</option>
                  <option value="architecture">architecture</option>
                  <option value="security">security</option>
                  <option value="language">language</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#64748b] mb-1">
                  PARAM: --definition
                </label>
                <textarea
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="Definición concisa de 1 frase..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-[#07090e] border border-[#202738] rounded text-white focus:outline-none focus:border-[#00f5ff] resize-none"
                  required
                />
              </div>

              {formSuccess && (
                <div className="flex items-center gap-1.5 p-2 bg-[#00ff66]/15 border border-[#00ff66]/40 rounded text-[#00ff66] text-[10px]">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>[STATUS 201] Término inyectado al motor</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-[#141b29] hover:bg-[#1a2336] border border-[#00f5ff]/40 text-[#00f5ff] font-bold rounded transition-all shadow-sm"
              >
                + INYECTAR_AL_MOTOR
              </button>
            </form>

            <div className="pt-2 border-t border-[#181d2a]">
              <div className="text-[10px] font-mono text-[#64748b] mb-1.5">
                TÉRMINOS ACTIVOS EN MEMORIA: {glossaryTerms.length}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                {glossaryTerms.slice(0, 8).map((t) => (
                  <div key={t.term} className="bg-[#07090e] p-1.5 rounded border border-[#171c26] flex items-center justify-between">
                    <span className="font-bold text-white">{t.term}</span>
                    <span className="text-[#8b5cf6]">[{t.category}]</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 19" RACK UNIT 04: LIVE TELEPROMPTER & SUBTITLE MONITOR (BROADCAST CONFIDENCE MONITOR) */}
      <RackUnit
        unitId="RACK_04"
        uHeight="2U"
        title="MONITOR DE SUBTÍTULOS EN VIVO // CONTROL ROOM CONFIDENCE PROMPTER"
        subTitle={`Visualización inmediata de la voz transcrita, traducción simultánea y emisión al aire • SALA: ${currentStage?.name.toUpperCase()}`}
        rightBadge={
          <div className="flex items-center gap-2 text-xs font-mono">
            {isRecording ? (
              <span className="px-2.5 py-1 rounded bg-[#ff1744]/20 border border-[#ff1744]/50 text-[#ff1744] flex items-center gap-1.5 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff1744] animate-ping" />
                MIC EN EL AIRE
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-[#10141e] border border-[#202738] text-gray-400 flex items-center gap-1.5">
                MIC STANDBY
              </span>
            )}
            <span className="px-2 py-1 rounded bg-[#07090e] border border-[#1b2230] text-[#00f5ff] text-[10px]">
              {speechApiAvailable ? 'MOTOR: BROWSER SPEECH + GEMINI' : 'MOTOR: MULTIMODAL AUDIO'}
            </span>
          </div>
        }
      >
        <div className="space-y-3">
          
          {/* REALTIME VOICE DETECTOR (ACTIVE HYPOTHESIS DISPLAY) */}
          {isRecording && (
            <div className={`p-3 rounded border transition-all ${
              liveInterimText 
                ? 'bg-[#00f5ff]/10 border-[#00f5ff]/50 shadow-[0_0_15px_rgba(0,245,255,0.15)]'
                : 'bg-[#07090e] border-[#1b2230]'
            }`}>
              <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
                <span className="text-[#00f5ff] font-bold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 animate-pulse text-[#00f5ff]" />
                  DETECTANDO VOZ EN TIEMPO REAL (&lt;50ms LATENCIA)
                </span>
                <span className="text-gray-400">IDIOMA: ES-AR // SALA {currentStage?.name}</span>
              </div>
              <div className="font-mono text-sm sm:text-base text-white min-h-[28px] flex items-center">
                {liveInterimText ? (
                  <span className="text-[#00f5ff] font-semibold">
                    "{liveInterimText}"
                    <span className="inline-block w-2 h-4 bg-[#00f5ff] ml-1 animate-pulse align-middle" />
                  </span>
                ) : (
                  <span className="text-gray-500 italic text-xs">
                    [ Hablá al micrófono ahora... tus palabras aparecerán aquí en vivo palabra por palabra ]
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TRILINGUAL SIMULTANEOUS BROADCAST MONITOR */}
          {chunks.length > 0 && (
            <div className="p-3 bg-[#0d1017] border-2 border-[#1c2333] rounded-lg space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#181d2a] pb-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#00f5ff]" />
                  MONITOR DE TRADUCCIÓN SIMULTÁNEA EN VIVO // {currentStage.name.toUpperCase()}
                </span>
                <span className="text-[#00ff66] font-bold text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                  EMITIENDO EN 3 IDIOMAS SIMULTÁNEOS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 1. ESPAÑOL */}
                <div className="p-2.5 bg-[#07090e] border border-[#202738] rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#00f5ff] mb-1 font-bold">
                    <span>🇦🇷 ESPAÑOL (ORIGINAL)</span>
                    <span className="px-1.5 py-0.2 bg-[#00f5ff]/15 rounded text-[9px]">SALA LOCAL</span>
                  </div>
                  <div className="text-white font-bold text-xs sm:text-sm leading-snug">
                    "{chunks[chunks.length - 1].esText || chunks[chunks.length - 1].originalText}"
                  </div>
                </div>

                {/* 2. INGLÉS */}
                <div className="p-2.5 bg-[#07090e] border border-[#202738] rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#38bdf8] mb-1 font-bold">
                    <span>🇬🇧 ENGLISH (SIMULTANEOUS)</span>
                    <span className="px-1.5 py-0.2 bg-[#38bdf8]/15 rounded text-[9px]">STREAM & OBS</span>
                  </div>
                  <div className="text-cyan-200 font-bold text-xs sm:text-sm leading-snug">
                    "{chunks[chunks.length - 1].enText || chunks[chunks.length - 1].originalText}"
                  </div>
                </div>

                {/* 3. PORTUGUÉS */}
                <div className="p-2.5 bg-[#07090e] border border-[#202738] rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#00ff66] mb-1 font-bold">
                    <span>🇧🇷 PORTUGUÊS (SIMULTÂNEO)</span>
                    <span className="px-1.5 py-0.2 bg-[#00ff66]/15 rounded text-[9px]">LATAM FEED</span>
                  </div>
                  <div className="text-emerald-200 font-bold text-xs sm:text-sm leading-snug">
                    "{chunks[chunks.length - 1].ptText || chunks[chunks.length - 1].esText || chunks[chunks.length - 1].originalText}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STREAM OF RECENT SUBTITLES */}
          <div className="bg-[#07090e] border border-[#171b26] rounded p-3">
            <div className="flex items-center justify-between border-b border-[#171b26] pb-2 mb-2 text-xs font-mono">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#00ff66]" />
                HISTORIAL DE SUBTÍTULOS EMITIDOS (ÚLTIMOS CHUNKS)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-500">TOTAL: {chunks.length}</span>
                {chunks.length > 0 && (
                  <>
                    <button
                      onClick={handleDeleteLastChunk}
                      className="px-2 py-0.5 rounded bg-[#ff1744]/15 hover:bg-[#ff1744]/30 border border-[#ff1744]/40 text-[#ff1744] text-[10px] font-bold flex items-center gap-1 transition-all"
                      title="Borrar el último subtítulo emitido en caso de error o palabra indeseada"
                    >
                      <Trash2 className="w-3 h-3" />
                      BORRAR ÚLTIMO
                    </button>

                    <button
                      onClick={handleEmergencyClear}
                      className="px-2 py-0.5 rounded bg-[#ff1744] hover:bg-[#ff1744]/80 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-[0_0_8px_#ff1744]"
                      title="Erase Displayed Memory (CEA-608): Borra inmediatamente todos los subtítulos en pantalla ante una contingencia"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      BLACKOUT PANTALLA
                    </button>

                    <div className="flex items-center gap-1 ml-1 border-l border-[#202738] pl-2">
                      <a
                        href={`/api/stages/${selectedStageId}/export/srt?lang=${micSourceLang}`}
                        download={`nerdsub-${selectedStageId}.srt`}
                        className="px-1.5 py-0.5 rounded bg-[#101520] hover:bg-[#1b2333] border border-[#232c3d] hover:border-[#00f5ff] text-[#00f5ff] text-[10px] font-bold flex items-center gap-0.5 transition-all"
                        title="Descargar subtítulos .SRT sincronizados para YouTube"
                      >
                        <Download className="w-2.5 h-2.5" />
                        SRT
                      </a>
                      <a
                        href={`/api/stages/${selectedStageId}/export/vtt?lang=${micSourceLang}`}
                        download={`nerdsub-${selectedStageId}.vtt`}
                        className="px-1.5 py-0.5 rounded bg-[#101520] hover:bg-[#1b2333] border border-[#232c3d] hover:border-[#00ff66] text-[#00ff66] text-[10px] font-bold flex items-center gap-0.5 transition-all"
                        title="Descargar subtítulos .VTT para reproductores web"
                      >
                        <Download className="w-2.5 h-2.5" />
                        VTT
                      </a>
                      <a
                        href={`/api/stages/${selectedStageId}/export/md?lang=${micSourceLang}`}
                        download={`nerdsub-${selectedStageId}.md`}
                        className="px-1.5 py-0.5 rounded bg-[#101520] hover:bg-[#1b2333] border border-[#232c3d] hover:border-[#ffb800] text-[#ffb800] text-[10px] font-bold flex items-center gap-0.5 transition-all"
                        title="Descargar Minuta Ejecutiva en Markdown con resumen de Gemini"
                      >
                        <Download className="w-2.5 h-2.5" />
                        MD
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            {chunks.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-gray-500 space-y-1">
                <div>(No hay subtítulos emitidos en esta sala aún)</div>
                <div className="text-[11px] text-gray-600">
                  Hacé clic en <span className="text-[#00f5ff]">"TRANSMITIR_MIC"</span> y hablá, o usá la barra de texto inferior para enviar una prueba.
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {chunks.slice(-6).map((chunk, idx, arr) => {
                  const isLatest = idx === arr.length - 1;
                  return (
                    <div
                      key={chunk.id}
                      className={`p-2.5 rounded border text-xs font-mono transition-all ${
                        isLatest
                          ? 'bg-[#0f172a] border-[#00f5ff]/40 shadow-sm'
                          : 'bg-[#0a0d14] border-[#161c28] opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#00f5ff] font-bold">
                            [{new Date(chunk.timestamp).toLocaleTimeString()}]
                          </span>
                          <span className="text-gray-400">ORIGINAL ({chunk.sourceLang.toUpperCase()}):</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {chunk.confidence && (
                            <span className="text-[#00ff66]">
                              {Math.round(chunk.confidence * 100)}% CONF
                            </span>
                          )}
                          {isLatest && (
                            <span className="px-1.5 py-0.2 rounded bg-[#00f5ff]/20 text-[#00f5ff] font-bold text-[9px]">
                              ÚLTIMO
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Verbatim Spoken Text */}
                      <div className="text-white font-bold text-sm mb-1 leading-snug">
                        "{chunk.originalText}"
                      </div>

                      {/* Translations & Glossaries */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#1b2230]">
                        <div className="text-gray-300">
                          <span className="text-gray-500 font-bold">ES:</span> {chunk.esText || chunk.originalText}
                        </div>
                        <div className="text-[#94a3b8]">
                          <span className="text-gray-500 font-bold">EN:</span> {chunk.enText || chunk.originalText}
                        </div>
                      </div>

                      {/* Tech terms chips if detected */}
                      {chunk.techTerms && chunk.techTerms.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[9px] text-gray-500">TÉRMINOS:</span>
                          {chunk.techTerms.map((t) => (
                            <span
                              key={t.term}
                              className="px-1.5 py-0.2 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/30 text-[#00f5ff] text-[9px] font-bold"
                            >
                              {t.term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MANUAL TEXT OVERRIDE & QUICK TEST INJECTOR */}
          <div className="bg-[#07090e] border border-[#171b26] rounded p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#ffb800] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#ffb800]" />
                EMISIÓN DE TEXTO DIRECTA / ANUNCIO AL AIRE
              </span>
              <span className="text-[10px] text-gray-500">Presioná ENTER para enviar</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendManualText();
                  }
                }}
                placeholder="Escribí una frase de prueba o anuncio oficial para enviar a todos los subtítulos..."
                className="flex-1 px-3 py-2 bg-[#0c1017] border border-[#222a3d] rounded text-xs font-mono text-white focus:outline-none focus:border-[#00f5ff]"
              />
              <button
                onClick={() => handleSendManualText()}
                disabled={!manualText.trim() || isSendingManual}
                className="hardware-btn flex items-center gap-1.5 px-4 py-2 bg-[#141b29] hover:bg-[#1a2336] text-[#00f5ff] text-xs font-mono font-bold rounded transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingManual ? 'ENVIANDO...' : 'ENVIAR_AL_AIRE'}</span>
              </button>
            </div>

            {/* Quick 1-Click Test Phrases */}
            <div className="pt-1 flex items-center gap-2 flex-wrap text-[10px] font-mono">
              <span className="text-gray-500">FRASES RÁPIDAS DE PRUEBA:</span>
              <button
                onClick={() => handleSendManualText('Hola a todos, bienvenidos a la Vibeathon de Nerdearla 2026.')}
                className="px-2 py-0.5 rounded bg-[#101520] border border-[#1f2738] hover:border-[#00f5ff] text-gray-300 hover:text-white transition-all"
              >
                "Hola a todos, bienvenidos a Nerdearla..."
              </button>
              <button
                onClick={() => handleSendManualText('Estamos testeando la transcripción en vivo del micrófono sin latencia.')}
                className="px-2 py-0.5 rounded bg-[#101520] border border-[#1f2738] hover:border-[#00f5ff] text-gray-300 hover:text-white transition-all"
              >
                "Testeando transcripción del micrófono..."
              </button>
              <button
                onClick={() => handleSendManualText('El cluster de Kubernetes está corriendo los pods en producción con Cilium eBPF.')}
                className="px-2 py-0.5 rounded bg-[#101520] border border-[#1f2738] hover:border-[#00f5ff] text-gray-300 hover:text-white transition-all"
              >
                "Cluster Kubernetes con Cilium eBPF..."
              </button>
            </div>
          </div>

        </div>
      </RackUnit>

      {/* 19" RACK UNIT 05: MINI-PC STAGE MATRIX & ZERO-RUSTDESK REMOTE MANAGEMENT */}
      <RackUnit
        unitId="RACK_05"
        uHeight="2U"
        title="MATRIZ DE MINI-PCs DE SALA // GESTIÓN REMOTA ZERO-RUSTDESK (MESA TÉCNICA)"
        subTitle="Control de hardware para las Mini PCs conectadas por Jack 3.5mm en cada escenario. Elimina la necesidad de acceder por RustDesk para reiniciar."
        rightBadge={
          <div className="flex items-center gap-2">
            {onOpenVMixModal && (
              <button
                onClick={onOpenVMixModal}
                className="px-2.5 py-1 rounded bg-[#ff1744]/15 hover:bg-[#ff1744]/25 border border-[#ff1744]/40 text-[#ff1744] text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>INTEGRACIÓN vMIX / OBS</span>
              </button>
            )}
            <div className="px-2 py-1 rounded bg-[#07090e] border border-[#1b2230] text-[#00ff66] text-[10px] font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]" />
              <span>WATCHDOG MESA: ACTIVO</span>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          
          {/* Remote Reload Feedback Toast */}
          {remoteReloadFeedback && (
            <div className="p-3 bg-[#00ff66]/15 border border-[#00ff66]/40 rounded text-[#00ff66] text-xs font-mono flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span className="font-bold">{remoteReloadFeedback}</span>
              </div>
              <span className="text-[10px] text-gray-400">Comando WebSocket emitido</span>
            </div>
          )}

          {/* Grid of 3 Stage Mini PCs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stages.map((stg, i) => (
              <div
                key={stg.id}
                className="bg-[#07090e] border border-[#171b26] rounded-xl p-3 flex flex-col justify-between space-y-3"
              >
                {/* Header */}
                <div className="border-b border-[#171b26] pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10141e] text-[#00f5ff] font-bold border border-[#202738]">
                      MINI-PC 0{i + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-white uppercase">{stg.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-mono text-[#00ff66]">
                      <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                      ONLINE
                    </span>
                    {stages.length > 1 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Estás seguro de eliminar la sala "${stg.name}" (${stg.id})?`)) {
                            try {
                              const res = await deleteStageApi(stg.id);
                              if (res.success) {
                                if (selectedStage?.id === stg.id) {
                                  const remaining = stages.filter(s => s.id !== stg.id);
                                  if (remaining.length > 0) {
                                    onSelectStage(remaining[0].id);
                                  }
                                }
                              } else {
                                alert(res.error || 'No se pudo eliminar la sala');
                              }
                            } catch (err: any) {
                              alert(`Error: ${err.message}`);
                            }
                          }
                        }}
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1"
                        title={`Eliminar sala ${stg.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Telemetry info */}
                <div className="space-y-1 text-[10px] font-mono text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>ENTRADA HARDWARE:</span>
                    <span className="text-[#00f5ff] font-bold truncate max-w-[160px]" title={stageRouting[stg.id]?.deviceLabel || 'Jack 3.5mm Line-In'}>
                      {stageRouting[stg.id]?.deviceLabel || 'Jack 3.5mm Line-In'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VÚMETRO DE ENTRADA:</span>
                    <span className={stg.audioLevel > 0 ? 'text-[#00ff66] font-bold' : 'text-gray-500'}>
                      {stg.audioLevel > 0 ? `${stg.audioLevel}% (ACTIVO)` : 'SILENCIO (0%)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PROYECTOR DE SALA:</span>
                    <span className="text-gray-200">Confidence Display</span>
                  </div>
                </div>

                {/* Action Buttons: F5 Remoto, Kiosk Link, vMix Overlay */}
                <div className="pt-2 border-t border-[#171b26] space-y-1.5 font-mono text-[10px]">
                  <button
                    onClick={() => handleRemoteReloadNode(stg.id, stg.name)}
                    className="w-full py-1.5 px-2 rounded bg-[#ff1744]/15 hover:bg-[#ff1744]/25 border border-[#ff1744]/40 text-[#ff1744] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Emite una orden WebSocket a la Mini PC de esta sala para que refresque su navegador automáticamente, sin usar RustDesk"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ENVIAR F5 REMOTO (REINICIAR NODO)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => window.open(`/?view=kiosk&stage=${stg.id}`, '_blank')}
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                      title="Abre la pantalla de orador y proyector de sala"
                    >
                      <Radio className="w-3 h-3 text-[#00f5ff]" />
                      <span>↗ KIOSK</span>
                    </button>

                    <button
                      onClick={() => window.open(`/?view=overlay&stage=${stg.id}&lang=es&theme=vmix`, '_blank')}
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                      title="Abre el overlay transparente de vMix / OBS Studio"
                    >
                      <Tv className="w-3 h-3 text-[#ff1744]" />
                      <span>↗ vMIX / OBS</span>
                    </button>

                    <button
                      onClick={() => window.open(`/?stage=${stg.id}`, '_blank')}
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                      title="Abre la vista móvil de la audiencia"
                    >
                      <Smartphone className="w-3 h-3 text-[#00ff66]" />
                      <span>↗ MÓVIL QR</span>
                    </button>

                    <a
                      href={`/api/stages/${stg.id}/export?format=srt`}
                      download={`subtitulos_${stg.id}.srt`}
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                      title="Descargar subtítulos de la charla en formato .SRT oficial"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>📥 .SRT</span>
                    </a>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </RackUnit>

      {/* 19" RACK UNIT 06: MESA TÉCNICA - MODERACIÓN DE PREGUNTAS DEL PÚBLICO (Q&A) */}
      <RackUnit
        unitId="RACK_06"
        uHeight="2U"
        title="CONSOLA DE MODERACIÓN DE PREGUNTAS (Q&A) & FIJADO EN TELEPROMPTER"
        subTitle="Control de preguntas enviadas por los asistentes desde el QR de sala. Pincha preguntas para mostrarlas en la pantalla de retorno del orador."
        rightBadge={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#ffb800] bg-[#ffb800]/15 px-2 py-0.5 rounded border border-[#ffb800]/30">
              {adminQuestions.length} PREGUNTAS EN COLA
            </span>
          </div>
        }
      >
        <div className="space-y-3 font-mono text-xs">
          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1b2230] pb-2">
            <div className="flex items-center gap-1.5">
              {(['all', 'on_stage', 'approved', 'pending'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setQaFilter(tab)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    qaFilter === tab
                      ? 'bg-[#182030] text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                      : 'bg-[#0d1017] text-gray-400 hover:text-white border border-[#1b2230]'
                  }`}
                >
                  {tab === 'all' ? 'TODAS' : tab === 'on_stage' ? '📌 EN ESCENARIO' : tab === 'approved' ? 'APROBADAS' : 'PENDIENTES'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {adminQuestions.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Deseas vaciar todas las preguntas de esta sala?')) {
                      await clearStageQuestionsApi(selectedStageId);
                      fetchAdminQuestions();
                    }
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-mono px-2 py-1 rounded bg-red-950/30 border border-red-800/40 transition-colors"
                  title="Vaciar lista de preguntas de este escenario"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>VACIAR PREGUNTAS</span>
                </button>
              )}

              {adminQuestions.length === 0 && (
                <button
                  onClick={async () => {
                    await seedStageQuestionsApi(selectedStageId);
                    fetchAdminQuestions();
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono px-2 py-1 rounded bg-cyan-950/30 border border-cyan-800/40 transition-colors"
                  title="Cargar preguntas de prueba para este escenario"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>CARGAR PREGUNTAS DEMO</span>
                </button>
              )}

              <button
                onClick={fetchAdminQuestions}
                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 font-mono px-2 py-1 rounded bg-[#10141e] border border-[#202738] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ACTUALIZAR COLA</span>
              </button>
            </div>
          </div>

          {/* Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {adminQuestions.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500 text-xs">
                No hay preguntas del público para este escenario en este momento.
              </div>
            ) : (
              adminQuestions
                .filter(q => qaFilter === 'all' || q.status === qaFilter)
                .map(q => {
                  const isOnStage = q.status === 'on_stage';
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 transition-all ${
                        isOnStage
                          ? 'bg-[#ffb800]/15 border-[#ffb800] shadow-md shadow-[#ffb800]/20 ring-1 ring-[#ffb800]'
                          : 'bg-[#0a0d14] border-[#1b2230] hover:border-[#2a364a]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-gray-300">
                            {q.author}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#00f5ff] bg-[#00f5ff]/10 px-1.5 py-0.5 rounded border border-[#00f5ff]/30 font-bold">
                              ▲ {q.votes} VOTOS
                            </span>
                            {isOnStage && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ffb800] text-black">
                                EN ESCENARIO
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-white text-xs font-sans font-medium leading-relaxed">
                          "{q.text}"
                        </p>
                      </div>

                      {/* Operator Action Buttons */}
                      <div className="pt-2 border-t border-[#1b2230] flex items-center justify-between gap-1.5 text-[10px]">
                        {isOnStage ? (
                          <button
                            onClick={() => handleUpdateQuestionStatus(q.id, 'approved')}
                            className="px-2.5 py-1 rounded bg-[#ffb800]/20 hover:bg-[#ffb800]/30 border border-[#ffb800] text-[#ffb800] font-bold flex items-center gap-1 transition-all"
                            title="Quitar esta pregunta de la pantalla del orador"
                          >
                            <Pin className="w-3 h-3" />
                            <span>DESFIJAR DE PANTALLA</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateQuestionStatus(q.id, 'on_stage')}
                            className="px-2.5 py-1 rounded bg-[#00f5ff]/15 hover:bg-[#00f5ff]/25 border border-[#00f5ff]/50 text-[#00f5ff] font-bold flex items-center gap-1 transition-all"
                            title="Fijar de inmediato en el prompter del speaker y pantalla gigante"
                          >
                            <Pin className="w-3 h-3" />
                            <span>FIJAR EN TELEPROMPTER</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuestionStatus(q.id, 'dismissed')}
                            className="p-1 rounded bg-[#10141e] hover:bg-[#ff1744]/20 border border-[#202738] hover:border-[#ff1744] text-gray-400 hover:text-[#ff1744] transition-all"
                            title="Descartar pregunta de la moderación"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </RackUnit>

      {/* DYNAMIC STAGE PROVISIONING MODAL */}
      <AddStageModal
        isOpen={showAddStageModal}
        existingStagesCount={stages.length}
        onClose={() => setShowAddStageModal(false)}
        onStageCreated={(newStage) => {
          onSelectStage(newStage.id);
        }}
      />

    </div>
  );
};
