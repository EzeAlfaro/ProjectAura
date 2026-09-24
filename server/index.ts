import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { stageManager } from './stageManager.js';
import { geminiService } from './geminiService.js';
import { TECH_GLOSSARY, registerCustomTerm } from './glossary.js';
import { SupportedLanguage } from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/* ========================================================
   REST API Endpoints
======================================================== */

// Health & System Status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'NerdSub',
    version: '1.0.0',
    geminiConfigured: geminiService.isConfigured(),
    stagesCount: stageManager.getStages().length,
    timestamp: Date.now()
  });
});

// Update or set GEMINI_API_KEY dynamically from Admin UI
app.post('/api/config/key', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  process.env.GEMINI_API_KEY = apiKey.trim();
  geminiService.reloadKey();

  res.json({
    success: true,
    geminiConfigured: geminiService.isConfigured(),
    message: 'API Key updated successfully'
  });
});

// Stages List
app.get('/api/stages', (req: Request, res: Response) => {
  res.json({ stages: stageManager.getStages() });
});

// Stage Details & Data
app.get('/api/stages/:id', (req: Request, res: Response) => {
  const data = stageManager.getStageData(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Stage not found' });
  }
  res.json(data);
});

// Create New Stage
app.post('/api/stages', (req: Request, res: Response) => {
  const newStage = stageManager.createStage(req.body);
  res.status(201).json({ stage: newStage });
});

// Start Demo on Stage
app.post('/api/stages/:id/demo/:talkId', (req: Request, res: Response) => {
  const { id, talkId } = req.params;
  stageManager.startDemo(id, talkId, true);
  res.json({ success: true, message: `Demo ${talkId} started on stage ${id}` });
});

// Stop Stage
app.post('/api/stages/:id/stop', (req: Request, res: Response) => {
  stageManager.stopStage(req.params.id);
  res.json({ success: true, message: `Stage ${req.params.id} stopped` });
});

// Trigger Gemini 2.5 Pro Deep Intel & Executive Summary
app.post('/api/stages/:id/deep-intel', async (req: Request, res: Response) => {
  try {
    const result = await stageManager.triggerDeepIntel(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error generating deep intel' });
  }
});

// Upload and Process Audio File Chunk
app.post('/api/stages/:id/audio', upload.single('audio'), async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  try {
    await stageManager.pushAudioChunk(id, req.file.buffer, req.file.mimetype || 'audio/webm');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Audio processing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Direct Live Text Transcript (from Browser Speech Recognition or real-time mic)
app.post('/api/stages/:id/live-text', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text, sourceLang } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    await stageManager.pushLiveTranscript(id, text, sourceLang || 'es');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Live text processing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete Last Chunk (Panic / Redaction Button)
app.delete('/api/stages/:id/chunks/last', (req: Request, res: Response) => {
  const success = stageManager.deleteLastChunk(req.params.id);
  res.json({ success });
});

// Emergency Blackout / Clear All Subtitles (EDM - Erase Displayed Memory)
app.post('/api/stages/:id/emergency-clear', (req: Request, res: Response) => {
  stageManager.emergencyClear(req.params.id);
  res.json({ success: true, message: `Emergency clear executed for ${req.params.id}` });
});

// Remote Stage Reload (Zero-RustDesk F5 trigger from Mesa Técnica)
app.post('/api/stages/:id/remote-reload', (req: Request, res: Response) => {
  stageManager.remoteReloadStage(req.params.id);
  res.json({ success: true, message: `Remote reload triggered for ${req.params.id}` });
});

// Export Transcripts
app.get('/api/stages/:id/export/:format', (req: Request, res: Response) => {
  const { id, format } = req.params;
  const lang = (req.query.lang as SupportedLanguage) || 'es';

  if (!['srt', 'vtt', 'txt', 'md'].includes(format)) {
    return res.status(400).json({ error: 'Unsupported format. Use srt, vtt, txt, or md' });
  }

  const content = stageManager.exportTranscript(id, format as any, lang);
  const mimeTypes: Record<string, string> = {
    srt: 'text/plain; charset=utf-8',
    vtt: 'text/vtt; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8'
  };

  res.setHeader('Content-Type', mimeTypes[format]);
  res.setHeader('Content-Disposition', `attachment; filename="nerdsub-${id}-${lang}.${format}"`);
  res.send(content);
});

// Technical Glossary Endpoints
app.get('/api/glossary', (req: Request, res: Response) => {
  res.json({ terms: Object.values(TECH_GLOSSARY) });
});

app.post('/api/glossary', (req: Request, res: Response) => {
  const { term, definition, category } = req.body;
  if (!term || !definition) {
    return res.status(400).json({ error: 'Term and definition are required' });
  }
  registerCustomTerm(term, definition, category || 'general');
  res.status(201).json({ success: true, term, definition });
});

/* ========================================================
   WebSocket Real-Time Broadcast Server
======================================================== */

wss.on('connection', (ws: WebSocket) => {
  let currentStageId: string | null = null;
  let currentLang: SupportedLanguage = 'original';

  ws.on('message', async (data: string | Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe': {
          currentStageId = message.stageId;
          currentLang = message.lang || 'original';
          stageManager.subscribe(ws, message.stageId, currentLang);
          break;
        }

        case 'set_lang': {
          currentLang = message.lang;
          if (currentStageId) {
            stageManager.subscribe(ws, currentStageId, currentLang);
          }
          break;
        }

        case 'audio_level': {
          if (message.stageId && typeof message.level === 'number') {
            stageManager.setAudioLevel(message.stageId, message.level);
          }
          break;
        }

        case 'audio_chunk': {
          // Real-time audio chunk sent from Operator microphone
          if (message.stageId && message.base64Audio) {
            const buffer = Buffer.from(message.base64Audio, 'base64');
            await stageManager.pushAudioChunk(message.stageId, buffer, message.mimeType || 'audio/webm');
          }
          break;
        }

        case 'live_transcript': {
          // Direct real-time speech recognition transcript from operator microphone
          if (message.stageId && message.text) {
            await stageManager.pushLiveTranscript(message.stageId, message.text, message.sourceLang || 'es');
          }
          break;
        }

        case 'delete_last_chunk': {
          if (message.stageId) {
            stageManager.deleteLastChunk(message.stageId);
          }
          break;
        }

        case 'emergency_clear': {
          if (message.stageId) {
            stageManager.emergencyClear(message.stageId);
          }
          break;
        }

        case 'remote_reload': {
          if (message.stageId) {
            stageManager.remoteReloadStage(message.stageId);
          }
          break;
        }
      }
    } catch (err) {
      console.error('[WebSocket] Error handling client message:', err);
    }
  });

  ws.on('close', () => {
    stageManager.unsubscribe(ws);
  });
});

/* ========================================================
   Production Static Serving & SPA Fallback
======================================================== */
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 NerdSub Core Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server live on ws://localhost:${PORT}/ws`);
  console.log(`✨ Gemini Engine: ${geminiService.isConfigured() ? 'Connected' : 'Simulation Fallback Mode'}`);
  console.log(`=======================================================`);
});
