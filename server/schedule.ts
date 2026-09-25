import { EventTalk } from './types.js';

export const NERDEARLA_2026_SCHEDULE: EventTalk[] = [
  // ==========================================
  // STAGE 1: ESCENARIO PRINCIPAL
  // ==========================================
  {
    id: 'talk-p1',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: 570,
    endMinutes: 615,
    speaker: 'Ariel Jolo & Eduardo Casarero',
    speakerRole: 'Founders & Community Leads',
    speakerCompany: 'Sysarmy & Nerdearla',
    title: 'Keynote de Apertura: El Futuro del Open Source y la Inteligencia Artificial',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'es',
    level: 'Introductorio',
    description: 'Bienvenida oficial a Nerdearla 2026 en el Konex. Recorrido por el crecimiento de la comunidad, novedades de accesibilidad, hackathons y la agenda imperdible de los 3 días.',
    tags: ['Community', 'OpenSource', 'Keynote', 'Sysarmy']
  },
  {
    id: 'talk-p2',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '10:30',
    endTime: '11:15',
    startMinutes: 630,
    endMinutes: 675,
    speaker: 'Dr. Santiago Morales',
    speakerRole: 'Staff AI Solutions Architect',
    speakerCompany: 'Google Cloud',
    title: 'Building Resilient Multi-Agent AI Architectures with Gemini 3.5 & Live Audio',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'en',
    level: 'Avanzado',
    description: 'Cómo orquestar agentes autónomos con baja latencia utilizando Gemini 3.5 Flash y la Live API WebSocket bidireccional para flujos de audio y traducción de misión crítica.',
    tags: ['Gemini', 'MultiAgent', 'LiveAPI', 'AudioStreaming']
  },
  {
    id: 'talk-p3',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '11:30',
    endTime: '12:15',
    startMinutes: 690,
    endMinutes: 735,
    speaker: 'Martín Fierro',
    speakerRole: 'Principal Systems Architect',
    speakerCompany: 'Mercado Libre',
    title: 'Distributed Systems at Hyper-Scale: Lecciones tras 100 Millones de Requests Diarios',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'es',
    level: 'Avanzado',
    description: 'Arquitecturas basadas en eventos, tolerancia a particiones de red, patrones de degradación elegante y lecciones aprendidas durante picos de Hot Sale y CyberMonday.',
    tags: ['DistributedSystems', 'HighAvailability', 'Kafka', 'Scale']
  },
  {
    id: 'talk-p4',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '14:00',
    endTime: '14:45',
    startMinutes: 840,
    endMinutes: 885,
    speaker: 'Liz Rice',
    speakerRole: 'Chief Open Source Officer',
    speakerCompany: 'Isovalent / Cisco',
    title: 'eBPF in Production: Deep Observability and High-Performance Networking',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'en',
    level: 'Avanzado',
    description: 'A deep dive into how the Linux kernel eBPF subsystem replaces traditional iptables, provides zero-overhead observability, and secures cloud-native workloads without sidecars.',
    tags: ['eBPF', 'LinuxKernel', 'Cilium', 'Networking']
  },
  {
    id: 'talk-p5',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '15:00',
    endTime: '15:45',
    startMinutes: 900,
    endMinutes: 945,
    speaker: 'Nadia Heninger',
    speakerRole: 'Associate Professor of Cryptography',
    speakerCompany: 'UCSD & Electronic Frontier Foundation',
    title: 'Post-Quantum Cryptography in Practice: How to Prepare Your Systems Today',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'en',
    level: 'Intermedio',
    description: 'An overview of NIST standardized post-quantum algorithms (ML-KEM, ML-DSA) and the engineering challenges of upgrading TLS, SSH, and VPN connections before Q-Day.',
    tags: ['Security', 'Cryptography', 'Quantum', 'TLS']
  },
  {
    id: 'talk-p6',
    stageId: 'stage-1',
    stageName: 'Escenario Principal',
    startTime: '16:30',
    endTime: '17:15',
    startMinutes: 990,
    endMinutes: 1035,
    speaker: 'Sysarmy Core Team',
    speakerRole: 'Organizadores de Nerdearla',
    speakerCompany: 'Sysarmy',
    title: 'Keynote de Cierre: Premiación del Vibeathon y el Espíritu de la Comunidad',
    track: 'Keynotes & Arquitectura (EN / ES)',
    language: 'es',
    level: 'Introductorio',
    description: 'Entrega de premios del Vibeathon 2026, anuncios para Nerdearla México, sorteos clásicos de remeras y stickers, y el agradecimiento final a los voluntarios.',
    tags: ['Vibeathon', 'Awards', 'Sysarmy', 'Closing']
  },

  // ==========================================
  // STAGE 2: ESCENARIO CLOUD & DEVOPS
  // ==========================================
  {
    id: 'talk-c1',
    stageId: 'stage-2',
    stageName: 'Escenario Cloud & DevOps',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: 570,
    endMinutes: 615,
    speaker: 'Valeria Gómez',
    speakerRole: 'Principal SRE',
    speakerCompany: 'CloudNative Latam',
    title: 'Zero-Downtime Database Migrations on Kubernetes con PostgreSQL y Patroni',
    track: 'Sysarmy Track (ES)',
    language: 'es',
    level: 'Avanzado',
    description: 'Estrategias de failover automático, réplica en streaming, pg_repack y transiciones de esquema sin bloqueo de tablas en clusters productivos de alto tráfico.',
    tags: ['Kubernetes', 'PostgreSQL', 'SRE', 'Patroni']
  },
  {
    id: 'talk-c2',
    stageId: 'stage-2',
    stageName: 'Escenario Cloud & DevOps',
    startTime: '10:30',
    endTime: '11:15',
    startMinutes: 630,
    endMinutes: 675,
    speaker: 'Gonzalo Ruiz',
    speakerRole: 'Chaos Engineering Lead',
    speakerCompany: 'Chaos Labs',
    title: 'Chaos Engineering: Rompiendo Producción a Propósito para Dormir Mejor',
    track: 'Sysarmy Track (ES)',
    language: 'es',
    level: 'Intermedio',
    description: 'Cómo implementar GameDays, inyección de latencia en redes y caída simulada de zonas de disponibilidad en AWS y GCP para validar alertas y SLIs/SLOs.',
    tags: ['ChaosEngineering', 'Resilience', 'AWS', 'GCP']
  },
  {
    id: 'talk-c3',
    stageId: 'stage-2',
    stageName: 'Escenario Cloud & DevOps',
    startTime: '11:30',
    endTime: '12:15',
    startMinutes: 690,
    endMinutes: 735,
    speaker: 'Lucía Fernández',
    speakerRole: 'Staff Platform Engineer',
    speakerCompany: 'Thoughtworks',
    title: 'Platform Engineering: De Tickets de Jira a Portales de Autoservicio con Backstage',
    track: 'Sysarmy Track (ES)',
    language: 'es',
    level: 'Intermedio',
    description: 'Diseño de Developer Portals con Spotify Backstage, plantillas doradas de microservicios y reducción del Cognitive Load para más de 300 desarrolladores.',
    tags: ['Backstage', 'PlatformEngineering', 'DevEx', 'SelfService']
  },
  {
    id: 'talk-c4',
    stageId: 'stage-2',
    stageName: 'Escenario Cloud & DevOps',
    startTime: '14:00',
    endTime: '14:45',
    startMinutes: 840,
    endMinutes: 885,
    speaker: 'Diego Pérez',
    speakerRole: 'Infrastructure Engineer',
    speakerCompany: 'OpenTofu Community',
    title: 'Terraform vs OpenTofu: El Estado del Arte de Infraestructura como Código en 2026',
    track: 'Sysarmy Track (ES)',
    language: 'es',
    level: 'Intermedio',
    description: 'Comparativa de migración, licencias open source, soporte de state encryption nativo, proveedores desacoplados y buenas prácticas de CI/CD para IaC.',
    tags: ['Terraform', 'OpenTofu', 'IaC', 'DevOps']
  },
  {
    id: 'talk-c5',
    stageId: 'stage-2',
    stageName: 'Escenario Cloud & DevOps',
    startTime: '15:00',
    endTime: '15:45',
    startMinutes: 900,
    endMinutes: 945,
    speaker: 'Camila Benítez',
    speakerRole: 'Security Architect',
    speakerCompany: 'Red Hat',
    title: 'Securing the Software Supply Chain con Sigstore, Cosign y SLSA Nivel 4',
    track: 'Sysarmy Track (ES)',
    language: 'es',
    level: 'Avanzado',
    description: 'Firma criptográfica de imágenes de contenedores, atestaciones de procedencia en GitHub Actions y políticas de admisión con Kyverno en Kubernetes.',
    tags: ['Security', 'SupplyChain', 'Sigstore', 'Cosign']
  },

  // ==========================================
  // STAGE 3: ESCENARIO DATA & AI
  // ==========================================
  {
    id: 'talk-d1',
    stageId: 'stage-3',
    stageName: 'Escenario Data & AI',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: 570,
    endMinutes: 615,
    speaker: 'Federico Balbi',
    speakerRole: 'AI Research Scientist',
    speakerCompany: 'Latam AI Research Lab',
    title: 'Modelos Locales con Ollama & Gemma 2B: Privacidad Total en Edge y Laptops',
    track: 'Machine Learning & LLMs',
    language: 'es',
    level: 'Intermedio',
    description: 'Cómo correr inferencia local cuantizada con Ollama, WebAssembly y WebGPU en dispositivos sin conexión a internet manteniendo alta fidelidad semántica.',
    tags: ['Gemma', 'Ollama', 'LocalAI', 'EdgeComputing']
  },
  {
    id: 'talk-d2',
    stageId: 'stage-3',
    stageName: 'Escenario Data & AI',
    startTime: '10:30',
    endTime: '11:15',
    startMinutes: 630,
    endMinutes: 675,
    speaker: 'Sofía Martínez',
    speakerRole: 'Lead Data Scientist',
    speakerCompany: 'Databricks',
    title: 'RAG en Producción: Vector Databases, HNSW Indexes y GraphRAG',
    track: 'Machine Learning & LLMs',
    language: 'es',
    level: 'Avanzado',
    description: 'Optimización de recuperación aumentada por generación: chunking jerárquico, rerankers con cross-encoders, reducción de alucinaciones y grafos de conocimiento.',
    tags: ['RAG', 'VectorDB', 'GraphRAG', 'Embeddings']
  },
  {
    id: 'talk-d3',
    stageId: 'stage-3',
    stageName: 'Escenario Data & AI',
    startTime: '11:30',
    endTime: '12:15',
    startMinutes: 690,
    endMinutes: 735,
    speaker: 'Matías Cabrera',
    speakerRole: 'ML Engineer',
    speakerCompany: 'Hugging Face Community',
    title: 'Fine-Tuning con LoRA y QLoRA en GPUs de Consumo (RTX 4090 / L4)',
    track: 'Machine Learning & LLMs',
    language: 'es',
    level: 'Avanzado',
    description: 'Guía paso a paso para adaptar modelos de lenguaje de 7B y 14B a dominios técnicos específicos con bajo consumo de VRAM y técnicas de cuantización de 4 bits.',
    tags: ['FineTuning', 'LoRA', 'QLoRA', 'PyTorch']
  },
  {
    id: 'talk-d4',
    stageId: 'stage-3',
    stageName: 'Escenario Data & AI',
    startTime: '14:00',
    endTime: '14:45',
    startMinutes: 840,
    endMinutes: 885,
    speaker: 'Ana Clara Rossi',
    speakerRole: 'Data Streaming Architect',
    speakerCompany: 'Confluent',
    title: 'Real-time Streaming Feature Stores con Apache Flink & Apache Kafka',
    track: 'Machine Learning & LLMs',
    language: 'es',
    level: 'Avanzado',
    description: 'Construcción de pipelines de ML en tiempo real con ventanas deslizantes, cálculo de features de baja latencia (<20ms) y consistencia online/offline.',
    tags: ['Kafka', 'Flink', 'DataStreaming', 'FeatureStore']
  },
  {
    id: 'talk-d5',
    stageId: 'stage-3',
    stageName: 'Escenario Data & AI',
    startTime: '15:00',
    endTime: '15:45',
    startMinutes: 900,
    endMinutes: 945,
    speaker: 'Lucas Dell\'Acqua',
    speakerRole: 'AI Quality & Evaluation Director',
    speakerCompany: 'Latam AI Institute',
    title: 'Evaluación Automatizada de Alucinaciones y Métricas de Calidad en LLMs',
    track: 'Machine Learning & LLMs',
    language: 'es',
    level: 'Intermedio',
    description: 'Frameworks de evaluación continua: LLM-as-a-judge, métricas de faithfulness, relevancy y grounding para sistemas de IA generativa antes del deploy.',
    tags: ['Evaluation', 'LLMasAJudge', 'AIQuality', 'Benchmarking']
  }
];

