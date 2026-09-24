import React, { useState } from 'react';
import { X, Plus, Radio, Globe, Mic, Cpu, Sparkles } from 'lucide-react';
import { Stage } from '../types.js';
import { createStageApi } from '../services/api.js';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageCreated: (newStage: Stage) => void;
}

export const AddStageModal: React.FC<AddStageModalProps> = ({
  isOpen,
  onClose,
  onStageCreated
}) => {
  const [name, setName] = useState('');
  const [track, setTrack] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [talkTitle, setTalkTitle] = useState('');
  const [detectedLang, setDetectedLang] = useState<'es' | 'en' | 'pt'>('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createStageApi({
        name: name.trim(),
        track: track.trim() || 'General Track',
        speaker: speaker.trim() || 'Speaker Invitado',
        talkTitle: talkTitle.trim() || 'Conferencia en Vivo',
        detectedLang
      });

      if (res && res.stage) {
        onStageCreated(res.stage);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error al provisionar el escenario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#0b0e14] border-2 border-[#1c2333] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-[#1b2236] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-[#181d2a] pb-3">
          <div className="p-2.5 rounded-xl bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-[#00f5ff]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white uppercase">
              PROVISIONAR NUEVO ESCENARIO // NODO DE SALA
            </h3>
            <p className="text-xs text-[#64748b]">
              Conectar una nueva Mini PC o habilitar un escenario para cualquier conferencia del mundo
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-[#ff1744]/20 border border-[#ff1744]/40 rounded text-[#ff1744] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
              NOMBRE DEL ESCENARIO / SALA *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Escenario 4 - Security Lab / Room B Tokyo"
              className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                TRACK TEMÁTICO
              </label>
              <input
                type="text"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="ej. Kubernetes, AI, DevOps"
                className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                IDIOMA BASE DEL ORADOR
              </label>
              <select
                value={detectedLang}
                onChange={(e) => setDetectedLang(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
              >
                <option value="es">🇪🇸 Español (es-AR / es-ES)</option>
                <option value="en">🇬🇧 English (en-US / en-GB)</option>
                <option value="pt">🇧🇷 Português (pt-BR)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                ORADOR / SPEAKER
              </label>
              <input
                type="text"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="ej. Jane Doe (Staff Engineer)"
                className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                TÍTULO DE LA DISERTACIÓN
              </label>
              <input
                type="text"
                value={talkTitle}
                onChange={(e) => setTalkTitle(e.target.value)}
                placeholder="ej. Zero-Trust eBPF Mesh at Scale"
                className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
              />
            </div>
          </div>

          <div className="p-3 bg-[#07090e] border border-[#1b2230] rounded text-[11px] text-[#64748b] space-y-1">
            <div className="flex items-center gap-1.5 text-gray-300 font-bold">
              <Cpu className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>VINCULACIÓN AUTOMÁTICA DE MINI PC:</span>
            </div>
            <p>
              Una vez creado, cualquier Mini PC o navegador puede emitir a esta sala conectándose a:
              <br />
              <code className="text-[#00ff66] bg-[#121622] px-1.5 py-0.5 rounded inline-block mt-1">
                /kiosk?stage={'stage-' + (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'nuevo')}
              </code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#181d2a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#10141e] text-gray-400 hover:text-white border border-[#222a3d]"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded bg-[#00f5ff] hover:bg-[#00f5ff]/90 disabled:opacity-50 text-black font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,245,255,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'PROVISIONANDO...' : 'CREAR ESCENARIO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
