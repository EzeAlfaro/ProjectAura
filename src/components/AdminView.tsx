import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, 
  TechTerm 
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
  Volume1
} from 'lucide-react';
import { 
  triggerDemo, 
  stopStage, 
  uploadAudioChunk, 
  addGlossaryTerm, 
  fetchGlossary 
} from '../services/api.js';

interface AdminViewProps {
  stages: Stage[];
  onSelectStage: (id: string) => void;
  geminiConfigured: boolean;
  onOpenApiKeyModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  stages,
  onSelectStage,
  geminiConfigured,
  onOpenApiKeyModal,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'stage-1');
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [glossaryTerms, setGlossaryTerms] = useState<TechTerm[]>([]);
  
  // Audio Devices & Hardware Diagnostics
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hardwareStats, setHardwareStats] = useState({
    audioContextSupported: false,
    mediaRecorderSupported: false,
    sampleRate: 0,
    webSocketSupported: typeof WebSocket !== 'undefined',
  });

  // Sound Check / Pre-flight state
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

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sound check stream ref
  const soundCheckStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchGlossary().then(setGlossaryTerms);
    refreshAudioDevices();
    checkHardwareCompatibility();

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
      webSocketSupported: typeof WebSocket !== 'undefined',
    });
  };

  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(mics[0].deviceId);
      }
    } catch (e) {
      console.warn('Device enumeration error:', e);
    }
  };

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  // Start Live Microphone Streaming
  const startMicStreaming = async () => {
    setAudioError(null);
    stopSoundCheck();

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          try {
            await uploadAudioChunk(selectedStageId, e.data);
          } catch (err) {
            console.error('Error sending audio chunk:', err);
          }
        }
      };

      mediaRecorder.start(3000); // 3-second slices
      setIsRecording(true);
      drawVisualizer();

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setAudioError(err.message || 'No se pudo acceder al micrófono del dispositivo');
    }
  };

  // Stop Live Microphone Streaming
  const stopMicStreaming = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
    setCurrentDbfs(-60);
    setIsClipping(false);
  };

  // Pre-flight 4-Second Sound Check
  const startSoundCheck = async () => {
    setSoundCheckResult(null);
    setSoundCheckProgress(0);
    setIsSoundChecking(true);

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      soundCheckStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      let peak = -Infinity;
      let sumSquares = 0;
      let samplesCount = 0;

      const startTime = Date.now();
      const duration = 4000;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        setSoundCheckProgress(progress);

        analyser.getFloatTimeDomainData(dataArray);
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          const abs = Math.abs(val);
          if (abs > peak) peak = abs;
          sumSquares += val * val;
          samplesCount++;
        }

        if (elapsed >= duration) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          setIsSoundChecking(false);

          const rms = Math.sqrt(sumSquares / samplesCount) || 0.0001;
          const peakDb = Math.round(20 * Math.log10(peak || 0.0001));
          const avgDb = Math.round(20 * Math.log10(rms));

          let status: 'optimal' | 'low' | 'clipping' = 'optimal';
          if (peakDb >= -1) status = 'clipping';
          else if (peakDb < -22) status = 'low';

          setSoundCheckResult({
            peakDb: Math.max(-60, peakDb),
            avgDb: Math.max(-60, avgDb),
            status,
          });
        }
      }, 100);

    } catch (err: any) {
      setIsSoundChecking(false);
      setAudioError(err.message || 'Error en prueba de sonido');
    }
  };

  const stopSoundCheck = () => {
    if (soundCheckStreamRef.current) {
      soundCheckStreamRef.current.getTracks().forEach((t) => t.stop());
      soundCheckStreamRef.current = null;
    }
    setIsSoundChecking(false);
  };

  // Oscilloscope & dBFS Meter Visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Clean background with industrial grid line
      ctx.fillStyle = '#0a0c13';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#161a26';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;
      let maxVal = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        if (val > maxVal) maxVal = val;
        const barHeight = (val / 255) * canvas.height;

        ctx.fillStyle = val > 220 ? '#ff1744' : val > 170 ? '#ffb700' : '#00f5ff';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }

      const normalized = maxVal / 255;
      const db = normalized > 0.001 ? Math.round(20 * Math.log10(normalized)) : -60;
      setCurrentDbfs(db);
      setIsClipping(db >= -1);
    };

    render();
  };

  const handleTriggerDemo = async (stageId: string, talkId: string) => {
    if (isRecording) stopMicStreaming();
    await triggerDemo(stageId, talkId);
  };

  const handleStopStage = async (stageId: string) => {
    if (isRecording) stopMicStreaming();
    await stopStage(stageId);
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDefinition.trim()) return;

    await addGlossaryTerm(newTerm.trim(), newDefinition.trim(), newCategory);
    setGlossaryTerms(await fetchGlossary());
    setNewTerm('');
    setNewDefinition('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* MASTER BROADCAST CONSOLE HEADER */}
      <div className="bg-[#0d0f17] border border-[#1c2130] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#141722] border border-[#222636] text-[#00f5ff] flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-white uppercase tracking-tight">
                SOUND_CONSOLE // PRODUCTION_DESK
              </h2>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 font-bold">
                MULTI-TRACK ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-[#64748b]">
              Blackmagic / Field Mixer Layout para operadores y sonidistas del evento
            </p>
          </div>
        </div>

        {/* Master Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#11131a] border border-[#222636] flex items-center gap-2 text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span>HARDWARE: {hardwareStats.sampleRate / 1000} kHz</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#11131a] border border-[#222636] flex items-center gap-2 text-gray-300">
            <Activity className="w-3.5 h-3.5 text-[#ffb700]" />
            <span>INPUTS: {audioDevices.length} MICS</span>
          </div>
        </div>
      </div>

      {/* HARDWARE DIAGNOSTICS & PRE-FLIGHT LEVEL TEST RACK */}
      <div className="bg-[#0a0c13] border border-[#1c2130] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1c2130] pb-3 gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              AUDIO_INTERFACE // HARDWARE_INSPECTION
            </span>
            <p className="text-[11px] font-mono text-[#64748b]">
              Selección de interfaz física y prueba de calibración de ganancia
            </p>
          </div>

          <button
            onClick={refreshAudioDevices}
            className="hardware-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-gray-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ESCANEAR_DISPOSITIVOS</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Audio Input Device Dropdown (6 cols) */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="block text-[11px] font-mono text-[#64748b]">
              DISPOSITIVO_DE_ENTRADA (MIC / USB INTERFACE):
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3 py-2 bg-[#11131a] border border-[#222636] rounded-xl text-xs text-white focus:outline-none focus:border-[#00f5ff] font-mono"
            >
              {audioDevices.length === 0 ? (
                <option value="">(No se detectaron dispositivos de audio)</option>
              ) : (
                audioDevices.map((d, index) => (
                  <option key={d.deviceId || index} value={d.deviceId}>
                    {d.label || `Entrada de Audio ${index + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sound Check Trigger & Result (6 cols) */}
          <div className="md:col-span-6 flex flex-col justify-end space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={startSoundCheck}
                disabled={isSoundChecking || isRecording}
                className="hardware-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#00f5ff] hover:border-[#00f5ff]"
              >
                <Gauge className="w-4 h-4" />
                <span>{isSoundChecking ? `CALIBRANDO (${soundCheckProgress}%)...` : 'PRUEBA_DE_NIVEL (4s)'}</span>
              </button>

              {soundCheckResult && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                    soundCheckResult.status === 'optimal'
                      ? 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/40'
                      : soundCheckResult.status === 'clipping'
                      ? 'bg-[#ff1744]/15 text-[#ff1744] border-[#ff1744]/40'
                      : 'bg-[#ffb700]/15 text-[#ffb700] border-[#ffb700]/40'
                  }`}
                >
                  <span>
                    PEAK: {soundCheckResult.peakDb} dBFS • {soundCheckResult.status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {isSoundChecking && (
              <div className="w-full bg-[#11131a] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00f5ff] h-full transition-all duration-100"
                  style={{ width: `${soundCheckProgress}%` }}
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* VERTICAL CHANNEL STRIPS (Teenage Engineering TX-6 / Blackmagic ATEM Mixer Style) */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-[#64748b]">
          <span className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#00f5ff]" />
            CONSOLA DE CANALES MULTI-SALA (1-TO-N BROADCAST MATRIX)
          </span>
          <span>CHANNELS: {stages.length} ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((stage, idx) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={`bg-[#0a0c13] rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#00f5ff] shadow-xl shadow-[#00f5ff]/10'
                    : 'border-[#1c2130] hover:border-[#2b334a]'
                }`}
              >
                {/* Channel Header */}
                <div className="flex items-center justify-between border-b border-[#1c2130] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141722] text-[#00f5ff] font-bold">
                      CH_0{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">{stage.name}</span>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full ${stage.isLive ? 'bg-[#ff5500] animate-pulse shadow-[0_0_8px_#ff5500]' : 'bg-[#334155]'}`} />
                </div>

                {/* Talk Meta */}
                <div className="space-y-1 mb-4">
                  <div className="text-xs font-bold text-gray-200 line-clamp-1">
                    {stage.talkTitle}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748b] truncate">
                    {stage.speaker}
                  </div>
                </div>

                {/* Segmented LED VU Meter Bar (Discrete Multi-Segment LEDs) */}
                <div className="bg-[#07080c] border border-[#141722] rounded-xl p-3 mb-4 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b]">
                    <span>AUDIO_LEVEL</span>
                    <span className="text-white font-bold">{stage.audioLevel}%</span>
                  </div>

                  {/* Discrete LED ladder */}
                  <div className="grid grid-cols-12 gap-1 h-3 items-center">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const threshold = ((i + 1) / 12) * 100;
                      const isActive = stage.audioLevel >= threshold;
                      const isRed = i >= 10;
                      const isYellow = i >= 7 && i < 10;
                      
                      let colorClass = 'bg-[#141722]';
                      if (isActive) {
                        if (isRed) colorClass = 'bg-[#ff1744] shadow-[0_0_4px_#ff1744]';
                        else if (isYellow) colorClass = 'bg-[#ffb700] shadow-[0_0_4px_#ffb700]';
                        else colorClass = 'bg-[#00ff88] shadow-[0_0_4px_#00ff88]';
                      }

                      return <div key={i} className={`h-full rounded-xs transition-colors duration-75 ${colorClass}`} />;
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-[#475569] pt-1">
                    <span>AUD: {stage.audienceCount}</span>
                    <span>LAT: {stage.latencyMs}ms</span>
                    <span>SRC: {stage.currentAudioSource.toUpperCase()}</span>
                  </div>
                </div>

                {/* Tactical Channel Strip Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1c2130]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerDemo(stage.id, stage.id === 'stage-1' ? 'talk-en-k8s' : 'talk-es-devops');
                    }}
                    className="hardware-btn py-1.5 px-2 rounded-lg text-[10px] font-mono text-center font-bold text-gray-300 hover:text-[#00f5ff]"
                  >
                    TEST_DEMO
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopStage(stage.id);
                    }}
                    className="hardware-btn py-1.5 px-2 rounded-lg text-[10px] font-mono text-center font-bold text-[#ff1744] hover:bg-[#ff1744]/10"
                  >
                    STOP_CH
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED CHANNEL DETAIL & MIC INGESTION PANEL */}
      {currentStage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Audio Ingestion Console (7 cols) */}
          <div className="lg:col-span-7 bg-[#0a0c13] border border-[#1c2130] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2130] pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  AUDIO_ROUTING // TARGET: {currentStage.name.toUpperCase()}
                </span>
                <p className="text-[11px] font-mono text-[#64748b]">
                  Control de transmisión directa por micrófono o archivo de sonido
                </p>
              </div>

              {currentStage.isLive && (
                <button
                  onClick={() => handleStopStage(currentStage.id)}
                  className="px-3 py-1 bg-[#ff1744]/15 hover:bg-[#ff1744]/25 border border-[#ff1744]/40 text-[#ff1744] text-xs font-mono font-bold rounded-xl transition-colors"
                >
                  DISARM_STAGE
                </button>
              )}
            </div>

            {/* Live Mic Transmitter with Oscilloscope */}
            <div className="p-4 bg-[#0d0f17] border border-[#1c2130] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#00f5ff]" />
                    <span>TRANSMISIÓN_EN_VIVO (MIC_INPUT)</span>
                  </div>
                  <p className="text-[11px] font-mono text-[#64748b]">
                    Transmite audio en tiempo real directamente al motor multimodal de Gemini
                  </p>
                </div>

                {isRecording ? (
                  <button
                    onClick={stopMicStreaming}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ff1744] hover:bg-[#ff1744]/90 text-white text-xs font-mono font-bold rounded-xl transition-all animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>DETENER_AIRE</span>
                  </button>
                ) : (
                  <button
                    onClick={startMicStreaming}
                    className="hardware-btn-active flex items-center gap-2 px-4 py-2 bg-[#181d2a] text-[#00f5ff] text-xs font-mono font-bold rounded-xl transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>TRANSMITIR_MIC</span>
                  </button>
                )}
              </div>

              {/* Oscilloscope Canvas & Calibrated dBFS Bar */}
              {isRecording && (
                <div className="space-y-2 pt-2">
                  <div className="rounded-xl overflow-hidden border border-[#1c2130]">
                    <canvas ref={canvasRef} width={500} height={45} className="w-full h-11" />
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-gray-400 w-12 text-right">{currentDbfs} dBFS</span>
                    <div className="flex-1 bg-[#07080c] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#1c2130]">
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          isClipping ? 'bg-[#ff1744] animate-pulse' : 'bg-gradient-to-r from-[#00ff88] via-[#ffb700] to-[#ff1744]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, ((currentDbfs + 60) / 60) * 100))}%` }}
                      />
                    </div>
                    {isClipping && (
                      <span className="px-1.5 py-0.2 bg-[#ff1744] text-white rounded font-bold text-[9px] animate-pulse">
                        CLIP!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {audioError && (
                <div className="p-2.5 bg-[#ff1744]/15 border border-[#ff1744]/40 rounded-xl text-[#ff1744] text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{audioError}</span>
                </div>
              )}
            </div>

            {/* 1-Click Nerdearla Talk Demos */}
            <div className="p-4 bg-[#0d0f17] border border-[#1c2130] rounded-xl space-y-2">
              <span className="text-xs font-mono font-bold text-[#ffb700] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                DEMOS_OFICIALES_NERDEARLA (1-CLICK TEST)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-en-k8s')}
                  className="hardware-btn p-2.5 rounded-xl text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#00f5ff] font-bold">EN 🇺🇸 → ES 🇦🇷</div>
                  <div className="text-xs font-bold text-white mt-0.5">Keynote K8s & eBPF</div>
                  <div className="text-[10px] font-mono text-[#64748b]">Alex Rivera</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-devops')}
                  className="hardware-btn p-2.5 rounded-xl text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#8b5cf6] font-bold">ES 🇦🇷 → EN 🇺🇸</div>
                  <div className="text-xs font-bold text-white mt-0.5">Sysarmy DevOps</div>
                  <div className="text-[10px] font-mono text-[#64748b]">Valeria Gómez</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-ai')}
                  className="hardware-btn p-2.5 rounded-xl text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#ff5500] font-bold">DATA & AI TRACK</div>
                  <div className="text-xs font-bold text-white mt-0.5">Gemini & Gemma</div>
                  <div className="text-[10px] font-mono text-[#64748b]">Federico Balbi</div>
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="p-3.5 bg-[#0d0f17] border border-[#1c2130] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-[#00ff88]" />
                  <span>SUBIR ARCHIVO DE AUDIO LOCAL</span>
                </div>
                <p className="text-[10px] font-mono text-[#64748b]">
                  Soporta .mp3, .wav, .webm
                </p>
              </div>

              <label className="hardware-btn cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-200 hover:text-white">
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
          <div className="lg:col-span-5 bg-[#0a0c13] border border-[#1c2130] rounded-2xl p-5 space-y-4">
            <div className="border-b border-[#1c2130] pb-3">
              <span className="text-xs font-mono font-bold text-[#00f5ff] flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                GLOSSARY_CLI // INYECTOR_EN_VIVO
              </span>
              <p className="text-[11px] font-mono text-[#64748b]">
                Inyectá términos prioritarios directamente al contexto de Gemini
              </p>
            </div>

            <form onSubmit={handleAddTerm} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-[#64748b] mb-1">
                  PARAM: --term
                </label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="ej. Cilium, Kafka, ArgoCD"
                  className="w-full px-3 py-2 bg-[#11131a] border border-[#222636] rounded-xl text-white focus:outline-none focus:border-[#00f5ff]"
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
                  className="w-full px-3 py-2 bg-[#11131a] border border-[#222636] rounded-xl text-white focus:outline-none focus:border-[#00f5ff]"
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
                  className="w-full px-3 py-2 bg-[#11131a] border border-[#222636] rounded-xl text-white focus:outline-none focus:border-[#00f5ff] resize-none"
                  required
                />
              </div>

              {formSuccess && (
                <div className="flex items-center gap-2 p-2 bg-[#00ff88]/15 border border-[#00ff88]/40 rounded-xl text-[#00ff88] text-[11px]">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>[STATUS 201] Término inyectado al motor</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#181d2a] hover:bg-[#202738] border border-[#00f5ff]/40 text-[#00f5ff] font-bold rounded-xl transition-all shadow-sm"
              >
                + INYECTAR_AL_MOTOR
              </button>
            </form>

            <div className="pt-2 border-t border-[#1c2130]">
              <div className="text-[10px] font-mono text-[#64748b] mb-2">
                TÉRMINOS ACTIVOS EN MEMORIA: {glossaryTerms.length}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                {glossaryTerms.slice(0, 8).map((t) => (
                  <div key={t.term} className="bg-[#11131a] p-2 rounded-lg border border-[#1c2130] flex items-center justify-between">
                    <span className="font-bold text-white">{t.term}</span>
                    <span className="text-[#8b5cf6]">[{t.category}]</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
