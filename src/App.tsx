import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { AudienceView } from './components/AudienceView.js';
import { AdminView } from './components/AdminView.js';
import { OBSOverlayView } from './components/OBSOverlayView.js';
import { StageKioskView } from './components/StageKioskView.js';
import { ApiKeyModal } from './components/ApiKeyModal.js';
import { QRCodeModal } from './components/QRCodeModal.js';
import { VMixModal } from './components/VMixModal.js';
import { LogViewerModal } from './components/LogViewerModal.js';
import { ScheduleModal } from './components/ScheduleModal.js';
import { ThemeSelectorModal } from './components/ThemeSelectorModal.js';
import { WSClient } from './services/websocket.js';
import { fetchStages, fetchStatus, triggerDeepIntel } from './services/api.js';
import { Stage, SubtitleChunk, StageTakeaway, StageQA, SupportedLanguage } from './types.js';

export function App() {
  const [currentView, setCurrentView] = useState<'audience' | 'admin' | 'overlay' | 'kiosk'>('audience');
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('stage-1');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('es');
  
  const [chunks, setChunks] = useState<SubtitleChunk[]>([]);
  const [takeaways, setTakeaways] = useState<StageTakeaway[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<StageQA[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [intelModelUsed, setIntelModelUsed] = useState<string>('gemini-3.5-pro');
  const [isGeneratingIntel, setIsGeneratingIntel] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [gemmaAvailable, setGemmaAvailable] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'gemini-cloud' | 'gemma-local' | 'native-offline'>('native-offline');
  const [forcedEngine, setForcedEngine] = useState<'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline'>('auto');
  const [keyPool, setKeyPool] = useState<any[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isVMixModalOpen, setIsVMixModalOpen] = useState<boolean>(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsClientRef = useRef<WSClient | null>(null);

  // Check URL pathname or query param for Overlay / Kiosk modes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryStage = params.get('stage');
    if (queryStage) setSelectedStageId(queryStage);
    const queryLang = params.get('lang') as SupportedLanguage;
    if (queryLang) setSelectedLang(queryLang);

    const path = window.location.pathname;
    const queryView = params.get('view');
    if (queryView === 'kiosk' || path.includes('kiosk') || params.has('kiosk')) {
      setCurrentView('kiosk');
    } else if (queryView === 'overlay' || path.includes('overlay') || params.has('overlay') || window.location.hash.includes('overlay')) {
      setCurrentView('overlay');
    }
  }, []);

  // Fetch initial stages and system status
  useEffect(() => {
    fetchStatus()
      .then((status) => {
        setGeminiConfigured(status.geminiConfigured);
        if (status.gemmaAvailable !== undefined) setGemmaAvailable(status.gemmaAvailable);
        if (status.activeEngine) setActiveEngine(status.activeEngine);
        if (status.forcedEngine) setForcedEngine(status.forcedEngine as any);
        if (status.keyPool) setKeyPool(status.keyPool);
      })
      .catch((e) => console.warn('Status check warning:', e));

    fetchStages()
      .then((data) => {
        if (data && data.length > 0) {
          setStages(data);
          if (!selectedStageId) setSelectedStageId(data[0].id);
        }
      })
      .catch((e) => console.warn('Fetch stages warning:', e));
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const ws = new WSClient({
      onStatusChange: (status) => setIsConnected(status),
      onStagesUpdate: (updatedStages) => {
        setStages(updatedStages);
      },
      onInitialState: (data) => {
        if (data.chunks) setChunks(data.chunks);
        if (data.takeaways) setTakeaways(data.takeaways);
        if (data.suggestedQuestions) setSuggestedQuestions(data.suggestedQuestions);
        if ((data as any).executiveSummary) setExecutiveSummary((data as any).executiveSummary);
        if ((data as any).intelModelUsed) setIntelModelUsed((data as any).intelModelUsed);
      },
      onInterim: (data) => {
        if (data.stageId === selectedStageId) {
          setInterimText(data.text);
        }
      },
      onCaption: (newChunk) => {
        setInterimText('');
        setChunks((prev) => {
          // Avoid duplicate ids
          if (prev.some((c) => c.id === newChunk.id)) return prev;
          const updated = [...prev, newChunk];
          return updated.slice(-100); // keep last 100 in memory
        });
      },
      onTakeaways: (newTakeaways) => setTakeaways(newTakeaways),
      onQuestions: (newQuestions) => setSuggestedQuestions(newQuestions),
      onDeepIntel: (data) => {
        if (data.executiveSummary) setExecutiveSummary(data.executiveSummary);
        if (data.intelModelUsed) setIntelModelUsed(data.intelModelUsed);
        if (data.takeaways) setTakeaways(data.takeaways);
        if (data.suggestedQuestions) setSuggestedQuestions(data.suggestedQuestions);
      },
      onChunkDeleted: (chunkId) => {
        setChunks((prev) => prev.filter((c) => c.id !== chunkId));
      },
      onRemoteReload: (stageId) => {
        if (!stageId || stageId === selectedStageId) {
          console.log('[RemoteReload] Signal received from Mesa Técnica, executing reload...');
          window.location.reload();
        }
      },
      onAudioLevel: (level) => {
        setStages((prev) =>
          prev.map((s) => (s.id === selectedStageId ? { ...s, audioLevel: level } : s))
        );
      },
    });

    ws.connect(selectedStageId, selectedLang);
    wsClientRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, []);

  const handleTriggerDeepIntel = async () => {
    setIsGeneratingIntel(true);
    try {
      const res = await triggerDeepIntel(selectedStageId);
      if (res.executiveSummary) setExecutiveSummary(res.executiveSummary);
      if (res.intelModelUsed) setIntelModelUsed(res.intelModelUsed);
      if (res.takeaways) setTakeaways(res.takeaways);
      if (res.suggestedQuestions) setSuggestedQuestions(res.suggestedQuestions);
    } catch (e) {
      console.warn('Deep intel trigger error:', e);
    } finally {
      setIsGeneratingIntel(false);
    }
  };

  // Sync stage switch with WebSocket
  const handleSelectStage = (stageId: string) => {
    setSelectedStageId(stageId);
    setChunks([]);
    setTakeaways([]);
    setSuggestedQuestions([]);
    setExecutiveSummary('');
    setInterimText('');
    wsClientRef.current?.setStage(stageId, selectedLang);
  };

  // Sync language switch with WebSocket
  const handleSelectLang = (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    wsClientRef.current?.setLanguage(lang);
  };

  const currentStage = stages.find((s) => s.id === selectedStageId);

  // If in pure OBS Overlay view, render without header/layout
  if (currentView === 'overlay') {
    return (
      <div className="bg-transparent min-h-screen">
        <OBSOverlayView
          stage={currentStage}
          chunks={chunks}
          selectedLang={selectedLang}
          onSelectLang={handleSelectLang}
          onExit={() => setCurrentView('admin')}
          interimText={interimText}
        />
      </div>
    );
  }

  // If in autonomous On-Stage Mini PC Kiosk mode
  if (currentView === 'kiosk') {
    return (
      <>
        <StageKioskView
          stage={currentStage}
          stages={stages}
          onSelectStage={handleSelectStage}
          chunks={chunks}
          selectedLang={selectedLang}
          onSelectLang={handleSelectLang}
          wsClient={wsClientRef.current}
          onPushLiveTranscript={(text: string, sourceLang?: string) => {
            wsClientRef.current?.sendLiveTranscript(selectedStageId, text, sourceLang || 'es');
          }}
          onExit={() => setCurrentView('admin')}
          geminiConfigured={geminiConfigured}
          activeEngine={activeEngine}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onOpenLogModal={() => setIsLogModalOpen(true)}
          onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
        />

        {/* API Key & Engine Manager Modal for Kiosk Operator */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          geminiConfigured={geminiConfigured}
          gemmaAvailable={gemmaAvailable}
          activeEngine={activeEngine}
          forcedEngine={forcedEngine}
          keyPool={keyPool}
          onKeyUpdated={(configured, newActiveEngine, updatedPool) => {
            setGeminiConfigured(configured);
            if (newActiveEngine) setActiveEngine(newActiveEngine as any);
            if (updatedPool) setKeyPool(updatedPool);
          }}
          onEngineChanged={(newForced, newActive) => {
            setForcedEngine(newForced as any);
            setActiveEngine(newActive as any);
          }}
        />

        {/* Telemetry Log Viewer in Kiosk Mode */}
        <LogViewerModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
        />

        {/* Conference Schedule & Agenda Modal */}
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          activeStageId={selectedStageId}
          onSyncTalk={() => {
            fetchStages().then(setStages).catch(() => {});
          }}
        />

        {/* Theme & Visual Skins Modal */}
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f17] text-[#f1f5f9] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        geminiConfigured={geminiConfigured}
        gemmaAvailable={gemmaAvailable}
        activeEngine={activeEngine}
        forcedEngine={forcedEngine}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenVMixModal={() => setIsVMixModalOpen(true)}
        onOpenLogModal={() => setIsLogModalOpen(true)}
        onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        isConnected={isConnected}
        activeStageName={currentStage?.name}
      />

      {/* Main View Content */}
      <main className="flex-1 pb-12">
        {currentView === 'audience' && (
          <AudienceView
            stages={stages}
            selectedStageId={selectedStageId}
            onSelectStage={handleSelectStage}
            selectedLang={selectedLang}
            onSelectLang={handleSelectLang}
            chunks={chunks}
            takeaways={takeaways}
            suggestedQuestions={suggestedQuestions}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            executiveSummary={executiveSummary}
            intelModelUsed={intelModelUsed}
            onTriggerDeepIntel={handleTriggerDeepIntel}
            isGeneratingIntel={isGeneratingIntel}
            interimText={interimText}
            wsClient={wsClientRef.current}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            stages={stages}
            onSelectStage={handleSelectStage}
            geminiConfigured={geminiConfigured}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onOpenVMixModal={() => setIsVMixModalOpen(true)}
            chunks={chunks}
            wsClient={wsClientRef.current}
            onPushLiveTranscript={(text: string, sourceLang?: string) => {
              wsClientRef.current?.sendLiveTranscript(selectedStageId, text, sourceLang || 'es');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a344f] bg-[#0c0f17] py-6 text-center text-xs text-[#94a3b8]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-white font-bold">⚡ Project Aura</span>
            <span>—</span>
            <span>Construido para la Vibeathon de Nerdearla 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Licencia MIT Open Source</span>
            <a
              href="https://nerdear.live"
              target="_blank"
              rel="noreferrer"
              className="text-[#00f0ff] hover:underline"
            >
              nerdear.live
            </a>
          </div>
        </div>
      </footer>

      {/* API Key & Engine Manager Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        geminiConfigured={geminiConfigured}
        gemmaAvailable={gemmaAvailable}
        activeEngine={activeEngine}
        forcedEngine={forcedEngine}
        keyPool={keyPool}
        onKeyUpdated={(configured, newActiveEngine, updatedPool) => {
          setGeminiConfigured(configured);
          if (newActiveEngine) setActiveEngine(newActiveEngine as any);
          if (updatedPool) setKeyPool(updatedPool);
        }}
        onEngineChanged={(newForced, newActive) => {
          setForcedEngine(newForced as any);
          setActiveEngine(newActive as any);
        }}
      />

      {/* QR Code Attendee & Projector Modal */}
      {currentStage && (
        <QRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          stage={currentStage}
          selectedLang={selectedLang}
        />
      )}

      {/* vMix & OBS Studio Integration Modal */}
      <VMixModal
        isOpen={isVMixModalOpen}
        onClose={() => setIsVMixModalOpen(false)}
        stages={stages}
        selectedStageId={selectedStageId}
      />

      {/* Real-time Telemetry & Log Viewer Modal */}
      <LogViewerModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      {/* Conference Schedule & Agenda Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        activeStageId={selectedStageId}
        onSyncTalk={() => {
          fetchStages().then(setStages).catch(() => {});
        }}
      />

      {/* Theme & Visual Skins Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}

export default App;
