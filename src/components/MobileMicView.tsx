import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Radio, Volume2, ShieldAlert, Sparkles, Check, Copy, ExternalLink, ArrowLeft, RefreshCw } from 'lucide-react';
import { Stage, SupportedLanguage, SubtitleChunk } from '../types.js';
import { WSClient } from '../services/websocket.js';

interface MobileMicViewProps {
  stages: Stage[];
  selectedStageId: string;
  onSelectStage: (id: string) => void;
  wsClient?: WSClient | null;
  onExit: () => void;
  chunks: SubtitleChunk[];
}

export const MobileMicView: React.FC<MobileMicViewProps> = ({
  stages,
  selectedStageId,
  onSelectStage,
  wsClient,
  onExit,
  chunks,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [spokenLang, setSpokenLang] = useState<'es' | 'en'>('es');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedFlagUrl, setCopiedFlagUrl] = useState(false);
  const [liveInterim, setLiveInterim] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSecure = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'https:'
  );

  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

  const currentStage = stages.find(s => s.id === selectedStageId) || stages[0] || {
    id: selectedStageId,
    name: 'Escenario Principal',
    speaker: 'Orador',
    talkTitle: 'Nerdearla 2026'
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setLiveInterim('');

    if (!hasMediaDevices && !isSecure) {
      setErrorMsg('Chrome requiere conexión HTTPS o habilitar el origen en chrome://flags para activar el micrófono en la red local.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Audio Level Analyser
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(normalized);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (e) {
        console.warn('AudioContext level meter init warning:', e);
      }

      // MediaRecorder for chunk streaming to backend Gemini Live
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && wsClient) {
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              if (base64) {
                wsClient.sendAudioChunk(selectedStageId, base64, mimeType || 'audio/webm');
              }
            };
            reader.readAsDataURL(e.data);
          } catch (err) {
            console.error('[MobileMic] Error reading audio chunk:', err);
          }
        }
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;

      // Web Speech API for instant interim text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = spokenLang === 'en' ? 'en-US' : 'es-AR';

          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                const text = event.results[i][0].transcript.trim();
                if (text && wsClient) {
                  wsClient.sendLiveTranscript(selectedStageId, text, spokenLang);
                }
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            if (interim) setLiveInterim(interim);
          };

          recognition.onerror = (e: any) => {
            console.warn('[MobileMic SpeechRecognition error]', e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition start warning:', e);
        }
      }

      setIsRecording(true);
    } catch (err: any) {
      console.error('[MobileMic] Error accessing microphone:', err);
      setErrorMsg(err.message || 'No se pudo acceder al micrófono del teléfono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }
    mediaRecorderRef.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
    setLiveInterim('');
  };

  const currentOrigin = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
  const httpsAlternativeUrl = typeof window !== 'undefined'
    ? `https://${window.location.hostname}:3000/?view=mic&stage=${selectedStageId}`
    : '';

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f1f5f9] flex flex-col font-sans select-none">
      
      {/* Top Mobile Bar */}
      <div className="bg-[#0c0f17] border-b border-[#1b2230] p-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-[#141926] border border-[#222a3d]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-[#00f5ff]'}`} />
          <span className="font-mono text-xs font-extrabold tracking-wider text-white">
            MICRÓFONO MÓVIL
          </span>
        </div>

        <div className="w-16 text-right">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
            EMERGENCIA
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-between space-y-4">
        
        {/* Stage Selector Pill */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
            TRANSMITIR AUDIO A LA SALA:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {stages.map((st, idx) => {
              const isSelected = st.id === selectedStageId;
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStage(st.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,245,255,0.25)]'
                      : 'bg-[#0d1017] border-[#1e2535] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-400 font-bold">SALA 0{idx + 1}</div>
                  <div className="text-xs font-bold truncate">{st.name.replace(/Escenario\s*/i, '')}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spoken Language Switch */}
        <div className="bg-[#0d1017] border border-[#1b2230] p-2 rounded-xl flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-gray-400 pl-2">IDIOMA QUE VOY A HABLAR:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSpokenLang('es')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                spokenLang === 'es' ? 'bg-[#00f5ff] text-black font-extrabold' : 'text-gray-400'
              }`}
            >
              🇦🇷 Español
            </button>
            <button
              onClick={() => setSpokenLang('en')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                spokenLang === 'en' ? 'bg-[#00f5ff] text-black font-extrabold' : 'text-gray-400'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* INSECURE CONTEXT / MEDIA DEVICES WARNING CARD */}
        {(!hasMediaDevices || !isSecure) && (
          <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-start gap-2.5 text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Permiso de Micrófono en Chrome Mobile
                </h4>
                <p className="text-[11px] text-amber-200/90 leading-relaxed mt-1">
                  Chrome bloquea el micrófono en conexiones HTTP locales. Para activarlo en tu celular tenés dos opciones:
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={httpsAlternativeUrl}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs shadow-lg transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>OPCIÓN 1: ABRIR EN HTTPS (PUERTO 3000)</span>
              </a>

              <div className="bg-[#07090e] border border-amber-500/40 rounded-xl p-3 text-[11px] font-mono text-gray-300 space-y-1.5">
                <div className="text-amber-400 font-bold">OPCIÓN 2: Habilitar en Chrome en 15 segundos:</div>
                <div className="text-gray-400">1. Abrí en Chrome: <code className="text-cyan-300">chrome://flags</code></div>
                <div className="text-gray-400">2. Buscá: <em>unsafely-treat-insecure-origin-as-secure</em></div>
                <div className="text-gray-400">3. Pegá este origen y dale Enabled:</div>
                <div className="flex items-center gap-1.5 bg-[#121622] p-1.5 rounded border border-[#222a3d]">
                  <span className="truncate text-cyan-300 text-[10px] flex-1 font-mono">{currentOrigin}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentOrigin);
                      setCopiedFlagUrl(true);
                      setTimeout(() => setCopiedFlagUrl(false), 2000);
                    }}
                    className="p-1 text-gray-300 hover:text-white"
                  >
                    {copiedFlagUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE DISPLAY */}
        {errorMsg && (
          <div className="bg-red-950/60 border border-red-500/60 rounded-xl p-3 text-xs text-red-200 font-mono">
            {errorMsg}
          </div>
        )}

        {/* GIANT PUSH-TO-TALK / ON-AIR TRANSMIT BUTTON */}
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-300 border-4 shadow-2xl relative select-none ${
              isRecording
                ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-300 text-white shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-pulse scale-105'
                : 'bg-gradient-to-br from-[#0c1424] to-[#12203a] border-cyan-400/80 text-cyan-400 hover:scale-105 shadow-[0_0_25px_rgba(0,245,255,0.3)]'
            }`}
          >
            {isRecording ? (
              <>
                <Radio className="w-14 h-14 mb-1 animate-ping text-white" />
                <span className="font-mono font-black text-sm tracking-widest uppercase">EN EL AIRE</span>
                <span className="text-[10px] font-mono text-red-100 mt-0.5">TOCAR PARA CORTAR</span>
              </>
            ) : (
              <>
                <Mic className="w-14 h-14 mb-1 text-cyan-300" />
                <span className="font-mono font-black text-sm tracking-widest uppercase">TRANSMITIR</span>
                <span className="text-[10px] font-mono text-gray-400 mt-0.5">TOCAR PARA HABLAR</span>
              </>
            )}

            {/* Ripple ring when recording */}
            {isRecording && (
              <span className="absolute -inset-3 rounded-full border-2 border-red-500 animate-ping opacity-40 pointer-events-none" />
            )}
          </button>

          {/* Real-time Dynamic VU Meter Bar */}
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>NIVEL DE ENTRADA:</span>
              <span className={audioLevel > 70 ? 'text-red-400 font-bold' : audioLevel > 30 ? 'text-cyan-400 font-bold' : 'text-gray-500'}>
                {audioLevel}% {isRecording ? '• ACTIVO' : '• STANDBY'}
              </span>
            </div>
            
            <div className="h-3 w-full bg-[#10141f] rounded-full border border-[#20293d] p-0.5 overflow-hidden flex items-center">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${audioLevel}%`,
                  background: audioLevel > 80
                    ? 'linear-gradient(90deg, #00f5ff, #ffbb00, #ff1744)'
                    : 'linear-gradient(90deg, #00f5ff, #00ff66)',
                  boxShadow: audioLevel > 20 ? '0 0 10px rgba(0,245,255,0.5)' : 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Live Audio / Subtitle Feedback Preview */}
        <div className="bg-[#0b0e15] border border-[#1b2230] rounded-2xl p-3 space-y-2 flex-1 min-h-[120px] flex flex-col justify-end">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 border-b border-[#181f2e] pb-1">
            <span className="text-cyan-400 font-bold uppercase">MONITOR DE SUBTÍTULOS SALIENTES:</span>
            <span>GEMINI 3.5 LIVE</span>
          </div>

          <div className="flex-1 flex flex-col justify-end overflow-hidden">
            {liveInterim ? (
              <p className="text-xs sm:text-sm font-mono text-amber-300 italic animate-pulse">
                "{liveInterim}"
              </p>
            ) : chunks.length > 0 ? (
              <p className="text-xs sm:text-sm font-sans font-medium text-white">
                "{chunks[chunks.length - 1].esText || chunks[chunks.length - 1].originalText}"
              </p>
            ) : (
              <p className="text-xs font-mono text-gray-600 text-center py-4">
                El texto traducido aparecerá aquí mientras hablás por el celular...
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
