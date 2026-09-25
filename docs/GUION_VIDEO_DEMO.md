# 🎬 Guión Oficial del Video Demo // Project Aura (2 Minutos Exactos)

> **Proyecto:** Project Aura ⚡  
> **Evento:** Vibeathon Nerdearla 2026 (Buenos Aires, Argentina)  
> **Lead Developer & Speaker:** Ezequiel Alfaro  
> **Duración Objetivo:** 2:00 minutos (~260 palabras habladas a ritmo fluido y seguro)  
> **Tono:** Profesional de broadcast, seguro, técnico de escenario, enfocado en el operador y la accesibilidad real.

---

## 🛠️ Pestañas a tener abiertas antes de apretar "REC" (1080p Fullscreen):
1. **Pestaña 1 - Vista Audiencia:** `http://localhost:3001` (Escenario Turing o Apolo activo con subtítulos corriendo).
2. **Pestaña 2 - Cabina Rack 19" (Admin):** `http://localhost:3001?view=admin` (Consola Teenage Engineering, vúmetros de 12 segmentos y osciloscopio).
3. **Pestaña 3 - Micrófono Móvil Wi-Fi:** `http://localhost:3001?view=mic` (Modo Push-to-Talk de emergencia para celular).
4. **Pestaña 4 - Multiview Monitor:** `http://localhost:3001?view=multiview` (Matriz de todos los auditorios concurrentes).
5. **Pestaña 5 - OBS Broadcast Overlay:** `http://localhost:3001?view=overlay&stage=stage-1&lang=es` (Zócalo transparente de TV).

---

## ⏱️ Libreto Segundo a Segundo (Pantalla + Locución)

### 0:00 - 0:20 | El Problema Real en el Escenario (El Manifiesto del Operador)
* **En Pantalla:** Pestaña 1 (Audiencia de Project Aura). Se ve la interfaz en modo oscuro/cyberpunk con subtítulos técnicos corriendo y el selector de escenarios de Nerdearla.
* **Locución (Ezequiel Alfaro):**
  > *"Cualquiera que haya operado sonido en una conferencia como Nerdearla conoce la pesadilla: Wi-Fi colapsado, micrófonos que se quedan sin batería y traductores automáticos que destrozan la jerga técnica traduciendo 'deployar el pod' como 'desplegar la vaina'.*  
  > *Por eso forjamos en el rack **Project Aura**: el motor open-source de transcripción, traducción técnica simultánea y accesibilidad diseñado por y para operadores de escenario."*

---

### 0:20 - 0:50 | Accesibilidad Radical & Glosario Spanglish (Audiencia en Vivo)
* **En Pantalla:**
  1. Mostrás los subtítulos en tiempo real con latencia sub-150ms.
  2. Hacés **click en un término neón** (`eBPF`, `Kubernetes` o `deadlock`): se abre la tarjeta interactiva con la explicación técnica.
  3. Activás el botón del parlante (**TTS - Síntesis de voz para no videntes**).
  4. Mostrás el panel de **Q&A**: una pregunta votada por la audiencia.
* **Locución:**
  > *"Miren esto en vivo: el orador habla a toda velocidad y Aura transcribe y traduce al español con latencia sub-150ms. Para evitar alucinaciones, inyectamos 175 reglas de Spanglish técnico: términos como eBPF o commit no fallan jamás, y cualquier junior puede clickear la insignia neón para aprender qué significa.*  
  > *Además, incluimos síntesis de voz en vivo para personas ciegas y un sistema de Q&A donde la audiencia vota preguntas desde su celular escaneando un simple QR proyectado."*

---

