import React, { useState } from 'react';
import { X, BookOpen, Terminal, Cpu, Radio, Shield, Tv, Download, Globe, Sparkles } from 'lucide-react';

interface OperatorManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManualSection = 'creed' | 'topology' | 'audio' | 'ai' | 'mission_control' | 'audience' | 'broadcast' | 'export';

export const OperatorManualModal: React.FC<OperatorManualModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [activeSection, setActiveSection] = useState<ManualSection>('creed');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0b0e14] border-2 border-[#00f5ff]/40 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,245,255,0.15)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#0d111a] border-b border-[#1b2230] px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00f5ff]/10 border border-[#00f5ff]/30 flex items-center justify-center text-[#00f5ff]">
              <BookOpen className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-extrabold text-sm sm:text-base text-white tracking-wide">
                  {lang === 'es' ? 'MANUAL DE OPERACIONES & GUÍA DE DESPLIEGUE' : 'STAGE OPERATOR FIELD MANUAL & RUNBOOK'}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40">
                  NERDEARLA 2026
                </span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                {lang === 'es' ? 'Creado por técnicos de escenario para técnicos de escenario' : 'Built on the rack by live stage technicians for live stage technicians'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-[#07090e] p-1 rounded-xl border border-[#1b2230]">
              <button
                onClick={() => setLang('es')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                  lang === 'es' ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🇦🇷</span>
                <span>ES</span>
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                  lang === 'en' ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#161d2d] text-gray-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Main Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 bg-[#080b10] border-b md:border-b-0 md:border-r border-[#181f2c] p-2.5 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5">
            {[
              { id: 'creed', labelEs: 'Manifiesto del Operador', labelEn: "Operator's Creed", icon: Shield },
              { id: 'topology', labelEs: 'Topología de Red & Rack', labelEn: 'Network & Hardware Topology', icon: Radio },
              { id: 'audio', labelEs: 'Ingesta de Audio & Worklets', labelEn: 'Audio Ingest & Worklets', icon: Terminal },
              { id: 'ai', labelEs: 'Matriz de Motores IA', labelEn: 'AI Engine Matrix & Failover', icon: Cpu },
              { id: 'mission_control', labelEs: 'Sala de Control & Pánico', labelEn: 'Mission Control & Panic', icon: Sparkles },
              { id: 'audience', labelEs: 'Audiencia & Accesibilidad', labelEn: 'Audience & Radical A11y', icon: Globe },
              { id: 'broadcast', labelEs: 'Salidas OBS / vMix', labelEn: 'OBS & vMix Broadcast Feeds', icon: Tv },
              { id: 'export', labelEs: 'Exportación SRT / MD', labelEn: 'Post-Talk Export & SRT', icon: Download },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as ManualSection)}
                  className={`px-3 py-2 rounded-xl font-mono text-xs font-bold shrink-0 text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-[#121c2d] border border-[#00f5ff] text-white shadow-[0_0_12px_rgba(0,245,255,0.25)]'
                      : 'border border-transparent text-gray-400 hover:bg-[#0f1420] hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#00f5ff]' : 'text-gray-500'}`} />
                  <span className="truncate">{lang === 'es' ? item.labelEs : item.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Reader Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 text-gray-200 font-sans leading-relaxed text-sm">
            
            {/* SECTION 1: CREED */}
            {activeSection === 'creed' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 01 • IDENTIDAD DEL SISTEMA' : 'SECTION 01 • SYSTEM IDENTITY'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'El Manifiesto del Operador de Escenario' : "The Stage Operator's Creed"}
                  </h3>
                </div>

                {lang === 'es' ? (
                  <div className="space-y-3.5">
                    <p className="italic text-cyan-300 font-medium bg-cyan-950/20 p-3 rounded-xl border border-cyan-800/40">
                      "Cualquiera que haya estado a cargo de la cabina técnica en un evento de más de 30 charlas simultáneas conoce la realidad: el Wi-Fi colapsa, los cables se desconectan y los oradores hablan un Spanglish técnico voraz."
                    </p>
                    <p>
                      Las soluciones comerciales de traducción automática fracasan en conferencias por 4 razones que nosotros vivimos en carne propia:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-300">
                      <li><strong>Destrucción de la jerga técnica:</strong> Traducir "deploy", "merge", "commit", "eBPF" o "Kubernetes" al español literal genera subtítulos ridículos que desconectan a la audiencia.</li>
                      <li><strong>Latencia inútil:</strong> Acumular bloques de 6 a 10 segundos deja al público leyendo lo que el orador dijo dos diapositivas atrás.</li>
                      <li><strong>Costos exorbitantes por minuto y por usuario:</strong> Inviable para eventos masivos de 3 días con miles de asistentes.</li>
                      <li><strong>Falta de salidas de broadcast:</strong> Sin overlays transparentes de calidad para OBS Studio, vMix o CasparCG.</li>
                    </ul>
                    <p className="font-semibold text-white">
                      Project Aura fue forjado en el rack: tolerante a microcortes, con remuestreo en tiempo real mediante AudioWorklet, 3 motores redundantes y herramientas de contingencia diseñadas para el operador de sonido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <p className="italic text-cyan-300 font-medium bg-cyan-950/20 p-3 rounded-xl border border-cyan-800/40">
                      "Anyone who has ever run the sound booth at a tech conference with 30+ concurrent talks knows the battlefield reality: venue Wi-Fi buckles, microphone cables get kicked, and tech speakers mix heavy Silicon Valley jargon."
                    </p>
                    <p>
                      Off-the-shelf automated translation platforms fail on live stages for 4 critical reasons we have personally endured:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-300">
                      <li><strong>Destruction of technical jargon:</strong> Translating words like "deploy", "merge", "eBPF", or "pod" literally creates absurd subtitles that alienate the audience.</li>
                      <li><strong>Unacceptable latency:</strong> Buffering 6 to 10 seconds leaves attendees reading thoughts the speaker finished two slides ago.</li>
                      <li><strong>Prohibitive per-minute/per-seat pricing:</strong> Financially unsustainable for 3-day multi-track community conferences.</li>
                      <li><strong>Zero broadcast integration:</strong> No clean transparent alpha overlays for OBS Studio or vMix control rooms.</li>
                    </ul>
                    <p className="font-semibold text-white">
                      Project Aura was forged directly in the rack: built with broadcast-grade resilience, dedicated AudioWorklet resamplers, 3 tiered fallback engines, and tactical panic controls.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: TOPOLOGY */}
            {activeSection === 'topology' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 02 • ARQUITECTURA DE DESPLIEGUE' : 'SECTION 02 • DEPLOYMENT TOPOLOGY'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Topología de Red & Nodos de Escenario' : 'Network & Stage Node Topology'}
                  </h3>
                </div>

                <div className="bg-[#070a0f] p-4 rounded-xl border border-[#1b2230] font-mono text-xs text-cyan-300 overflow-x-auto">
                  <pre>{`[MIXER / XLR / USB]         [EMERGENCY MOBILE MIC]
         │                            │ (Wi-Fi PCM 16kHz)
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│ STAGE NODE MINI-PC│       │ ATTENDEE PHONE   │
│ (Kiosk Mode / F5) │       │ (/?view=mic PTT) │
└────────┬─────────┘        └────────┬─────────┘
         │ Production VLAN (CAT6)    │ Public Wi-Fi / QR
         ▼                           ▼
┌────────────────────────────────────────────────────────┐
│             CENTRAL AURA CORE SERVER (3001)            │
│  - Gemini Live Transcribe (WebSocket Bi-Di Stream)     │
│  - On-Premise Gemma 2 / Local Neural Macro Engine      │
│  - Broadcast WebSocket Pub/Sub (1 Ingest -> N Viewers) │
└────────┬──────────────────────────┬────────────────────┘
         │                          │
         ▼ Production VLAN          ▼ Public Wi-Fi
┌──────────────────┐        ┌────────────────────────────┐
│ BROADCAST PC     │        │ AUDIENCE SMARTPHONES       │
│ (OBS / vMix)     │        │ - ES / EN / PT Subtitles   │
│ - Alpha Overlay  │        │ - Spanglish Tech Glossary  │
│ - live.txt Ticker│        │ - TTS for Blind Attendees  │
└──────────────────┘        └────────────────────────────┘`}</pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#0e131d] p-3 rounded-xl border border-[#1e2638]">
                    <div className="text-[#00f5ff] font-bold mb-1">
                      {lang === 'es' ? 'PUERTOS & PROTOCOLOS' : 'PORTS & PROTOCOLS'}
                    </div>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Port 3000: HTTP Vite Frontend (Audiencia / Kiosk / Overlay)</li>
                      <li>• Port 3001: Express API + WebSocket Server (`/ws`)</li>
                      <li>• TCP 11434: Ollama Local (Gemma 2 fallback)</li>
                    </ul>
                  </div>
                  <div className="bg-[#0e131d] p-3 rounded-xl border border-[#1e2638]">
                    <div className="text-[#00ff66] font-bold mb-1">
                      {lang === 'es' ? 'SEGURIDAD DE RED' : 'NETWORK ISOLATION'}
                    </div>
                    <p className="text-gray-300">
                      {lang === 'es'
                        ? 'La audiencia solo recibe mensajes WebSocket de texto liviano (<2 KB/s). El streaming de audio ocurre exclusivamente entre la cabina y el servidor central.'
                        : 'Audience phones only receive lightweight text frames (<2 KB/s). Raw audio ingestion is strictly isolated between the stage nodes and core server.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: AUDIO */}
            {activeSection === 'audio' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 03 • PIPELINE DE AUDIO' : 'SECTION 03 • AUDIO PIPELINE'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Ingesta de Audio & Remuestreo PCM 16kHz' : 'Audio Ingest & 16kHz PCM Worklet'}
                  </h3>
                </div>

                <p>
                  {lang === 'es'
                    ? 'Los modelos de audio en tiempo real de Google Gemini requieren audio en 16.000 Hz Mono Little-Endian PCM. Para no saturar el navegador ni meter chasquidos acústicos, Project Aura ejecuta un AudioWorklet dedicado en background:'
                    : 'Google Gemini real-time voice models require 16,000 Hz Mono Little-Endian PCM. To eliminate audio pops and UI thread lag, Project Aura runs a dedicated background AudioWorklet:'}
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#0a0e16] p-3.5 rounded-xl border border-cyan-500/30">
                    <span className="text-cyan-400 font-bold block mb-1">
                      1. AudioWorklet Processor (`public/worklets/pcm-processor.js`):
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Captura el stream del mixer (44.1kHz o 48kHz Float32) y aplica un algoritmo de interpolación lineal continua con preservación de fracciones de muestra residuales. Emite bloques de 100ms (3.200 bytes) directamente al WebSocket del servidor.'
                        : 'Captures the mixer stream (44.1kHz or 48kHz Float32) and applies continuous linear interpolation with fractional sample residue tracking. Emits clean 100ms frames (3,200 bytes) directly to the server WebSocket.'}
                    </p>
                  </div>

                  <div className="bg-[#0a0e16] p-3.5 rounded-xl border border-red-500/30">
                    <span className="text-red-400 font-bold block mb-1">
                      2. Micrófono Móvil de Emergencia (`/?view=mic`):
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Si el micrófono inalámbrico del orador se queda sin batería en pleno escenario, cualquier asistente o técnico abre la URL en su celular, selecciona la sala y usa el botón Push-to-Talk con vúmetro en tiempo real.'
                        : 'If the speaker wireless bodypack dies mid-talk, any technician or volunteer opens this URL on their smartphone, selects the stage, and holds Push-to-Talk with live decibel VU metering.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: AI MATRIX */}
            {activeSection === 'ai' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 04 • MOTORES DE INTELIGENCIA' : 'SECTION 04 • AI ENGINE MATRIX'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Jerarquía de 3 Motores & Failover en Caliente' : '3-Tier Engine Hierarchy & Live Failover'}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border border-[#1b2230] rounded-xl overflow-hidden">
                    <thead className="bg-[#0f1420] text-gray-300 border-b border-[#1b2230]">
                      <tr>
                        <th className="p-2.5">Tier</th>
                        <th className="p-2.5">Motor / Engine</th>
                        <th className="p-2.5">Latencia</th>
                        <th className="p-2.5">Función Operativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2230] text-gray-300">
                      <tr className="bg-[#0a0e16]">
                        <td className="p-2.5 text-[#00f5ff] font-bold">Tier 1</td>
                        <td className="p-2.5 text-white font-bold">Gemini Live Transcribe (2.0/2.5 Flash)</td>
                        <td className="p-2.5 text-[#00ff66]">&lt; 150 ms</td>
                        <td className="p-2.5 font-sans">Streaming bidireccional palabra por palabra con preview especulativo.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-purple-400 font-bold">Tier 1B</td>
                        <td className="p-2.5 text-white font-bold">Gemini 2.5 Pro (Deep Intel)</td>
                        <td className="p-2.5 text-gray-400">Post-charla</td>
                        <td className="p-2.5 font-sans">Síntesis de arquitectura, 5 takeaways y 3 preguntas incisivas para Q&A.</td>
                      </tr>
                      <tr className="bg-[#0a0e16]">
                        <td className="p-2.5 text-amber-400 font-bold">Tier 2</td>
                        <td className="p-2.5 text-white font-bold">Google Gemma 2 (Local Edge)</td>
                        <td className="p-2.5 text-amber-300">~250 ms</td>
                        <td className="p-2.5 font-sans">Inferencia en servidor local on-premise si se corta el enlace exterior.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-green-400 font-bold">Tier 3</td>
                        <td className="p-2.5 text-white font-bold">Standalone Neural Macro</td>
                        <td className="p-2.5 text-[#00ff66]">&lt; 5 ms</td>
                        <td className="p-2.5 font-sans">Cero dependencias de red externa. Protege 150+ términos Spanglish.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#0e131d] p-3 rounded-xl border border-[#1e2638] text-xs font-mono">
                  <span className="text-[#00f5ff] font-bold block mb-1">
                    {lang === 'es' ? 'POOL DE API KEYS & ROTACIÓN AUTOMÁTICA:' : 'API KEY ROTATION POOL:'}
                  </span>
                  <p className="text-gray-300 font-sans">
                    {lang === 'es'
                      ? 'Si una clave de API sufre HTTP 429 por agotamiento de cuota, el servidor la pone en cooldown de 60 segundos y conmuta de inmediato a la siguiente clave del pool en memoria sin interrumpir la charla.'
                      : 'If an API key encounters an HTTP 429 rate limit, the server automatically puts it into a 60s cooldown and switches instantly to the next available key in the in-memory pool.'}
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 5: MISSION CONTROL */}
            {activeSection === 'mission_control' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 05 • SALA DE CONTROL & CONTINGENCIA' : 'SECTION 05 • MISSION CONTROL & PANIC'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Botones de Pánico & Protocolos de Emergencia' : 'Panic Buttons & Emergency Protocols'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-amber-950/20 border border-amber-500/40 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-amber-400 font-extrabold flex items-center gap-1.5">
                      <span>⌫</span>
                      <span>BORRAR ÚLTIMA FRASA (REDACTION)</span>
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Elimina de inmediato la última tarjeta de subtítulo en la base de datos y purga la pantalla de todos los asistentes y de OBS ante bloopers o datos confidenciales filtrados accidentalmente.'
                        : 'Instantly deletes the last subtitle card from memory and purges it across all audience screens and OBS in case of speaker gaffes or accidental credential leaks.'}
                    </p>
                  </div>

                  <div className="bg-red-950/20 border border-red-500/40 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-red-400 font-extrabold flex items-center gap-1.5">
                      <span>🛑</span>
                      <span>APAGÓN TOTAL (EDM BLACKOUT)</span>
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Limpia en 0 milisegundos todo el historial de subtítulos visible en todos los clientes conectados. Ideal al terminar una charla o ante una evacuación de sala.'
                        : 'Wipes 100% of visible subtitle history across all connected clients in 0ms. Ideal at talk completion or stage resets.'}
                    </p>
                  </div>

                  <div className="bg-cyan-950/20 border border-cyan-500/40 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-cyan-400 font-extrabold flex items-center gap-1.5">
                      <span>🔄</span>
                      <span>RECARGA REMOTA F5 (ZERO-RUSTDESK)</span>
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Envía una orden WebSocket al nodo del escenario para que la Mini PC refresque su instancia de navegador automáticamente sin necesidad de conectar teclado ni usar VNC.'
                        : 'Dispatches a remote reload command to the stage node Mini-PC to refresh the browser instance without needing keyboard or VNC access.'}
                    </p>
                  </div>

                  <div className="bg-gray-900 border border-gray-700 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-gray-300 font-extrabold flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>CERROJO DE MESA TÉCNICA (CHILDPROOF LOCK)</span>
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Bloquea los interruptores destructivos del panel de operador para prevenir clics accidentales mientras se monitorean los vúmetros.'
                        : 'Locks destructive switches on the operator faceplate to prevent accidental clicks during intense live monitoring.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: AUDIENCE & A11Y */}
            {activeSection === 'audience' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 06 • EXPERIENCIA DE ASISTENTES' : 'SECTION 06 • AUDIENCE EXPERIENCE'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Audiencia Móvil & Accesibilidad Radical WCAG AAA' : 'Mobile Audience & Radical WCAG AAA A11y'}
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#0e131d] p-3.5 rounded-xl border border-[#1e2638] space-y-1">
                    <span className="text-[#00f5ff] font-bold block">
                      1. Acceso Instantáneo por Código QR (Zero-Install):
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Los asistentes escanean el código QR proyectado en pantalla o folleto y acceden a la aplicación web ultra-liviana sin instalar nada de las tiendas de aplicaciones.'
                        : 'Attendees scan the projected QR code and open the ultra-light web client instantly without app store downloads.'}
                    </p>
                  </div>

                  <div className="bg-[#0e131d] p-3.5 rounded-xl border border-[#1e2638] space-y-1">
                    <span className="text-[#00ff66] font-bold block">
                      2. Voz Accesible en Vivo (TTS para Personas No Videntes):
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Al activar [VOZ ACCESIBLE], el motor Web Speech API lee cada subtítulo entrante en voz alta en el idioma seleccionado con modulación fluida.'
                        : 'Toggling [ACCESSIBLE VOICE] uses Web Speech synthesis to read every incoming caption aloud in real time in the user selected language.'}
                    </p>
                  </div>

                  <div className="bg-[#0e131d] p-3.5 rounded-xl border border-[#1e2638] space-y-1">
                    <span className="text-amber-400 font-bold block">
                      3. Preguntas de la Audiencia (Q&A) & Pinned to Stage:
                    </span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Los asistentes envían preguntas técnicas y votan las de otros. La mesa técnica puede presionar "Fijar en Pantalla" para proyectar la pregunta en la pantalla del orador.'
                        : 'Attendees submit questions and upvote peers. The operator booth can click "Pin to Stage" to elevate the top question directly onto the teleprompter screen.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: BROADCAST */}
            {activeSection === 'broadcast' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 07 • SALIDAS BROADCAST & OVERLAY' : 'SECTION 07 • BROADCAST FEEDS & OVERLAY'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Integración Profesional con OBS Studio & vMix' : 'OBS Studio & vMix Integration'}
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#0a0f18] p-3.5 rounded-xl border border-[#1a2335]">
                    <span className="text-cyan-400 font-bold block mb-1">
                      OBS Browser Source (Canal Alfa Transparente):
                    </span>
                    <p className="text-gray-300 font-sans mb-2">
                      {lang === 'es'
                        ? 'Agregá una fuente de Navegador en OBS Studio con esta URL para subtítulos flotantes de alta legibilidad:'
                        : 'Add an OBS Browser Source with this URL for broadcast-grade floating subtitles:'}
                    </p>
                    <code className="block bg-[#05070a] p-2 rounded text-[#00f5ff] select-all">
                      http://localhost:3000/?view=overlay&stage=stage-1&lang=es
                    </code>
                  </div>

                  <div className="bg-[#0a0f18] p-3.5 rounded-xl border border-[#1a2335]">
                    <span className="text-green-400 font-bold block mb-1">
                      Endpoint de Texto Plano (vMix Title / CasparCG):
                    </span>
                    <p className="text-gray-300 font-sans mb-2">
                      {lang === 'es'
                        ? 'Para generadores de caracteres por hardware o pantallas de leds en el escenario:'
                        : 'For hardware character generators, tickers, or LED stage ribbons:'}
                    </p>
                    <code className="block bg-[#05070a] p-2 rounded text-[#00ff66] select-all">
                      http://localhost:3001/api/stages/stage-1/live.txt?lang=es
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: EXPORT */}
            {activeSection === 'export' && (
              <div className="space-y-4">
                <div className="border-b border-[#1b2230] pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f5ff] uppercase tracking-wider">
                    {lang === 'es' ? 'SECCIÓN 08 • EXPORTACIÓN Y ENTREGABLES' : 'SECTION 08 • POST-TALK ARTIFACTS'}
                  </span>
                  <h3 className="text-xl font-mono font-black text-white mt-1">
                    {lang === 'es' ? 'Formatos de Exportación Inmediata (.SRT, .VTT, .MD)' : 'Instant Export Formats (.SRT, .VTT, .MD)'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#0c1017] p-3 rounded-xl border border-[#1b2230]">
                    <span className="text-[#00f5ff] font-bold block mb-1">.SRT (SubRip)</span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Con códigos de tiempo epoch exactos listo para subir directamente a los videos de YouTube del evento o editar en Premiere/DaVinci.'
                        : 'Formatted with exact millisecond timestamps ready for direct upload to YouTube or timeline editing in Premiere.'}
                    </p>
                  </div>

                  <div className="bg-[#0c1017] p-3 rounded-xl border border-[#1b2230]">
                    <span className="text-[#00f5ff] font-bold block mb-1">.VTT (WebVTT)</span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Estándar para reproductores web HTML5 (<video><track>).'
                        : 'W3C standard for HTML5 browser players and accessibility tracks.'}
                    </p>
                  </div>

                  <div className="bg-[#0c1017] p-3 rounded-xl border border-[#1b2230]">
                    <span className="text-[#00ff66] font-bold block mb-1">.MD (Resumen Ejecutivo)</span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Briefing ejecutivo generado por Gemini 2.5 Pro con puntos clave y preguntas para publicar en el blog o notas de la charla.'
                        : 'Executive briefing synthesized by Gemini Pro with key architectural takeaways for conference recap posts.'}
                    </p>
                  </div>

                  <div className="bg-[#0c1017] p-3 rounded-xl border border-[#1b2230]">
                    <span className="text-gray-300 font-bold block mb-1">.TXT (Transcripción)</span>
                    <p className="text-gray-300 font-sans">
                      {lang === 'es'
                        ? 'Texto plano continuo sin timestamps para actas, minería de texto o búsqueda semántica.'
                        : 'Continuous plain text transcript without timestamps for text mining or indexing.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#0d111a] border-t border-[#1b2230] px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-mono text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#00ff66]">●</span>
            <span>PROJECT AURA FIELD GUIDE • NERDEARLA VIBEATHON 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#161d2d] text-white hover:bg-[#20293d] transition-all font-bold"
          >
            {lang === 'es' ? 'CERRAR MANUAL' : 'CLOSE MANUAL'}
          </button>
        </div>

      </div>
    </div>
  );
};
