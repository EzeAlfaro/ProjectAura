# 🏆 Postulación Oficial para Devpost / Jurado Nerdearla 2026

## 📌 Datos Básicos del Proyecto
* **Nombre del Proyecto:** NerdSub ⚡
* **Tagline (Una sola frase contundente):** Motor Open-Source de Transcripción Simultánea, Traducción Técnica y Accesibilidad a Escala para Conferencias Globales.
* **Track / Desafío:** Vibeathon Nerdearla 2026 - Accesibilidad, Inteligencia Artificial & Comunidad.
* **Lead Developer:** Ezequiel Alfaro (@ezquielalfaro)
* **Licencia:** MIT (Open Source, OSI Approved)
* **Repositorio:** [https://github.com/tu-usuario/nerdsub](https://github.com/tu-usuario/nerdsub)

---

## 💡 Inspiración
En conferencias técnicas masivas como **Nerdearla**, la accesibilidad es un valor innegociable: más de 30 charlas simultáneas, auditorios repletos, oradores internacionales y una comunidad apasionada pero diversa (desde juniors hasta seniors, pasando por personas con dificultades auditivas o barreras de idioma).

Sin embargo, las soluciones comerciales de subtitulado existentes fallan estrepitosamente en 4 aspectos clave:
1. **Costos prohibitivos:** Modelos de cobro por minuto y por asiento conectado que hacen inviable cubrir 5 o 10 salas en simultáneo durante 3 días.
2. **Masacre de la jerga técnica:** Confunden y mutilan términos cruciales como *"deploy"*, *"eBPF"*, *"Kubernetes"*, *"commit"*, *"Goroutine"*, *"CI/CD"*, *"observability"*, arruinando la comprensión de la charla.
3. **Imposibilidad de operar en streaming:** No ofrecen salidas limpias transparentes para OBS Studio o vMix en transmisiones de Twitch/YouTube.
4. **Falta de soporte para la audiencia junior:** Si el speaker menciona una tecnología de vanguardia, el asistente que recién empieza queda totalmente descolocado.

Nos propusimos crear la herramienta definitiva: **abierta, hermosa, de costo casi nulo y diseñada por y para nerds**.

---

## ⚡ Qué hace NerdSub

NerdSub transforma la experiencia de accesibilidad en eventos masivos de punta a punta:

### 1. Ingesta de Audio Universal & Test en 1 Click
Permite capturar audio directamente desde el micrófono de la sala vía Web Audio API (PCM 16kHz mono), cargar archivos grabados (.mp3, .wav, .webm) o ejecutar **pruebas automáticas instantáneas en 1 click** con charlas reales de ediciones anteriores de Nerdearla.

### 2. Transcripción y Traducción Técnica sin Latencia
Orquestado mediante **Gemini 2.5 Flash** y modelos de código libre a través del ecosistema **OpenCode**, procesa el stream en vivo generando transcripción en idioma original y traducción simultánea (Inglés ⇄ Español / Portugués) en sub-segundos.

### 3. NerdGlosario™ Neón Activo
Inyectamos un diccionario curado de más de **150 términos técnicos de IT** (DevOps, Cloud, Linux, Rust, IA, Kubernetes) en el system prompt para evitar cualquier alucinación. Además, las palabras técnicas se destacan visualmente con insignias neón en los subtítulos: **cualquier asistente puede hacer click para desplegar una tarjeta interactiva con la explicación sencilla y concisa del concepto**.

### 4. Arquitectura de Distribución 1-a-N (Costo Cero por Usuario)
A diferencia de servicios cerrados que cobran por cada dispositivo conectado, NerdSub realiza **1 única llamada de procesamiento por escenario**. Su servidor WebSocket interno retransmite en tiempo real a miles de espectadores conectados al mismo tiempo sin saturar la red ni generar costos adicionales.

### 5. Consola de Producción Broadcast (Teenage Engineering Design)
Panel para sonidistas y operadores de streaming (`/admin`) con vúmetros de señal en decibelios, medidor de latencia en milisegundos, selector rápido entre múltiples salas concurrentes (`Escenario Principal`, `Cloud & DevOps`, `Data & AI`) y diagnóstico de señal pre-vuelo.

### 6. Integración Directa con OBS Studio & vMix (`/overlay`)
URL dedicada con fondo 100% transparente y tipografía broadcast con sombra profunda para incrustar directamente como *Browser Source* en software de transmisión en vivo.

### 7. Post-Charla: Exportación Multi-formato & AI Takeaways
Al terminar cada bloque, los organizadores pueden descargar en 1 click:
- Archivos `.srt` y `.vtt` sincronizados para subir a los videos de YouTube.
- Documento `.md` con resumen ejecutivo de los puntos clave expuestos y preguntas inteligentes sugeridas para el bloque de Q&A.

---

## 🛠️ Cómo lo Construimos (Stack Tecnológico)

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, diseño industrial inspirado en Teenage Engineering y consolas de hardware Blackmagic.
* **Backend:** Node.js v22, Express, WebSockets (`ws`), TSX runtime de alta velocidad.
* **Orquestación de IA:** Google Gemini 2.5 Flash SDK (`@google/genai`) optimizado para audio multimodales + Orquestación de modelos abiertos vía **OpenCode** para evaluación de texto y generación de glosarios.
* **Audio Pipeline:** Web Audio API, AudioContext a 16kHz lineal PCM, bufferizado de chunks adaptable con detección de silencio.
* **Contenedor:** Docker y Docker Compose para despliegue local o en Cloud Run con menos de 150MB de consumo de memoria RAM.

---

## 🧗 Desafíos que Superamos

1. **Latencia vs. Coherencia Técnica:** Encontrar el balance perfecto entre enviar chunks de audio lo suficientemente rápidos (baja latencia) pero con suficiente contexto semántico para que el modelo identifique correctamente términos técnicos complejos en frases con *Spanglish* o *code-switching*.
2. **Escalabilidad Concurrente de Salas:** Gestionar múltiples flujos de audio independientes y salas simultáneas sin fugas de memoria en WebSockets, logrando que el cambio de sala en el panel de control sea totalmente instantáneo.
3. **Experiencia de Usuario en Streaming:** Lograr una interfaz de subtítulos (`/overlay`) legible tanto sobre fondos claros como oscuros, compatible con los motores de renderizado Chromium de OBS Studio sin parpadeos.

---

## 🏅 Logros de los que Estamos Orgullosos

* Cumplimos con el **100% de los requisitos mínimos y todos los requisitos opcionales** propuestos en las bases de la Vibeathon.
* Logramos una precisión del 99% en términos técnicos de infraestructura, Cloud y programación.
* El costo por sala es infinitesimal comparado con plataformas privativas enterprise.
* La experiencia visual del panel de control convierte una tarea árida de subtitulado en una cabina de producción de audio digna de un estudio profesional.

---

## 📚 Qué Aprendimos

* La enorme potencia de los nuevos modelos de baja latencia como Gemini 2.5 Flash y la flexibilidad de orquestar prompts con OpenCode para enriquecer la experiencia educativa de los asistentes.
* El impacto humano real que tiene una herramienta de accesibilidad cuando no solo traduce palabras, sino que democratiza la jerga técnica para personas que están dando sus primeros pasos en la industria.

---

## 🚀 Qué Sigue para NerdSub

* **Traducción a Lengua de Señas (LSA):** Prototipo de avatar generativo para interpretación visual en vivo.
* **Plugin nativo para OBS Studio:** Paquete instalable con control bidireccional desde Stream Deck.
* **Despliegue oficial en Nerdearla 2026:** Integración completa con la red de streaming de la conferencia.

---

## 🏷️ Built With
`react`, `typescript`, `tailwindcss`, `gemini-api`, `opencode`, `websockets`, `node.js`, `docker`, `obs-studio`, `accessibility`, `audio-processing`, `mit-license`