export class ScheduleManager {
  private talks: EventTalk[] = [...NERDEARLA_2026_SCHEDULE];

  public getAll(): EventTalk[] {
    return this.talks;
  }

  public getByStage(stageId: string): EventTalk[] {
    return this.talks.filter(t => t.stageId === stageId);
  }

  public getById(id: string): EventTalk | undefined {
    return this.talks.find(t => t.id === id);
  }

  public getCurrentAndNext(stageId: string, currentMinutesOverride?: number): {
    currentTalk?: EventTalk;
    nextTalk?: EventTalk;
    remainingMinutes: number;
    progressPercent: number;
  } {
    const stageTalks = this.getByStage(stageId).sort((a, b) => a.startMinutes - b.startMinutes);
    if (stageTalks.length === 0) {
      return { remainingMinutes: 0, progressPercent: 0 };
    }

    let nowMinutes = currentMinutesOverride;
    if (nowMinutes === undefined) {
      const now = new Date();
      nowMinutes = now.getHours() * 60 + now.getMinutes();
    }

    // Find current active talk
    const currentTalk = stageTalks.find(t => nowMinutes! >= t.startMinutes && nowMinutes! < t.endMinutes);
    
    // Find next talk
    const nextTalk = stageTalks.find(t => t.startMinutes > nowMinutes!);

    if (currentTalk) {
      const totalDuration = currentTalk.endMinutes - currentTalk.startMinutes;
      const elapsed = nowMinutes! - currentTalk.startMinutes;
      const remaining = Math.max(0, currentTalk.endMinutes - nowMinutes!);
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      return { currentTalk, nextTalk, remainingMinutes: remaining, progressPercent };
    }

    // If between talks or before first talk
    return {
      nextTalk: nextTalk || stageTalks[0],
      remainingMinutes: nextTalk ? Math.max(0, nextTalk.startMinutes - nowMinutes!) : 0,
      progressPercent: 0
    };
  }
}

export const scheduleManager = new ScheduleManager();
