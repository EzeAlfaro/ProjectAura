import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Trash2, X, AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';
import { fetchLogsApi, clearLogsApi } from '../services/api.js';

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogViewerModal: React.FC<LogViewerModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchLogsApi(
        selectedLevel !== 'all' ? selectedLevel : undefined,
        150
      );
      setLogs(res.logs || []);
    } catch (e) {
      console.warn('Error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, selectedLevel, selectedSubsystem]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(loadLogs, 2500);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, selectedLevel, selectedSubsystem]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => {
    if (selectedSubsystem !== 'all' && l.subsystem !== selectedSubsystem) return false;
    return true;
  });

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="bg-[#0b0e14] border-2 border-[#1c2333] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Terminal Header */}
        <div className="bg-[#10141e] border-b border-[#1c2333] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00f5ff]/10 border border-[#00f5ff]/30 flex items-center justify-center text-[#00f5ff]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  TELEMETRÍA & GESTIÓN DE LOGS // PROJECT AURA
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
              </div>
              <p className="text-[10px] text-gray-400">
                Registro persistente de errores en <code>server/logs/aura.log</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#ff1744]/20 border border-[#ff1744]/40 text-[#ff1744] text-[10px] font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorCount} ERRORES
              </span>
            )}
            {warnCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#ffba00]/20 border border-[#ffba00]/40 text-[#ffba00] text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {warnCount} AVISOS
              </span>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 rounded border text-[10px] transition-all flex items-center gap-1 ${
                autoRefresh
                  ? 'bg-[#00ff66]/10 border-[#00ff66]/40 text-[#00ff66]'
                  : 'bg-[#141b29] border-[#222a3d] text-gray-400'
              }`}
              title="Actualización automática en vivo"
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">LIVE</span>
            </button>

            <button
              onClick={async () => {
                await clearLogsApi();
                setLogs([]);
              }}
              className="p-1.5 rounded bg-[#141b29] hover:bg-[#ff1744]/20 border border-[#222a3d] hover:border-[#ff1744]/40 text-gray-400 hover:text-[#ff1744] transition-all"
              title="Borrar logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded bg-[#141b29] hover:bg-[#202738] border border-[#222a3d] text-gray-400 hover:text-white transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-[#07090e] border-b border-[#181d2a] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Level Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 mr-1">NIVEL:</span>
            {['all', 'error', 'warn', 'info'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                  selectedLevel === lvl
                    ? 'bg-[#00f5ff] text-black'
                    : 'bg-[#10141e] text-gray-400 border border-[#1e2535] hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Subsystem Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 mr-1">SUBSISTEMA:</span>
            {['all', 'gemini', 'audio', 'stage', 'ws'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubsystem(sub)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                  selectedSubsystem === sub
                    ? 'bg-[#00ff66] text-black'
                    : 'bg-[#10141e] text-gray-400 border border-[#1e2535] hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

        </div>

        {/* Logs Console Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-1.5 bg-[#05070b] text-[11px] font-mono select-text">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <Shield className="w-8 h-8 text-[#00ff66] opacity-60" />
              <p>No hay eventos registrados en este filtro.</p>
              <p className="text-[10px]">El sistema está saludable sin anomalías.</p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isError = entry.level === 'error';
              const isWarn = entry.level === 'warn';
              const isExpanded = expandedLogId === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                  className={`p-2 rounded border cursor-pointer transition-all ${
                    isError
                      ? 'bg-[#ff1744]/10 border-[#ff1744]/40 hover:bg-[#ff1744]/15'
                      : isWarn
                      ? 'bg-[#ffba00]/10 border-[#ffba00]/40 hover:bg-[#ffba00]/15'
                      : 'bg-[#0c1017] border-[#181d2a] hover:bg-[#121622]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(entry.epoch).toLocaleTimeString()}
                    </span>

                    <span
                      className={`px-1 rounded text-[9px] font-bold shrink-0 uppercase ${
                        isError
                          ? 'bg-[#ff1744] text-white'
                          : isWarn
                          ? 'bg-[#ffba00] text-black'
                          : 'bg-[#00f5ff]/20 text-[#00f5ff]'
                      }`}
                    >
                      {entry.level}
                    </span>

                    <span className="text-[10px] text-[#00f5ff] font-bold shrink-0 uppercase">
                      [{entry.subsystem}]
                    </span>

                    <span className={`flex-1 break-words ${isError ? 'text-[#ff5252] font-bold' : isWarn ? 'text-[#ffba00]' : 'text-gray-200'}`}>
                      {entry.message}
                    </span>
                  </div>

                  {/* Expanded Stack or Details */}
                  {isExpanded && (entry.details || entry.stack) && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-1 text-gray-300 bg-black/40 p-2 rounded">
                      {entry.details && (
                        <div>
                          <span className="text-gray-400 font-bold">Detalles: </span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
                        </div>
                      )}
                      {entry.stack && (
                        <div>
                          <span className="text-[#ff1744] font-bold">Stack Trace: </span>
                          <pre className="text-[#ff5252] whitespace-pre-wrap text-[9px]">{entry.stack}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#0b0e14] border-t border-[#1c2333] px-4 py-2 flex items-center justify-between text-[10px] text-gray-400">
          <span>{filteredLogs.length} eventos mostrados</span>
          <span>Click en cualquier log para expandir stack trace y metadatos</span>
        </div>

      </div>
    </div>
  );
};
