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
