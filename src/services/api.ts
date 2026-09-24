import { Stage, StageData, TechTerm, SupportedLanguage } from '../types.js';

const API_BASE = '/api';

export async function fetchStatus(): Promise<{
  status: string;
  appName: string;
  version: string;
  geminiConfigured: boolean;
  stagesCount: number;
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

export async function updateApiKey(apiKey: string): Promise<{ success: boolean; geminiConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/config/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function triggerDemo(stageId: string, talkId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/demo/${talkId}`, {
    method: 'POST',
  });
  return res.json();
}

export async function stopStage(stageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/stages/${stageId}/stop`, {
    method: 'POST',
  });
  return res.json();
}

export async function uploadAudioChunk(stageId: string, audioBlob: Blob): Promise<any> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'mic-chunk.webm');
  const res = await fetch(`${API_BASE}/stages/${stageId}/audio`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function fetchGlossary(): Promise<TechTerm[]> {
  const res = await fetch(`${API_BASE}/glossary`);
  const data = await res.json();
  return data.terms || [];
}

export async function addGlossaryTerm(term: string, definition: string, category: string = 'general'): Promise<any> {
  const res = await fetch(`${API_BASE}/glossary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, definition, category }),
  });
  return res.json();
}

export function getExportUrl(stageId: string, format: 'srt' | 'vtt' | 'txt' | 'md', lang: SupportedLanguage): string {
  return `${API_BASE}/stages/${stageId}/export/${format}?lang=${lang}`;
}
