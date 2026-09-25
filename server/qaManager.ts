import { AudienceQuestion } from './types.js';

export class QAManager {
  private questions: Map<string, AudienceQuestion> = new Map();

  constructor() {
    this.seedDefaultQuestions();
  }

  private seedDefaultQuestions() {
    const seed: AudienceQuestion[] = [
      {
        id: 'qa-1',
        stageId: 'stage-1',
        author: 'Nico @ Mercado Libre',
        text: '¿Cómo resolvieron el rebalanceo de particiones en Kafka cuando tienen picos de 5x tráfico sin frenar el flujo de eventos?',
        timestamp: Date.now() - 15 * 60 * 1000,
        votes: 18,
        status: 'approved'
      },
      {
        id: 'qa-2',
        stageId: 'stage-1',
        author: 'Flor @ Sysarmy',
        text: 'Para eBPF: ¿tuvieron que actualizar la versión del kernel de Linux en todos los nodos de producción o usaron CO-RE (Compile Once - Run Everywhere)?',
        timestamp: Date.now() - 8 * 60 * 1000,
        votes: 24,
        status: 'on_stage'
      },
      {
        id: 'qa-3',
        stageId: 'stage-1',
        author: 'Matías B.',
        text: '¿Qué latencia extra añade la validación de TLS post-cuántica en microservicios internos?',
        timestamp: Date.now() - 3 * 60 * 1000,
        votes: 7,
        status: 'pending'
      },
      {
        id: 'qa-4',
        stageId: 'stage-2',
        author: 'Ana SRE',
        text: '¿Cómo garantizan que Patroni no tenga split-brain si se cae un switch de red en el datacenter?',
        timestamp: Date.now() - 12 * 60 * 1000,
        votes: 15,
        status: 'approved'
      },
      {
        id: 'qa-5',
        stageId: 'stage-3',
        author: 'Lucas AI Dev',
        text: '¿Recomiendan cuantización Q4_K_M o Q8_0 para mantener precisión técnica en Spanglish?',
        timestamp: Date.now() - 10 * 60 * 1000,
        votes: 19,
        status: 'on_stage'
      }
    ];

    for (const q of seed) {
      this.questions.set(q.id, q);
    }
  }

  public getByStage(stageId: string): AudienceQuestion[] {
    return Array.from(this.questions.values())
      .filter(q => q.stageId === stageId && q.status !== 'dismissed')
      .sort((a, b) => b.votes - a.votes || b.timestamp - a.timestamp);
  }

  public getAll(): AudienceQuestion[] {
    return Array.from(this.questions.values());
  }

  public getOnStage(stageId: string): AudienceQuestion | undefined {
    return Array.from(this.questions.values())
      .find(q => q.stageId === stageId && q.status === 'on_stage');
  }

  public addQuestion(stageId: string, author: string, text: string): AudienceQuestion {
    const cleanText = text.trim();
    const cleanAuthor = (author || 'Asistente Anónimo').trim();
    const q: AudienceQuestion = {
      id: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stageId,
      author: cleanAuthor,
      text: cleanText,
      timestamp: Date.now(),
      votes: 1,
      status: 'approved' // auto-approve in conference mode, moderator can dismiss or pin on_stage
    };

    this.questions.set(q.id, q);
    return q;
  }

  public upvote(id: string): AudienceQuestion | null {
    const q = this.questions.get(id);
    if (!q) return null;
    q.votes += 1;
    return q;
  }

  public updateStatus(id: string, status: AudienceQuestion['status']): AudienceQuestion | null {
    const q = this.questions.get(id);
    if (!q) return null;

    // If setting to on_stage, unpin any other pinned question for this stage
    if (status === 'on_stage') {
      for (const other of this.questions.values()) {
        if (other.stageId === q.stageId && other.id !== q.id && other.status === 'on_stage') {
          other.status = 'approved';
        }
      }
    }

    q.status = status;
    return q;
  }

  public deleteQuestion(id: string): boolean {
    return this.questions.delete(id);
  }
}

export const qaManager = new QAManager();
