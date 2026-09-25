import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Aura ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-[#f1f5f9] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[#0d1017] border border-[#232b3d] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Project Aura • Diagnóstico Móvil
              </h2>
              <p className="text-xs text-gray-400">
                Se detectó una interrupción en el renderizado de la consola de subtítulos.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#05070a] border border-[#1b2230] rounded-xl p-3 text-left overflow-x-auto">
                <div className="text-[10px] font-mono text-red-400 font-bold uppercase mb-1">
                  MENSAJE DE ERROR:
                </div>
                <div className="text-xs font-mono text-gray-300 break-words">
                  {this.state.error.message || String(this.state.error)}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-mono font-bold text-xs shadow-[0_0_12px_rgba(0,245,255,0.3)] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Conexión</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#161c2a] hover:bg-[#1f273b] text-gray-300 font-mono text-xs border border-[#232b3d] transition-all"
                title="Limpiar preferencias guardadas y reiniciar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Cache</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] font-mono text-gray-500">
              Nerdearla 2026 // Fallback Resiliente v3.5
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
