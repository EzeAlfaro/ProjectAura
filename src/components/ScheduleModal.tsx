import React, { useState, useEffect } from 'react';
import { EventTalk } from '../types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStageId?: string;
  onSyncTalk?: (talk: EventTalk) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  activeStageId = 'stage-1',
  onSyncTalk
}) => {
  const [talks, setTalks] = useState<EventTalk[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(activeStageId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncSuccessId, setSyncSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (activeStageId) {
      setSelectedStage(activeStageId);
    }
  }, [activeStageId]);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => {
        if (data.talks) {
          setTalks(data.talks);
        }
      })
      .catch(err => console.error('[Schedule] Error fetching schedule:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate current minutes for live detection
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const stageOptions = React.useMemo(() => {
    const stageMap = new Map<string, string>();
    talks.forEach(t => {
      if (!stageMap.has(t.stageId)) {
        stageMap.set(t.stageId, t.stageName);
      }
    });
    if (stageMap.size === 0) {
      return [
        { id: 'stage-1', name: 'Escenario Principal', icon: '🏛️' },
        { id: 'stage-2', name: 'Cloud & DevOps', icon: '☁️' },
        { id: 'stage-3', name: 'Data & AI', icon: '🧠' }
      ];
    }
    return Array.from(stageMap.entries()).map(([id, name]) => {
      let icon = '🏛️';
      if (/cloud|devops|infra/i.test(name + id)) icon = '☁️';
      else if (/ai|data|intel/i.test(name + id)) icon = '🧠';
      else if (/sec|seguridad/i.test(name + id)) icon = '🛡️';
      return { id, name, icon };
    });
  }, [talks]);

  const filteredTalks = talks.filter(t => {
    const matchesStage = selectedStage === 'all' || t.stageId === selectedStage;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStage;

    const matchesSearch = 
      t.title.toLowerCase().includes(q) ||
      t.speaker.toLowerCase().includes(q) ||
      t.speakerCompany.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q));

    return matchesStage && matchesSearch;
  });

  const handleSyncWithStage = async (talk: EventTalk) => {
    setSyncingId(talk.id);
    try {
      const res = await fetch(`/api/schedule/${talk.stageId}/sync/${talk.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        setSyncSuccessId(talk.id);
        setTimeout(() => setSyncSuccessId(null), 2500);
        if (onSyncTalk) {
          onSyncTalk(talk);
        }
      }
    } catch (err) {
      console.error('[Schedule] Failed to sync talk:', err);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">📅</span>
            <div>
              <h2 id="schedule-modal-title" className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                AGENDA OFICIAL NERDEARLA 2026
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Ciudad Cultural Konex
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                16 conferencias programadas across 3 stages • Sincronización instantánea con teleprompters y OBS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Stage Selector Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedStage('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedStage === 'all'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Todos los Escenarios
            </button>
            {stageOptions.map(stage => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  selectedStage === stage.id
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{stage.icon}</span>
                <span>{stage.name}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar speaker, charla, tag..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Talks List */}
        <div className="flex-1 overflow-y-auto p-5 space-x-0 space-y-3.5 bg-slate-950/40">
          {filteredTalks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron charlas para los filtros seleccionados.
            </div>
          ) : (
            filteredTalks.map(talk => {
              const isNow = currentMinutes >= talk.startMinutes && currentMinutes < talk.endMinutes;
              const isPast = currentMinutes >= talk.endMinutes;
              const isSyncing = syncingId === talk.id;
              const isSynced = syncSuccessId === talk.id;

              return (
                <div
                  key={talk.id}
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                    isNow
                      ? 'bg-cyan-950/30 border-cyan-500/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : isPast
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Active Live Strip Indicator */}
                  {isNow && (
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 to-emerald-400 animate-pulse" />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Time & Badges */}
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-cyan-900">
                        {talk.startTime} - {talk.endTime}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {talk.stageName}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {talk.language.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">
                        {talk.level}
                      </span>

                      {isNow && (
                        <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>EN VIVO AHORA</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Sync Button */}
                    <button
                      onClick={() => handleSyncWithStage(talk)}
                      disabled={isSyncing}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 self-start sm:self-auto ${
                        isSynced
                          ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-cyan-600 hover:text-black text-slate-200 border border-slate-700'
                      }`}
                      title="Sincronizar speaker y título con el escenario actual"
                    >
                      <span>{isSynced ? '✓' : isSyncing ? '⏳' : '⚡'}</span>
                      <span>{isSynced ? '¡Sincronizado!' : isSyncing ? 'Sincronizando...' : 'Sincronizar Sala'}</span>
                    </button>
                  </div>

                  {/* Talk Title & Speaker */}
                  <div className="mt-2.5">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {talk.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-300 mt-0.5 flex items-center space-x-1.5">
                      <span className="text-cyan-400">👤 {talk.speaker}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{talk.speakerRole} ({talk.speakerCompany})</span>
                    </p>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {talk.description}
                  </p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {talk.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800/80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Nerdearla 2026 • Buenos Aires Live Telemetry</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
