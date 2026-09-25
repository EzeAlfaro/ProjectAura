import { Stage, StageData, TechTerm, SupportedLanguage, AudienceQuestion, StageAudioRouting, StageAudioRoutingMap } from '../types.js';

export const STAGE_AUDIO_ROUTING_KEY = 'aura_stage_audio_routing';

export function getStageAudioRouting(): StageAudioRoutingMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STAGE_AUDIO_ROUTING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[AudioRouting] Error reading stage audio routing from localStorage:', e);
    return {};
  }
}

export function saveStageAudioRouting(routing: StageAudioRoutingMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STAGE_AUDIO_ROUTING_KEY, JSON.stringify(routing));
  } catch (e) {
    console.warn('[AudioRouting] Error saving stage audio routing to localStorage:', e);
  }
}

export function setStageAudioRouting(stageId: string, config: StageAudioRouting): StageAudioRoutingMap {
  const current = getStageAudioRouting();
  const updated: StageAudioRoutingMap = {
    ...current,
    [stageId]: config,
  };
  saveStageAudioRouting(updated);
  return updated;
}

const API_BASE = '/api';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = searchParams.get('key') || searchParams.get('token');
  if (tokenFromUrl) {
    localStorage.setItem('nerdsub_admin_token', tokenFromUrl);
    localStorage.setItem('aura_admin_token', tokenFromUrl);
    return tokenFromUrl;
  }
  return localStorage.getItem('nerdsub_admin_token') || localStorage.getItem('aura_admin_token') || '';
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem('nerdsub_admin_token');
    localStorage.removeItem('aura_admin_token');
  } else {
    localStorage.setItem('nerdsub_admin_token', token);
    localStorage.setItem('aura_admin_token', token);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { 'x-admin-token': token } : {};
}

export async function fetchStatus(): Promise<{
  status: string;
  appName: string;
  version: string;
  geminiConfigured: boolean;
  gemmaAvailable?: boolean;
  activeEngine?: 'gemini-cloud' | 'gemma-local' | 'native-offline';
  forcedEngine?: 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline';
  keyPool?: any[];
  activeKeyMasked?: string;
  stagesCount: number;
  adminTokenRequired?: boolean;
}> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function fetchStages(): Promise<Stage[]> {
  const res = await fetch(`${API_BASE}/stages`);
  const data = await res.json();
  return data.stages || [];
}

export async function fetchStageData(stageId: string): Promise<StageData> {
  const res = await fetch(`${API_BASE}/stages/${stageId}`);
  return res.json();
}

export async function createStageApi(stageData: Partial<Stage>): Promise<{ stage: Stage }> {
  const res = await fetch(`${API_BASE}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(stageData),
  });
  return res.json();
}

export async function deleteStageApi(stageId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/stages/${stageId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function setStageAudioRouteApi(
  stageId: string,
  deviceId: string,
  deviceLabel: string,
  sourceKind?: string
): Promise<{ success: boolean; stage?: Stage; error?: string }> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/audio-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ deviceId, deviceLabel, sourceKind }),
  });
  return res.json();
}

export async function updateApiKey(apiKey: string, modelName?: string): Promise<{ success: boolean; geminiConfigured: boolean; model?: string; activeEngine?: string; keyPool?: any[] }> {
  const res = await fetch(`${API_BASE}/config/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ apiKey, modelName }),
  });
  return res.json();
}

export async function setEngineModeApi(mode: 'auto' | 'gemini-cloud' | 'gemma-local' | 'native-offline'): Promise<{ success: boolean; forcedEngine: string; activeEngine: string }> {
  const res = await fetch(`${API_BASE}/config/engine-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

export async function disconnectApi(): Promise<{ success: boolean; geminiConfigured: boolean; activeEngine: string; message: string }> {
  const res = await fetch(`${API_BASE}/config/disconnect`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function addKeyToPoolApi(apiKey: string): Promise<{ success: boolean; addedKey: any; keyPool: any[]; geminiConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/config/key-pool/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function rotateApiKeyApi(): Promise<{ success: boolean; activeKey?: any; keyPool: any[]; geminiConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/config/key-pool/rotate`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function removeKeyFromPoolApi(id: string): Promise<{ success: boolean; keyPool: any[]; geminiConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/config/key-pool/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function testModelApi(apiKey?: string, modelName?: string): Promise<{ success: boolean; model: string; message: string; latencyMs: number }> {
  const res = await fetch(`${API_BASE}/config/test-model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ apiKey, modelName }),
  });
  return res.json();
}

export async function triggerDemo(stageId: string, talkId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/demo/${talkId}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function stopStage(stageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/stop`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function uploadAudioChunk(stageId: string, audioBlob: Blob): Promise<any> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'mic-chunk.webm');
  const res = await fetch(`${API_BASE}/stages/${stageId}/audio`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Error al procesar audio en servidor`);
  }
  return res.json();
}

export async function sendLiveTranscriptApi(stageId: string, text: string, sourceLang: string = 'es'): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/live-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ text, sourceLang })
  });
  return res.json();
}

export async function deleteLastChunkApi(stageId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/chunks/last`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function emergencyClearApi(stageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/emergency-clear`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function remoteReloadStageApi(stageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/remote-reload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function updateQuestionStatusApi(stageId: string, questionId: string, status: AudienceQuestion['status']): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/questions/${questionId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function fetchLogsApi(level?: string, limit?: number): Promise<{ logs: any[] }> {
  const params = new URLSearchParams();
  if (level) params.append('level', level);
  if (limit) params.append('limit', String(limit));
  const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
  return res.json();
}

export async function clearLogsApi(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function fetchGlossary(): Promise<TechTerm[]> {
  const res = await fetch(`${API_BASE}/glossary`);
  const data = await res.json();
  return data.terms || [];
}

export async function addGlossaryTerm(
  termOrObj: string | { term: string; definition: string; category?: string },
  def?: string,
  cat: string = 'general'
): Promise<any> {
  let term: string;
  let definition: string;
  let category: string;

  if (typeof termOrObj === 'object') {
    term = termOrObj.term;
    definition = termOrObj.definition;
    category = termOrObj.category || 'general';
  } else {
    term = termOrObj;
    definition = def || '';
    category = cat;
  }

  const res = await fetch(`${API_BASE}/glossary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ term, definition, category }),
  });
  return res.json();
}

export function getExportUrl(stageId: string, format: 'srt' | 'vtt' | 'txt' | 'md', lang: SupportedLanguage): string {
  return `${API_BASE}/stages/${stageId}/export/${format}?lang=${lang}`;
}

export async function triggerDeepIntel(stageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/deep-intel`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function clearStageQuestionsApi(stageId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/questions`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function seedStageQuestionsApi(stageId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/questions/seed`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}
