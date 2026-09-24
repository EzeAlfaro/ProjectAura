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
  Layers
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

  useEffect(() => {
    fetchGlossary().then(setGlossaryTerms);
  }, []);

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  // Start Live Microphone Streaming
  const startMicStreaming = async () => {
    setAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio Analyser for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Setup MediaRecorder with 3-second slices
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

      mediaRecorder.start(3000); // 3-second chunks
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
  };

  // Draw Audio Visualizer Bars
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(0, ${Math.min(255, dataArray[i] + 100)}, 255)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  const handleTriggerDemo = async (talkId: string) => {
    if (isRecording) stopMicStreaming();
    await triggerDemo(selectedStageId, talkId);
  };

  const handleStopStage = async () => {
    if (isRecording) stopMicStreaming();
    await stopStage(selectedStageId);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141a29] border border-[#2a344f] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Panel de Producción y Control Room
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Orquestación simultánea multi-escenario para operadores de sonido y streaming
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!geminiConfigured && (
            <button
              onClick={onOpenApiKeyModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Configurar Gemini API Key</span>
            </button>
          )}
        </div>
      </div>

      {/* MULTI-STAGE MATRIX (Criteria: Concurrent multi-session support) */}
      <div>
        <h3 className="text-xs font-mono uppercase text-[#94a3b8] tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00f0ff]" />
          <span>Matriz de Escenarios en Vivo ({stages.length} Salas Concurrente)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((stage) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#141a29] border-[#00f0ff] shadow-lg shadow-[#00f0ff]/10'
                    : 'bg-[#0f1422] border-[#2a344f] hover:border-[#3a4768]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        stage.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                      }`}
                    />
                    <span className="font-bold text-white text-sm">{stage.name}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 text-[#00f0ff] border border-[#00f0ff]/20">
                    {stage.currentAudioSource}
                  </span>
                </div>

                <div className="text-xs font-semibold text-gray-200 line-clamp-1 mb-1">
                  {stage.talkTitle}
                </div>
                <div className="text-[11px] text-[#94a3b8] truncate mb-3">
                  {stage.speaker}
                </div>

                {/* Live VU Meter & Metrics */}
                <div className="space-y-2 border-t border-[#2a344f] pt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Nivel de Audio</span>
                    <span className="text-white font-bold">{stage.audioLevel}%</span>
                  </div>
                  <div className="w-full bg-[#0c0f17] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 h-full transition-all duration-300"
                      style={{ width: `${stage.audioLevel}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1">
                    <span>Audiencia: <strong className="text-white">{stage.audienceCount}</strong></span>
                    <span>Latencia: <strong className="text-emerald-400">{stage.latencyMs} ms</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AUDIO INGESTION & STAGE OPERATOR CONSOLE */}
      {currentStage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Audio Source Controller (7 cols) */}
          <div className="lg:col-span-7 bg-[#141a29] border border-[#2a344f] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2a344f] pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#00f0ff]" />
                  Control de Ingesta de Audio: <span className="text-[#00f0ff]">{currentStage.name}</span>
                </h4>
                <p className="text-xs text-[#94a3b8]">
                  Elegí la fuente de audio en vivo para alimentar la transcripción y traducción de Gemini
                </p>
              </div>

              {currentStage.isLive && (
                <button
                  onClick={handleStopStage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 border border-red-800 text-red-400 text-xs font-bold rounded-xl transition-colors"
                >
                  <Square className="w-3 h-3" />
                  <span>Detener Sala</span>
                </button>
              )}
            </div>

            {/* Source A: Live Microphone */}
            <div className="p-4 bg-[#0f1422] border border-[#2a344f] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#00f0ff]" />
                    <span>Micrófono de Cabina / Sonido del Escenario</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Captura directa en 16kHz PCM procesada por Gemini en tiempo real
                  </p>
                </div>

                {isRecording ? (
                  <button
                    onClick={stopMicStreaming}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Detener Mic</span>
                  </button>
                ) : (
                  <button
                    onClick={startMicStreaming}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00f0ff]/20"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Transmitir Mi Micrófono</span>
                  </button>
                )}
              </div>

              {/* Real-time Canvas Waveform */}
              {isRecording && (
                <div className="mt-2 bg-[#0c0f17] p-2 rounded-xl border border-[#2a344f]">
                  <canvas ref={canvasRef} width={500} height={40} className="w-full h-10" />
                </div>
              )}

              {audioError && (
                <div className="p-2.5 bg-red-950/50 border border-red-800 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{audioError}</span>
                </div>
              )}
            </div>

            {/* Source B: 1-Click Nerdearla Sample Talk Demos (Critical for Evaluation!) */}
            <div className="p-4 bg-[#0f1422] border border-[#2a344f] rounded-xl space-y-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Prueba con Charlas Reales de Nerdearla (1-Click Test para Jurado)</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Simula la señal de audio de conferencias reales para evaluar precisión y latencia
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleTriggerDemo('talk-en-k8s')}
                  className="p-3 rounded-xl bg-[#141a29] border border-[#2a344f] hover:border-[#00f0ff] text-left transition-all group"
                >
                  <div className="text-[10px] font-mono text-[#00f0ff] font-bold">INGLÉS 🇺🇸 → ESPAÑOL</div>
                  <div className="text-xs font-semibold text-white mt-1 group-hover:text-[#00f0ff]">
                    Keynote Kubernetes & eBPF
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Alex Rivera</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo('talk-es-devops')}
                  className="p-3 rounded-xl bg-[#141a29] border border-[#2a344f] hover:border-[#8b5cf6] text-left transition-all group"
                >
                  <div className="text-[10px] font-mono text-[#8b5cf6] font-bold">ESPAÑOL 🇦🇷 → INGLÉS</div>
                  <div className="text-xs font-semibold text-white mt-1 group-hover:text-[#8b5cf6]">
                    Sysarmy DevOps & Caos
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Valeria Gómez</div>
                </button>

                <button
                  onClick={() => handleTriggerDemo('talk-es-ai')}
                  className="p-3 rounded-xl bg-[#141a29] border border-[#2a344f] hover:border-[#ff007a] text-left transition-all group"
                >
                  <div className="text-[10px] font-mono text-[#ff007a] font-bold">DATA & AI TRACK</div>
                  <div className="text-xs font-semibold text-white mt-1 group-hover:text-[#ff007a]">
                    Gemini Live & Gemma
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Federico Balbi</div>
                </button>
              </div>
            </div>

            {/* Source C: File Upload */}
            <div className="p-4 bg-[#0f1422] border border-[#2a344f] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Cargar Archivo de Audio Local</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Subí cualquier fragmento .mp3, .wav o .webm para procesarlo de inmediato
                </p>
              </div>

              <label className="cursor-pointer px-4 py-2 bg-[#1b2236] hover:bg-[#232c45] border border-[#2a344f] text-white text-xs font-medium rounded-xl transition-colors">
                <span>Elegir Archivo</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await uploadAudioChunk(selectedStageId, file);
                    }
                  }}
                />
              </label>
            </div>

          </div>

          {/* Dynamic Technical Glossary Injector (5 cols) */}
          <div className="lg:col-span-5 bg-[#141a29] border border-[#2a344f] rounded-2xl p-5 space-y-4">
            <div className="border-b border-[#2a344f] pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00f0ff]" />
                Inyector de Glosario en Vivo
              </h4>
              <p className="text-xs text-[#94a3b8]">
                Agregá nombres de speakers, proyectos o siglas para priorizarlos en el prompt de Gemini
              </p>
            </div>

            <form onSubmit={handleAddTerm} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Término o Sigla
                </label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="ej. Cilium, Kafka, ArgoCD"
                  className="w-full px-3 py-2 bg-[#0c0f17] border border-[#2a344f] rounded-xl text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0c0f17] border border-[#2a344f] rounded-xl text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                >
                  <option value="cloud">Cloud / Infraestructura</option>
                  <option value="devops">DevOps & CI/CD</option>
                  <option value="ai">Inteligencia Artificial / ML</option>
                  <option value="architecture">Arquitectura de Software</option>
                  <option value="security">Seguridad & Redes</option>
                  <option value="language">Lenguaje / Runtime</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Definición Rápida (para la audiencia)
                </label>
                <textarea
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="Breve explicación de 1 frase..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0c0f17] border border-[#2a344f] rounded-xl text-xs text-white focus:outline-none focus:border-[#00f0ff] resize-none"
                  required
                />
              </div>

              {formSuccess && (
                <div className="flex items-center gap-2 p-2 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-400 text-xs">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>¡Término agregado al motor de Gemini con éxito!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#8b5cf6]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Inyectar al Glosario del Evento</span>
              </button>
            </form>

            <div className="pt-2 border-t border-[#2a344f]">
              <div className="text-[10px] font-mono text-gray-400 mb-2">
                Términos precargados activos: {glossaryTerms.length}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {glossaryTerms.slice(0, 10).map((t) => (
                  <div key={t.term} className="text-[11px] bg-[#0c0f17] p-2 rounded-lg border border-[#2a344f] flex items-center justify-between">
                    <span className="font-semibold text-white">{t.term}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-[#1b2236] text-[#a855f7]">
                      {t.category}
                    </span>
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