### 0:50 - 1:20 | Cabina de Sonido de 19" & Micrófono Móvil de Respaldo
* **En Pantalla:**
  1. Cambiás a la Pestaña 2 (**Admin / Rack 19"**). Mostrás los vúmetros LED de 12 segmentos, tornillos hexagonales y osciloscopio en tiempo real.
  2. Cambiás un segundo a la Pestaña 3 (**`/?view=mic`**): mostrás cómo un smartphone se convierte en micrófono inalámbrico Push-to-Talk.
  3. Volvés al rack y mostrás el botón de **Pánico / Apagón EDM** y la matriz de 3 motores de IA.
* **Locución:**
  > *"Para la cabina diseñamos una consola de rack inspirada en hardware broadcast como Teenage Engineering y Blackmagic: vúmetros LED, osciloscopio y botones de pánico instantáneos.*  
  > *¿Se murió la batería del inalámbrico del speaker? Con nuestra vista `/?view=mic`, cualquier celular en la red Wi-Fi se transforma en un micrófono de contingencia con Push-to-Talk.*  
  > *¿Y si se corta Internet en el predio? Aura conmuta en caliente de Gemini Live en la nube a Gemma 2 local o a nuestro motor offline sin cortar la sala."*

---

### 1:20 - 1:45 | Streaming OBS, Multiview & Deep Intel con Gemini Pro
* **En Pantalla:**
  1. Pasás a la Pestaña 4 (**Multiview**) para mostrar la supervisión de 3 escenarios en simultáneo.
  2. Cambiás a la Pestaña 5 (**OBS Overlay**): fondo 100% transparente para Twitch/YouTube.
  3. Volvés a la app y hacés click en **Deep Intel**: mostrás el resumen ejecutivo generado por Gemini 2.5 Pro y los botones de exportación `.SRT` y `.MD`.
* **Locución:**
  > *"Con la vista Multiview monitoreamos todos los auditorios a la vez. Para la transmisión en vivo, el overlay transparente se incrusta directo en OBS Studio o vMix con calidad broadcast.*  
  > *Al terminar la charla, Gemini 2.5 Pro procesa el contenido generando un resumen ejecutivo, ideas clave y preguntas para el moderador, con descarga en un click de archivos SRT y VTT listos para YouTube."*

---

### 1:45 - 2:00 | Arquitectura de Costo Cero & Licencia Libre
* **En Pantalla:** Repositorio en GitHub de Project Aura, mostrando el badge de Licencia MIT, benchmarks de p50 9.7ms y autoría de Ezequiel Alfaro.
* **Locución:**
  > *"Su arquitectura Pub/Sub 1-a-N permite que un único stream alimente a 5.000 asistentes por menos de 5 centavos de dólar la hora.*  
  > *Project Aura está 100% liberado bajo licencia MIT para Nerdearla y todos los eventos del mundo. Hagamos la tecnología accesible de verdad. ¡Muchas gracias!"*

---

## 📋 Mapeo Técnico de Funcionalidades (Demostración de Rigor Técnico)

| Segundo | Funcionalidad Demostrada en Video | Archivo / Componente en el Código |
| :---: | :--- | :--- |
| **0:00 - 0:20** | Identidad Project Aura + AudioWorklet 16kHz PCM | `public/worklets/pcm-processor.js`, `README.md` |
| **0:20 - 0:35** | Gemini Live Streaming (<150ms) + 175 reglas Spanglish | `server/glossary.ts`, `broadcastSegmenter.ts` |
| **0:35 - 0:50** | TTS Voice for the Blind + Q&A con Upvotes + QR Escenario | `ttsService.ts`, `AudienceView.tsx`, `QRCodeModal.tsx` |
| **0:50 - 1:05** | Consola Rack 19" (Teenage Engineering, LED VU meters) | `AdminView.tsx`, `HardwareControls.tsx` |
| **1:05 - 1:15** | Mobile Mic Wi-Fi de contingencia (`/?view=mic`) | `MobileMicView.tsx` |
| **1:15 - 1:20** | Failover 3 Motores: Gemini Live -> Gemma Local -> Offline | `server/geminiService.ts`, `server/localTranslator.ts` |
| **1:20 - 1:30** | Matriz Multiview + OBS Alpha Transparent Overlay | `MultiStageMonitorView.tsx`, `OBSOverlayView.tsx` |
| **1:30 - 1:45** | Deep Intel (Gemini 2.5 Pro) + Exportación SRT/VTT/MD | `server/geminiService.ts`, `App.tsx` |
| **1:45 - 2:00** | Benchmark (p50 9.7ms) + Costo $0.05 USD/h + Licencia MIT | `docs/benchmark.md`, `LICENSE` |
