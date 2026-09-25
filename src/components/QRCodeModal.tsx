import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check, ExternalLink, Monitor, Smartphone, Sparkles } from 'lucide-react';
import { Stage, SupportedLanguage } from '../types.js';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: Stage;
  selectedLang: SupportedLanguage;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  stage,
  selectedLang,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'attendee' | 'projector'>('attendee');
  const [networkIp, setNetworkIp] = useState<string>('');
  const [useLocalhost, setUseLocalhost] = useState<boolean>(false);

  const [selectedPort, setSelectedPort] = useState<string>(() => window.location.port || '3000');

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.networkIp && data.networkIp !== 'localhost') {
          setNetworkIp(data.networkIp);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveHost = useLocalhost || !networkIp
    ? window.location.hostname
    : networkIp;
  // Always use http on local Wi-Fi to avoid mobile SSL cert rejections
  const isLocalIp = effectiveHost !== 'localhost' && !effectiveHost.includes('.');
  const protocol = window.location.protocol === 'https:' && !networkIp ? 'https:' : 'http:';
  const effectivePort = selectedPort ? `:${selectedPort}` : '';
  const shareUrl = `${protocol}//${effectiveHost}${effectivePort}/?stage=${stage.id}&lang=${selectedLang}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0c0f17',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-[#141a29] border border-[#2a344f] rounded-3xl w-full shadow-2xl relative transition-all overflow-hidden ${
          mode === 'projector' ? 'max-w-3xl p-8 sm:p-10' : 'max-w-md p-6'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94a3b8] hover:text-white p-2 rounded-xl hover:bg-[#1b2236] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* View Mode Toggle: Attendee vs Projector Slide */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setMode('attendee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'attendee'
                ? 'bg-[#00f0ff] text-black shadow-sm'
                : 'bg-[#1b2236] text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Compartir con Asistentes</span>
          </button>

          <button
            onClick={() => setMode('projector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'projector'
                ? 'bg-[#8b5cf6] text-white shadow-sm'
                : 'bg-[#1b2236] text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Modo Pantalla de Auditorio</span>
          </button>
        </div>

        {/* MODE 1: ATTENDEE MODAL */}
        {mode === 'attendee' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 border border-[#00f0ff]/30 text-[#00f0ff]">
              <QrCode className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">
                Abrir Subtítulos en tu Teléfono
              </h3>
              <p className="text-xs text-[#94a3b8] mt-1">
                Escaneá con la cámara de tu celular para seguir la charla en vivo en tu idioma.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-[#00f0ff]/40">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code para subtítulos"
                  className="w-52 h-52 object-contain rounded-lg"
                />
              )}
            </div>

            {/* Stage & Lang Pill */}
            <div className="flex items-center gap-2 text-xs font-mono bg-[#0c0f17] px-3.5 py-1.5 rounded-full border border-[#2a344f] text-gray-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[#00f0ff] font-bold">{stage.name}</span>
              <span>•</span>
              <span className="uppercase text-purple-400 font-bold">{selectedLang}</span>
            </div>

            {/* Network Host & Port Toggles */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono">
              {networkIp && (
                <div className="flex items-center gap-1 bg-[#0c0f17] p-1 rounded-lg border border-[#1e2535]">
                  <span className="text-gray-500 pl-1">HOST:</span>
                  <button
                    onClick={() => setUseLocalhost(false)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      !useLocalhost
                        ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Wi-Fi ({networkIp})
                  </button>
                  <button
                    onClick={() => setUseLocalhost(true)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      useLocalhost
                        ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Localhost
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-[#0c0f17] p-1 rounded-lg border border-[#1e2535]">
                <span className="text-gray-500 pl-1">PORT:</span>
                <button
                  onClick={() => setSelectedPort('3000')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    selectedPort === '3000'
                      ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Puerto de desarrollo Vite (con HMR)"
                >
                  :3000 (Vite)
                </button>
                <button
                  onClick={() => setSelectedPort('3001')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    selectedPort === '3001'
                      ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Puerto de producción Express (ideal para celulares)"
                >
                  :3001 (Server)
                </button>
              </div>
            </div>

            {/* Copyable Link */}
            <div className="w-full flex items-center gap-2 bg-[#0c0f17] border border-[#2a344f] rounded-xl p-2 text-xs">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-gray-300 flex-1 truncate px-2 font-mono text-[11px] focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-black font-bold rounded-lg transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: AUDITORIUM PROJECTOR SLIDE (Live Church / Conference Big Screen style) */}
        {mode === 'projector' && (
          <div className="text-center space-y-6 py-2">
            
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00f0ff] bg-[#00f0ff]/10 px-3 py-1 rounded-full border border-[#00f0ff]/30">
                NERDEARLA 2026 • ACCESIBILIDAD EN VIVO
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Subtítulos & Traducción Simultánea
              </h2>
              <p className="text-base text-gray-300 max-w-xl mx-auto">
                Escaneá este código QR desde tu asiento para leer la charla en <strong className="text-[#00f0ff]">Español</strong>, <strong className="text-[#8b5cf6]">Inglés</strong> o <strong className="text-[#ff007a]">Portugués</strong> en tu propio teléfono.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
              {/* Giant QR Code */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-[#00f0ff] flex items-center justify-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Auditorio"
                    className="w-64 h-64 object-contain rounded-xl"
                  />
                )}
              </div>

              {/* Instructions List */}
              <div className="text-left space-y-4 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] font-bold flex items-center justify-center shrink-0 text-sm">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Abrí tu cámara</div>
                    <div className="text-xs text-[#94a3b8]">Apuntá al código QR sin descargar ninguna app.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] font-bold flex items-center justify-center shrink-0 text-sm">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Elegí tu idioma</div>
                    <div className="text-xs text-[#94a3b8]">Español, English o Português al instante.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#ff007a]/20 text-[#ff007a] font-bold flex items-center justify-center shrink-0 text-sm">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">NerdGlosario Interactivo</div>
                    <div className="text-xs text-[#94a3b8]">Tocá los términos técnicos para entender siglas difíciles.</div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-mono text-gray-500">
                    Sala: <strong className="text-white">{stage.name}</strong> • Powered by Google Gemini 3.5 Transcribe Live
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
