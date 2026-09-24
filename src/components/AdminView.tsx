import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, 
  TechTerm,
  SubtitleChunk 
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
  ShieldAlert
} from 'lucide-react';
import { 
  triggerDemo, 
  stopStage, 
  uploadAudioChunk, 
  addGlossaryTerm, 
  fetchGlossary 
} from '../services/api.js';
import { 
  RackUnit, 
  HardwareVuMeter, 
  HardwareOscilloscope, 
  HexScrew 
} from './HardwareControls.js';
import { WSClient } from '../services/websocket.js';
import { findBroadcastSplitIndex, formatBroadcastSubtitle } from '../utils/broadcastSegmenter.js';

interface AdminViewProps {
  stages: Stage[];
  onSelectStage: (id: string) => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
  onOpenVMixModal?: () => void;
  chunks?: SubtitleChunk[];
  wsClient?: WSClient | null;
  onPushLiveTranscript?: (text: string, sourceLang?: string) => void;
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
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'stage-1');
  const [isRecording, setIsRecording] = useState(false);
  const [micSourceLang, setMicSourceLang] = useState<'es' | 'en'>('es');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [glossaryTerms, setGlossaryTerms] = useState<TechTerm[]>([]);
  const [remoteReloadFeedback, setRemoteReloadFeedback] = useState<string | null>(null);
  
  // Audio Devices & Hardware Diagnostics
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const soundCheckStreamRef = useRef<MediaStream | null>(null);
  const soundCheckAudioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const committedCharsRef = useRef(0);
  const silenceFlushTimerRef = useRef<any>(null);

  useEffect(() => {
    fetchGlossary().then(setGlossaryTerms);
    refreshAudioDevices();
    checkHardwareCompatibility();

    const hasSpeech = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechApiAvailable(hasSpeech);

    return () => {
      stopMicStreaming();
      stopSoundCheck();
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

      if (audioInputs.length > 0 && !selectedDeviceId) {
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

      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

  const commitAdminPhrase = (phrase: string, lang: 'es' | 'en') => {
    const clean = phrase.trim();
    if (!clean) return;

    if (onPushLiveTranscript) {
      onPushLiveTranscript(clean, lang);
    } else {
      fetch(`/api/stages/${selectedStageId}/live-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, sourceLang: lang })
      }).catch(console.error);
    }
  };

  /**
   * Broadcast-Grade SpeechRecognition factory for Mesa Técnica.
   * Chunks long continuous speech into bite-sized 6-8 word broadcast subtitles.
   * Flushes on 550ms acoustic pauses so fast speakers never generate monster paragraphs.
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

            // Rapid broadcast phrase chunking: cut at 7-8 words or natural conjunctions
            while (true) {
              const uncommitted = transcript.substring(committedCharsRef.current).trimStart();
              if (!uncommitted) break;

              const splitPos = findBroadcastSplitIndex(uncommitted, {
                maxWords: 8,
                maxChars: 50,
                minWordsBeforeCut: 5,
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
            setLiveInterimText(remaining);

            // Fast acoustic pause detection: 550ms of silence flushes any remaining speech immediately!
            if (remaining.length > 0) {
              silenceFlushTimerRef.current = setTimeout(() => {
                const toFlush = transcript.substring(committedCharsRef.current).trim();
                if (toFlush) {
                  commitAdminPhrase(toFlush, targetLang);
                  committedCharsRef.current = transcript.length;
                  setLiveInterimText('');
                }
              }, 550);
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

      // 1. Mic capture with ideal constraint and fallback
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Could not grab exact mic device, fallback to default:', err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

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

      // 2. Launch resilient speech recognition
      createAndStartAdminRecognition();

      // 3. MediaRecorder chunk backup
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
            await uploadAudioChunk(selectedStageId, event.data);
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
    }
  };

  const stopMicStreaming = () => {
    isRecordingRef.current = false;
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

    analyserRef.current = null;
    setIsRecording(false);
    setCurrentDbfs(-60);
    setIsClipping(false);
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

  const handleTriggerDemo = async (stageId: string, demoKey: string) => {
    try {
      await triggerDemo(stageId, demoKey);
    } catch (err: any) {
      setAudioError(`Error al activar demo: ${err.message}`);
    }
  };

  const handleStopStage = async (stageId: string) => {
    try {
      await stopStage(stageId);
      if (isRecording && selectedStageId === stageId) {
        stopMicStreaming();
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

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4">
      
      {/* 19" RACK UNIT 01: MASTER PRODUCTION DESK & TELEMETRY */}
      <RackUnit
        unitId="RACK_01"
        uHeight="1U"
        title="MASTER PRODUCTION DESK // BROADCAST TELEMETRY"
        subTitle="Control central de audio, latencias de streaming y motor Gemini 2.5 Flash"
        rightBadge={
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded bg-[#07090e] border border-[#1b2230] flex items-center gap-1.5 text-gray-300">
              <Cpu className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>HARDWARE: {hardwareStats.sampleRate / 1000} kHz</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#07090e] border border-[#1b2230] flex items-center gap-1.5 text-gray-300">
              <Activity className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>INPUTS: {audioDevices.length} MICS</span>
            </div>
          </div>
        }
      >
        {/* HARDWARE INTERFACE CALIBRATION MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#07090e] p-3 rounded border border-[#171b26]">
          {/* Audio Input Device Dropdown (6 cols) */}
          <div className="md:col-span-6 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-mono text-[#64748b]">
                DISPOSITIVO_DE_ENTRADA (MIC / USB AUDIO INTERFACE):
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
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0d1017] border border-[#222a3d] rounded text-xs text-white focus:outline-none focus:border-[#00f5ff] font-mono"
            >
              {audioDevices.length === 0 ? (
                <option value="">(No se detectaron dispositivos de audio físicos)</option>
              ) : (
                audioDevices.map((d, index) => (
                  <option key={d.deviceId || index} value={d.deviceId}>
                    {d.label || `Entrada de Audio Frecuencia ${index + 1}`}
                  </option>
                ))
              )}
            </select>
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

      {/* 19" RACK UNIT 02: MULTI-TRACK CHANNEL STRIPS (TX-6 / ATEM STYLE) */}
      <RackUnit
        unitId="RACK_02"
        uHeight="2U"
        title="CONSOLA DE CANALES MULTI-SALA // 1-TO-N BROADCAST MATRIX"
        subTitle="Monitoreo individual de escenarios con vúmetros de 14 segmentos y control de emisión"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stages.map((stage, idx) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <div
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  onSelectStage(stage.id);
                }}
                className={`bg-[#07090e] rounded border p-3 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#00f5ff] shadow-lg shadow-[#00f5ff]/10 bg-[#0b0e16]'
                    : 'border-[#171c26] hover:border-[#273247]'
                }`}
              >
                {/* Channel Header & Tally */}
                <div className="flex items-center justify-between border-b border-[#171c26] pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10141e] text-[#00f5ff] font-bold border border-[#202738]">
                      CH 0{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-white uppercase">{stage.name}</span>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full ${stage.isLive ? 'bg-[#ff1744] animate-pulse shadow-[0_0_8px_#ff1744]' : 'bg-[#2b3347]'}`} />
                </div>

                {/* Talk Metadata */}
                <div className="space-y-0.5 mb-2.5 text-left">
                  <div className="text-xs font-bold text-gray-200 line-clamp-1">
                    {stage.talkTitle}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748b] truncate">
                    {stage.speaker}
                  </div>
                </div>

                {/* Discrete 14-Segment LED VU Meter */}
                <div className="mb-3">
                  <HardwareVuMeter
                    levelPercent={stage.audioLevel}
                    label={`POST_FADER // ${stage.currentAudioSource.toUpperCase()}`}
                    peakDb={-36 + (stage.audioLevel / 100) * 36}
                    isClipping={stage.audioLevel >= 92}
                  />
                  <div className="flex items-center justify-between text-[8px] font-mono text-[#475569] pt-1">
                    <span>AUD: {stage.audienceCount}</span>
                    <span>LAT: {stage.latencyMs}ms</span>
                    <span>SRC: {stage.currentAudioSource.toUpperCase()}</span>
                  </div>
                </div>

                {/* Channel Strip Hardware Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#171c26]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerDemo(stage.id, stage.id === 'stage-1' ? 'talk-en-k8s' : 'talk-es-devops');
                    }}
                    className="hardware-btn py-1 px-2 rounded text-[10px] font-mono text-center font-bold text-gray-300 hover:text-[#00f5ff]"
                  >
                    TEST_DEMO
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopStage(stage.id);
                    }}
                    className="hardware-btn py-1 px-2 rounded text-[10px] font-mono text-center font-bold text-[#ff1744] hover:bg-[#ff1744]/10"
                  >
                    STOP_CH
                  </button>
                </div>
              </div>
            );
          })}
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
                      onClick={stopMicStreaming}
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
                  <span className="flex items-center gap-1 text-[9px] font-mono text-[#00ff66]">
                    <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                    ONLINE
                  </span>
                </div>

                {/* Telemetry info */}
                <div className="space-y-1 text-[10px] font-mono text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>ENTRADA HARDWARE:</span>
                    <span className="text-gray-200 font-bold">Jack 3.5mm Line-In</span>
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
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <Radio className="w-3 h-3 text-[#00f5ff]" />
                      <span>ABRIR KIOSK</span>
                    </button>

                    <button
                      onClick={() => window.open(`/?view=overlay&stage=${stg.id}&lang=es&theme=vmix`, '_blank')}
                      className="py-1 px-2 rounded bg-[#10141e] hover:bg-[#161c28] border border-[#202738] text-gray-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <Tv className="w-3 h-3 text-[#ff1744]" />
                      <span>vMIX OVERLAY</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </RackUnit>

    </div>
  );
};
