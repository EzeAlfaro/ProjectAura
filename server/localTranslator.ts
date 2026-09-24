/**
 * Local High-Fidelity Conference Translator for Project Aura.
 * Provides instant, offline-capable technical translations (ES ⇄ EN & PT)
 * when Gemini API key is absent or during network hiccups in the venue.
 */

interface TranslationDictionary {
  [key: string]: { en: string; pt: string };
}

// Key conference & technical phrases
const PHRASE_DICTIONARY: [RegExp, { en: string; pt: string }][] = [
  // Greetings & Stage Intros
  [/^hola a todos,? bienvenidos?( a la charla( de hoy)?)?/i, { en: "Hello everyone, welcome to today's talk", pt: "Olá a todos, bem-vindos à palestra de hoje" }],
  [/^bienvenidos a nerdearla/i, { en: "Welcome to Nerdearla", pt: "Bem-vindos à Nerdearla" }],
  [/^muchas gracias a todos/i, { en: "Thank you very much everyone", pt: "Muito obrigado a todos" }],
  [/^muchas gracias por venir/i, { en: "Thank you so much for coming", pt: "Muito obrigado por terem vindo" }],
  [/^alguna pregunta( o duda)?/i, { en: "Any questions or comments?", pt: "Alguma pergunta ou dúvida?" }],
  [/^buenos d[ií]as a todos/i, { en: "Good morning everyone", pt: "Bom dia a todos" }],
  [/^buenas tardes a todos/i, { en: "Good afternoon everyone", pt: "Boa tarde a todos" }],
  [/^vamos a comenzar/i, { en: "Let's get started", pt: "Vamos começar" }],
  [/^en esta presentaci[oó]n vamos a ver/i, { en: "In this presentation we are going to look at", pt: "Nesta apresentação vamos ver" }],
  [/vamos a hablar de/i, { en: "we will talk about", pt: "vamos falar sobre" }],
  [/vamos a ver/i, { en: "we will see", pt: "vamos ver" }],
  [/vamos a/i, { en: "we are going to", pt: "vamos" }],


  // DevOps, Cloud & Architecture
  [/alta disponibilidad/i, { en: "high availability", pt: "alta disponibilidade" }],
  [/baja latencia/i, { en: "low latency", pt: "baixa latência" }],
  [/en producci[oó]n/i, { en: "in production", pt: "em produção" }],
  [/en tiempo real/i, { en: "in real-time", pt: "em tempo real" }],
  [/entorno de desarrollo/i, { en: "development environment", pt: "ambiente de desenvolvimento" }],
  [/balanceador de carga/i, { en: "load balancer", pt: "balanceador de carga" }],
  [/base de datos/i, { en: "database", pt: "banco de dados" }],
  [/tolerancia a fallos?/i, { en: "fault tolerance", pt: "tolerância a falhas" }],
  [/código abierto/i, { en: "open source", pt: "código aberto" }],
  [/red local/i, { en: "local network", pt: "rede local" }],
  [/consumo de memoria/i, { en: "memory consumption", pt: "consumo de memória" }],
  [/fuga de memoria/i, { en: "memory leak", pt: "vazamento de memória" }],
  [/hilos de ejecuci[oó]n/i, { en: "threads of execution", pt: "threads de execução" }],
  [/punto de entrada/i, { en: "entrypoint", pt: "ponto de entrada" }],
];

