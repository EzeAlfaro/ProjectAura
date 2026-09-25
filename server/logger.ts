import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type Subsystem = 'gemini' | 'audio' | 'stage' | 'ws' | 'auth' | 'system' | 'api';

export interface LogEntry {
  id: string;
  timestamp: string;
  epoch: number;
  level: LogLevel;
  subsystem: Subsystem;
  message: string;
  details?: any;
  stack?: string;
}

type LogListener = (entry: LogEntry) => void;

class Logger {
  private logDir: string;
  private logFile: string;
  private memoryBuffer: LogEntry[] = [];
  private maxMemoryEntries: number = 300;
  private listeners: Set<LogListener> = new Set();

  constructor() {
    this.logDir = path.resolve(process.cwd(), 'server', 'logs');
    this.logFile = path.join(this.logDir, 'aura.log');
    this.ensureLogDir();
  }

  private ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (e) {
      console.error('[Logger] Could not create log directory:', e);
    }
  }

  private writeToFile(entry: LogEntry) {
    try {
      const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.subsystem}] ${entry.message}${entry.details ? ' ' + JSON.stringify(entry.details) : ''}${entry.stack ? '\n' + entry.stack : ''}\n`;
      fs.appendFileSync(this.logFile, line, 'utf-8');
    } catch (e) {
      // Fail silently to avoid crash in logging
    }
  }

  public log(level: LogLevel, subsystem: Subsystem, message: string, details?: any, err?: any): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      level,
      subsystem,
      message,
      details: details !== undefined ? details : undefined,
      stack: err?.stack || (typeof err === 'string' ? err : undefined)
    };

    // 1. In-memory buffer
    this.memoryBuffer.push(entry);
    if (this.memoryBuffer.length > this.maxMemoryEntries) {
      this.memoryBuffer.shift();
    }

    // 2. Append to disk
    this.writeToFile(entry);

    // 3. Console output
    const consoleMsg = `[${entry.subsystem.toUpperCase()}] ${message}`;
    if (level === 'error') {
      console.error(consoleMsg, details || '', err || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, details || '');
    } else {
      console.log(consoleMsg, details || '');
    }

    // 4. Notify listeners (e.g. WebSocket broadcaster)
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (e) {}
    }

    return entry;
  }

  public info(subsystem: Subsystem, message: string, details?: any): LogEntry {
    return this.log('info', subsystem, message, details);
  }

  public warn(subsystem: Subsystem, message: string, details?: any): LogEntry {
    return this.log('warn', subsystem, message, details);
  }

  public error(subsystem: Subsystem, message: string, details?: any, err?: any): LogEntry {
    return this.log('error', subsystem, message, details, err);
  }

  public debug(subsystem: Subsystem, message: string, details?: any): LogEntry {
    return this.log('debug', subsystem, message, details);
  }

  public getRecent(options?: { level?: LogLevel; subsystem?: Subsystem; limit?: number }): LogEntry[] {
    let list = [...this.memoryBuffer];
    if (options?.level) {
      list = list.filter(e => e.level === options.level);
    }
    if (options?.subsystem) {
      list = list.filter(e => e.subsystem === options.subsystem);
    }
    const limit = options?.limit || 100;
    return list.slice(-limit).reverse();
  }

  public clear() {
    this.memoryBuffer = [];
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '', 'utf-8');
      }
    } catch (e) {}
  }

  public onLog(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const logger = new Logger();
