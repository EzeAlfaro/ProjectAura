import React, { useState, useEffect } from 'react';
import { X, Plus, Radio, Globe, Mic, Cpu, Sparkles, Copy, Check, Tv, Smartphone } from 'lucide-react';
import { Stage } from '../types.js';
import { createStageApi } from '../services/api.js';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageCreated: (newStage: Stage) => void;
  existingStagesCount?: number;
}

export const AddStageModal: React.FC<AddStageModalProps> = ({
  isOpen,
  onClose,
  onStageCreated,
  existingStagesCount = 3
}) => {
  const defaultStageNumber = existingStagesCount + 1;
  const [stageId, setStageId] = useState(`stage-${defaultStageNumber}`);
  const [name, setName] = useState(`Escenario ${defaultStageNumber}`);
  const [track, setTrack] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [talkTitle, setTalkTitle] = useState('');
  const [detectedLang, setDetectedLang] = useState<'es' | 'en' | 'pt'>('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const nextNum = existingStagesCount + 1;
      setStageId(`stage-${nextNum}`);
      setName(`Escenario ${nextNum}`);
      setTrack('Track General');
      setSpeaker('Orador Invitado');
      setTalkTitle('Conferencia Técnica');
      setError(null);
    }
  }, [isOpen, existingStagesCount]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const kioskUrl = `${origin}/kiosk?stage=${stageId}`;
  const audienceUrl = `${origin}/?stage=${stageId}`;
  const tvUrl = `${origin}/?view=overlay&mode=tv&stage=${stageId}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createStageApi({
        id: stageId.trim().toLowerCase(),
        name: name.trim(),
        track: track.trim() || 'General Track',
        speaker: speaker.trim() || 'Orador Invitado',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none overflow-y-auto">
      <div className="bg-[#0b0e14] border-2 border-[#1c2333] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative text-white my-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-[#1b2236] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-[#181d2a] pb-3">
          <div className="p-2.5 rounded-xl bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-[#00f5ff]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white uppercase">
              CREAR NUEVA SALA / ESCENARIO
            </h3>
            <p className="text-xs text-[#64748b]">
              Habilita una sala para la conferencia y genera sus URLs para la Mini PC del sonidista, la audiencia y el proyector
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-[#ff1744]/20 border border-[#ff1744]/40 rounded text-[#ff1744] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Nombre y Slug ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                NOMBRE DE LA SALA *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Optional auto slug if starts with Escenario
                  const match = e.target.value.match(/\d+/);
                  if (match) {
                    setStageId(`stage-${match[0]}`);
                  }
                }}
                placeholder="ej. Escenario 4 - Security Lab"
                className="w-full px-3 py-2 bg-[#07090e] border border-[#222a3d] rounded text-white focus:outline-none focus:border-[#00f5ff]"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#64748b] mb-1 font-bold">
                IDENTIFICADOR (ID) *
              </label>
              <input
                type="text"
                value={stageId}
                onChange={(e) => setStageId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="stage-4"
                className="w-full px-3 py-2 bg-[#07090e] border border-[#00f5ff]/40 rounded text-[#00f5ff] font-bold focus:outline-none focus:border-[#00f5ff]"
                required
              />
            </div>
          </div>

          {/* Track e Idioma */}
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

          {/* Orador y Título */}
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
                TÍTULO DE LA CHARLA
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

          {/* LIVE URLS PREVIEW CARD */}
          <div className="p-3.5 bg-[#07090e] border border-[#1b2230] rounded-xl text-xs space-y-2.5">
            <div className="flex items-center gap-1.5 text-gray-200 font-bold border-b border-[#161c28] pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>LINKS GENERADOS PARA ESTA SALA:</span>
            </div>

            {/* 1. Mini PC / Kiosk */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0e121a] border border-[#1e2535]">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#00ff66] flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>PARA LA MINI PC DE ESCENARIO (Captura de Audio):</span>
                </div>
                <div className="text-gray-300 font-mono text-[11px] truncate">
                  {kioskUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(kioskUrl, 'kiosk')}
                className="px-2 py-1 rounded bg-[#161d2b] hover:bg-[#1e283b] text-gray-200 hover:text-white shrink-0 text-[10px] flex items-center gap-1 border border-[#232f48]"
              >
                {copiedKey === 'kiosk' ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'kiosk' ? 'COPIADO' : 'COPIAR'}</span>
              </button>
            </div>

            {/* 2. Audiencia Celulares */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0e121a] border border-[#1e2535]">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#00f5ff] flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  <span>PARA LA AUDIENCIA (Escaneo de QR):</span>
                </div>
                <div className="text-gray-300 font-mono text-[11px] truncate">
                  {audienceUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(audienceUrl, 'audience')}
                className="px-2 py-1 rounded bg-[#161d2b] hover:bg-[#1e283b] text-gray-200 hover:text-white shrink-0 text-[10px] flex items-center gap-1 border border-[#232f48]"
              >
                {copiedKey === 'audience' ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'audience' ? 'COPIADO' : 'COPIAR'}</span>
              </button>
            </div>

            {/* 3. Proyector TV */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0e121a] border border-[#1e2535]">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <Tv className="w-3 h-3" />
                  <span>PARA EL PROYECTOR / TV DEL ESCENARIO (con QR):</span>
                </div>
                <div className="text-gray-300 font-mono text-[11px] truncate">
                  {tvUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(tvUrl, 'tv')}
                className="px-2 py-1 rounded bg-[#161d2b] hover:bg-[#1e283b] text-gray-200 hover:text-white shrink-0 text-[10px] flex items-center gap-1 border border-[#232f48]"
              >
                {copiedKey === 'tv' ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'tv' ? 'COPIADO' : 'COPIAR'}</span>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
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
              <span>{loading ? 'HABILITANDO...' : 'HABILITAR SALA'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