// Single word & connective translations for technical context
const WORD_DICT: Record<string, { en: string; pt: string }> = {
  // Connectors & Pronouns
  "hola": { en: "hello", pt: "olá" },
  "todos": { en: "everyone", pt: "todos" },
  "bienvenidos": { en: "welcome", pt: "bem-vindos" },
  "hoy": { en: "today", pt: "hoje" },
  "vamos": { en: "we are going", pt: "vamos" },
  "a": { en: "to", pt: "a" },
  "hablar": { en: "to talk", pt: "falar" },
  "de": { en: "about", pt: "sobre" },
  "del": { en: "of the", pt: "do" },
  "que": { en: "that", pt: "que" },
  "qué": { en: "what", pt: "o que" },
  "cómo": { en: "how", pt: "como" },
  "como": { en: "as", pt: "como" },
  "cuando": { en: "when", pt: "quando" },
  "cuándo": { en: "when", pt: "quando" },
  "donde": { en: "where", pt: "onde" },
  "dónde": { en: "where", pt: "onde" },
  "por": { en: "for", pt: "por" },
  "para": { en: "to", pt: "para" },
  "con": { en: "with", pt: "com" },
  "sin": { en: "without", pt: "sem" },
  "el": { en: "the", pt: "o" },
  "la": { en: "the", pt: "a" },
  "los": { en: "the", pt: "os" },
  "las": { en: "the", pt: "as" },
  "un": { en: "a", pt: "um" },
  "una": { en: "a", pt: "uma" },
  "unos": { en: "some", pt: "uns" },
  "unas": { en: "some", pt: "umas" },
  "y": { en: "and", pt: "e" },
  "o": { en: "or", pt: "ou" },
  "pero": { en: "but", pt: "mas" },
  "este": { en: "this", pt: "este" },
  "esta": { en: "this", pt: "esta" },
  "estos": { en: "these", pt: "estes" },
  "estas": { en: "these", pt: "estas" },
  "nuestro": { en: "our", pt: "nosso" },
  "nuestra": { en: "our", pt: "nossa" },
  "nuestros": { en: "our", pt: "nossos" },
  "nuestras": { en: "our", pt: "nossas" },

  // Verbs & Technical actions
  "es": { en: "is", pt: "é" },
  "son": { en: "are", pt: "são" },
  "está": { en: "is", pt: "está" },
  "están": { en: "are", pt: "estão" },
  "estamos": { en: "we are", pt: "estamos" },
  "tenemos": { en: "we have", pt: "temos" },
  "tiene": { en: "has", pt: "tem" },
  "tienen": { en: "have", pt: "têm" },
  "configurando": { en: "configuring", pt: "configurando" },
  "desplegando": { en: "deploying", pt: "implantando" },
  "corriendo": { en: "running", pt: "executando" },
  "ejecutando": { en: "executing", pt: "executando" },
  "probando": { en: "testing", pt: "testando" },
  "migrando": { en: "migrating", pt: "migrando" },
  "usando": { en: "using", pt: "usando" },
  "utilizando": { en: "using", pt: "utilizando" },
  "construyendo": { en: "building", pt: "construindo" },
  "optimizando": { en: "optimizing", pt: "otimizando" },
  "escalando": { en: "scaling", pt: "escalando" },
  "monitoreando": { en: "monitoring", pt: "monitorando" },
  "desarrollando": { en: "developing", pt: "desenvolvendo" },
  "desplegar": { en: "to deploy", pt: "implantar" },
  "configurar": { en: "to configure", pt: "configurar" },
  "ejecutar": { en: "to run", pt: "executar" },
  "escalar": { en: "to scale", pt: "escalar" },
  "monitorear": { en: "to monitor", pt: "monitorar" },
  "migrar": { en: "to migrate", pt: "migrar" },
  "conectar": { en: "to connect", pt: "conectar" },
  "funciona": { en: "works", pt: "funciona" },
  "funcionando": { en: "working", pt: "funcionando" },

  // Tech nouns
  "charla": { en: "talk", pt: "palestra" },
  "conferencia": { en: "conference", pt: "conferência" },
  "evento": { en: "event", pt: "evento" },
  "escenario": { en: "stage", pt: "palco" },
  "sala": { en: "room", pt: "sala" },
  "arquitectura": { en: "architecture", pt: "arquitetura" },
  "sistema": { en: "system", pt: "sistema" },
  "sistemas": { en: "systems", pt: "sistemas" },
  "aplicación": { en: "application", pt: "aplicação" },
  "aplicaciones": { en: "applications", pt: "aplicações" },
  "servicio": { en: "service", pt: "serviço" },
  "servicios": { en: "services", pt: "serviços" },
  "microservicios": { en: "microservices", pt: "microsserviços" },
  "servidor": { en: "server", pt: "servidor" },
  "servidores": { en: "servers", pt: "servidores" },
  "cliente": { en: "client", pt: "cliente" },
  "clientes": { en: "clients", pt: "clientes" },
  "código": { en: "code", pt: "código" },
  "datos": { en: "data", pt: "dados" },
  "red": { en: "network", pt: "rede" },
  "redes": { en: "networks", pt: "redes" },
  "seguridad": { en: "security", pt: "segurança" },
  "latencia": { en: "latency", pt: "latência" },
  "velocidad": { en: "speed", pt: "velocidade" },
  "rendimiento": { en: "performance", pt: "desempenho" },
  "problema": { en: "issue", pt: "problema" },
  "problemas": { en: "issues", pt: "problemas" },
  "solución": { en: "solution", pt: "solução" },
  "soluciones": { en: "solutions", pt: "soluções" },
  "equipo": { en: "team", pt: "equipe" },
  "equipos": { en: "teams", pt: "equipes" },
  "orador": { en: "speaker", pt: "palestrante" },
  "pregunta": { en: "question", pt: "pergunta" },
  "preguntas": { en: "questions", pt: "perguntas" },
  "ejemplo": { en: "example", pt: "exemplo" },
  "ahora": { en: "now", pt: "agora" },
  "después": { en: "afterwards", pt: "depois" },
  "antes": { en: "before", pt: "antes" },
  "muy": { en: "very", pt: "muito" },
  "más": { en: "more", pt: "mais" },
  "menos": { en: "less", pt: "menos" },
  "rápido": { en: "fast", pt: "rápido" },
  "fácil": { en: "easy", pt: "fácil" },
  "difícil": { en: "difficult", pt: "difícil" },
  "importante": { en: "important", pt: "importante" },
  "grande": { en: "large", pt: "grande" },
  "pequeño": { en: "small", pt: "pequeno" },
};

