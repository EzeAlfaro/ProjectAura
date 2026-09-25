import { TechTerm } from './types.js';

export const TECH_GLOSSARY: Record<string, TechTerm> = {
  // ==========================================
  // CLOUD, CONTAINERS & INFRASTRUCTURE
  // ==========================================
  'kubernetes': {
    term: 'Kubernetes',
    definition: 'Sistema open source para automatizar el despliegue, escalado y gestión de contenedores.',
    category: 'devops'
  },
  'k8s': {
    term: 'K8s',
    definition: 'Abreviatura estándar de Kubernetes (8 letras entre la K y la s).',
    category: 'devops'
  },
  'pod': {
    term: 'Pod',
    definition: 'Unidad mínima de ejecución en Kubernetes; encapsula uno o más contenedores.',
    category: 'devops'
  },
  'container': {
    term: 'Container',
    definition: 'Paquete de software liviano y ejecutable que incluye código, dependencias y runtime aislados.',
    category: 'devops'
  },
  'docker': {
    term: 'Docker',
    definition: 'Plataforma líder para empaquetar y ejecutar aplicaciones dentro de contenedores portables.',
    category: 'devops'
  },
  'terraform': {
    term: 'Terraform',
    definition: 'Herramienta de Infraestructura como Código (IaC) de HashiCorp para aprovisionar nubes con código declarativo.',
    category: 'cloud'
  },
  'ansible': {
    term: 'Ansible',
    definition: 'Motor de automatización open source para gestión de configuración, despliegue y orquestación.',
    category: 'devops'
  },
  'helm': {
    term: 'Helm',
    definition: 'Administrador de paquetes para Kubernetes que facilita la instalación y versionado de charts.',
    category: 'devops'
  },
  'ingress': {
    term: 'Ingress',
    definition: 'Objeto de Kubernetes que gestiona el acceso externo HTTP/HTTPS a los servicios del cluster.',
    category: 'cloud'
  },
  'egress': {
    term: 'Egress',
    definition: 'Tráfico de red que sale desde una red o cluster hacia destinos externos.',
    category: 'cloud'
  },
  'ebpf': {
    term: 'eBPF',
    definition: 'Extended Berkeley Packet Filter: tecnología del kernel Linux para correr programas sandboxed de alta performance sin modificar el kernel.',
    category: 'architecture'
  },
  'cilium': {
    term: 'Cilium',
    definition: 'Plataforma de red, observabilidad y seguridad para Kubernetes impulsada nativamente por eBPF.',
    category: 'cloud'
  },
  'service mesh': {
    term: 'Service Mesh',
    definition: 'Capa de infraestructura dedicada a gestionar comunicación, seguridad y telemetría entre microservicios.',
    category: 'architecture'
  },
  'istio': {
    term: 'Istio',
    definition: 'Malla de servicios open source que proporciona balanceo de carga, cifrado mTLS y telemetría.',
    category: 'cloud'
  },
  'envoy': {
    term: 'Envoy',
    definition: 'Proxy de red y servicios edge de alto rendimiento escrito en C++ para arquitecturas cloud native.',
    category: 'architecture'
  },
  'serverless': {
    term: 'Serverless',
    definition: 'Modelo de computación donde el proveedor de nube ejecuta el código y escala recursos bajo demanda sin gestión de servidores.',
    category: 'cloud'
  },
  'cloud native': {
    term: 'Cloud Native',
    definition: 'Enfoque para construir y ejecutar aplicaciones escalables en nubes públicas, privadas o híbridas usando contenedores y microservicios.',
    category: 'cloud'
  },
  'edge computing': {
    term: 'Edge Computing',
    definition: 'Procesamiento de datos descentralizado cerca de la fuente de captura para minimizar latencia y consumo de ancho de banda.',
    category: 'architecture'
  },
  'cdn': {
    term: 'CDN',
    definition: 'Content Delivery Network: red distribuida geográficamente para entregar contenido web con baja latencia.',
    category: 'cloud'
  },
  'cloudflare': {
    term: 'Cloudflare',
    definition: 'Red global de seguridad, CDN, DNS y edge workers que protege y acelera aplicaciones web.',
    category: 'cloud'
  },
  'aws': {
    term: 'AWS',
    definition: 'Amazon Web Services: plataforma de servicios de computación en la nube de Amazon.',
    category: 'cloud'
  },
  'gcp': {
    term: 'GCP',
    definition: 'Google Cloud Platform: suite de computación en la nube e inteligencia artificial de Google.',
    category: 'cloud'
  },
  'azure': {
    term: 'Microsoft Azure',
    definition: 'Plataforma de servicios de nube pública de Microsoft para infraestructura, desarrollo y AI.',
    category: 'cloud'
  },
  'vault': {
    term: 'HashiCorp Vault',
    definition: 'Herramienta para gestionar secretos, certificados, tokens y claves de cifrado con control de acceso estricto.',
    category: 'security'
  },
  'consul': {
    term: 'Consul',
    definition: 'Solución de networking y service discovery de HashiCorp para conectar y asegurar servicios.',
    category: 'cloud'
  },
  'nomad': {
    term: 'Nomad',
    definition: 'Orquestador de cargas de trabajo flexible de HashiCorp para contenedores y aplicaciones legacy.',
    category: 'devops'
  },

  // ==========================================
  // DEVOPS, CI/CD, SRE & OBSERVABILITY
  // ==========================================
  'ci/cd': {
    term: 'CI/CD',
    definition: 'Integración Continua y Despliegue Continuo: automatización de pruebas, empaquetado y entrega de software.',
    category: 'devops'
  },
  'pipeline': {
    term: 'Pipeline',
    definition: 'Flujo estructurado de pasos automatizados de construcción, testeo y despliegue ante commits de código.',
    category: 'devops'
  },
  'gitlab': {
    term: 'GitLab',
    definition: 'Plataforma integral de DevOps basada en web con repositorios Git, pipelines CI/CD y observabilidad.',
    category: 'devops'
  },
  'github': {
    term: 'GitHub',
    definition: 'Plataforma de desarrollo colaborativo de software, control de versiones Git y automatización con GitHub Actions.',
    category: 'devops'
  },
  'gitops': {
    term: 'GitOps',
    definition: 'Práctica operativa donde repositorios Git representan el único estado deseado de infraestructura y aplicaciones.',
    category: 'devops'
  },
  'argocd': {
    term: 'ArgoCD',
    definition: 'Herramienta declarativa de entrega continua GitOps para Kubernetes que sincroniza el estado en tiempo real.',
    category: 'devops'
  },
  'flux': {
    term: 'Flux',
    definition: 'Conjunto de operadores continuos y progresivos para Kubernetes construidos bajo el paradigma GitOps.',
    category: 'devops'
  },
  'observability': {
    term: 'Observabilidad',
    definition: 'Capacidad de inferir el estado interno de un sistema complejo analizando sus métricas, traces y logs externos.',
    category: 'devops'
  },
  'telemetry': {
    term: 'Telemetría',
    definition: 'Recolección y transmisión automática de datos operativos desde sistemas remotos para monitoreo.',
    category: 'devops'
  },
  'opentelemetry': {
    term: 'OpenTelemetry (OTel)',
    definition: 'Estándar abierto de la CNCF para instrumentalización, generación y exportación de traces, métricas y logs.',
    category: 'devops'
  },
  'otel': {
    term: 'OTel',
    definition: 'Acrónimo oficial de OpenTelemetry.',
    category: 'devops'
  },
  'prometheus': {
    term: 'Prometheus',
    definition: 'Sistema líder de monitoreo y alertas de series temporales con modelo pull y lenguaje PromQL.',
    category: 'devops'
  },
  'grafana': {
    term: 'Grafana',
    definition: 'Plataforma para visualización interactiva, tableros analíticos y alertas operativas multi-fuente.',
    category: 'devops'
  },
  'jaeger': {
    term: 'Jaeger',
    definition: 'Herramienta open source para rastreo distribuido de transacciones entre microservicios.',
    category: 'devops'
  },
  'loki': {
    term: 'Grafana Loki',
    definition: 'Sistema de agregación de logs horizontalmente escalable que indexa solo etiquetas de metadata.',
    category: 'devops'
  },
  'datadog': {
    term: 'Datadog',
    definition: 'Plataforma SaaS de observabilidad y seguridad para infraestructura en la nube y aplicaciones.',
    category: 'devops'
  },
  'sentry': {
    term: 'Sentry',
    definition: 'Plataforma de seguimiento y diagnóstico en tiempo real de errores y crashes en aplicaciones.',
    category: 'devops'
  },
  'sre': {
    term: 'SRE',
    definition: 'Site Reliability Engineering: disciplina de Google que aplica principios de ingeniería de software a operaciones.',
    category: 'devops'
  },
  'slo': {
    term: 'SLO',
    definition: 'Service Level Objective: objetivo medible de confiabilidad o latencia acordado internamente.',
    category: 'devops'
  },
  'sla': {
    term: 'SLA',
    definition: 'Service Level Agreement: compromiso formal contractual entre un proveedor y sus clientes con penalidades.',
    category: 'devops'
  },
  'sli': {
    term: 'SLI',
    definition: 'Service Level Indicator: métrica cuantitativa directa del servicio (ej. porcentaje de respuestas HTTP 200).',
    category: 'devops'
  },
  'mttr': {
    term: 'MTTR',
    definition: 'Mean Time To Recovery: tiempo promedio transcurrido hasta restablecer un servicio tras una interrupción.',
    category: 'devops'
  },
  'mttd': {
    term: 'MTTD',
    definition: 'Mean Time To Detect: tiempo promedio desde que ocurre una anomalía hasta que es identificada por el equipo.',
    category: 'devops'
  },
  'chaos engineering': {
    term: 'Chaos Engineering',
    definition: 'Disciplina de inyectar fallas controladas en producción para validar la resiliencia y tolerancia a fallos.',
    category: 'architecture'
  },
  'canary deploy': {
    term: 'Canary Deployment',
    definition: 'Estrategia de lanzamiento gradual donde una nueva versión se expone a un porcentaje mínimo de usuarios antes del rollout completo.',
    category: 'devops'
  },
  'blue-green': {
    term: 'Blue-Green Deployment',
    definition: 'Técnica de despliegue con dos entornos idénticos donde el tráfico cambia instantáneamente al nuevo mediante balanceador.',
    category: 'devops'
  },
  'rollback': {
    term: 'Rollback',
    definition: 'Operación de revertir un despliegue o cambio de base de datos a un estado previo funcional ante fallas.',
    category: 'devops'
  },

  // ==========================================
  // SPANGLISH NERD & OPERATIONAL JARGON
  // ==========================================
  'deploy': {
    term: 'Deploy',
    definition: 'Publicación o puesta en marcha de una versión de software en un ambiente de ejecución.',
    category: 'devops'
  },
  'deployar': {
    term: 'Deployar',
    definition: 'Verbo coloquial rioplatense para ejecutar un despliegue de software.',
    category: 'devops'
  },
  'merge': {
    term: 'Merge',
    definition: 'Fusión de ramas en un sistema de control de versiones Git.',
    category: 'devops'
  },
  'mergear': {
    term: 'Mergear',
    definition: 'Verbo coloquial para combinar dos ramas o ramas de pull request en Git.',
    category: 'devops'
  },
  'crash': {
    term: 'Crash',
    definition: 'Falla abrupta o terminación inesperada de un proceso o aplicación.',
    category: 'architecture'
  },
  'crashear': {
    term: 'Crashear',
    definition: 'Caerse inesperadamente un servidor o proceso por una excepción no capturada.',
    category: 'architecture'
  },
  'romper prod': {
    term: 'Romper Prod',
    definition: 'Expresión clásica de sistemas para incidentes donde un cambio introduce una caída en el ambiente de producción.',
    category: 'devops'
  },
  'on-call': {
    term: 'On-Call',
    definition: 'Guardia activa donde un ingeniero responde a alertas críticas fuera del horario habitual.',
    category: 'devops'
  },
  'troubleshooting': {
    term: 'Troubleshooting',
    definition: 'Proceso metódico de diagnóstico y resolución de problemas técnicos o fallas de infraestructura.',
    category: 'devops'
  },
  'deadlock': {
    term: 'Deadlock',
    definition: 'Bloqueo mutuo donde dos o más procesos compiten por recursos y ninguno puede continuar.',
    category: 'architecture'
  },
  'hotfix': {
    term: 'Hotfix',
    definition: 'Parche de software de urgencia aplicado directamente sobre producción para resolver un bug crítico.',
    category: 'devops'
  },
  'pull request': {
    term: 'Pull Request (PR)',
    definition: 'Solicitud formal para que los cambios de una rama sean revisados e incorporados a la rama principal.',
    category: 'devops'
  },
  'cherry-pick': {
    term: 'Cherry-Pick',
    definition: 'Comando de Git para seleccionar y aplicar un commit específico de una rama hacia otra.',
    category: 'devops'
  },
  'rebase': {
    term: 'Rebase',
    definition: 'Reescribir la base de una rama Git moviéndola encima de los últimos commits de otra rama.',
    category: 'devops'
  },
  'rate limit': {
    term: 'Rate Limit',
    definition: 'Límite máximo de peticiones que un cliente puede enviar a una API en una ventana de tiempo.',
    category: 'security'
  },
  'throttling': {
    term: 'Throttling',
    definition: 'Mecanismo que reduce intencionalmente la velocidad de procesamiento para evitar sobrecarga del sistema.',
    category: 'architecture'
  },

  // ==========================================
  // ARTIFICIAL INTELLIGENCE & LLMS
  // ==========================================
  'gemini': {
    term: 'Google Gemini',
    definition: 'Familia insignia de modelos multimodales nativos creados por Google DeepMind (texto, audio, imagen, video y código).',
    category: 'ai'
  },
  'gemma': {
    term: 'Google Gemma',
    definition: 'Familia de modelos abiertos livianos desarrollados por Google DeepMind a partir de la investigación de Gemini.',
    category: 'ai'
  },
  'deepmind': {
    term: 'Google DeepMind',
    definition: 'Laboratorio de investigación avanzada de inteligencia artificial de Google que desarrolló Gemini, AlphaFold y AlphaGo.',
    category: 'ai'
  },
  'llm': {
    term: 'LLM',
    definition: 'Large Language Model: modelo neuronal con miles de millones de parámetros entrenado para comprender y generar lenguaje.',
    category: 'ai'
  },
  'rag': {
    term: 'RAG',
    definition: 'Retrieval-Augmented Generation: técnica que enriquece prompts de LLMs con contexto recuperado dinámicamente de bases vectoriales.',
    category: 'ai'
  },
  'embeddings': {
    term: 'Embeddings',
    definition: 'Vectores matemáticos densos que representan el significado semántico y relaciones de conceptos en espacios multidimensionales.',
    category: 'ai'
  },
  'vector database': {
    term: 'Vector Database',
    definition: 'Base de datos optimizada para indexar y buscar vectores semánticos a través de algoritmos k-NN / HNSW.',
    category: 'database'
  },
  'qdrant': {
    term: 'Qdrant',
    definition: 'Motor open source de búsqueda vectorial de alta velocidad escrito en Rust para aplicaciones RAG y búsqueda semántica.',
    category: 'database'
  },
  'milvus': {
    term: 'Milvus',
    definition: 'Base de datos vectorial distribuida y escalable para aplicaciones de machine learning con billones de vectores.',
    category: 'database'
  },
  'fine-tuning': {
    term: 'Fine-Tuning',
    definition: 'Entrenamiento adicional supervisado de un modelo preentrenado con un dataset especializado para una tarea específica.',
    category: 'ai'
  },
  'lora': {
    term: 'LoRA',
    definition: 'Low-Rank Adaptation: técnica eficiente que congela los pesos del modelo y entrena matrices de bajo rango con bajo consumo de VRAM.',
    category: 'ai'
  },
  'hallucination': {
    term: 'Alucinación',
    definition: 'Respuesta generada por un modelo de IA que es plausible y sintácticamente correcta pero falsa o infundada.',
    category: 'ai'
  },
  'token': {
    term: 'Token',
    definition: 'Fragmento básico de texto (carácter, sub-palabra o palabra) que un modelo de lenguaje procesa como entrada o salida.',
    category: 'ai'
  },
  'context window': {
    term: 'Ventana de Contexto',
    definition: 'Cantidad máxima de tokens de entrada y salida que un modelo de lenguaje puede procesar en una sola interacción.',
    category: 'ai'
  },
  'multimodal': {
    term: 'Multimodal',
    definition: 'Capacidad de un modelo de IA para procesar e interrelacionar simultáneamente diferentes modalidades de datos (audio, texto, video).',
    category: 'ai'
  },
  'whisper': {
    term: 'Whisper',
    definition: 'Modelo neuronal open source de reconocimiento automático de voz (ASR) desarrollado por OpenAI entrenado con 680k horas de audio.',
    category: 'ai'
  },
  'vad': {
    term: 'VAD (Voice Activity Detection)',
    definition: 'Algoritmo que detecta la presencia o ausencia de voz humana en una señal de audio para pausar o segmentar buffers.',
    category: 'ai'
  },
  'zero-shot': {
    term: 'Zero-Shot',
    definition: 'Capacidad de un modelo para resolver una tarea sin haber visto ejemplos explícitos previos en el prompt.',
    category: 'ai'
  },
  'few-shot': {
    term: 'Few-Shot',
    definition: 'Técnica de prompt donde se le proporcionan al modelo algunos ejemplos demostrativos de entrada y salida esperada.',
    category: 'ai'
  },
  'prompt engineering': {
    term: 'Prompt Engineering',
    definition: 'Diseño sistemático de instrucciones de entrada para optimizar la precisión, formato y razonamiento de modelos de IA.',
    category: 'ai'
  },
  'agentic ai': {
    term: 'AI Agéntica',
    definition: 'Sistemas autónomos basados en LLMs capaces de planificar, usar herramientas, ejecutar código y coordinarse entre pares.',
    category: 'ai'
  },
  'ollama': {
    term: 'Ollama',
    definition: 'Herramienta open source para ejecutar y servir modelos de lenguaje locales (Gemma, Llama, Mistral) en GPU o CPU local.',
    category: 'ai'
  },

  // ==========================================
  // DATABASES, MESSAGING & DATA
  // ==========================================
  'postgresql': {
    term: 'PostgreSQL',
    definition: 'Sistema de base de datos relacional open source de nivel empresarial con soporte avanzado de SQL, JSONB y ACID.',
    category: 'database'
  },
  'postgres': {
    term: 'Postgres',
    definition: 'Forma abreviada popular para referirse al motor de base de datos PostgreSQL.',
    category: 'database'
  },
  'mysql': {
    term: 'MySQL',
    definition: 'Sistema de gestión de bases de datos relacionales ampliamente utilizado en la web.',
    category: 'database'
  },
  'redis': {
    term: 'Redis',
    definition: 'Estructura de datos en memoria ultrarrápida usada como base de datos, caché de baja latencia y message broker.',
    category: 'database'
  },
  'kafka': {
    term: 'Apache Kafka',
    definition: 'Plataforma distribuida de transmisión de eventos de alto rendimiento con persistencia de logs en disco.',
    category: 'database'
  },
  'rabbitmq': {
    term: 'RabbitMQ',
    definition: 'Message broker open source confiable que implementa el protocolo AMQP para encolado de mensajes asíncronos.',
    category: 'architecture'
  },
  'nats': {
    term: 'NATS',
    definition: 'Sistema de mensajería publish-subscribe y pub-sub ultraliviano y de altísimo rendimiento para arquitecturas cloud native.',
    category: 'architecture'
  },
  'clickhouse': {
    term: 'ClickHouse',
    definition: 'Base de datos orientada a columnas (DBMS columnar) para procesamiento analítico en tiempo real (OLAP) a escala de petabytes.',
    category: 'database'
  },
  'elasticsearch': {
    term: 'Elasticsearch',
    definition: 'Motor distribuido de búsqueda y analítica RESTful basado en Apache Lucene.',
    category: 'database'
  },
  'sharding': {
    term: 'Sharding',
    definition: 'Particionamiento horizontal de datos a través de múltiples servidores o bases de datos para escalar lecturas y escrituras.',
    category: 'database'
  },
  'replication lag': {
    term: 'Replication Lag',
    definition: 'Retardo temporal entre la escritura de datos en el nodo primario y su replicación en las instancias de solo lectura.',
    category: 'database'
  },
  'read replica': {
    term: 'Read Replica',
    definition: 'Copia sincronizada de solo lectura de una base de datos para balancear y acelerar consultas intensivas.',
    category: 'database'
  },
  'acid': {
    term: 'ACID',
    definition: 'Propiedades de transacciones en bases de datos: Atomicidad, Consistencia, Aislamiento y Durabilidad.',
    category: 'database'
  },
  'wal': {
    term: 'WAL (Write-Ahead Logging)',
    definition: 'Técnica de bases de datos donde los cambios se escriben primero en un log secuencial antes de aplicarse a las tablas.',
    category: 'database'
  },

  // ==========================================
  // ARCHITECTURE, NETWORKING & PROTOCOLS
  // ==========================================
  'microservices': {
    term: 'Microservicios',
    definition: 'Patrón de arquitectura donde una aplicación se compone de servicios autónomos, desacoplados y desplegables independientemente.',
    category: 'architecture'
  },
  'monolith': {
    term: 'Monolito',
    definition: 'Patrón arquitectónico tradicional donde toda la funcionalidad del sistema reside en una única base de código y binario.',
    category: 'architecture'
  },
  'event-driven': {
    term: 'Event-Driven Architecture',
    definition: 'Paradigma de diseño donde la interacción del software se rige por la emisión, detección y consumo de eventos asíncronos.',
    category: 'architecture'
  },
  'eventual consistency': {
    term: 'Consistencia Eventual',
    definition: 'Garantía en sistemas distribuidos de que, sin nuevas actualizaciones, todos los nodos convergerán al mismo dato.',
    category: 'architecture'
  },
  'grpc': {
    term: 'gRPC',
    definition: 'Framework open source de alto rendimiento para RPC desarrollado por Google sobre HTTP/2 y Protocol Buffers.',
    category: 'architecture'
  },
  'protobuf': {
    term: 'Protocol Buffers (Protobuf)',
    definition: 'Mecanismo neutral y extensible de Google para serializar datos estructurados en binarios compactos.',
    category: 'architecture'
  },
  'graphql': {
    term: 'GraphQL',
    definition: 'Lenguaje de consulta y manipulación para APIs creado por Meta que permite a los clientes solicitar datos con tipado estricto.',
    category: 'architecture'
  },
  'rest': {
    term: 'REST',
    definition: 'Representational State Transfer: estilo de arquitectura de software para sistemas de hipermedios sobre HTTP.',
    category: 'architecture'
  },
  'websocket': {
    term: 'WebSocket',
    definition: 'Protocolo de comunicación bidireccional y persistente sobre una única conexión TCP de baja latencia.',
    category: 'architecture'
  },
  'webrtc': {
    term: 'WebRTC',
    definition: 'Protocolo y APIs web para comunicación de audio, video y datos en tiempo real punto a punto (peer-to-peer).',
    category: 'architecture'
  },
  'sse': {
    term: 'Server-Sent Events (SSE)',
    definition: 'Estándar web que permite a un servidor transmitir actualizaciones unidireccionales en tiempo real hacia el navegador sobre HTTP.',
    category: 'architecture'
  },
  'reverse proxy': {
    term: 'Reverse Proxy',
    definition: 'Servidor intermedio que recibe peticiones externas y las redirige hacia uno o más servidores de backend.',
    category: 'architecture'
  },
  'load balancer': {
    term: 'Load Balancer',
    definition: 'Dispositivo o software que distribuye el tráfico entrante equitativamente entre múltiples servidores para evitar saturaciones.',
    category: 'architecture'
  },
  'zero trust': {
    term: 'Zero Trust',
    definition: 'Principio de seguridad donde nunca se confía por defecto en ninguna conexión, requiriendo autenticación continua.',
    category: 'security'
  },
  'oauth': {
    term: 'OAuth 2.0',
    definition: 'Marco de autorización estándar del sector que permite a aplicaciones delegar accesos seguros a recursos de usuarios.',
    category: 'security'
  },
  'jwt': {
    term: 'JSON Web Token (JWT)',
    definition: 'Estándar compacto y seguro para transmitir información autenticada y verificable criptográficamente como objeto JSON.',
    category: 'security'
  },

  // ==========================================
  // LANGUAGES, RUNTIMES & FRONTEND
  // ==========================================
  'rust': {
    term: 'Rust',
    definition: 'Lenguaje de sistemas enfocado en seguridad de memoria, velocidad nativa y concurrencia sin garbage collector.',
    category: 'language'
  },
  'golang': {
    term: 'Go / Golang',
    definition: 'Lenguaje compilado desarrollado en Google, famoso por su simplicidad, rendimiento y concurrencia con goroutines.',
    category: 'language'
  },
  'goroutine': {
    term: 'Goroutine',
    definition: 'Hilo de ejecución ultraliviano gestionado por el runtime de Go con mínimo overhead de memoria.',
    category: 'language'
  },
  'typescript': {
    term: 'TypeScript',
    definition: 'Superconjunto con tipado estricto de JavaScript creado por Microsoft que compila a código JavaScript estándar.',
    category: 'language'
  },
  'python': {
    term: 'Python',
    definition: 'Lenguaje de programación interpretado de alto nivel, estándar de facto en inteligencia artificial, analítica y scripting.',
    category: 'language'
  },
  'node.js': {
    term: 'Node.js',
    definition: 'Entorno de ejecución de JavaScript multiplataforma del lado del servidor basado en el motor V8 de Google.',
    category: 'language'
  },
  'webassembly': {
    term: 'WebAssembly (WASM)',
    definition: 'Formato de código binario portable y de alta velocidad que permite correr código C/Rust/Go a velocidad casi nativa en la web.',
    category: 'architecture'
  },
  'react': {
    term: 'React',
    definition: 'Biblioteca open source de JavaScript creada por Meta para construir interfaces de usuario declarativas mediante componentes.',
    category: 'language'
  },
  'vite': {
    term: 'Vite',
    definition: 'Herramienta de frontend de última generación que ofrece un servidor de desarrollo ultrarrápido impulsado por ESM nativo.',
    category: 'devops'
  },
  'audioworklet': {
    term: 'AudioWorklet',
    definition: 'API de Web Audio que ejecuta procesamiento de señales de audio de ultra baja latencia en un hilo separado del hilo principal.',
    category: 'architecture'
  },

  // ==========================================
  // COMMUNITY & NERDEARLA IDENTITY
  // ==========================================
  'sysarmy': {
    term: 'Sysarmy',
    definition: 'La comunidad de sistemas y profesionales IT de Argentina e Iberoamérica, organizadores de Nerdearla.',
    category: 'general'
  },
  'nerdearla': {
    term: 'Nerdearla',
    definition: 'La conferencia técnica comunitaria, abierta y gratuita más grande de América Latina celebrada anualmente.',
    category: 'general'
  },
  'konex': {
    term: 'Ciudad Cultural Konex',
    definition: 'Complejo cultural icónico en Buenos Aires donde se realiza presencialmente la edición principal de Nerdearla.',
    category: 'general'
  },
  'vibeathon': {
    term: 'Vibeathon',
    definition: 'El hackathon de alto voltaje de Nerdearla donde los equipos construyen soluciones de vanguardia con IA en tiempo récord.',
    category: 'general'
  },
  'open source': {
    term: 'Open Source',
    definition: 'Software de código abierto distribuido bajo licencias libres que permiten inspeccionar, modificar y compartir el código.',
    category: 'general'
  }
};

