import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { stageManager } from './stageManager.js';
import { geminiService } from './geminiService.js';
import { TECH_GLOSSARY, registerCustomTerm } from './glossary.js';
import { SupportedLanguage } from './types.js';
import { logger } from './logger.js';
import { scheduleManager } from './schedule.js';
import { qaManager } from './qaManager.js';
import { config } from './config.js';
import { SAMPLE_TALKS } from './sampleAudios.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: config.server.wsPath });

// Forward system warnings and errors in real-time to connected admin/telemetry clients
logger.onLog((entry) => {
  if (entry.level === 'warn' || entry.level === 'error') {
    stageManager.broadcast({
      type: 'system_log',
      entry
    });
  }
});

app.use(cors({ origin: config.server.corsOrigin }));
app.use(express.json({ limit: config.server.maxPayloadSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxPayloadSize }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.server.maxAudioUploadBytes }
});

/* ========================================================
   REST API Endpoints
======================================================== */

function syncEnvFile(keyToSet?: string, modelToSet?: string) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    if (keyToSet !== undefined) {
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${keyToSet}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${keyToSet}`;
      }
    }
    if (modelToSet !== undefined) {
      if (envContent.includes('GEMINI_MODEL=')) {
        envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${modelToSet}`);
      } else {
        envContent += `\nGEMINI_MODEL=${modelToSet}`;
      }
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    console.log('[Config] Synced key/model changes to .env file');
  } catch (err) {
    console.warn('[Config] Could not sync .env file:', err);
  }
}

function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('192.168.56.')) {
          return net.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

// Middleware: Operator Security (ADMIN_TOKEN)
// When ADMIN_TOKEN is set in environment, protected mutating endpoints require authorization.
// When left empty/unset, system runs in open demo mode.
const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const configuredToken = config.server.adminToken;
  if (!configuredToken) {
    return next(); // Open demo mode when ADMIN_TOKEN is empty
  }

  const providedToken =
    req.headers['x-admin-token'] ||
    req.query.key ||
    req.query.token ||
    req.body?.adminToken ||
    req.body?.token;

  if (providedToken === configuredToken) {
    return next();
  }

  return res.status(403).json({
    error: 'Acceso no autorizado. Se requiere token de operador técnico de cabina (ADMIN_TOKEN).',
    code: 'UNAUTHORIZED_OPERATOR'
  });
};

// Operator Token Verification
app.post('/api/auth/verify', (req: Request, res: Response) => {
  const configuredToken = config.server.adminToken;
  if (!configuredToken) {
    return res.json({ required: false, valid: true });
  }
  const providedToken =
    req.headers['x-admin-token'] ||
    req.query.key ||
    req.query.token ||
    req.body?.adminToken ||
    req.body?.token;
  res.json({
    required: true,
    valid: providedToken === configuredToken
  });
});

// Health & System Status (Supports both /api/status and /api/health)
app.get(['/api/status', '/api/health'], async (req: Request, res: Response) => {
  const gemmaAvailable = await geminiService.checkGemmaAvailability();
  res.json({
    status: 'online',
    appName: 'Project Aura',
    version: '1.0.0',
    networkIp: getLocalNetworkIp(),
    geminiConfigured: geminiService.isConfigured(),
    gemmaAvailable,
    activeEngine: geminiService.getActiveEngineName(),
    forcedEngine: geminiService.getForcedEngine(),
    keyPool: geminiService.getKeyPoolInfo(),
    activeKeyMasked: geminiService.getActiveKeyMasked(),
    stagesCount: stageManager.getStages().length,
    adminTokenRequired: !!config.server.adminToken,
    timestamp: Date.now()
  });
});

