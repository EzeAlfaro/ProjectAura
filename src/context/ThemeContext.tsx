import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeId } from '../types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  accent: string;
  description: string;
  icon: string;
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'broadcast-dark',
    name: 'Broadcast Rack Dark',
    badge: 'PRO-AV',
    accent: '#00f5ff',
    description: 'Consola técnica estándar pro-audio de 19 pulgadas con anodizado negro.',
    icon: '🎛️'
  },
  {
    id: 'cyberpunk-konex',
    name: 'Cyberpunk Konex',
    badge: 'NEON',
    accent: '#ff007f',
    description: 'Estética nocturna festival Konex con destellos neón magenta y cian.',
    icon: '⚡'
  },
  {
    id: 'high-contrast-aaa',
    name: 'High-Contrast AAA',
    badge: 'WCAG 21:1',
    accent: '#ffff00',
    description: 'Contraste extremo para personas con baja visión o auditorios con sol directo.',
    icon: '👁️'
  },
  {
    id: 'paper-light',
    name: 'Paper Daylight',
    badge: 'LIGHT',
    accent: '#2563eb',
    description: 'Modo claro editorial de alta legibilidad para exteriores o impresión.',
    icon: '☀️'
  },
  {
    id: 'retro-crt',
    name: 'Retro CRT Green Phosphor',
    badge: 'MAINFRAME',
    accent: '#39ff14',
    description: 'Terminal vintage VT100 con fósforo verde y líneas de barrido catódico.',
    icon: '📺'
  }
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themeConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'nerdsub_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId;
      if (saved && AVAILABLE_THEMES.some(t => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      // Fallback if localStorage restricted
    }
    return 'broadcast-dark';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    // Remove previous theme-* classes and add new one
    const classList = document.documentElement.classList;
    AVAILABLE_THEMES.forEach(t => classList.remove(`theme-${t.id}`));
    classList.add(`theme-${theme}`);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const themeConfig = AVAILABLE_THEMES.find(t => t.id === theme) || AVAILABLE_THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
