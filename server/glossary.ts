import { TechTerm } from './types.js';

export const TECH_GLOSSARY: Record<string, TechTerm> = {
  // DevOps & Cloud
  'kubernetes': {
    term: 'Kubernetes',
    definition: 'Sistema de orquestación de código abierto para automatizar el despliegue, escalado y gestión de aplicaciones en contenedores.',
    category: 'devops'
  },
  'k8s': {
    term: 'K8s',
    definition: 'Abreviatura estándar de Kubernetes (8 letras entre la "K" y la "s").',
    category: 'devops'
  },
  'pod': {
    term: 'Pod',
    definition: 'La unidad básica y más pequeña ejecutable en Kubernetes; encapsula uno o más contenedores.',
    category: 'devops'
  },
  'ebpf': {
    term: 'eBPF',
    definition: 'Extended Berkeley Packet Filter: tecnología del kernel Linux para ejecutar programas de forma segura y eficiente sin modificar el kernel.',
    category: 'architecture'
  },
  'terraform': {
    term: 'Terraform',
    definition: 'Herramienta de infraestructura como código (IaC) de HashiCorp para definir recursos en la nube mediante código declarativo.',
    category: 'cloud'
  },
  'docker': {
    term: 'Docker',
    definition: 'Plataforma para crear, desplegar y ejecutar aplicaciones dentro de contenedores ligeros y aislados.',
    category: 'devops'
  },
  'ci/cd': {
    term: 'CI/CD',
    definition: 'Integración Continua y Despliegue Continuo: metodología para automatizar pruebas, construcción y entrega de software.',
    category: 'devops'
  },
  'gitlab': {
    term: 'GitLab',
    definition: 'Plataforma DevOps integral basada en web con repositorios Git, CI/CD automatizado, seguridad y observabilidad.',
    category: 'devops'
  },
  'github': {
    term: 'GitHub',
    definition: 'Plataforma líder para desarrollo colaborativo de software, control de versiones Git y automatización con GitHub Actions.',
    category: 'devops'
  },
  'pipeline': {
    term: 'Pipeline',
    definition: 'Conjunto de pasos automatizados que ejecutan pruebas, compilación y despliegue de software ante cada cambio de código.',
    category: 'devops'
  },
  'deploy': {
    term: 'Deploy',
    definition: 'El proceso de publicar, instalar o actualizar una aplicación o servicio en un entorno de producción o staging.',
    category: 'devops'
  },
  'cluster': {
    term: 'Cluster',
    definition: 'Conjunto de nodos (máquinas físicas o virtuales) interconectadas que trabajan como un único sistema coordinado.',
    category: 'devops'
  },
  'gitops': {
    term: 'GitOps',
    definition: 'Paradigma operativo donde los repositorios Git actúan como la única fuente de verdad para la infraestructura y aplicaciones.',
    category: 'devops'
  },
  'service mesh': {
    term: 'Service Mesh',
    definition: 'Capa de infraestructura dedicada a gestionar la comunicación y seguridad entre microservicios (ej. Istio, Linkerd).',
    category: 'architecture'
  },
  'prometheus': {
    term: 'Prometheus',
    definition: 'Sistema open source de monitoreo y alertas basado en métricas de series temporales.',
    category: 'devops'
  },
  'grafana': {
    term: 'Grafana',
    definition: 'Plataforma líder para visualización de métricas, dashboards interactivos y observabilidad.',
    category: 'devops'
  },
  'otel': {
    term: 'OpenTelemetry (OTel)',
    definition: 'Estándar abierto para recopilar rastreo distribuido (traces), métricas y logs de aplicaciones.',
    category: 'devops'
  },

  // AI & Data
  'rag': {
    term: 'RAG',
    definition: 'Retrieval-Augmented Generation: técnica que nutre un modelo LLM con información externa recuperada de una base vectorial antes de responder.',
    category: 'ai'
  },
  'embeddings': {
    term: 'Embeddings',
    definition: 'Representaciones vectoriales de alta dimensión que capturan el significado semántico de texto o datos.',
    category: 'ai'
  },
  'gemini': {
    term: 'Google Gemini',
    definition: 'Familia de modelos multimodales de última generación creados por Google DeepMind capaces de procesar texto, audio, imagen y video.',
    category: 'ai'
  },
  'gemma': {
    term: 'Gemma',
    definition: 'Familia de modelos de lenguaje abiertos y livianos construidos con la misma investigación y tecnología de Gemini.',
    category: 'ai'
  },
  'llm': {
    term: 'LLM',
    definition: 'Large Language Model: modelo de inteligencia artificial entrenado con miles de millones de parámetros para comprender y generar lenguaje humano.',
    category: 'ai'
  },
  'fine-tuning': {
    term: 'Fine-tuning',
    definition: 'Ajuste fino de un modelo preentrenado con un dataset especializado para una tarea o dominio concreto.',
    category: 'ai'
  },
  'vector database': {
    term: 'Vector Database',
    definition: 'Base de datos optimizada para almacenar y buscar vectores numéricos de similitud semántica (ej. Qdrant, Milvus, pgvector).',
    category: 'database'
  },

  // Languages & Runtime
  'rust': {
    term: 'Rust',
    definition: 'Lenguaje de programación de sistemas enfocado en seguridad de memoria, velocidad y concurrencia sin garbage collector.',
    category: 'language'
  },
  'golang': {
    term: 'Go / Golang',
    definition: 'Lenguaje compilado creado en Google, destacado por su simplicidad, rendimiento y goroutines para alta concurrencia.',
    category: 'language'
  },
  'goroutine': {
    term: 'Goroutine',
    definition: 'Hilo de ejecución liviano manejado por el runtime de Go en lugar del sistema operativo.',
    category: 'language'
  },
  'typescript': {
    term: 'TypeScript',
    definition: 'Superconjunto tipado de JavaScript desarrollado por Microsoft que compila a JavaScript plano.',
    category: 'language'
  },
  'webassembly': {
    term: 'WebAssembly (WASM)',
    definition: 'Formato de código binario portable que permite ejecutar código de alto rendimiento (C/Rust/Go) en navegadores web y servidores.',
    category: 'architecture'
  },

  // Architecture & Security
  'microservices': {
    term: 'Microservicios',
    definition: 'Patrón de arquitectura donde una aplicación se estructura como un conjunto de servicios independientes y acoplados de forma débil.',
    category: 'architecture'
  },
  'zero trust': {
    term: 'Zero Trust',
    definition: 'Modelo de ciberseguridad que asume que ninguna entidad dentro o fuera del perímetro de red debe ser confiada por defecto.',
    category: 'security'
  },
  'eventual consistency': {
    term: 'Consistencia Eventual',
    definition: 'Modelo de consistencia en sistemas distribuidos donde si no se hacen más actualizaciones, todos los nodos convergerán eventualmente.',
    category: 'architecture'
  },
  'grpc': {
    term: 'gRPC',
    definition: 'Framework open source de alto rendimiento para llamadas a procedimientos remotos basado en HTTP/2 y Protocol Buffers.',
    category: 'architecture'
  },
  'graphql': {
    term: 'GraphQL',
    definition: 'Lenguaje de consulta y manipulación de datos para APIs desarrollado por Facebook, que permite pedir solo los datos necesarios.',
    category: 'architecture'
  },

  // Community & Nerdearla
  'sysarmy': {
    term: 'sysarmy',
    definition: 'La comunidad de sistemas de Argentina e Iberoamérica, organizadores oficiales de Nerdearla.',
    category: 'general'
  },
  'nerdearla': {
    term: 'Nerdearla',
    definition: 'La conferencia técnica comunitaria, libre y gratuita más grande de América Latina.',
    category: 'general'
  }
};

