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
import { 
  RackUnit, 
  HardwareVuMeter, 
  HardwareOscilloscope, 
  HexScrew 
} from './HardwareControls.js';

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

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
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
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      soundCheckStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  };

  const startMicStreaming = async () => {
    try {
      setAudioError(null);
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
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
    }
  };

  const stopMicStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-en-k8s')}
                  className="hardware-btn p-2 rounded text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#00f5ff] font-bold">KEYNOTE (EN)</div>
                  <div className="text-xs font-bold text-white mt-0.5">K8s & eBPF</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Brendan Gregg</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-devops')}
                  className="hardware-btn p-2 rounded text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#00ff66] font-bold">DEVOPS (ES)</div>
                  <div className="text-xs font-bold text-white mt-0.5">Sysarmy CI/CD</div>
                  <div className="text-[9px] font-mono text-[#64748b]">Eduardo Casarero</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo(currentStage.id, 'talk-es-ai')}
                  className="hardware-btn p-2 rounded text-left transition-all"
                >
                  <div className="text-[9px] font-mono text-[#ffb800] font-bold">DATA & AI (ES)</div>
                  <div className="text-xs font-bold text-white mt-0.5">Gemini & Agents</div>
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

    </div>
  );
};
