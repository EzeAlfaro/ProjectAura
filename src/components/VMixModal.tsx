import React, { useState } from 'react';
import { X, Copy, Check, Tv, ExternalLink, Sliders, Monitor, Radio, Sparkles } from 'lucide-react';
import { Stage, SupportedLanguage } from '../types.js';

interface VMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  selectedStageId: string;
}

export const VMixModal: React.FC<VMixModalProps> = ({
  isOpen,
  onClose,
  stages,
  selectedStageId,
}) => {
  const [activeStageId, setActiveStageId] = useState<string>(selectedStageId || stages[0]?.id || 'stage-1');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('es');
  const [theme, setTheme] = useState<'dark-bar' | 'floating'>('dark-bar');
  const [lines, setLines] = useState<1 | 2>(2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStage = stages.find((s) => s.id === activeStageId) || stages[0];
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

  const getOverlayUrl = (stageId: string, lang: SupportedLanguage) => {
    return `${origin}/?view=overlay&stage=${stageId}&lang=${lang}&theme=${theme}&lines=${lines}`;
  };

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#0b0e15] border-2 border-[#1c2333] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Chassis Header */}
        <div className="bg-[#0e121b] border-b border-[#181d2a] px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#ff1744]/15 border border-[#ff1744]/40 text-[#ff1744]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm sm:text-base font-black tracking-tight text-white uppercase">
                  INTEGRACIÓN BROADCAST // vMIX & OBS STUDIO
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/40 text-[10px] font-mono font-bold">
                  ALPHA TRANSPARENCY 1080p
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#64748b]">
                Planchado de subtítulos y traducción simultánea en vivo directo en el stream virtual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#1a2030] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs font-mono text-gray-300">
          
          {/* Stage Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#64748b] block font-bold uppercase">
              1. SELECCIONAR ESCENARIO / SALA DEL EVENTO:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {stages.map((stage) => {
                const isSelected = stage.id === activeStageId;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setActiveStageId(stage.id)}
                    className={`p-2.5 rounded border text-left transition-all ${
                      isSelected
                        ? 'bg-[#121927] border-[#00f5ff] text-white shadow-md'
                        : 'bg-[#07090e] border-[#181d2a] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#00f5ff]">{stage.name}</span>
                      <span className={`w-2 h-2 rounded-full ${stage.isLive ? 'bg-[#ff1744] animate-pulse' : 'bg-[#2b3347]'}`} />
                    </div>
                    <div className="text-[11px] text-gray-200 font-bold truncate">{stage.talkTitle}</div>
                    <div className="text-[9px] text-[#64748b] truncate">{stage.speaker}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overlay Customizer */}
          <div className="bg-[#07090e] border border-[#171b26] p-3 rounded grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#64748b] block font-bold mb-1 uppercase">
                ESTILO GRÁFICO (THEME):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme('dark-bar')}
                  className={`py-1.5 px-2 rounded border text-center font-bold ${
                    theme === 'dark-bar'
                      ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]'
                      : 'bg-[#090b10] border-[#1f2738] text-gray-400'
                  }`}
                >
                  Dark Bar (Franja broadcast)
                </button>
                <button
                  onClick={() => setTheme('floating')}
                  className={`py-1.5 px-2 rounded border text-center font-bold ${
                    theme === 'floating'
                      ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]'
                      : 'bg-[#090b10] border-[#1f2738] text-gray-400'
                  }`}
                >
                  Floating (Texto con sombra)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#64748b] block font-bold mb-1 uppercase">
                LÍNEAS SIMULTÁNEAS EN STREAM:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLines(1)}
                  className={`py-1.5 px-2 rounded border text-center font-bold ${
                    lines === 1
                      ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]'
                      : 'bg-[#090b10] border-[#1f2738] text-gray-400'
                  }`}
                >
                  1 Línea (Minimalista)
                </button>
                <button
                  onClick={() => setLines(2)}
                  className={`py-1.5 px-2 rounded border text-center font-bold ${
                    lines === 2
                      ? 'bg-[#141b29] border-[#00f5ff] text-[#00f5ff]'
                      : 'bg-[#090b10] border-[#1f2738] text-gray-400'
                  }`}
                >
                  2 Líneas (Recomendado)
                </button>
              </div>
            </div>
          </div>

          {/* Language URLs Ready to Copy */}
          <div className="space-y-2.5">
            <label className="text-[10px] text-[#64748b] block font-bold uppercase">
              2. URLS PARA vMIX WEB BROWSER INPUT / OBS BROWSER SOURCE:
            </label>

            {/* Spanish stream URL */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇪🇸</span>
                  <span className="font-bold text-white text-xs">STREAM ESPAÑOL (Subtítulos traducidos al Español)</span>
                  <span className="px-1.5 py-0.2 bg-[#00f5ff]/15 text-[#00f5ff] text-[9px] rounded font-bold">RECOMENDADO</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate select-all">
                  {getOverlayUrl(activeStageId, 'es')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(getOverlayUrl(activeStageId, 'es'), 'es')}
                  className="px-3 py-1.5 rounded bg-[#141b29] hover:bg-[#1a2336] border border-[#00f5ff]/40 text-[#00f5ff] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === 'es' ? <Check className="w-3.5 h-3.5 text-[#00ff66]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'es' ? '¡COPIADO!' : 'COPIAR URL'}</span>
                </button>
                <a
                  href={getOverlayUrl(activeStageId, 'es')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded bg-[#10141e] border border-[#202738] text-gray-400 hover:text-white"
                  title="Abrir vista previa en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* English stream URL */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇬🇧</span>
                  <span className="font-bold text-white text-xs">STREAM ORIGINAL / INGLÉS (English Subtitles)</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate select-all">
                  {getOverlayUrl(activeStageId, 'en')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(getOverlayUrl(activeStageId, 'en'), 'en')}
                  className="px-3 py-1.5 rounded bg-[#141b29] hover:bg-[#1a2336] border border-[#00f5ff]/40 text-[#00f5ff] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === 'en' ? <Check className="w-3.5 h-3.5 text-[#00ff66]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'en' ? '¡COPIADO!' : 'COPIAR URL'}</span>
                </button>
                <a
                  href={getOverlayUrl(activeStageId, 'en')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded bg-[#10141e] border border-[#202738] text-gray-400 hover:text-white"
                  title="Abrir vista previa en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Portuguese stream URL */}
            <div className="p-3 bg-[#07090e] border border-[#171b26] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇧🇷</span>
                  <span className="font-bold text-white text-xs">STREAM PORTUGUÊS (Legendas em Português)</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate select-all">
                  {getOverlayUrl(activeStageId, 'pt')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(getOverlayUrl(activeStageId, 'pt'), 'pt')}
                  className="px-3 py-1.5 rounded bg-[#141b29] hover:bg-[#1a2336] border border-[#00f5ff]/40 text-[#00f5ff] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === 'pt' ? <Check className="w-3.5 h-3.5 text-[#00ff66]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pt' ? '¡COPIADO!' : 'COPIAR URL'}</span>
                </button>
                <a
                  href={getOverlayUrl(activeStageId, 'pt')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded bg-[#10141e] border border-[#202738] text-gray-400 hover:text-white"
                  title="Abrir vista previa en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>

          {/* Step-by-Step Cheat Sheet for Technical AV Crew */}
          <div className="p-4 bg-[#080b11] border border-[#181d2a] rounded space-y-3">
            <div className="font-bold text-white text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00ff66]" />
              <span>GUÍA RÁPIDA DE CONFIGURACIÓN EN vMIX (30 SEGUNDOS):</span>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-300">
              <li>En vMix, clic en el botón inferior izquierdo <strong className="text-white">"Add Input" (Agregar Entrada)</strong>.</li>
              <li>En el menú lateral, seleccionar la categoría <strong className="text-[#00f5ff]">"Web Browser" (Navegador Web)</strong>.</li>
              <li>Pegar la <strong className="text-white">URL copiada</strong> de arriba (según el idioma del stream).</li>
              <li>Fijar resolución en <strong className="text-white">1920 x 1080</strong> y Frame Rate a <strong className="text-white">60 fps</strong>.</li>
              <li>
                <span className="text-[#00ff66] font-bold">¡NO REQUIERE CHROMA KEY!</span> La capa tiene fondo transparente nativo por canal alfa.
              </li>
              <li>Asignar la entrada como <strong className="text-[#00f5ff]">Overlay 1</strong> o <strong className="text-[#00f5ff]">Overlay 2</strong> para planchar los subtítulos sobre el video del orador.</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#0e121b] border-t border-[#181d2a] px-6 py-3 flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#64748b]">Compatible con vMix 24+, OBS Studio 28+, Wirecast y vMix Replay</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141b29] hover:bg-[#1a2336] text-white rounded border border-[#222a3d] font-bold"
          >
            CERRAR
          </button>
        </div>

      </div>
    </div>
  );
};