/**
 * Phonetic Tech Normalizer (Spanglish IT Auto-Corrector)
 * Corrects Spanish phonetic misrecognitions of English IT technical terms
 * (e.g. "hitlab" -> "GitLab", "jijab" -> "GitHub", "cobernetes" -> "Kubernetes", "diploy" -> "deploy").
 */
export const PHONETIC_TECH_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Git & Platforms
  { pattern: /\b(hitlab|jitlab|git\s*lab|guid\s*lab|jit\s*lab|jilab|hit\s*lab)\b/gi, replacement: 'GitLab' },
  { pattern: /\b(jijab|gijab|git\s*jab|hit\s*hub|guid\s*hub|jit\s*hub)\b/gi, replacement: 'GitHub' },
  { pattern: /\b(gitops|git\s*ops)\b/gi, replacement: 'GitOps' },
  { pattern: /\b(pul\s*riquest|purriquest|pul\s*request|pull\s*riquest|pulrequest)\b/gi, replacement: 'Pull Request' },
  { pattern: /\b(merch|mersh|mergear|mergeado|mergiado)\b/gi, replacement: 'merge' },
  { pattern: /\b(comit|comits|comitear)\b/gi, replacement: 'commit' },
  { pattern: /\b(reposs|repos|repoz)\b/gi, replacement: 'repositorio' },

  // Containers, Cloud & Infrastructure
  { pattern: /\b(cobernetes|cuvernetes|cuvernetis|kubernetis|covernetes|cobernetis)\b/gi, replacement: 'Kubernetes' },
  { pattern: /\b(doquer|docte|docter|doquers)\b/gi, replacement: 'Docker' },
  { pattern: /\b(diploy|de\s*ploy|diployar|deployar|diploye|deploye)\b/gi, replacement: 'deploy' },
  { pattern: /\b(claster|clastes|clasters)\b/gi, replacement: 'cluster' },
  { pattern: /\b(claud|clau)\b/gi, replacement: 'Cloud' },
  { pattern: /\b(paiplain|pai\s*plain|payplain|pay\s*plain)\b/gi, replacement: 'pipeline' },
  { pattern: /\b(evepefe|e\s*b\s*p\s*f|e\s*ve\s*pe\s*fe)\b/gi, replacement: 'eBPF' },
  { pattern: /\b(silium|ciliun)\b/gi, replacement: 'Cilium' },
  { pattern: /\b(ansibl|ansible|anzible)\b/gi, replacement: 'Ansible' },
  { pattern: /\b(terrafom|terrafor|terrafon)\b/gi, replacement: 'Terraform' },
  { pattern: /\b(promitius|promitiu|prometeus)\b/gi, replacement: 'Prometheus' },
  { pattern: /\b(grefana|grafana)\b/gi, replacement: 'Grafana' },
  { pattern: /\b(otel|ou\s*tel)\b/gi, replacement: 'OpenTelemetry' },

  // Architecture, Web & Databases
  { pattern: /\b(baquen|vaquend|baquend|back\s*end)\b/gi, replacement: 'backend' },
  { pattern: /\b(fronen|fronten|front\s*end)\b/gi, replacement: 'frontend' },
  { pattern: /\b(posgres|posgre|posgrez|postgre)\b/gi, replacement: 'PostgreSQL' },
  { pattern: /\b(rredis|rediss)\b/gi, replacement: 'Redis' },
  { pattern: /\b(cafca|kafca)\b/gi, replacement: 'Kafka' },
  { pattern: /\b(grafql|graf\s*ql|grefql)\b/gi, replacement: 'GraphQL' },
  { pattern: /\b(llepec|yeperce|g\s*r\s*p\s*c)\b/gi, replacement: 'gRPC' },
  { pattern: /\b(nobase|node\s*js|no\s*yes|nout\s*yes)\b/gi, replacement: 'Node.js' },
  { pattern: /\b(paiton|paitom|paito)\b/gi, replacement: 'Python' },
  { pattern: /\b(ras|rasta)\s+(lang|lenguaje|código)?\b/gi, replacement: 'Rust' },
  { pattern: /\b(tai\s*escript|taiescript|type\s*script)\b/gi, replacement: 'TypeScript' },
  { pattern: /\b(veb\s*asembli|guasam|wasm)\b/gi, replacement: 'WebAssembly' },

  // AI & Community
  { pattern: /\b(llm|yeleeme|ele\s*ele\s*eme)\b/gi, replacement: 'LLM' },
  { pattern: /\b(yemini|yémini|geminis|yeminis)\b/gi, replacement: 'Gemini' },
  { pattern: /\b(deep\s*main|dipmain|dip\s*main)\b/gi, replacement: 'DeepMind' },
  { pattern: /\b(open\s*sors|opensors|open\s*sor)\b/gi, replacement: 'Open Source' },
  { pattern: /\b(sisarmy|sis\s*armi|sisarmi|cissarmy)\b/gi, replacement: 'Sysarmy' },
  { pattern: /\b(nerdiarla|nerdear\s*la|nerd\s*arla|nerd\s*diarla)\b/gi, replacement: 'Nerdearla' },
  { pattern: /\b(cones|konecs|conecs)\b/gi, replacement: 'Konex' }
];

/**
 * Normalizes Argentine phonetic misspellings of English technical terms
 */
export function normalizePhoneticTechTerms(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const rule of PHONETIC_TECH_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized;
}

/**
 * Detect technical terms in text and return matching definitions
 */
export function extractTechTerms(text: string): TechTerm[] {
  const lower = text.toLowerCase();
  const matched: TechTerm[] = [];
  const seen = new Set<string>();

  for (const [key, termObj] of Object.entries(TECH_GLOSSARY)) {
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
