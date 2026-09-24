# 🏛️ Topología Física y Red en Ciudad Cultural Konex (Nerdearla 2026)

## 📌 1. ¿Cómo funciona la arquitectura? ¿Todos tienen todo?

**NO, no todos tienen todo.**  
Existe una arquitectura **Cliente-Servidor con patrón Productor–Broker–Consumidor (Pub/Sub)** estrictamente jerárquica y eficiente.

```
┌──────────────────────────────────────────────────────────┐
│                   STAGE NODES (Mini PCs)                 │
│  - Captura analógica balanceada (Focusrite / Consola)     │
│  - Digitalización ALSA 16 kHz Mono PCM                   │
│  - Envío por LAN cableada (VLAN 20) al Servidor Central  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│               CENTRAL PRODUCTION SERVER (NOC)            │
│  - Único nodo con GEMINI_API_KEY corporativa              │
│  - Conexión WebSocket streaming con Google Gemini Live   │
│  - Inyección de NerdGlosario (+150 términos IT)          │
│  - Motor Gemini 2.5 Pro (Deep Intel & Minutas)           │
│  - Broker WebSocket: 1 Stream Entrante -> 3,000+ Salidas │
└────────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌────────────────────────┐
│  BROADCAST RIGS (NOC) │         │   AUDIENCIA (MÓVIL)    │
│  - OBS Studio / vMix  │         │  - 3,000+ Smartphones  │
│  - VLAN 30 Cableada   │         │  - QR Code a PWA       │
│  - /overlay (Alpha)   │         │  - Cloudflare CDN Edge │
└───────────────────────┘         └────────────────────────┘
```

---

## ⚙️ 2. Especificación Técnica de los Componentes

### A. Stage Nodes / Mini PCs (Por Escenario)
* **Ubicación:** Cabina técnica / mesa de sonido de cada sala (Gran Sala, Columnas, Auditorio).
* **Hardware:** Intel NUC 12/13 Pro o Minisforum (Core i5, 16 GB RAM, Debian 12 / Ubuntu Server).
* **Interfaz de Audio Profesional:** Focusrite Scarlett 2i2 USB o Behringer UMC202HD.
  * **Conexión:** Cable TRS de 1/4" balanceado desde el envío Auxiliar/Matrix de la consola (Behringer X32 / Midas M32).
  * **Por qué no usar el Jack 3.5mm de la PC:** El jack integrado es desbalanceado y capta el zumbido de 50Hz (*ground loop*) de las pantallas LED y dimmers del escenario. La interfaz profesional entrega audio puro con piso de ruido inferior a -100 dBFS.
* **Red:** Cableada directa CAT6 (1 Gbps) hacia el switch central. **Nunca Wi-Fi**.

### B. Servidor Central de Producción (Mesa Central Sysarmy / NOC)
* **Hardware:** Workstation rackeable o Intel Core i7/i9 con 64 GB RAM y UPS de doble conversión.
* **Función:**
  * Recibe los streams de audio PCM de los 3 escenarios.
  * Mantiene las sesiones activas con `gemini-3.5-transcribe-live` (Google Live API).
  * Conmuta a `gemini-2.5-flash` en caso de contingencia.
  * Emite los subtítulos resultantes a todos los suscriptores conectados.

### C. Audiencia (3,000+ Asistentes)
* **Ruta de Acceso:** Escaneo del código QR en las pantallas (`https://sub.nerdear.la`).
* **Tráfico de Red:** Se atiende mayoritariamente a través de las redes 4G/5G de las operadoras (Personal, Claro, Movistar) o el Wi-Fi de cortesía en VLAN separada.
* **Caché CDN de Cloudflare:** Todo el JavaScript, CSS e imágenes se descargan desde el Edge de Cloudflare; el servidor local de Konex solo maneja los pequeños mensajes de texto WebSocket (~400 bytes por frase).

---

## 📡 3. Protocolo Gemini 3.5 Transcribe Live

1. **Transporte:** WebSocket bidireccional sobre TLS (`wss://generativelanguage.googleapis.com/.../BidiGenerateContent`).
2. **Formato de Audio:** Raw 16-bit linear PCM, Little-Endian, 16,000 Hz Mono (`audio/pcm;rate=16000`).
3. **Eventos en Tiempo Real:**
   - `interimInputTranscription`: Transcripción tentativa en tiempo real (< 150 ms) para previsualización inmediata.
   - `inputTranscription`: Segmento final consolidado con puntuación, mayúsculas y eliminación automática de muletillas (*SMART Mode*).
4. **Custom Vocabulary Biasing:** Inyección de hasta 1,000 términos técnicos en el parámetro `inputAudioTranscription.customVocabulary`.
