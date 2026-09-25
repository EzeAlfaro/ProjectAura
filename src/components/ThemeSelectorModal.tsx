import React from 'react';
import { useTheme, AVAILABLE_THEMES } from '../context/ThemeContext';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">🎨</span>
            <div>
              <h2 id="theme-modal-title" className="text-sm font-bold text-white tracking-wide">
                TEMAS Y SKINS VISUALES
              </h2>
              <p className="text-[11px] text-slate-400">
                Selecciona la apariencia adaptada a la cabina de audio o pantalla del auditorio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Theme Options */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {AVAILABLE_THEMES.map(t => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start space-x-3.5 ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="text-2xl pt-0.5">{t.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {t.name}
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                          ACTIVO
                        </span>
                      )}
                    </span>
                    <span 
                      className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
                      style={{ color: t.accent, borderColor: `${t.accent}66`, backgroundColor: `${t.accent}15` }}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Se guarda automáticamente en tu navegador</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
