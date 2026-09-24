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
        es: "¡Hola a todos y bienvenidos a Nerdearla 2026! Es un absoluto placer estar exponiendo hoy aquí en Buenos Aires.",
        en: "Hello everyone, and welcome to Nerdearla 2026! It is an absolute pleasure to be speaking here in Buenos Aires today.",
        pt: "Olá a todos e bem-vindos ao Nerdearla 2026! É um prazer absoluto estar palestrando aqui em Buenos Aires hoje.",
        delayMs: 3200
      },
      {
        originalText: "Today we are diving into how we scaled our distributed Kubernetes clusters across three multi-region cloud providers.",
        es: "Hoy vamos a profundizar en cómo escalamos nuestros clusters distribuidos de Kubernetes a través de tres proveedores de nube multirregión.",
        en: "Today we are diving into how we scaled our distributed Kubernetes clusters across three multi-region cloud providers.",
        pt: "Hoje vamos nos aprofundar em como escalamos nossos clusters distribuídos de Kubernetes em três provedores de nuvem multirregião.",
        delayMs: 3800
      },
      {
        originalText: "When dealing with thousands of pods, traditional iptables routing creates severe packet latency and CPU overhead.",
        es: "Al lidiar con miles de pods, el enrutamiento tradicional con iptables crea una severa latencia de paquetes y sobrecarga de CPU.",
        en: "When dealing with thousands of pods, traditional iptables routing creates severe packet latency and CPU overhead.",
        pt: "Ao lidar com milhares de pods, o roteamento tradicional com iptables cria uma latência severa de pacotes e sobrecarga de CPU.",
        delayMs: 4000
      },
      {
        originalText: "By leveraging eBPF directly inside the Linux kernel, we bypassed user-space context switches completely.",
        es: "Al aprovechar eBPF directamente dentro del kernel de Linux, evitamos por completo los cambios de contexto del espacio de usuario.",
        en: "By leveraging eBPF directly inside the Linux kernel, we bypassed user-space context switches completely.",
        pt: "Ao aproveitar o eBPF diretamente dentro do kernel Linux, contornamos completamente as trocas de contexto do espaço do usuário.",
        delayMs: 3900
      },
      {
        originalText: "Our CI/CD pipelines with GitOps and Terraform ensure that every manifest change undergoes automated linting and security scans.",
        es: "Nuestras canalizaciones de CI/CD con GitOps y Terraform garantizan que cada cambio de manifiesto pase por análisis de código y seguridad automatizados.",
        en: "Our CI/CD pipelines with GitOps and Terraform ensure that every manifest change undergoes automated linting and security scans.",
        pt: "Nossas esteiras de CI/CD com GitOps e Terraform garantem que cada alteração de manifesto passe por linting automatizado e varreduras de segurança.",
        delayMs: 4200
      },
      {
        originalText: "We also integrated Prometheus metrics and Grafana dashboards with OpenTelemetry tracing to gain nanosecond-level visibility.",
        es: "También integramos métricas de Prometheus y dashboards de Grafana con rastreo de OpenTelemetry para obtener visibilidad a nivel de nanosegundos.",
        en: "We also integrated Prometheus metrics and Grafana dashboards with OpenTelemetry tracing to gain nanosecond-level visibility.",
        pt: "Também integramos métricas do Prometheus e painéis do Grafana com rastreamento OpenTelemetry para obter visibilidade em nível de nanossegundos.",
        delayMs: 4100
      },
      {
        originalText: "The lesson here is simple: never treat your infrastructure as pets; declare everything as immutable code.",
        es: "La lección aquí es sencilla: nunca traten a su infraestructura como mascotas; declaren todo como código inmutable.",
        en: "The lesson here is simple: never treat your infrastructure as pets; declare everything as immutable code.",
        pt: "A lição aqui é simples: nunca trate sua infraestrutura como animais de estimação; declare tudo como código imutável.",
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
        es: "Muy buenas tardes a toda la comunidad de Sysarmy. Es un orgullo tremendo volver a vernos en otra edición de Nerdearla.",
        en: "Good afternoon to the entire Sysarmy community. It is a tremendous honor to see you all again at another edition of Nerdearla.",
        pt: "Boa tarde a toda a comunidade Sysarmy. É um grande orgulho nos encontrarmos novamente em outra edição do Nerdearla.",
        delayMs: 3300
      },
      {
        originalText: "El año pasado nuestro cluster en producción sufrió una caída en pleno viernes a las seis de la tarde durante un deploy.",
        es: "El año pasado nuestro cluster en producción sufrió una caída en pleno viernes a las seis de la tarde durante un deploy.",
        en: "Last year our production cluster suffered an outage right on a Friday at 6 PM during a deployment.",
        pt: "No ano passado, nosso cluster de produção sofreu uma queda bem numa sexta-feira às 18h durante um deploy.",
        delayMs: 3900
      },
      {
        originalText: "Aprendimos que la consistencia eventual y los microservicios sin circuit breakers son una receta directa para la catástrofe.",
        es: "Aprendimos que la consistencia eventual y los microservicios sin circuit breakers son una receta directa para la catástrofe.",
        en: "We learned that eventual consistency and microservices without circuit breakers are a direct recipe for disaster.",
        pt: "Aprendemos que consistência eventual e microsserviços sem circuit breakers são uma receita direta para a catástrofe.",
        delayMs: 4100
      },
      {
        originalText: "Reescribimos los servicios críticos de red en Rust compilados con WebAssembly para garantizar seguridad en memoria.",
        es: "Reescribimos los servicios críticos de red en Rust compilados con WebAssembly para garantizar seguridad en memoria.",
        en: "We rewrote critical networking services in Rust compiled with WebAssembly to guarantee memory safety.",
        pt: "Reescrevemos serviços críticos de rede em Rust compilados com WebAssembly para garantir segurança de memória.",
        delayMs: 3800
      },
      {
        originalText: "Migramos toda la comunicación interna a gRPC con HTTP/2 y establecimos políticas de Zero Trust.",
        es: "Migramos toda la comunicación interna a gRPC con HTTP/2 y establecimos políticas de Zero Trust.",
        en: "We migrated all internal communication to gRPC with HTTP/2 and established Zero Trust policies.",
        pt: "Migramos toda a comunicação interna para gRPC com HTTP/2 e estabelecemos políticas de Zero Trust.",
        delayMs: 3600
      },
      {
        originalText: "Gracias al equipo de guardia y a las alertas automatizadas, reducimos el MTTR de dos horas a menos de tres minutos.",
        es: "Gracias al equipo de guardia y a las alertas automatizadas, reducimos el MTTR de dos horas a menos de tres minutos.",
        en: "Thanks to the on-call team and automated alerts, we reduced MTTR from two hours to under three minutes.",
        pt: "Graças à equipe de plantão e aos alertas automatizados, reduzimos o MTTR de duas horas para menos de três minutos.",
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
        es: "Bienvenidos al track de Inteligencia Artificial. Hoy vamos a experimentar con la API de Gemini Live y modelos Gemma locales.",
        en: "Welcome to the Artificial Intelligence track. Today we are going to experiment with the Gemini Live API and local Gemma models.",
        pt: "Bem-vindos à trilha de Inteligência Artificial. Hoje vamos experimentar a API Gemini Live e modelos Gemma locais.",
        delayMs: 3500
      },
      {
        originalText: "Combinar arquitecturas RAG con bases de datos vectoriales nos permite responder consultas de documentación técnica sin alucinaciones.",
        es: "Combinar arquitecturas RAG con bases de datos vectoriales nos permite responder consultas de documentación técnica sin alucinaciones.",
        en: "Combining RAG architectures with vector databases allows us to answer technical documentation queries without hallucinations.",
        pt: "Combinar arquiteturas RAG com bancos de dados vetoriais nos permite responder a dúvidas de documentação técnica sem alucinações.",
        delayMs: 4200
      },
      {
        originalText: "Con el procesamiento multimodal de Gemini 2.0 podemos alimentar audio PCM en tiempo real y recibir transcripción instantánea.",
        es: "Con el procesamiento multimodal de Gemini 2.0 podemos alimentar audio PCM en tiempo real y recibir transcripción instantánea.",
        en: "With Gemini 2.0 multimodal processing we can stream real-time PCM audio and receive instant transcription.",
        pt: "Com o processamento multimodal do Gemini 2.0, podemos transmitir áudio PCM em tempo real e receber transcrição instantânea.",
        delayMs: 3900
      }
    ]
  }
};
