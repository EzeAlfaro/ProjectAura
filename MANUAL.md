# 🛠️ PROJECT AURA: MANUAL DEL OPERADOR & GUÍA DE DESPLIEGUE EN VIVO
# 🛠️ PROJECT AURA: STAGE OPERATOR FIELD MANUAL & LIVE DEPLOYMENT GUIDE

> **"Creado por técnicos de escenario para técnicos de escenario."**  
> *"Built on the rack by live stage technicians for live stage technicians."*  
> *Nerdearla 2026 • Ciudad Cultural Konex & Worldwide IT Venues*

---

## 📑 ÍNDICE / TABLE OF CONTENTS

1. [Manifiesto del Operador // The Operator's Creed](#1-manifiesto-del-operador--the-operators-creed)
2. [Topología de Red & Hardware // Network Topology & Hardware](#2-topología-de-red--hardware--network-topology--hardware)
3. [Ingesta de Audio & Conectividad // Audio Ingest & Connectivity](#3-ingesta-de-audio--conectividad--audio-ingest--connectivity)
4. [Jerarquía de Motores de IA // AI Engine Hierarchy & Failover](#4-jerarquía-de-motores-de-ia--ai-engine-hierarchy--failover)
5. [Protocolos de Sala de Control // Mission Control & Emergency Protocols](#5-protocolos-de-sala-de-control--mission-control--emergency-protocols)
6. [Experiencia de Audiencia & A11y // Audience Experience & Radical A11y](#6-experiencia-de-audiencia--a11y--audience-experience--radical-a11y)
7. [Salidas de Broadcast (OBS / vMix) // Broadcast Feeds (OBS / vMix)](#7-salidas-de-broadcast-obs--vmix--broadcast-feeds-obs--vmix)
8. [Exportación Post-Charla // Post-Talk Export & Documentation](#8-exportación-post-charla--post-talk-export--documentation)
9. [Guía Rápida de Comandos // Quick-Start Terminal Commands](#9-guía-rápida-de-comandos--quick-start-terminal-commands)

---

## 1. MANIFIESTO DEL OPERADOR // THE OPERATOR'S CREED

### 🇦🇷 Español
Cualquiera que haya estado a cargo de la cabina técnica en un evento de más de 30 charlas simultáneas conoce la realidad:
- El Wi-Fi del auditorio colapsa a los 10 minutos de empezar el keynote.
- Los oradores mezclan Spanglish técnico violento: *"tuvimos que deployar un hotfix porque crasheó el pod en el cluster de k8s y rompimos prod"*. Los traductores automáticos genéricos traducen eso como *"tuvimos que desplegar un arreglo caliente porque chocó la vaina en el racimo"*.
- El cable XLR del atril se desconecta, el orador se aleja del micrófono o entra feedback.
- Las herramientas SaaS comerciales cobran por minuto y por usuario, colapsan con el ancho de banda y no dan salidas limpias para OBS.

**Project Aura nació en el rack.** Está diseñado con tolerancia a fallos de grado broadcast, cinta gaffer mental, buffers con remuestreo en tiempo real, modo offline instantáneo y herramientas tácticas para que el operador de sonido y streaming tenga el control absoluto bajo fuego.

### 🇬🇧 English
Anyone who has ever run the sound booth at a tech conference with 30+ concurrent talks knows the battlefield reality:
- Venue Wi-Fi buckles 10 minutes into the opening keynote.
- Tech speakers speak heavy engineering jargon and code-switching: *"we had to deploy a hotfix because the pod crashed in our k8s cluster and broke prod"*. Off-the-shelf translation SaaS translates this into absurd gibberish like *"we deployed a warm fix because the bean-pod collided in the fruit-bunch"*.
- Podium mic cables get kicked, wireless transmitter batteries die, or speakers wander away from the microphone.
- Commercial cloud tools charge per-minute and per-connected-user, consume massive venue bandwidth, and offer zero broadcast-grade alpha overlays.

**Project Aura was forged in the rack.** It is built with broadcast-grade fault tolerance, gaffer-tape resilience, hardware-accurate AudioWorklet buffers, instant offline failover, and tactical controls that give live AV engineers absolute mastery under pressure.

---

## 2. TOPOLOGÍA DE RED & HARDWARE // NETWORK TOPOLOGY & HARDWARE

```
 [STAGE MICS / MIXER]        [EMERGENCY MOBILE MIC]
   │ (XLR / USB line)          │ (Wi-Fi PCM 16kHz)
   ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ STAGE NODE MINI-PC│       │ ATTENDEE PHONE   │
│ (Kiosk Mode / F5)│       │ (/?view=mic PTT) │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         │ Venue Production LAN     │ Venue Public Wi-Fi
         ▼ (CAT6 / 1 Gbps)          ▼
┌────────────────────────────────────────────────────────┐
│               CENTRAL AURA CORE SERVER                 │
│  - Port 3001: Express API + WS Engine (Unified Prod)   │
│  - Port 3000: Vite Dev Server (Proxy to 3001)          │
│  - Gemini Live Transcribe (WebSocket Bi-Di Stream)     │
│  - On-Premise Gemma 2 / Local Neural Macro Engine      │
│  - In-Memory Ring Buffer Telemetry Logger (300 events) │
└────────┬──────────────────────────┬────────────────────┘
         │                          │
         ▼ Venue Production LAN     ▼ Venue Public Wi-Fi / QR
┌──────────────────┐       ┌───────────────────────────────┐
│ BROADCAST PC     │       │ AUDIENCE SMARTPHONES          │
│ (OBS / vMix)     │       │ - Subtitles in ES / EN / PT   │
│ - Alpha Overlay  │       │ - Spanglish Tech Glossary     │
│ - live.txt Ticker│       │ - Live Q&A & Upvoting         │
└──────────────────┘       │ - TTS Voice for Blind People  │
                           └───────────────────────────────┘
```

### 🇦🇷 Recomendaciones de Red para el Evento
1. **Servidor Central Aura**: Ubicado físicamente en el rack principal o sala de servidores, conectado por cable CAT6 a la red troncal (VLAN de Producción).
2. **Nodos de Escenario (Mini PCs / NUCs)**: Conectados por cable Ethernet al switch de sala. Inician el navegador en pantalla completa apuntando a `/?view=kiosk&stage=stage-1`.
3. **Red de Audiencia (Wi-Fi de Asistentes)**: No necesita tocar el servidor central con cargas pesadas. Cada teléfono móvil recibe streams WebSocket livianos de texto (<2 KB/s) sin descargar blobs pesados.
4. **Broadcast Streaming PC (OBS / vMix)**: En la misma VLAN de producción, consume la vista `/?view=overlay&stage=stage-1&lang=es` como Browser Source con aceleración por hardware habilitada.

### 🇬🇧 Venue Network Specifications
1. **Central Aura Server**: Located in the main server rack or AV control room, wired via CAT6 to the primary venue backbone (Production VLAN).
2. **Stage Nodes (Mini-PCs / NUCs)**: Hardwired via Ethernet to the stage switch. Boots browser in kiosk mode pointed at `/?view=kiosk&stage=stage-1`.
3. **Audience Network (Public Wi-Fi)**: Zero heavy traffic. Smartphones only receive lightweight WebSocket text frames (<2 KB/s), preventing network choking.
4. **Broadcast Streaming PC (OBS / vMix)**: On the isolated Production VLAN, consumes `/?view=overlay&stage=stage-1&lang=es` as an OBS Browser Source with hardware acceleration.

---

## 3. INGESTA DE AUDIO & CONECTIVIDAD // AUDIO INGEST & CONNECTIVITY

### Ingesta 1: Mesa de Sonido / Interfaz USB (AudioWorklet 16kHz PCM)
- **Ruta**: Mesa Técnica (`/admin`) o Modo Kiosk (`/?view=kiosk`).
- **Pipeline**: Captura el feed de audio del mixer (44.1kHz / 48kHz Float32) y mediante un AudioWorklet dedicado en background remuestrea a **16-bit 16.000 Hz Mono Little-Endian PCM** en bloques de 100ms.
- **Ventaja**: Cero impacto en el hilo de renderizado del navegador, latencia nula y compatibilidad directa con los modelos de voz de Google.

### Ingesta 2: Micrófono Móvil de Emergencia (Push-to-Talk)
- **Ruta**: `http://<IP-LOCAL>:3000/?view=mic` (Accesible desde el botón rojo `[🎙️ MIC]` en el header móvil).
- **Escenario de Uso**: Si el micrófono del orador se queda sin batería en pleno escenario, cualquier técnico o voluntario de sala abre esta URL en su teléfono, selecciona la sala y presiona **PUSH-TO-TALK** para transmitir audio 16kHz directamente al teleprompter central.
- **Herramientas en Pantalla**: Vúmetro de decibelios en tiempo real con advertencia de saturación (Peak/Clipping), selector de sala, selector de idioma y preview de retorno de subtítulos.

### Ingesta 3: Captura de Pestaña / Audio de Pantalla (Screen Audio Share)
- **Ruta**: Mesa Técnica (`/admin`) -> Botón `[🖥️ PESTAÑA]`.
- **Escenario de Uso**: Oradores remotos vía Zoom/Google Meet o videos técnicos reproducidos desde la laptop de presentación. Captura el audio interno del sistema operativo sin acoples de micrófono ambiente.

---

## 4. JERARQUÍA DE MOTORES DE IA // AI ENGINE HIERARCHY & FAILOVER

Project Aura cuenta con una arquitectura de **3 motores redundantes** con conmutación en caliente en menos de 50 milisegundos:

| Nivel / Tier | Motor / Engine | Protocolo / Protocol | Latencia / Latency | Rol Operativo / Operational Role |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Nube)** | **Gemini Live Transcribe (2.0/2.5 Flash)** | WebSocket Bidireccional | < 150 ms | Reconocimiento de voz continuo, interim preview especulativo palabra por palabra y puntuación natural (compatible con Gemini 3.5 Transcribe). |
| **Tier 1B (Pro)** | **Gemini 2.5 Pro** | REST con Structured Schema | Post-charla | Síntesis ejecutiva de arquitectura, extracción de 5 puntos clave y generación de preguntas de alto nivel para Q&A. |
| **Tier 2 (Edge)** | **Google Gemma 2 (Local)** | Ollama HTTP (`127.0.0.1:11434`) | ~250 ms | Inferencia local en servidor on-premise si el auditorio pierde salida a Internet internacional. |
| **Tier 3 (Local)** | **Motor Standalone Neuronal** | Regex Macro + MyMemory Neural Cache | < 5 ms | Contingencia total de emergencia sin Internet: protege 136 términos categorizados + 39 reglas fonéticas Spanglish y traduce ES ⇄ EN / PT. |

### Cola de Rotación de API Keys (Multi-Key Pool)
- Si una clave alcanza el límite de cuota (HTTP 429 Rate Limit) durante una jornada de 8 horas, el servidor la pone automáticamente en cooldown de 60 segundos y **conmuta a la siguiente clave del pool en memoria sin cortar la transmisión**.
- Las claves se administran en caliente desde el modal de configuración de la mesa técnica o mediante el archivo `.env`.

---

## 5. PROTOCOLOS DE SALA DE CONTROL // MISSION CONTROL & EMERGENCY PROTOCOLS

### 🚨 Botón de Pánico / Borrado de Frase (Delete Last Chunk)
- **Ubicación**: Consola de Operador (`/admin`) -> Botón Ámbar `[⌫ BORRAR ÚLTIMA]`.
- **Efecto**: Elimina de inmediato la última tarjeta de subtítulo en la base de datos central y envía un evento WebSocket `chunk_deleted` que purga la frase en todos los teléfonos de la audiencia, pantallas de sala y OBS.
- **Cuándo usar**: Bloopers involuntarios, fallas de micrófono, comentarios fuera de micrófono o datos sensibles expuestos accidentalmente.

### 🛑 Apagón de Emergencia / Erase Displayed Memory (EDM)
- **Ubicación**: Consola de Operador (`/admin`) -> Botón Rojo `[🛑 BLACKOUT]`.
- **Efecto**: Purga el 100% del historial de subtítulos visible en todos los clientes en 0 milisegundos.
- **Cuándo usar**: Fin de bloque, evacuación de sala o reinicio integral de la charla.

### 🔄 Recarga Remota de Escenarios (Zero-RustDesk F5)
- **Ubicación**: Consola de Operador (`/admin`) -> Botón `[🔄 RECARGAR SALA]`.
- **Efecto**: Envía una orden `remote_reload` al nodo del escenario para que la Mini PC refresque su instancia de navegador automáticamente sin necesidad de conectar teclado o usar software de control remoto.

### 🔒 Cerrojo de Seguridad de Mesa Técnica
- **Ubicación**: Switch `[LOCK]` en el panel frontal del rack.
- **Efecto**: Deshabilita los botones destructivos de la consola para evitar pulsaciones accidentales mientras el operador monitorea los vúmetros.

---

## 6. EXPERIENCIA DE AUDIENCIA & ACCESIBILIDAD RADICAL // AUDIENCE & A11Y

### 📱 Auto-Detección Móvil & Navegación con un Pulgar
- Al abrir `http://<IP>:3000` en un celular, la interfaz detecta la pantalla táctil y oculta el rack de 19 pulgadas para ofrecer una experiencia nativa fluida con 4 pestañas:
  1. 💬 **Subtítulos**: Teleprompter maximizado con auto-scroll y resaltado interactivo de términos.
  2. ❓ **Q&A**: Formulario para enviar preguntas al orador y votación en vivo de las preguntas de otros asistentes. Las más votadas suben automáticamente a la pantalla del orador.
  3. 📖 **Glosario**: Diccionario técnico Spanglish en vivo con definiciones didácticas.
  4. 💡 **Claves**: Resúmenes ejecutivos y puntos clave generados por Gemini 2.5 Pro.

### 🔊 Voz Accesible en Vivo (TTS para Personas No Videntes)
- Integrado mediante la Web Speech API en [AudienceView.tsx](file:///c:/nerdearla/src/components/AudienceView.tsx).
- Al activar el botón **`[VOZ ACCESIBLE]`**, el sistema lee cada subtítulo entrante en voz alta en el idioma seleccionado por el usuario, permitiendo que personas ciegas o con baja visión sigan la conferencia en tiempo real.

### 🎨 Selector de Skins / Temas Visuales
Disponibles en el botón **`[🎨 TEMAS]`**:
1. **Cyberpunk Nerd (Default)**: Fondo grafito oscuro, cian reactivo `#00f5ff` y ámbar de telemetría.
2. **Phosphor Matrix**: Verde fósforo CRT `#00ff66` sobre negro puro para máxima legibilidad en auditorios oscuros.
3. **Amber Terminal**: Ámbar VT220 clásico `#ffb800` para reducir fatiga visual durante jornadas maratónicas.
4. **High Contrast Neon**: Cumplimiento estricto WCAG AAA con bordes marcados.
5. **Minimal Monochrome**: Estética Dieter Rams / Braun en escala de grises para salas formales.

---

## 7. SALIDAS DE BROADCAST (OBS / vMix) // BROADCAST FEEDS (OBS / vMix)

### Salida 1: Browser Source Transparente (Alpha Channel)
- **URL**: `http://<IP-SERVIDOR>:3000/?view=overlay&stage=stage-1&lang=es`
- **Configuración en OBS Studio**:
  1. Agregar Fuente -> **Navegador (Browser)**.
  2. Ancho: `1920`, Alto: `1080`.
  3. Marcar: *"Controlar audio vía OBS"* (opcional).
  4. Marcar: *"Actualizar el navegador cuando la escena se active"*.
- **Características**: Fondo 100% transparente (RGBA 0,0,0,0), tipografía Grotesk con drop-shadow pronunciado para contraste sobre cualquier presentación, y soporte para saltos de línea de 37 caracteres (Estándar CEA-708).

### Salida 2: Endpoint de Texto Plano para Generadores de Caracteres
- **URL**: `http://<IP-SERVIDOR>:3001/api/stages/stage-1/live.txt?lang=es`
- **Uso**: Permite que software como vMix Title Input, CasparCG o matrices LED de escenario consuman los últimos subtítulos como texto puro sin parsear HTML ni CSS.

---

## 8. EXPORTACIÓN POST-CHARLA // POST-TALK EXPORT & DOCUMENTATION

Apenas finaliza una charla, los subtítulos y el resumen están listos para descarga instantánea desde la pestaña `EXPORT` o vía HTTP directo:

- 🎬 **`.SRT`**: `GET /api/stages/:id/export/srt?lang=es`  
  Formato estándar SubRip con códigos de tiempo exactos (`00:14:22,150 --> 00:14:25,800`) listo para subir a YouTube Studio, Vimeo o Premiere.
- 🌐 **`.VTT`**: `GET /api/stages/:id/export/vtt?lang=es`  
  Formato WebVTT para reproductores HTML5 (`<video><track>`).
- 📝 **`.MD`**: `GET /api/stages/:id/export/md?lang=es`  
  Resumen ejecutivo generado por IA, estructura de temas tratados y preguntas destacadas para publicar en el blog del evento o repositorio de GitHub.
- 📄 **`.TXT`**: `GET /api/stages/:id/export/txt?lang=es`  
  Transcripción textual continua sin timestamps para análisis de minería de texto o actas.

---

## 9. GUÍA RÁPIDA DE COMANDOS // QUICK-START TERMINAL COMMANDS

### Despliegue en Servidor Local (Bare-Metal / Laptop)
```bash
# 1. Clonar el repositorio
git clone https://github.com/EzeAlfaro/ProjectAura.git
cd ProjectAura

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# (Opcional: Agregar GEMINI_API_KEY en .env)

# 4. Iniciar servidores en red local (Modo Desarrollo)
npm run dev
# -> Frontend (Vite HMR): http://localhost:3000 (o http://<TU-IP-LOCAL>:3000)
# -> Backend (API + WS):  http://localhost:3001
```

### Despliegue con Docker Compose (Modo Producción Unificado en Puerto 3001)
En producción o contenedores Docker, Express sirve **unificadamente tanto el frontend como los WebSockets en el puerto 3001**:
```bash
# Iniciar contenedor autónomo con reinicio automático
docker compose up -d --build

# Acceso inmediato a la interfaz completa:
# -> http://localhost:3001 (Audiencia, Mesa Técnica, Kiosk, Overlay)

# Ver logs de telemetría en vivo
docker compose logs -f
```

### Verificación Rápida de Salud del Sistema (Healthcheck)
```bash
# Probar API de salas
curl -s http://localhost:3001/api/stages | jq

# Probar estado del motor Gemini / Gemma
curl -s http://localhost:3001/api/health | jq
```

---

*Manual oficial redactado y mantenido por el equipo de ingeniería de Project Aura para Nerdearla Vibeathon 2026.*  
*Official field manual maintained by the Project Aura engineering team for Nerdearla Vibeathon 2026.*