// Update or set GEMINI_API_KEY dynamically from Admin UI
app.post('/api/config/key', requireAdminAuth, (req: Request, res: Response) => {
  const { apiKey, modelName, disconnect } = req.body;

  if (disconnect || (typeof apiKey === 'string' && apiKey.trim() === '')) {
    geminiService.disconnectAll();
    syncEnvFile('');
    return res.json({
      success: true,
      geminiConfigured: false,
      activeEngine: geminiService.getActiveEngineName(),
      message: 'Desconectado de Google Gemini Cloud con éxito'
    });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  const cleanKey = apiKey.trim();
  if (modelName && typeof modelName === 'string') {
    process.env.GEMINI_MODEL = modelName.trim();
    console.log(`[Config] Active Gemini speech model set to: ${modelName.trim()}`);
  }
  geminiService.reloadKey(cleanKey);
  syncEnvFile(cleanKey, modelName?.trim());

  res.json({
    success: true,
    geminiConfigured: geminiService.isConfigured(),
    model: process.env.GEMINI_MODEL || config.ai.flashModel || 'gemini-3.5-flash',
    activeEngine: geminiService.getActiveEngineName(),
    keyPool: geminiService.getKeyPoolInfo(),
    message: 'API Key and model updated successfully'
  });
});

// Test Gemini Model Connection & Latency (Ping Verification)
app.post('/api/config/test-model', requireAdminAuth, async (req: Request, res: Response) => {
  const { apiKey, modelName } = req.body;
  const result = await geminiService.testModelConnection(apiKey, modelName || config.ai.flashModel || 'gemini-3.5-flash');
  res.json(result);
});

// Select / Force Engine Mode ('auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline')
app.post('/api/config/engine-mode', requireAdminAuth, (req: Request, res: Response) => {
  const { mode } = req.body;
  if (!mode || !['auto', 'gemini-cloud', 'gemma-local', 'native-offline'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid engine mode' });
  }

  geminiService.setForcedEngine(mode);
  res.json({
    success: true,
    forcedEngine: geminiService.getForcedEngine(),
    activeEngine: geminiService.getActiveEngineName()
  });
});

// Disconnect all API keys / Revert to Local Standalone
app.post('/api/config/disconnect', requireAdminAuth, (req: Request, res: Response) => {
  geminiService.disconnectAll();
  res.json({
    success: true,
    geminiConfigured: false,
    activeEngine: geminiService.getActiveEngineName(),
    message: 'Desconectado de Google Cloud. Operando en modo local.'
  });
});

// Add Key to Pool (Multi-key Queue)
app.post('/api/config/key-pool/add', requireAdminAuth, (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({ error: 'Valid API key is required' });
  }

  const item = geminiService.addKey(apiKey.trim());
  res.json({
    success: true,
    addedKey: item,
    keyPool: geminiService.getKeyPoolInfo(),
    geminiConfigured: geminiService.isConfigured()
  });
});

// Rotate to Next Available Key in Pool
app.post('/api/config/key-pool/rotate', requireAdminAuth, (req: Request, res: Response) => {
  const nextKey = geminiService.rotateKey();
  res.json({
    success: !!nextKey,
    activeKey: nextKey,
    keyPool: geminiService.getKeyPoolInfo(),
    geminiConfigured: geminiService.isConfigured()
  });
});

// Remove Key from Pool
app.delete('/api/config/key-pool/:id', requireAdminAuth, (req: Request, res: Response) => {
  const removed = geminiService.removeKey(req.params.id);
  res.json({
    success: removed,
    keyPool: geminiService.getKeyPoolInfo(),
    geminiConfigured: geminiService.isConfigured()
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
app.post('/api/stages', requireAdminAuth, (req: Request, res: Response) => {
  const newStage = stageManager.createStage(req.body);
  res.status(201).json({ stage: newStage });
});

// Delete Stage
app.delete('/api/stages/:id', requireAdminAuth, (req: Request, res: Response) => {
  const success = stageManager.deleteStage(req.params.id);
  if (!success) {
    return res.status(400).json({ error: 'No se puede eliminar la sala (debe quedar al menos una o no existe).' });
  }
  res.json({ success: true, message: `Sala ${req.params.id} eliminada con éxito` });
});

// Get Available Sample & YouTube Demo Talks
app.get('/api/sample-talks', (_req: Request, res: Response) => {
  const talks = Object.values(SAMPLE_TALKS).map(({ chunks, ...rest }) => ({
    ...rest,
    chunkCount: chunks.length
  }));
  res.json({ talks });
});

// Start Demo on Stage
app.post('/api/stages/:id/demo/:talkId', requireAdminAuth, (req: Request, res: Response) => {
  const { id, talkId } = req.params;
  stageManager.startDemo(id, talkId, true);
  res.json({ success: true, message: `Demo ${talkId} started on stage ${id}` });
});

// Stop Stage
app.post('/api/stages/:id/stop', requireAdminAuth, (req: Request, res: Response) => {
  stageManager.stopStage(req.params.id);
  res.json({ success: true, message: `Stage ${req.params.id} stopped` });
});

// Pin / Persist Audio Input Route to Specific Stage
app.post('/api/stages/:id/audio-route', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { deviceId, deviceLabel, sourceKind } = req.body;
  if (typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required and must be a string' });
  }

  const validSourceKinds = ['mic', 'file', 'demo', 'stream', 'idle'];
  const validatedSourceKind = sourceKind && validSourceKinds.includes(sourceKind)
    ? (sourceKind as any)
    : undefined;

  const stage = stageManager.setStageAudioRoute(
    id,
    deviceId,
    deviceLabel || 'Dispositivo de Audio',
    validatedSourceKind
  );
  res.json({ success: true, stage });
});

// Trigger Gemini 2.5 Pro Deep Intel & Executive Summary
app.post('/api/stages/:id/deep-intel', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await stageManager.triggerDeepIntel(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error generating deep intel' });
  }
});

// Upload and Process Audio File Chunk
app.post('/api/stages/:id/audio', requireAdminAuth, upload.single('audio'), async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  try {
    const chunk = await stageManager.pushAudioChunk(id, req.file.buffer, req.file.mimetype || 'audio/webm');
    const lastErr = geminiService.getLastError();
    if ((!chunk || !chunk.originalText) && lastErr && Date.now() - lastErr.timestamp < 10000) {
      return res.status(lastErr.code === 'API_KEY_SERVICE_BLOCKED' ? 403 : 400).json({
        success: false,
        error: lastErr.message,
        code: lastErr.code
      });
    }
    res.json({ success: true, text: chunk?.originalText || '' });
  } catch (error: any) {
    logger.error('audio', `Audio processing error for stage ${id}`, { error: error?.message });
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Telemetry & Diagnostic Logs
app.get('/api/logs', (req: Request, res: Response) => {
  const level = req.query.level as any;
  const subsystem = req.query.subsystem as any;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const logs = logger.getRecent({ level, subsystem, limit });
  res.json({ logs });
});

app.delete('/api/logs', requireAdminAuth, (_req: Request, res: Response) => {
  logger.clear();
  res.json({ success: true });
});

// Direct Live Text Transcript (from Browser Speech Recognition or real-time mic)
app.post('/api/stages/:id/live-text', requireAdminAuth, async (req: Request, res: Response) => {
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
app.delete('/api/stages/:id/chunks/last', requireAdminAuth, (req: Request, res: Response) => {
  const success = stageManager.deleteLastChunk(req.params.id);
  res.json({ success });
});

// Emergency Blackout / Clear All Subtitles (EDM - Erase Displayed Memory)
app.post('/api/stages/:id/emergency-clear', requireAdminAuth, (req: Request, res: Response) => {
  stageManager.emergencyClear(req.params.id);
  res.json({ success: true, message: `Emergency clear executed for ${req.params.id}` });
});

// Remote Stage Reload (Zero-RustDesk F5 trigger from Mesa Técnica)
app.post('/api/stages/:id/remote-reload', requireAdminAuth, (req: Request, res: Response) => {
  stageManager.remoteReloadStage(req.params.id);
  res.json({ success: true, message: `Remote reload triggered for ${req.params.id}` });
});

// Plaintext Live Subtitle Output (Direct polling for vMix Title / CasparCG / OBS Text GDI+)
app.get('/api/stages/:id/live.txt', (req: Request, res: Response) => {
  const { id } = req.params;
  const lang = (req.query.lang as SupportedLanguage) || 'es';
  const stageData = stageManager.getStageData(id);
  if (!stageData) {
    return res.status(404).send('');
  }
  const recent = stageData.chunks.slice(-2);
  if (recent.length === 0) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send('');
  }

  const lines = recent.map((c) => {
    if (lang === 'en') return c.enText || c.originalText;
    if (lang === 'pt') return c.ptText || c.originalText;
    if (lang === 'original') return c.originalText;
    return c.esText || c.originalText;
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(lines.join('\n'));
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

app.post('/api/glossary', requireAdminAuth, (req: Request, res: Response) => {
  const { term, definition, category } = req.body;
  if (!term || !definition) {
    return res.status(400).json({ error: 'Term and definition are required' });
  }
  registerCustomTerm(term, definition, category || 'general');
  res.status(201).json({ success: true, term, definition });
});

/* ========================================================
   Schedule / Agenda Endpoints
======================================================== */

app.get('/api/schedule', (_req: Request, res: Response) => {
  res.json({ talks: scheduleManager.getAll() });
});

app.get('/api/schedule/:stageId', (req: Request, res: Response) => {
  res.json({ talks: scheduleManager.getByStage(req.params.stageId) });
});

app.get('/api/schedule/:stageId/current', (req: Request, res: Response) => {
  const current = scheduleManager.getCurrentAndNext(req.params.stageId);
  res.json(current);
});

app.post('/api/schedule/:stageId/sync/:talkId', requireAdminAuth, (req: Request, res: Response) => {
  const { stageId, talkId } = req.params;
  const talk = scheduleManager.getById(talkId);
  if (!talk) {
    return res.status(404).json({ error: 'Talk not found in schedule' });
  }
  const stage = stageManager.getStage(stageId);
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' });
  }

  stage.talkTitle = talk.title;
  stage.speaker = `${talk.speaker} (${talk.speakerCompany || talk.speakerRole})`;
  stage.description = talk.description;

  stageManager.broadcastSystemUpdate();
  logger.info('stage', `Synced stage ${stageId} with schedule talk: ${talk.title}`);
  res.json({ success: true, stage, talk });
});

/* ========================================================
   Audience Q&A & On-Stage Moderation Endpoints
======================================================== */

app.get('/api/stages/:id/questions', (req: Request, res: Response) => {
  const questions = qaManager.getByStage(req.params.id);
  const onStage = qaManager.getOnStage(req.params.id);
  res.json({ questions, onStage });
});

app.post('/api/stages/:id/questions', (req: Request, res: Response) => {
  const { id } = req.params;
  const { author, text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required' });
  }
  const q = qaManager.addQuestion(id, author || 'Asistente', text);
  stageManager.broadcastToStage(id, {
    type: 'qa_update',
    stageId: id,
    question: q,
    action: 'add'
  });
  logger.info('api', `New audience question for ${id}: "${text.substring(0, 40)}..." by ${author}`);
  res.status(201).json({ question: q });
});

app.post('/api/stages/:id/questions/:questionId/vote', (req: Request, res: Response) => {
  const { id, questionId } = req.params;
  const q = qaManager.upvote(questionId);
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  stageManager.broadcastToStage(id, {
    type: 'qa_update',
    stageId: id,
    question: q,
    action: 'vote'
  });
  res.json({ question: q });
});

app.post('/api/stages/:id/questions/:questionId/status', requireAdminAuth, (req: Request, res: Response) => {
  const { id, questionId } = req.params;
  const { status } = req.body;
  if (!['pending', 'approved', 'on_stage', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const q = qaManager.updateStatus(questionId, status);
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  stageManager.broadcastToStage(id, {
    type: 'qa_update',
    stageId: id,
    question: q,
    action: 'status'
  });
  logger.info('stage', `Question ${questionId} updated to status '${status}' on stage ${id}`);
  res.json({ question: q });
});

// Clear all questions for a stage (Operator Panic/Reset)
app.delete('/api/stages/:id/questions', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  qaManager.clearStageQuestions(id);
  stageManager.broadcastToStage(id, {
    type: 'qa_cleared',
    stageId: id
  });
  res.json({ success: true, message: `Preguntas de la sala ${id} eliminadas con éxito` });
});

// Seed demo questions for a stage (Operator Demo Request)
app.post('/api/stages/:id/questions/seed', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  qaManager.seedQuestionsForStage(id);
  res.json({ success: true, message: `Preguntas demo cargadas para la sala ${id}` });
});

/* ========================================================
   WebSocket Real-Time Broadcast Server
======================================================== */

function isAuthorizedAdmin(providedToken?: string | null): boolean {
  const configuredToken = config.server.adminToken;
  if (!configuredToken) return true;
  return !!providedToken && providedToken === configuredToken;
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  let currentStageId: string | null = null;
  let currentLang: SupportedLanguage = 'original';

  // Parse connection URL query for token/key
  let connectionToken = '';
  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    connectionToken = urlObj.searchParams.get('token') || urlObj.searchParams.get('key') || (req.headers['x-admin-token'] as string) || '';
  } catch (e) {}

  ws.on('message', async (data: string | Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      const messageToken = message.adminToken || message.token || connectionToken;

      const requireAuth = (): boolean => {
        if (!isAuthorizedAdmin(messageToken)) {
          ws.send(JSON.stringify({
            type: 'system_alert',
            alertType: 'error',
            message: 'Acceso denegado: Token de operador requerido para acciones técnicas (ADMIN_TOKEN).'
          }));
          return false;
        }
        return true;
      };

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

        case 'set_audio_route': {
          if (!requireAuth()) return;
          if (message.stageId && typeof message.deviceId === 'string') {
            const validSourceKinds = ['mic', 'file', 'demo', 'stream', 'idle'];
            const validatedSourceKind = message.sourceKind && validSourceKinds.includes(message.sourceKind)
              ? message.sourceKind
              : undefined;
            stageManager.setStageAudioRoute(
              message.stageId,
              message.deviceId,
              message.deviceLabel || 'Dispositivo de Audio',
              validatedSourceKind
            );
          }
          break;
        }

        case 'audio_chunk': {
          if (!requireAuth()) return;
          // Real-time audio chunk sent from Operator microphone
          if (message.stageId && message.base64Audio) {
            const buffer = Buffer.from(message.base64Audio, 'base64');
            await stageManager.pushAudioChunk(message.stageId, buffer, message.mimeType || 'audio/webm');
          }
          break;
        }

        case 'pcm_audio_chunk': {
          if (!requireAuth()) return;
          // High-precision raw 16kHz Int16 Linear PCM from AudioWorklet
          if (message.stageId && message.pcmBase64) {
            const buffer = Buffer.from(message.pcmBase64, 'base64');
            await stageManager.pushPcmChunk(message.stageId, buffer);
          }
          break;
        }

        case 'live_transcript': {
          if (!requireAuth()) return;
          // Direct real-time speech recognition transcript from operator microphone
          if (message.stageId && message.text) {
            await stageManager.pushLiveTranscript(message.stageId, message.text, message.sourceLang || 'es');
          }
          break;
        }

        case 'delete_last_chunk': {
          if (!requireAuth()) return;
          if (message.stageId) {
            stageManager.deleteLastChunk(message.stageId);
          }
          break;
        }

        case 'emergency_clear': {
          if (!requireAuth()) return;
          if (message.stageId) {
            stageManager.emergencyClear(message.stageId);
          }
          break;
        }

        case 'remote_reload': {
          if (!requireAuth()) return;
          if (message.stageId) {
            stageManager.remoteReloadStage(message.stageId);
          }
          break;
        }

        case 'qa_submit': {
          if (message.stageId && message.text) {
            const q = qaManager.addQuestion(message.stageId, message.author || 'Asistente', message.text);
            stageManager.broadcastToStage(message.stageId, {
              type: 'qa_update',
              stageId: message.stageId,
              question: q,
              action: 'add'
            });
          }
          break;
        }

        case 'qa_vote': {
          if (message.stageId && message.questionId) {
            const q = qaManager.upvote(message.questionId);
            if (q) {
              stageManager.broadcastToStage(message.stageId, {
                type: 'qa_update',
                stageId: message.stageId,
                question: q,
                action: 'vote'
              });
            }
          }
          break;
        }

        case 'qa_status': {
          if (!requireAuth()) return;
          if (message.stageId && message.questionId && message.status) {
            const q = qaManager.updateStatus(message.questionId, message.status);
            if (q) {
              stageManager.broadcastToStage(message.stageId, {
                type: 'qa_update',
                stageId: message.stageId,
                question: q,
                action: 'status'
              });
            }
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

const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, () => {
  const localIp = getLocalNetworkIp();
  console.log(`=======================================================`);
  console.log(`🚀 Project Aura Core Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  if (localIp !== 'localhost') {
    console.log(`   - Network: http://${localIp}:${PORT}`);
  }
  console.log(`📡 WebSocket server live on path: ${config.server.wsPath}`);
  console.log(`✨ Gemini Engine: ${geminiService.isConfigured() ? 'Connected' : 'Simulation Fallback Mode'}`);
  console.log(`=======================================================`);
});