/**
 * Detect technical terms in text and return matching definitions
 */
export function extractTechTerms(text: string): TechTerm[] {
  const lower = text.toLowerCase();
  const matched: TechTerm[] = [];
  const seen = new Set<string>();

  for (const [key, termObj] of Object.entries(TECH_GLOSSARY)) {
    // Regex match with word boundaries
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
    if (regex.test(lower) && !seen.has(termObj.term.toLowerCase())) {
      matched.push(termObj);
      seen.add(termObj.term.toLowerCase());
    }
  }

  return matched;
}

/**
 * Register dynamic custom terms during an event
 */
export function registerCustomTerm(term: string, definition: string, category: TechTerm['category'] = 'general') {
  TECH_GLOSSARY[term.toLowerCase()] = {
    term,
    definition,
    category
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Phonetic Tech Normalizer (Spanglish IT Auto-Corrector)
 * Corrects Spanish phonetic misrecognitions of English IT technical terms
 * (e.g. "hitlab" -> "GitLab", "jijab" -> "GitHub", "cobernetes" -> "Kubernetes", "diploy" -> "deploy").
 */
export const PHONETIC_TECH_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Git & DevOps Platforms
  { pattern: /\b(hitlab|jitlab|git\s*lab|guid\s*lab|jit\s*lab|jilab|hit\s*lab)\b/gi, replacement: 'GitLab' },
  { pattern: /\b(jijab|gijab|git\s*jab|hit\s*hub|guid\s*hub|jit\s*hub)\b/gi, replacement: 'GitHub' },
  { pattern: /\b(gitops|git\s*ops)\b/gi, replacement: 'GitOps' },
  { pattern: /\b(pul\s*riquest|purriquest|pul\s*request|pull\s*riquest|pulrequest)\b/gi, replacement: 'Pull Request' },
  { pattern: /\b(merch|mersh|mergear|mergeado)\b/gi, replacement: 'merge' },
  { pattern: /\b(comit|comits)\b/gi, replacement: 'commit' },
  { pattern: /\b(reposs|repos|repoz)\b/gi, replacement: 'repositorio' },

  // Containers, Cloud & Infrastructure
  { pattern: /\b(cobernetes|cuvernetes|cuvernetis|kubernetis|covernetes|cobernetis)\b/gi, replacement: 'Kubernetes' },
  { pattern: /\b(doquer|docte|docter|doquers)\b/gi, replacement: 'Docker' },
  { pattern: /\b(diploy|de\s*ploy|diployar|deployar|diploye|deploye)\b/gi, replacement: 'deploy' },
  { pattern: /\b(claster|clastes)\b/gi, replacement: 'cluster' },
  { pattern: /\b(claud|clau)\b/gi, replacement: 'Cloud' },
  { pattern: /\b(paiplain|pai\s*plain|payplain|pay\s*plain)\b/gi, replacement: 'pipeline' },
  { pattern: /\b(evepefe|e\s*b\s*p\s*f|e\s*ve\s*pe\s*fe)\b/gi, replacement: 'eBPF' },
  { pattern: /\b(ansibl|ansible|anzible)\b/gi, replacement: 'Ansible' },
  { pattern: /\b(terrafom|terrafor|terrafon)\b/gi, replacement: 'Terraform' },
  { pattern: /\b(promitius|promitiu|prometeus)\b/gi, replacement: 'Prometheus' },
  { pattern: /\b(grefana|grafana)\b/gi, replacement: 'Grafana' },

  // Architecture, Web & DBs
  { pattern: /\b(baquen|vaquend|baquend|back\s*end)\b/gi, replacement: 'backend' },
  { pattern: /\b(fronen|fronten|front\s*end)\b/gi, replacement: 'frontend' },
  { pattern: /\b(posgres|posgre|posgrez|postgre)\b/gi, replacement: 'PostgreSQL' },
  { pattern: /\b(rredis|rediss)\b/gi, replacement: 'Redis' },
  { pattern: /\b(grafql|graf\s*ql|grefql)\b/gi, replacement: 'GraphQL' },
  { pattern: /\b(nobase|node\s*js|no\s*yes|nout\s*yes)\b/gi, replacement: 'Node.js' },
  { pattern: /\b(paiton|paitom|paito)\b/gi, replacement: 'Python' },
  { pattern: /\b(ras|rasta)\s+(lang|lenguaje|código)?\b/gi, replacement: 'Rust' },
  { pattern: /\b(tai\s*escript|taiescript|type\s*script)\b/gi, replacement: 'TypeScript' },

  // AI & Community
  { pattern: /\b(llm|yeleeme|ele\s*ele\s*eme)\b/gi, replacement: 'LLM' },
  { pattern: /\b(open\s*sors|opensors|open\s*sor)\b/gi, replacement: 'Open Source' },
  { pattern: /\b(sisarmy|sis\s*armi|sisarmi|cissarmy)\b/gi, replacement: 'Sysarmy' },
  { pattern: /\b(nerdiarla|nerdear\s*la|nerd\s*arla|nerd\s*diarla)\b/gi, replacement: 'Nerdearla' }
];

export function normalizePhoneticTechTerms(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const rule of PHONETIC_TECH_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized;
}