/**
 * Translates a phrase or sentence from Spanish to English and Portuguese locally.
 * Preserves IT terms, proper names, casing, and punctuation.
 */
export function translateConferenceTextLocally(spanishText: string): { enText: string; ptText: string } {
  let text = spanishText.trim();
  if (!text) {
    return { enText: '', ptText: '' };
  }

  // 1. Check for exact or regex phrase matches first
  let enWorking = text;
  let ptWorking = text;

  for (const [regex, trans] of PHRASE_DICTIONARY) {
    if (regex.test(enWorking)) {
      enWorking = enWorking.replace(regex, trans.en);
      ptWorking = ptWorking.replace(regex, trans.pt);
    }
  }

  // 2. Tokenize and substitute words in enWorking and ptWorking
  const enTokens = enWorking.split(/(\s+|[.,;!?()]+)/).map((token) => {
    const cleanLower = token.toLowerCase();
    if (WORD_DICT[cleanLower]) {
      const translated = WORD_DICT[cleanLower].en;
      if (token[0] && token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      }
      return translated;
    }
    return token;
  });

  const ptTokens = ptWorking.split(/(\s+|[.,;!?()]+)/).map((token) => {
    const cleanLower = token.toLowerCase();
    if (WORD_DICT[cleanLower]) {
      const translated = WORD_DICT[cleanLower].pt;
      if (token[0] && token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      }
      return translated;
    }
    return token;
  });

  let enResult = enTokens.join('');
  let ptResult = ptTokens.join('');


  // Clean double spaces
  enResult = enResult.replace(/\s{2,}/g, ' ').trim();
  ptResult = ptResult.replace(/\s{2,}/g, ' ').trim();

  return {
    enText: enResult,
    ptText: ptResult
  };
}
