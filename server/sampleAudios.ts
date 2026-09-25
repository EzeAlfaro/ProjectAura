import { SubtitleChunk } from './types.js';
import { extractTechTerms } from './glossary.js';

export interface SampleTalk {
  id: string;
  stageId: string;
  title: string;
  speaker: string;
  sourceLang: 'en' | 'es';
  track: string;
  youtubeId?: string;
  youtubeUrl?: string;
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
  },

  'talk-yt-peladonerd': {
    id: 'talk-yt-peladonerd',
    stageId: 'stage-1',
    title: 'Kubernetes en Producción: Desmitificando Clusters y Microservicios',
    speaker: 'Pablo Fredrikson (Pelado Nerd)',
    sourceLang: 'es',
    track: 'Escenario Principal (Keynote)',
    youtubeId: 'IdOO3R_1F08',
    youtubeUrl: 'https://www.youtube.com/watch?v=IdOO3R_1F08',
    chunks: [
      {
        originalText: "Hola gente de Nerdearla, bienvenidos a esta charla sobre Kubernetes en producción sin morir en el intento.",
        esText: "Hola gente de Nerdearla, bienvenidos a esta charla sobre Kubernetes en producción sin morir en el intento.",
        enText: "Hello Nerdearla folks, welcome to this talk about Kubernetes in production without losing your mind.",
        ptText: "Olá pessoal do Nerdearla, bem-vindos a esta palestra sobre Kubernetes em produção sem desespero.",
        delayMs: 3400
      },
      {
        originalText: "Cuando empezamos a trabajar con microservicios, el primer error es pensar que necesitamos cincuenta pods para una API simple.",
        esText: "Cuando empezamos a trabajar con microservicios, el primer error es pensar que necesitamos cincuenta pods para una API simple.",
        enText: "When we start working with microservices, the first mistake is thinking we need fifty pods for a simple API.",
        ptText: "Quando começamos a trabalhar com microsserviços, o primeiro erro é achar que precisamos de cinquenta pods para uma API simples.",
        delayMs: 3800
      },
      {
        originalText: "Vamos a ver cómo configurar réplicas, límites de memoria y recursos en nuestros deployment manifests con YAML.",
        esText: "Vamos a ver cómo configurar réplicas, límites de memoria y recursos en nuestros deployment manifests con YAML.",
        enText: "Let's see how to configure replicas, memory limits, and resources in our YAML deployment manifests.",
        ptText: "Vamos ver como configurar réplicas, limites de memória e recursos em nossos deployment manifests com YAML.",
        delayMs: 3900
      },
      {
        originalText: "Si un pod se queda sin memoria en el nodo, el OOMKilled de Linux lo va a matar instantáneamente.",
        esText: "Si un pod se queda sin memoria en el nodo, el OOMKilled de Linux lo va a matar instantáneamente.",
        enText: "If a pod runs out of memory on the node, the Linux OOMKilled mechanism will terminate it instantly.",
        ptText: "Se um pod ficar sem memória no nó, o OOMKilled do Linux vai matá-lo instantaneamente.",
        delayMs: 3600
      },
      {
        originalText: "Implementamos probes de liveness y readiness para garantizar que el ingress controller no envíe tráfico a instancias caídas.",
        esText: "Implementamos probes de liveness y readiness para garantizar que el ingress controller no envíe tráfico a instancias caídas.",
        enText: "We implement liveness and readiness probes to guarantee that the ingress controller doesn't route traffic to unhealthy instances.",
        ptText: "Implementamos probes de liveness e readiness para garantir que o ingress controller não envie tráfego para instâncias inoperantes.",
        delayMs: 4000
      },
      {
        originalText: "En conclusión: mantengan sus configuraciones simples, monitoreen con Prometheus y automaticen sus despliegues con GitOps.",
        esText: "En conclusión: mantengan sus configuraciones simples, monitoreen con Prometheus y automaticen sus despliegues con GitOps.",
        enText: "In conclusion: keep your configurations simple, monitor with Prometheus, and automate your deployments with GitOps.",
        ptText: "Em conclusão: mantenham suas configurações simples, monitorem com Prometheus e automatizem seus deploys com GitOps.",
        delayMs: 4200
      }
    ]
  },

  'talk-yt-argorollouts': {
    id: 'talk-yt-argorollouts',
    stageId: 'stage-2',
    title: 'Argo Rollouts y Progressive Delivery en Entornos Críticos',
    speaker: 'Lucas Blanco (Cloud & DevOps Architect)',
    sourceLang: 'es',
    track: 'Escenario Cloud & DevOps',
    youtubeId: 'sIprvJ2i1lg',
    youtubeUrl: 'https://www.youtube.com/watch?v=sIprvJ2i1lg',
    chunks: [
      {
        originalText: "Buenas tardes a todos en Nerdearla. Hoy vamos a hablar de cómo implementar Argo Rollouts para progressive delivery.",
        esText: "Buenas tardes a todos en Nerdearla. Hoy vamos a hablar de cómo implementar Argo Rollouts para progressive delivery.",
        enText: "Good afternoon everyone at Nerdearla. Today we are talking about implementing Argo Rollouts for progressive delivery.",
        ptText: "Boa tarde a todos no Nerdearla. Hoje vamos falar sobre como implementar Argo Rollouts para progressive delivery.",
        delayMs: 3300
      },
      {
        originalText: "El despliegue tradicional tipo recreación o rolling update estándar a veces no es suficiente para evitar caídas masivas en producción.",
        esText: "El despliegue tradicional tipo recreación o rolling update estándar a veces no es suficiente para evitar caídas masivas en producción.",
        enText: "Traditional deployment like recreation or standard rolling update is sometimes not enough to avoid massive outages in production.",
        ptText: "O deploy tradicional do tipo recreação ou rolling update padrão às vezes não é suficiente para evitar quedas em massa na produção.",
        delayMs: 3900
      },
      {
        originalText: "Con Canary deployments podemos enviar sólo el cinco por ciento del tráfico de producción a la nueva versión candidata.",
        esText: "Con Canary deployments podemos enviar sólo el cinco por ciento del tráfico de producción a la nueva versión candidata.",
        enText: "With Canary deployments we can route just five percent of production traffic to the new candidate release.",
        ptText: "Com Canary deployments podemos enviar apenas cinco por cento do tráfego de produção para a nova versão candidata.",
        delayMs: 3800
      },
      {
        originalText: "Si las métricas de error rate en Datadog o Prometheus aumentan, Argo ejecuta un rollback automático en milisegundos.",
        esText: "Si las métricas de error rate en Datadog o Prometheus aumentan, Argo ejecuta un rollback automático en milisegundos.",
        enText: "If error rate metrics in Datadog or Prometheus increase, Argo triggers an automated rollback in milliseconds.",
        ptText: "Se as métricas de taxa de erro no Datadog ou Prometheus aumentarem, o Argo executa um rollback automático em milissegundos.",
        delayMs: 4000
      },
      {
        originalText: "Esto nos permite iterar con total confianza y sin riesgo de interrumpir el servicio a los usuarios finales.",
        esText: "Esto nos permite iterar con total confianza y sin riesgo de interrumpir el servicio a los usuarios finales.",
        enText: "This allows us to iterate with absolute confidence and without risk of disrupting service for end users.",
        ptText: "Isso nos permite iterar com total confiança e sem risco de interromper o serviço aos usuários finais.",
        delayMs: 3600
      }
    ]
  },

  'talk-yt-testingk8s': {
    id: 'talk-yt-testingk8s',
    stageId: 'stage-3',
    title: 'Testing y Chaos Engineering en Clusters de Kubernetes',
    speaker: 'Carlos Gauto (Lead SRE)',
    sourceLang: 'es',
    track: 'Escenario QA & SRE',
    youtubeId: 'iqVGWI1Y880',
    youtubeUrl: 'https://www.youtube.com/watch?v=iqVGWI1Y880',
    chunks: [
      {
        originalText: "Hola comunidad. En esta sesión vamos a explorar cómo testear infraestructura antes de que llegue a producción.",
        esText: "Hola comunidad. En esta sesión vamos a explorar cómo testear infraestructura antes de que llegue a producción.",
        enText: "Hello community. In this session we will explore how to test infrastructure before it hits production.",
        ptText: "Olá comunidade. Nesta sessão vamos explorar como testar infraestrutura antes de chegar em produção.",
        delayMs: 3400
      },
      {
        originalText: "El testing moderno de contenedores va mucho más allá de simples pruebas unitarias en el pipeline de CI.",
        esText: "El testing moderno de contenedores va mucho más allá de simples pruebas unitarias en el pipeline de CI.",
        enText: "Modern container testing goes far beyond simple unit tests inside the CI pipeline.",
        ptText: "O teste moderno de contêineres vai muito além de simples testes unitários na esteira de CI.",
        delayMs: 3700
      },
      {
        originalText: "Utilizamos Chaos Mesh para inyectar fallas de red, latencia de disco y caída aleatoria de nodos y pods.",
        esText: "Utilizamos Chaos Mesh para inyectar fallas de red, latencia de disco y caída aleatoria de nodos y pods.",
        enText: "We use Chaos Mesh to inject network failures, disk latency, and random node or pod termination.",
        ptText: "Utilizamos Chaos Mesh para injetar falhas de rede, latência de disco e queda aleatória de nós e pods.",
        delayMs: 3800
      },
      {
        originalText: "Así descubrimos cuellos de botella antes de que un evento con miles de usuarios concurrentes colapse la plataforma.",
        esText: "Así descubrimos cuellos de botella antes de que un evento con miles de usuarios concurrentes colapse la plataforma.",
        enText: "That's how we discover bottlenecks before a massive event with thousands of concurrent users crashes the platform.",
        ptText: "Assim descobrimos gargalos antes que um evento com milhares de usuários simultâneos colapse a plataforma.",
        delayMs: 4100
      },
      {
        originalText: "La resiliencia no se asume; se prueba empíricamente en cada commit y en cada despliegue.",
        esText: "La resiliencia no se asume; se prueba empíricamente en cada commit y en cada despliegue.",
        enText: "Resilience is never assumed; it is empirically proven on every commit and deployment.",
        ptText: "A resiliência não se presume; é comprovada empiricamente em cada commit e em cada deploy.",
        delayMs: 3500
      }
    ]
  }
};
