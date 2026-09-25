# 📘 Project Aura // Guía de Uso y Manual Operativo de Campo

> **Manual de Referencia para Técnicos de Escenario, Operadores de Sonido, Streamers y Audiencia.**  
> *Desarrollado para Nerdearla 2026 (Ciudad Cultural Konex, Buenos Aires) y conferencias globales.*

---

## 🗂️ Tabla de Contenidos
1. [Arquitectura y Concepto General](#1-arquitectura-y-concepto-general)
2. [Guía de Instalación Rápida & Nodo Edge Gemma](#2-guía-de-instalación-rápida--nodo-edge-gemma)
3. [Matriz de Triple Motor de IA (Cloud, Edge, Offline)](#3-matriz-de-triple-motor-de-ia-cloud-edge-offline)
4. [Mesa Técnica de Sonido y Consola de Rack](#4-mesa-técnica-de-sonido-y-consola-de-rack)
5. [Ruteo de Audio y Videos de YouTube por Escenario](#5-ruteo-de-audio-y-videos-de-youtube-por-escenario)
6. [Multiviewer con Traducción Independiente](#6-multiviewer-con-traducción-independiente)
7. [Micrófono Móvil de Emergencia (Wi-Fi)](#7-micrófono-móvil-de-emergencia-wi-fi)
8. [Señal de Transmisión & Overlay Transparente (OBS / vMix)](#8-señal-de-transmisión--overlay-transparente-obs--vmix)
9. [Experiencia de Audiencia, NerdGlosario y Accesibilidad TTS](#9-experiencia-de-audiencia-nerdglosario-y-accesibilidad-tts)
10. [Deep Intel Post-Charla y Exportación SRT/VTT](#10-deep-intel-post-charla-y-exportación-srtvtt)

---

## 1. Arquitectura y Concepto General

Project Aura resuelve el desafío de accesibilidad técnica multilingüe en conferencias masivas mediante una arquitectura **Pub/Sub 1-a-N**:
- **1 Ingesta**: Una sola fuente de audio por escenario (micrófono físico, pestaña de video o stream) es procesada por el servidor central.
- **N Receptores**: Miles de clientes (teléfonos celulares de la audiencia, proyectores de escenario, overlays de streaming para OBS) se suscriben vía WebSockets ultralivianos sin multiplicar el costo de inferencia ni saturar la red.

```
       [ 🎤 Micrófono de Sala / 📺 Video YouTube ]
                          │
                          ▼
            [ ⚡ AudioWorklet 16kHz PCM ]
                          │
                          ▼
          ┌────────────────────────────────┐
          │  Project Aura Central Server   │
          │  (Node.js + WebSockets :3001)  │
          └────────────────────────────────┘
             │             │            │
      [Gemini 3.5 Live] [Gemma 2B] [Motor Offline]
             │             │            │
             └─────────────┬────────────┘
                           ▼
          ┌────────────────────────────────┐
          │   WebSocket Broadcast Pub/Sub  │
          └────────────────────────────────┘
          /            │            │       \
         ▼             ▼            ▼        ▼
   [ Audiencia ] [ Multiview ] [ OBS/vMix ] [ Kiosk ]
    (Celulares)   (Monitoreo)  (Streaming)  (Proyector)
```

---

## 2. Guía de Instalación Rápida & Nodo Edge Gemma

### Requisitos Mínimos:
- **Node.js**: v20 o superior
- **npm**: v10 o superior
- *(Opcional)* **Ollama**: con modelo `gemma2:2b`

### Pasos de Despliegue:
```bash
# 1. Clonar el repositorio
git clone https://github.com/EzeAlfaro/ProjectAura.git
cd ProjectAura

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env

# 4. (Opcional) Ejecutar Gemma 2 local con Ollama
ollama run gemma2:2b

# 5. Ejecutar la suite de pruebas oficial de Gemma
npm test

# 6. Iniciar en modo desarrollo con HTTPS nativo
npm run dev
```

> **HTTPS en Red Local (LAN)**: Al levantar con `USE_SSL=true` (activo por defecto en desarrollo), podés ingresar desde cualquier celular o Mini PC en la misma red Wi-Fi usando `https://<TU_IP_LOCAL>:3000` (ej: `https://192.168.1.87:3000`), permitiendo acceso inmediato al micrófono sin advertencias de navegador.

---

## 3. Matriz de Triple Motor de IA (Cloud, Edge, Offline)

En la barra superior, hacé clic en el botón con el indicador LED **`[⚡ GEMINI / GEMMA / LOCAL]`** para abrir el panel de control de IA:

| Motor | Modo de Ejecución | Latencia Típica | Caso de Uso |
| :--- | :--- | :---: | :--- |
| **Google Gemini 3.5 Live** | Cloud (Google AI Studio) | `< 150 ms` | Streaming en vivo oficial, preview interactivo especulativo, máxima precisión en jerga IT. |
| **Google Gemma 2 (2B)** | Edge On-Premise (Ollama) | `~ 150 - 250 ms` | Salas privadas, eventos corporativos, corte total de salida a Internet exterior. |
| **Motor Nativo Standalone** | 100% Offline (Navegador) | `0 ms` | Failover instantáneo de emergencia si el predio sufre corte de luz o caída de red. |

---

## 4. Mesa Técnica de Sonido y Consola de Rack

Ingresá desde el botón **`[MESA TÉCNICA]`** o navegando a `/?view=admin`.

### Funcionalidades del Operador:
1. **Sound Check Pre-Vuelo (4 Segundos)**:
   - Presioná `INICIAR SOUND CHECK (4s)`.
   - El sistema analiza la entrada acústica, calcula el nivel en dBFS y advierte si la ganancia está baja o si hay saturación / clipping.
2. **Selector de Dispositivos por Escenario**:
   - En el patchbay podés asignar qué micrófono físico alimenta cada escenario (Focusrite Scarlett, micrófono USB, etc.).
3. **Botón de Pánico**:
   - `BORRAR ÚLTIMO SUBTÍTULO`: Remueve en caliente una frase errónea o blooper del orador antes de que sea leída por el público.
   - `APAGÓN DE SALA (EDM)`: Limpia los subtítulos en pantalla y silencia la emisión de forma instantánea.
4. **Recarga Remota F5**:
   - Envía una instrucción WebSocket a todos los proyectores y pantallas de esa sala para forzar un refresco de página sin necesidad de tocar la Mini PC.

---

## 5. Ruteo de Audio y Videos de YouTube por Escenario

Cada escenario cuenta con su propia configuración desacoplada de YouTube:
- **Escenario Principal (`stage-1`)**: Charla de Pelado Nerd (*Kubernetes en Producción*).
- **Escenario Cloud & DevOps (`stage-2`)**: Charla de Lucas Blanco (*Argo Rollouts*).
- **Escenario Data & AI (`stage-3`)**: Charla de Carlos Gauto (*Testing K8s & Chaos*).

### Cómo Usar Videos Personalizados:
1. En la Mesa Técnica, andá a la sección **REPRODUCTOR DE VIDEO YOUTUBE**.
2. Seleccioná la **SALA DE DESTINO** deseada.
3. Pegá cualquier URL de YouTube (`https://www.youtube.com/watch?v=...`) o ingresá el ID del video.
4. Definí el título de la charla y el orador.
5. Hacé clic en **`CARGAR EN [SALA]`**: el video queda asignado exclusivamente a esa sala.
6. Podés usar:
   - **`AUDIO REAL (PESTAÑA)`**: Captura el sonido original de la pestaña donde se reproduce el video remuestreado a 16kHz PCM.
   - **`SINCRONIZAR DEMO`**: Dispara la transcripción y traducción simultánea para la charla.

---

## 6. Multiviewer con Traducción Independiente

Ingresá desde el botón **`[MULTIVIEWER]`** o navegando a `/?view=multiview`.

- **Muro Multi-Sala**: Visualizá los 3 escenarios en paralelo con sus respectivos vúmetros y estados de emisión.
- **Traducción 100% Independiente por Sala**:
  - En la barra de cada monitor de sala, hacé clic en `[🇦🇷 ES]`, `[🇬🇧 EN]` o `[🇧🇷 PT]`.
  - Podés monitorear el Escenario 1 en Español, el Escenario 2 en Inglés y el Escenario 3 en Portugués en la misma pantalla.
- **Botonera Global `TODAS:`**:
  - Ubicada en la barra superior, permite cambiar el idioma de todos los monitores en bloque con un solo clic.
- **Acciones Rápidas**:
  - Cada monitor cuenta con accesos directos para abrir su vista Kiosk, OBS, Móvil o descargar el archivo `.SRT` traducido de esa sala.

---

## 7. Micrófono Móvil de Emergencia (Wi-Fi)

Ingresá desde el botón rojo **`[MIC]`** en el Header o navegando a `/?view=mic`.

- Convierte cualquier smartphone conectado a la red Wi-Fi en un micrófono inalámbrico.
- Posee botón grande **Push-to-Talk**, vúmetro reactivo y selector de sala.
- Si se agota la batería del inalámbrico del disertante, el moderador enciende el mic móvil y la charla continúa sin interrupciones.

---

## 8. Señal de Transmisión & Overlay Transparente (OBS / vMix)

Ingresá desde el botón **`[TRANSMISIÓN & TV]`** o navegando a `/overlay?stage=stage-1&lang=es`.

- **Fondo 100% Alfa Transparente**: Listo para incrustar como fuente de navegador (*Browser Source*) en OBS Studio o vMix.
- **Tipografía Broadcast con Drop Shadow**: Máxima legibilidad sobre cualquier fondo de video o presentación de diapositivas.
- **Controles en Pantalla**:
  - Botón `[1 LÍNEA / 2 LÍNEAS]` para ajustar la altura del subtítulo.
  - Píldoras de idioma `[ES] [EN] [PT]` para alternar el idioma de la transmisión en vivo sin recargar la fuente en OBS.

---

## 9. Experiencia de Audiencia, NerdGlosario y Accesibilidad TTS

Ingresá a la vista principal `/` o `/?view=audience`.

- **Código QR**: El público escanea el QR en pantalla y accede a los subtítulos en su idioma preferido.
- **NerdGlosario Interactivo**: Más de 170 términos técnicos (Kubernetes, eBPF, GitOps, CI/CD, Istio, Grafana, etc.) se destacan con resaltado neón. Al hacerles clic, se abre una tarjeta didáctica con la definición y ejemplos.
- **Voz Accesible (TTS)**: Lector de pantalla integrado que verbaliza los subtítulos en tiempo real para personas ciegas o con baja visión.
- **Moderación de Q&A**: El público envía preguntas y vota las más relevantes. La cabina técnica puede marcarlas como `ON STAGE` para que aparezcan en el atril del orador.

---

## 10. Deep Intel Post-Charla y Exportación SRT/VTT

Al finalizar una conferencia:
1. En la vista de Audiencia o Mesa Técnica, hacé clic en **`[DEEP INTEL]`**.
2. **Gemini 2.5 Pro** analiza la totalidad de la transcripción y genera:
   - **Resumen Ejecutivo** de la charla.
   - **3 Key Takeaways** fundamentales.
   - **Preguntas Sugeridas** para el bloque de Q&A.
3. **Descarga en 1 Clic**:
   - `Descargar SRT`: Archivo de subtítulos sincronizado listo para subir a YouTube o editar en Premiere/DaVinci.
   - `Descargar VTT`: Subtítulos compatibles con reproductores HTML5.
   - `Descargar MD`: Documento de síntesis ejecutiva para compartir con la comunidad.
