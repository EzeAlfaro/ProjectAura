import React, { useState } from 'react';
import { KeyRound, CheckCircle, AlertCircle, X, ExternalLink, Sparkles, RefreshCw, Trash2, PowerOff, Cpu, Zap, Cloud, Bot, Eye, EyeOff } from 'lucide-react';
import { updateApiKey, setEngineModeApi, disconnectApi, addKeyToPoolApi, rotateApiKeyApi, removeKeyFromPoolApi, testModelApi } from '../services/api.js';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiConfigured: boolean;
  gemmaAvailable: boolean;
  activeEngine: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  forcedEngine?: 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline';
  keyPool?: any[];
  onKeyUpdated: (configured: boolean, activeEngine?: string, keyPool?: any[]) => void;
  onEngineChanged?: (forced: string, active: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  geminiConfigured,
  gemmaAvailable,
  activeEngine,
  forcedEngine = 'auto',
  keyPool = [],
  onKeyUpdated,
  onEngineChanged,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Handle Switch Engine Mode
  const handleSelectEngine = async (mode: 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline') => {
    try {
      setLoading(true);
      const res = await setEngineModeApi(mode);
      if (res.success) {
        if (onEngineChanged) onEngineChanged(res.forcedEngine, res.activeEngine);
        setStatusMsg({
          type: 'success',
          text: `Modo de motor cambiado a: ${mode.toUpperCase()} (Activo: ${res.activeEngine.toUpperCase()})`
        });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'Error al cambiar modo de motor' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Disconnect All Keys / Standalone
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const res = await disconnectApi();
      if (res.success) {
        onKeyUpdated(false, res.activeEngine, []);
        setStatusMsg({ type: 'success', text: 'Desconectado de Google Cloud. Operando en modo local.' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'Error al desconectar' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Key to Pool
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await addKeyToPoolApi(newApiKey.trim());
      if (res.success) {
        setNewApiKey('');
        onKeyUpdated(res.geminiConfigured, undefined, res.keyPool);
        setStatusMsg({ type: 'success', text: `Clave agregada a la cola (${res.addedKey?.maskedKey || 'exitosa'}).` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al agregar clave.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Rotate Key in Pool
  const handleRotate = async () => {
    try {
      setLoading(true);
      const res = await rotateApiKeyApi();
      if (res.success && res.activeKey) {
        onKeyUpdated(res.geminiConfigured, undefined, res.keyPool);
        setStatusMsg({ type: 'success', text: `Rotada a clave: ${res.activeKey.maskedKey}` });
      } else {
        setStatusMsg({ type: 'error', text: 'No hay otras claves disponibles para rotar.' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'Error al rotar clave' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Remove Key from Pool
  const handleRemoveKey = async (id: string) => {
    try {
      const res = await removeKeyFromPoolApi(id);
      if (res.success) {
        onKeyUpdated(res.geminiConfigured, undefined, res.keyPool);
        setStatusMsg({ type: 'success', text: 'Clave eliminada de la cola.' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'Error al eliminar clave' });
    }
  };

  // Handle Test Model Connection (Ping)
  const handleTestModel = async () => {
    setIsTestingModel(true);
    setStatusMsg(null);
    try {
      const res = await testModelApi(newApiKey.trim() || undefined, selectedModel);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `✓ ${res.message}` });
      } else {
        setStatusMsg({ type: 'error', text: `✗ ${res.message}` });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Error de conexión: ${e.message || 'Verifica tu red y clave'}` });
    } finally {
      setIsTestingModel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0b0e14] border-2 border-[#1c2333] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-[#161c28] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#1b2230]">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 border border-[#00f0ff]/40 text-[#00f0ff]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Consola de Motores & Cola de API Keys</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30">
                PROD-READY
              </span>
            </h3>
            <p className="text-xs text-[#94a3b8] font-mono">
              Control Tri-Motor: Gemini 3.5 Cloud • Gemma 2B Edge • Nativo 0ms
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          
          {/* 1. SECTION: ENGINE SELECTOR SWITCH */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ffb800]" />
                1. Selección de Motor de Inferencia
              </span>
              <span className="text-[10px] font-mono text-[#00ff66]">
                ACTIVO: {activeEngine.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* Option A: Auto-Failover */}
              <button
                type="button"
                onClick={() => handleSelectEngine('auto')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  forcedEngine === 'auto'
                    ? 'bg-[#00f5ff]/15 border-[#00f5ff] text-white shadow-[0_0_12px_#00f5ff22]'
                    : 'bg-[#0e131d] border-[#202738] text-gray-400 hover:text-white hover:border-[#2b354c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-[#00f5ff]">
                    <Bot className="w-3.5 h-3.5" />
                    AUTO-RESILIENTE
                  </span>
                  {forcedEngine === 'auto' && (
                    <span className="w-2 h-2 rounded-full bg-[#00f5ff] animate-ping" />
                  )}
                </div>
                <p className="text-[10px] text-[#94a3b8] leading-tight">
                  Cascada: Gemini 3.5 ➔ Gemma 2B ➔ Nativo
                </p>
              </button>

              {/* Option B: Force Gemini 3.5 Cloud */}
              <button
                type="button"
                onClick={() => handleSelectEngine('gemini-cloud')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  forcedEngine === 'gemini-cloud'
                    ? 'bg-[#00f5ff]/15 border-[#00f5ff] text-white shadow-[0_0_12px_#00f5ff22]'
                    : 'bg-[#0e131d] border-[#202738] text-gray-400 hover:text-white hover:border-[#2b354c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-[#00f5ff]">
                    <Cloud className="w-3.5 h-3.5" />
                    FORZAR GEMINI 3.5
                  </span>
                  {forcedEngine === 'gemini-cloud' && (
                    <span className="w-2 h-2 rounded-full bg-[#00f5ff]" />
                  )}
                </div>
                <p className="text-[10px] text-[#94a3b8] leading-tight">
                  Google Cloud Live Streaming & Multimodal
                </p>
              </button>

              {/* Option C: Force Google Gemma 2B Edge */}
              <button
                type="button"
                onClick={() => handleSelectEngine('gemma-local')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  forcedEngine === 'gemma-local'
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_12px_#00ff6622]'
                    : 'bg-[#0e131d] border-[#202738] text-gray-400 hover:text-white hover:border-[#2b354c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-[#00ff66]">
                    <Cpu className="w-3.5 h-3.5" />
                    FORZAR GEMMA 2B
                  </span>
                  {forcedEngine === 'gemma-local' && (
                    <span className="w-2 h-2 rounded-full bg-[#00ff66]" />
                  )}
                </div>
                <p className="text-[10px] text-[#94a3b8] leading-tight">
                  Local On-Premise Ollama {gemmaAvailable ? '(Disponible)' : '(No detectado)'}
                </p>
              </button>

              {/* Option D: Force Motor Nativo Standalone */}
              <button
                type="button"
                onClick={() => handleSelectEngine('native-offline')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  forcedEngine === 'native-offline'
                    ? 'bg-[#ffb800]/15 border-[#ffb800] text-white shadow-[0_0_12px_#ffb80022]'
                    : 'bg-[#0e131d] border-[#202738] text-gray-400 hover:text-white hover:border-[#2b354c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-[#ffb800]">
                    <Zap className="w-3.5 h-3.5" />
                    MOTOR NATIVO (0 MS)
                  </span>
                  {forcedEngine === 'native-offline' && (
                    <span className="w-2 h-2 rounded-full bg-[#ffb800]" />
                  )}
                </div>
                <p className="text-[10px] text-[#94a3b8] leading-tight">
                  100% Offline en Navegador (Cero Cloud)
                </p>
              </button>
            </div>
          </div>

          {/* 2. SECTION: API KEY POOL & ROTATION QUEUE */}
          <div className="space-y-3 pt-2 border-t border-[#1b2230]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#00f5ff]" />
                2. Cola de API Keys & Rotación Automática
              </span>
              <span className="text-[10px] font-mono text-[#64748b]">
                {keyPool.length} {keyPool.length === 1 ? 'clave cargada' : 'claves en cola'}
              </span>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Inspirado en pasarelas de alta disponibilidad (LiteLLM / OpenRouter). Si una clave alcanza el límite de peticiones (Rate Limit 429) o cuota, el sistema conmuta automáticamente a la siguiente clave de la cola sin cortar el subtitulado.
            </p>

            {/* Key Pool List */}
            {keyPool.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {keyPool.map((k: any, idx: number) => {
                  const isActive = k.status === 'active';
                  const isRateLimited = k.status === 'rate_limited';
                  const isBlocked = k.status === 'blocked';

                  return (
                    <div
                      key={k.id || idx}
                      className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-[#00f5ff]/10 border-[#00f5ff]/50 text-white'
                          : 'bg-[#080b11] border-[#1b2230] text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          isActive
                            ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]'
                            : isRateLimited
                            ? 'bg-[#ffb800]'
                            : isBlocked
                            ? 'bg-[#ff1744]'
                            : 'bg-[#3b82f6]'
                        }`} />
                        <div>
                          <div className="font-bold text-gray-200 flex items-center gap-2">
                            <span>{k.maskedKey}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : isRateLimited
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : isBlocked
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {k.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748b]">
                            Peticiones: {k.requestsSuccess || 0} exitosas • {k.requestsFailed || 0} fallas
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveKey(k.id)}
                        className="p-1 text-gray-500 hover:text-[#ff1744] hover:bg-[#ff1744]/10 rounded transition-all"
                        title="Eliminar clave de la cola"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Bar for Keys: Rotate & Disconnect */}
            {keyPool.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={loading || keyPool.length <= 1}
                  className="flex-1 hardware-btn flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#00f5ff] border-[#00f5ff]/40 hover:bg-[#00f5ff]/15 transition-all disabled:opacity-40"
                  title="Conmutar manualmente a la siguiente clave"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Rotar a Siguiente Clave</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="hardware-btn flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#ff1744] border-[#ff1744]/40 hover:bg-[#ff1744]/15 transition-all disabled:opacity-40"
                  title="Desconectar y limpiar claves de memoria"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>Desconectar API</span>
                </button>
              </div>
            )}

            {/* Form to Add a New Key to Pool */}
            <form onSubmit={handleAddKey} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 mb-1 flex items-center justify-between">
                  <span>+ Agregar Clave a la Cola</span>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00f0ff] hover:underline inline-flex items-center gap-1 font-normal text-[11px]"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Pegá otra API Key (AIzaSy...)"
                      className="w-full px-3 py-2 pr-9 bg-[#06080d] border border-[#202738] rounded-xl text-xs text-white focus:outline-none focus:border-[#00f0ff] font-mono placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00f0ff] transition-colors"
                      title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !newApiKey.trim()}
                    className="px-4 py-2 bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-[#0c0f17] text-xs font-bold font-mono rounded-xl transition-all shadow-md shadow-[#00f0ff]/20 shrink-0"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Model Choice for Gemini */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-[#94a3b8]">
                  Modelo Gemini Speech & Audio:
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#06080d] border border-[#202738] rounded-xl text-xs text-gray-200 focus:outline-none focus:border-[#00f0ff] font-mono"
                >
                  <option value="gemini-3.5-flash">
                    ⚡ gemini-3.5-flash (Google Multimodal & Audio — Ultra Rápido ~1.9s)
                  </option>
                  <option value="gemini-3.8-flash">
                    🏆 gemini-3.8-flash (Google Flagship Audio — Recomendado por Google AI Studio)
                  </option>
                  <option value="gemini-3.5-transcribe-live">
                    ✨ gemini-3.5-transcribe-live (Google Live WebSocket Stream)
                  </option>
                  <option value="gemini-2.5-pro">
                    🧠 gemini-2.5-pro (Google Deep Reasoning & Q&A)
                  </option>
                  <option value="gemma-2-2b-it">
                    💎 gemma-2-2b-it (Google Gemma 2 — Open Model en Google AI Studio)
                  </option>
                  <option value="gemma-2-9b-it">
                    💎 gemma-2-9b-it (Google Gemma 2 Instrucción — Alta Fidelidad)
                  </option>
                  <option value="gemma-local">
                    💻 gemma2:2b (Ollama Local Edge On-Premise en :11434)
                  </option>
                  <option value="gemini-3.1-flash-lite">
                    🚀 gemini-3.1-flash-lite (Speech Stream)
                  </option>
                  <option value="gemini-2.5-flash">
                    📦 gemini-2.5-flash (Legacy GA)
                  </option>
                </select>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-gray-500 font-mono">
                    Verificación de conexión & latencia con Google AI Studio
                  </span>
                  <button
                    type="button"
                    onClick={handleTestModel}
                    disabled={isTestingModel || loading}
                    className="px-3 py-1.5 bg-[#171b26] hover:bg-[#202738] border border-[#2e384d] hover:border-[#00f0ff] text-[#00f0ff] rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0"
                    title="Envía una prueba de latencia al modelo seleccionado en Google AI Studio"
                  >
                    {isTestingModel ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#00f0ff]" />}
                    <span>{isTestingModel ? 'Probando...' : 'Probar Modelo (Ping)'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs font-mono ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                  : 'bg-red-950/40 text-red-400 border border-red-800/50'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#1b2230]">
          <span className="text-[10px] font-mono text-[#64748b]">
            Modo Seleccionado: <strong className="text-white">{forcedEngine.toUpperCase()}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-bold text-gray-300 hover:text-white bg-[#161c28] hover:bg-[#202738] rounded-xl transition-colors border border-[#232c3f]"
          >
            Cerrar Consola
          </button>
        </div>

      </div>
    </div>
  );
};
