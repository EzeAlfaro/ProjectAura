import { SubtitleChunk } from './types.js';
import { extractTechTerms } from './glossary.js';

export interface SampleTalk {
  id: string;
  stageId: string;
  title: string;
  speaker: string;
  sourceLang: 'en' | 'es';
  track: string;
  chunks: {
    originalText: string;
    esText: string;
    enText: string;
    ptText: string;
    delayMs: number;
  }[];
}

export const SAMPLE_TALKS: Record<string, SampleTalk> = {
  'talk-en-k8s': {
    id: 'talk-en-k8s',
    stageId: 'stage-1',
    title: 'Scaling Cloud Native Workloads with Kubernetes, eBPF & Zero-Trust',
    speaker: 'Alex Rivera (Staff Infrastructure Engineer)',
    sourceLang: 'en',
    track: 'Escenario Principal (Keynote)',
    chunks: [
      {
        originalText: "Hello everyone, and welcome to Nerdearla 2026! It is an absolute pleasure to be speaking here in Buenos Aires today.",
        esText: "¡Hola a todos y bienvenidos a Nerdearla 2026! Es un absoluto placer estar exponiendo hoy aquí en Buenos Aires.",
        enText: "Hello everyone, and welcome to Nerdearla 2026! It is an absolute pleasure to be speaking here in Buenos Aires today.",
        ptText: "Olá a todos e bem-vindos ao Nerdearla 2026! É um prazer absoluto estar palestrando aqui em Buenos Aires hoje.",
        delayMs: 3200
      },
      {
        originalText: "Today we are diving into how we scaled our distributed Kubernetes clusters across three multi-region cloud providers.",
        esText: "Hoy vamos a profundizar en cómo escalamos nuestros clusters distribuidos de Kubernetes a través de tres proveedores de nube multirregión.",
        enText: "Today we are diving into how we scaled our distributed Kubernetes clusters across three multi-region cloud providers.",
        ptText: "Hoje vamos nos aprofundar em como escalamos nossos clusters distribuídos de Kubernetes em três provedores de nuvem multirregião.",
        delayMs: 3800
      },
      {
        originalText: "When dealing with thousands of pods, traditional iptables routing creates severe packet latency and CPU overhead.",
        esText: "Al lidiar con miles de pods, el enrutamiento tradicional con iptables crea una severa latencia de paquetes y sobrecarga de CPU.",
        enText: "When dealing with thousands of pods, traditional iptables routing creates severe packet latency and CPU overhead.",
        ptText: "Ao lidar com milhares de pods, o roteamento tradicional com iptables cria uma latência severa de pacotes e sobrecarga de CPU.",
        delayMs: 4000
      },
      {
        originalText: "By leveraging eBPF directly inside the Linux kernel, we bypassed user-space context switches completely.",
        esText: "Al aprovechar eBPF directamente dentro del kernel de Linux, evitamos por completo los cambios de contexto del espacio de usuario.",
        enText: "By leveraging eBPF directly inside the Linux kernel, we bypassed user-space context switches completely.",
        ptText: "Ao aproveitar o eBPF diretamente dentro do kernel Linux, contornamos completamente as trocas de contexto do espaço do usuário.",
        delayMs: 3900
      },
      {
        originalText: "Our CI/CD pipelines with GitOps and Terraform ensure that every manifest change undergoes automated linting and security scans.",
        esText: "Nuestras canalizaciones de CI/CD con GitOps y Terraform garantizan que cada cambio de manifiesto pase por análisis de código y seguridad automatizados.",
        enText: "Our CI/CD pipelines with GitOps and Terraform ensure that every manifest change undergoes automated linting and security scans.",
        ptText: "Nossas esteiras de CI/CD com GitOps e Terraform garantem que cada alteração de manifesto passe por linting automatizado e varreduras de segurança.",
        delayMs: 4200
      },
      {
        originalText: "We also integrated Prometheus metrics and Grafana dashboards with OpenTelemetry tracing to gain nanosecond-level visibility.",
        esText: "También integramos métricas de Prometheus y dashboards de Grafana con rastreo de OpenTelemetry para obtener visibilidad a nivel de nanosegundos.",
        enText: "We also integrated Prometheus metrics and Grafana dashboards with OpenTelemetry tracing to gain nanosecond-level visibility.",
        ptText: "Também integramos métricas do Prometheus e painéis do Grafana com rastreamento OpenTelemetry para obter visibilidade em nível de nanossegundos.",
        delayMs: 4100
      },
      {
        originalText: "The lesson here is simple: never treat your infrastructure as pets; declare everything as immutable code.",
        esText: "La lección aquí es sencilla: nunca traten a su infraestructura como mascotas; declaren todo como código inmutable.",
        enText: "The lesson here is simple: never treat your infrastructure as pets; declare everything as immutable code.",
        ptText: "A lição aqui é simples: nunca trate sua infraestrutura como animais de estimação; declare tudo como código imutável.",
        delayMs: 3500
      }
    ]
  },

  'talk-es-devops': {
    id: 'talk-es-devops',
    stageId: 'stage-2',
    title: 'Resiliencia, Observabilidad y Cultura de Sistemas en Producción',
    speaker: 'Valeria Gómez (SRE Principal en Sysarmy)',
    sourceLang: 'es',
    track: 'Escenario Cloud & DevOps (Sysarmy)',
    chunks: [
      {
        originalText: "Muy buenas tardes a toda la comunidad de Sysarmy. Es un orgullo tremendo volver a vernos en otra edición de Nerdearla.",
        esText: "Muy buenas tardes a toda la comunidad de Sysarmy. Es un orgullo tremendo volver a vernos en otra edición de Nerdearla.",
        enText: "Good afternoon to the entire Sysarmy community. It is a tremendous honor to see you all again at another edition of Nerdearla.",
        ptText: "Boa tarde a toda a comunidade Sysarmy. É um grande orgulho nos encontrarmos novamente em outra edição do Nerdearla.",
        delayMs: 3300
      },
      {
        originalText: "El año pasado nuestro cluster en producción sufrió una caída en pleno viernes a las seis de la tarde durante un deploy.",
        esText: "El año pasado nuestro cluster en producción sufrió una caída en pleno viernes a las seis de la tarde durante un deploy.",
        enText: "Last year our production cluster suffered an outage right on a Friday at 6 PM during a deployment.",
        ptText: "No ano passado, nosso cluster de produção sofreu uma queda bem numa sexta-feira às 18h durante um deploy.",
        delayMs: 3900
      },
      {
        originalText: "Aprendimos que la consistencia eventual y los microservicios sin circuit breakers son una receta directa para la catástrofe.",
        esText: "Aprendimos que la consistencia eventual y los microservicios sin circuit breakers son una receta directa para la catástrofe.",
        enText: "We learned that eventual consistency and microservices without circuit breakers are a direct recipe for disaster.",
        ptText: "Aprendemos que consistência eventual e microsserviços sem circuit breakers são uma receita direta para a catástrofe.",
        delayMs: 4100
      },
      {
        originalText: "Reescribimos los servicios críticos de red en Rust compilados con WebAssembly para garantizar seguridad en memoria.",
        esText: "Reescribimos los servicios críticos de red en Rust compilados con WebAssembly para garantizar seguridad en memoria.",
        enText: "We rewrote critical networking services in Rust compiled with WebAssembly to guarantee memory safety.",
        ptText: "Reescrevemos serviços críticos de rede em Rust compilados com WebAssembly para garantir segurança de memória.",
        delayMs: 3800
      },
      {
        originalText: "Migramos toda la comunicación interna a gRPC con HTTP/2 y establecimos políticas de Zero Trust.",
        esText: "Migramos toda la comunicación interna a gRPC con HTTP/2 y establecimos políticas de Zero Trust.",
        enText: "We migrated all internal communication to gRPC with HTTP/2 and established Zero Trust policies.",
        ptText: "Migramos toda a comunicação interna para gRPC com HTTP/2 e estabelecemos políticas de Zero Trust.",
        delayMs: 3600
      },
      {
        originalText: "Gracias al equipo de guardia y a las alertas automatizadas, reducimos el MTTR de dos horas a menos de tres minutos.",
        esText: "Gracias al equipo de guardia y a las alertas automatizadas, reducimos el MTTR de dos horas a menos de tres minutos.",
        enText: "Thanks to the on-call team and automated alerts, we reduced MTTR from two hours to under three minutes.",
        ptText: "Graças à equipe de plantão e aos alertas automatizados, reduzimos o MTTR de duas horas para menos de três minutos.",
        delayMs: 3700
      }
    ]
  },

  'talk-es-ai': {
    id: 'talk-es-ai',
    stageId: 'stage-3',
    title: 'Desplegando Modelos Gemini y Gemma para Inferencia en Tiempo Real',
    speaker: 'Federico Balbi (AI Research Lead)',
    sourceLang: 'es',
    track: 'Escenario Data & AI',
    chunks: [
      {
        originalText: "Bienvenidos al track de Inteligencia Artificial. Hoy vamos a experimentar con la API de Gemini Live y modelos Gemma locales.",
        esText: "Bienvenidos al track de Inteligencia Artificial. Hoy vamos a experimentar con la API de Gemini Live y modelos Gemma locales.",
        enText: "Welcome to the Artificial Intelligence track. Today we are going to experiment with the Gemini Live API and local Gemma models.",
        ptText: "Bem-vindos à trilha de Inteligência Artificial. Hoje vamos experimentar a API Gemini Live e modelos Gemma locais.",
        delayMs: 3500
      },
      {
        originalText: "Combinar arquitecturas RAG con bases de datos vectoriales nos permite responder consultas de documentación técnica sin alucinaciones.",
        esText: "Combinar arquitecturas RAG con bases de datos vectoriales nos permite responder consultas de documentación técnica sin alucinaciones.",
        enText: "Combining RAG architectures with vector databases allows us to answer technical documentation queries without hallucinations.",
        ptText: "Combinar arquiteturas RAG com bancos de dados vetoriais nos permite responder a dúvidas de documentação técnica sem alucinações.",
        delayMs: 4200
      },
      {
        originalText: "Con el procesamiento multimodal de Gemini 2.0 podemos alimentar audio PCM en tiempo real y recibir transcripción instantánea.",
        esText: "Con el procesamiento multimodal de Gemini 2.0 podemos alimentar audio PCM en tiempo real y recibir transcripción instantánea.",
        enText: "With Gemini 2.0 multimodal processing we can stream real-time PCM audio and receive instant transcription.",
        ptText: "Com o processamento multimodal do Gemini 2.0, podemos transmitir áudio PCM em tempo real e receber transcrição instantânea.",
        delayMs: 3900
      }
    ]
  },

  'talk-es-midudev': {
    id: 'talk-es-midudev',
    stageId: 'stage-1',
    title: 'La programación ha muerto: Programando con IA y Agentes en 2026',
    speaker: 'Miguel Ángel Durán (midudev)',
    sourceLang: 'es',
    track: 'Escenario Principal (Keynote)',
    chunks: [
      {
        originalText: "¡Hola a todos! Bienvenidos a mi charla en Nerdearla. Hoy quiero hablar de cómo la inteligencia artificial ha transformado radicalmente nuestro flujo de desarrollo.",
        esText: "¡Hola a todos! Bienvenidos a mi charla en Nerdearla. Hoy quiero hablar de cómo la inteligencia artificial ha transformado radicalmente nuestro flujo de desarrollo.",
        enText: "Hello everyone! Welcome to my talk at Nerdearla. Today I want to talk about how artificial intelligence has radically transformed our development workflow.",
        ptText: "Olá a todos! Bem-vindos à minha palestra no Nerdearla. Hoje quero falar sobre como a inteligência artificial transformou radicalmente nosso fluxo de desenvolvimento.",
        delayMs: 3400
      },
      {
        originalText: "Muchos dicen que programar ha muerto. Lo que ha muerto es escribir boilerplate aburrido y pelearse con errores sintácticos de sintaxis.",
        esText: "Muchos dicen que programar ha muerto. Lo que ha muerto es escribir boilerplate aburrido y pelearse con errores sintácticos de sintaxis.",
        enText: "Many say programming is dead. What is truly dead is writing boring boilerplate and wrestling with minor syntax errors.",
        ptText: "Muitos dizem que programar morreu. O que realmente morreu é escrever boilerplate chato e brigar com pequenos erros de sintaxe.",
        delayMs: 3800
      },
      {
        originalText: "Ahora nos convertimos en arquitectos de software que orquestan modelos como Gemini 2.5 Flash y agentes autónomos para entregar valor de negocio.",
        esText: "Ahora nos convertimos en arquitectos de software que orquestan modelos como Gemini 2.5 Flash y agentes autónomos para entregar valor de negocio.",
        enText: "Now we become software architects who orchestrate models like Gemini 2.5 Flash and autonomous agents to deliver real business value.",
        ptText: "Agora nos tornamos arquitetos de software que orquestram modelos como o Gemini 2.5 Flash e agentes autônomos para entregar valor real de negócios.",
        delayMs: 4000
      }
    ]
  },

  'talk-en-thor': {
    id: 'talk-en-thor',
    stageId: 'stage-2',
    title: 'Building Multilingual AI Agents with WebSockets and Real-Time Audio',
    speaker: 'Thor Schaeff (Developer Advocate & Open Source Contributor)',
    sourceLang: 'en',
    track: 'Escenario Cloud & DevOps',
    chunks: [
      {
        originalText: "Welcome everyone! Today I want to explore how we can bridge speech, multimodal models, and distributed agents in real-time.",
        esText: "¡Bienvenidos a todos! Hoy quiero explorar cómo podemos conectar el habla, modelos multimodales y agentes distribuidos en tiempo real.",
        enText: "Welcome everyone! Today I want to explore how we can bridge speech, multimodal models, and distributed agents in real-time.",
        ptText: "Bem-vindos a todos! Hoje quero explorar como podemos conectar fala, modelos multimodais e agentes distribuídos em tempo real.",
        delayMs: 3500
      },
      {
        originalText: "Traditional transcription relied on batching audio every five seconds, creating terrible latency for conference attendees.",
        esText: "La transcripción tradicional dependía de acumular audio cada cinco segundos, creando una latencia terrible para los asistentes de la conferencia.",
        enText: "Traditional transcription relied on batching audio every five seconds, creating terrible latency for conference attendees.",
        ptText: "A transcrição tradicional dependia do envio em lotes a cada cinco segundos, criando uma latência terrível para os participantes da conferência.",
        delayMs: 3900
      },
      {
        originalText: "By pairing low-latency streaming PCM with Gemini 2.5 Flash, we get instant multilingual translation without losing technical context.",
        esText: "Al combinar streaming PCM de baja latencia con Gemini 2.5 Flash, obtenemos traducción multilingüe instantánea sin perder contexto técnico.",
        enText: "By pairing low-latency streaming PCM with Gemini 2.5 Flash, we get instant multilingual translation without losing technical context.",
        ptText: "Ao combinar streaming PCM de baixa latência com o Gemini 2.5 Flash, obtemos tradução multilíngue instantânea sem perder o contexto técnico.",
        delayMs: 4100
      }
    ]
  }
};
