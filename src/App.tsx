import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { AudienceView } from './components/AudienceView.js';
import { AdminView } from './components/AdminView.js';
import { OBSOverlayView } from './components/OBSOverlayView.js';
import { ApiKeyModal } from './components/ApiKeyModal.js';
import { QRCodeModal } from './components/QRCodeModal.js';
import { WSClient } from './services/websocket.js';
import { fetchStages, fetchStatus } from './services/api.js';
import { Stage, SubtitleChunk, StageTakeaway, StageQA, SupportedLanguage } from './types.js';

export function App() {
  const [currentView, setCurrentView] = useState<'audience' | 'admin' | 'overlay'>('audience');
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('stage-1');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('es');
  
  const [chunks, setChunks] = useState<SubtitleChunk[]>([]);
  const [takeaways, setTakeaways] = useState<StageTakeaway[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<StageQA[]>([]);
  
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsClientRef = useRef<WSClient | null>(null);

  // Check URL pathname or query param for OBS Overlay mode
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path.includes('overlay') || params.has('overlay') || window.location.hash.includes('overlay')) {
      setCurrentView('overlay');
      const queryStage = params.get('stage');
      if (queryStage) setSelectedStageId(queryStage);
      const queryLang = params.get('lang') as SupportedLanguage;
      if (queryLang) setSelectedLang(queryLang);
    }
  }, []);

  // Fetch initial stages and system status
  useEffect(() => {
    fetchStatus()
      .then((status) => {
        setGeminiConfigured(status.geminiConfigured);
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
      },
      onCaption: (newChunk) => {
        setChunks((prev) => {
          // Avoid duplicate ids
          if (prev.some((c) => c.id === newChunk.id)) return prev;
          const updated = [...prev, newChunk];
          return updated.slice(-100); // keep last 100 in memory
        });
      },
      onTakeaways: (newTakeaways) => setTakeaways(newTakeaways),
      onQuestions: (newQuestions) => setSuggestedQuestions(newQuestions),
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

  // Sync stage switch with WebSocket
  const handleSelectStage = (stageId: string) => {
    setSelectedStageId(stageId);
    setChunks([]);
    setTakeaways([]);
    setSuggestedQuestions([]);
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
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f17] text-[#f1f5f9] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        geminiConfigured={geminiConfigured}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
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
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            stages={stages}
            onSelectStage={handleSelectStage}
            geminiConfigured={geminiConfigured}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a344f] bg-[#0c0f17] py-6 text-center text-xs text-[#94a3b8]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-white font-bold">⚡ NerdSub</span>
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

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        geminiConfigured={geminiConfigured}
        onKeyUpdated={(configured) => setGeminiConfigured(configured)}
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
    </div>
  );
}

export default App;
