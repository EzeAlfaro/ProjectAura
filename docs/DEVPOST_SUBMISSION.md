# 🏆 Postulación Oficial para Devpost / Jurado Nerdearla 2026

## 📌 Datos Básicos del Proyecto
* **Nombre del Proyecto:** Project Aura ⚡
* **Tagline:** Motor Open-Source de Transcripción Simultánea, Traducción Técnica y Accesibilidad a Escala para Conferencias Globales.
* **Track / Desafío:** Vibeathon Nerdearla 2026 - Accesibilidad, Inteligencia Artificial & Comunidad.
* **Lead Developer:** Ezequiel Alfaro
* **Licencia:** MIT (Open Source, OSI Approved)
* **Repositorio Oficial:** [https://github.com/EzeAlfaro/ProjectAura](https://github.com/EzeAlfaro/ProjectAura)

---

## 💡 Inspiración
En conferencias técnicas masivas como **Nerdearla**, la accesibilidad es un valor innegociable: más de 30 charlas simultáneas, auditorios repletos, oradores internacionales y una comunidad apasionada pero diversa (desde juniors hasta seniors, pasando por personas con dificultades auditivas o barreras de idioma).

Sin embargo, las soluciones comerciales de subtitulado existentes fallan estrepitosamente en 4 aspectos clave:
1. **Costos prohibitivos:** Modelos de cobro por minuto y por asiento conectado que hacen inviable cubrir 5 o 10 salas en simultáneo durante 3 días.
2. **Masacre de la jerga técnica:** Confunden y mutilan términos cruciales como *"deploy"*, *"eBPF"*, *"Kubernetes"*, *"commit"*, *"Goroutine"*, *"CI/CD"*, *"observability"*, arruinando la comprensión de la charla.
3. **Latencia destructiva:** La mayoría de las soluciones acumulan buffers de 6 a 10 segundos antes de procesar, dejando los subtítulos totalmente desfasados del orador.
4. **Imposibilidad de operar en streaming:** No ofrecen salidas limpias transparentes para OBS Studio o vMix en transmisiones de Twitch/YouTube.

Nos propusimos crear la herramienta definitiva: **abierta, hermosa, de costo casi nulo y diseñada por y para la comunidad**.

---

## ⚡ Qué hace Project Aura

Project Aura transforma la experiencia de accesibilidad en eventos masivos de punta a punta:

### 1. Ingesta de Audio Directa vía AudioWorklet (16kHz PCM)
Captura audio directamente desde el micrófono de la sala o placa de sonido vía un procesador `AudioWorklet` dedicado que remuestrea a **16-bit 16kHz Linear PCM Little-Endian** en bloques de 100ms sin bloqueo de UI, o permite ejecutar **pruebas automáticas instantáneas en 1 click** con charlas reales de conferencias.

### 2. Triple Motor de Inteligencia Artificial (Cloud + Edge + Standalone)
- **Streaming ASR en Tiempo Real**: Impulsado por el flagship **Gemini 3.5 Transcribe Live**, emitiendo tokens de preview provisional en sub-150ms y subtítulos finales de alta fidelidad con code-switching y biasing técnico.
- **Síntesis Ejecutiva & Deep Intel**: Con **Gemini 3.5 Pro**, generando automáticamente resúmenes ejecutivos en Markdown, lecciones clave de arquitectura y preguntas inteligentes para el bloque de Q&A.
- **Traducción Multimodal Ultrarrápida**: Con **Gemini 3.5 Flash**, traduciendo simultáneamente a Español, Inglés y Portugués.
- **Edge On-Premise Local**: Con **Google Gemma 2B**, garantizando inferencia local privada y continuidad sin conexión a Internet.
- **Motor Nativo Standalone (0 ms)**: Renderizado instantáneo en navegador vía Web Speech API y normalizador fonético de Sysarmy.

### 3. NerdGlosario™ Neón Activo
Inyectamos un diccionario curado de más de **150 términos técnicos de IT** (DevOps, Cloud, Linux, Rust, IA, Kubernetes) en el system prompt para evitar cualquier alucinación. Además, las palabras técnicas se destacan visualmente con insignias neón en los subtítulos: **cualquier asistente puede hacer click para desplegar una tarjeta interactiva con la explicación didáctica del concepto**.

### 4. Arquitectura de Distribución 1-a-N (Costo Cero por Usuario)
A diferencia de servicios cerrados que cobran por cada dispositivo conectado, Project Aura realiza **1 única llamada de procesamiento por escenario**. Su servidor WebSocket interno retransmite en tiempo real a miles de espectadores conectados al mismo tiempo sin saturar la red ni generar costos adicionales.

### 5. Consola de Producción Broadcast (Teenage Engineering Design)
Panel para sonidistas y operadores de streaming (`/admin`) con vúmetros de señal en decibelios, medidor de latencia en milisegundos, cerrojo de producción, watchdog de autorecuperación de 8 minutos, botón de pánico y apagón de emergencia (EDM).

### 6. Integración Directa con OBS Studio & vMix (`/overlay`)
URL dedicada con fondo 100% transparente y tipografía broadcast con sombra profunda para incrustar directamente como *Browser Source* en software de transmisión en vivo.

### 7. Post-Charla: Exportación Multi-formato & AI Takeaways
Al terminar cada bloque, los organizadores pueden descargar en 1 click:
- Archivos `.srt` y `.vtt` sincronizados para subir a los videos de YouTube.
- Documento `.md` con resumen ejecutivo de los puntos clave expuestos y preguntas inteligentes sugeridas para el bloque de Q&A.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, diseño industrial inspirado en Teenage Engineering y consolas de hardware Blackmagic.
* **Backend:** Node.js v22, Express, WebSockets (`ws`), TSX runtime de alta velocidad.
* **Orquestación de IA:** Google GenAI SDK (`@google/genai`) con soporte para el stack insignia **Gemini 3.5 Transcribe Live**, **Gemini 3.5 Pro**, **Gemini 3.5 Flash**, y **Google Gemma 2B Edge**.
* **Audio Pipeline:** `AudioWorkletProcessor` en hilo de audio dedicado para remuestreo stateful a 16kHz Int16 PCM mono.
* **Contenedor:** Docker y Docker Compose para despliegue local o en Cloud Run con menos de 150MB de consumo de memoria RAM.

---

## 🏷️ Built With
`react`, `typescript`, `tailwindcss`, `gemini-3.5-live`, `gemini-3.5-pro`, `gemini-3.5-flash`, `google-gemma-2b`, `audioworklet`, `pcm-audio`, `websockets`, `node.js`, `docker`, `obs-studio`, `accessibility`, `mit-license`
