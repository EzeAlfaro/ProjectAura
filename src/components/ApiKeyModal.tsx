import React, { useState } from 'react';
import { KeyRound, CheckCircle, AlertCircle, X, ExternalLink, Sparkles } from 'lucide-react';
import { updateApiKey } from '../services/api.js';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiConfigured: boolean;
  onKeyUpdated: (configured: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  geminiConfigured,
  onKeyUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await updateApiKey(apiKey.trim());
      if (res.success) {
        setStatusMsg({ type: 'success', text: '¡API Key configurada correctamente con Gemini 2.5 Flash!' });
        onKeyUpdated(res.geminiConfigured);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: 'Error al actualizar la clave.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141a29] border border-[#2a344f] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-[#1b2236] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 border border-[#00f0ff]/30 text-[#00f0ff]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Configurar Gemini API Key</h3>
            <p className="text-xs text-[#94a3b8]">Google AI Studio / Gemini Live API</p>
          </div>
        </div>

        <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
          NerdSub utiliza los modelos <strong>Gemini 2.5 Flash</strong> y procesamiento multimodal de audio para transcribir y traducir en tiempo real. Obtené tu clave gratuita en{' '}
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00f0ff] hover:underline inline-flex items-center gap-1 font-medium"
          >
            Google AI Studio <ExternalLink className="w-3 h-3" />
          </a>.
        </p>

        {geminiConfigured && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Una clave ya se encuentra activa en el servidor. Podés reemplazarla aquí si lo deseás.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#f1f5f9] mb-1.5">
              API Key (AIzaSy...)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pegá tu GEMINI_API_KEY aquí"
              className="w-full px-3.5 py-2.5 bg-[#0c0f17] border border-[#2a344f] rounded-xl text-sm text-white focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] font-mono placeholder:text-gray-600"
              required
            />
          </div>

          {statusMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#1b2236] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-[#0c0f17] text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00f0ff]/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Guardando...' : 'Conectar Gemini'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
