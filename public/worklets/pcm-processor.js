/**
 * StreamingPCMResampler AudioWorkletProcessor for Project Aura
 * 
 * Converts live mic input (44.1kHz / 48kHz Float32)
 * to 16-bit 16kHz Mono Little-Endian Linear PCM via continuous stateful linear interpolation.
 * 
 * Preserves fractional residue and the previous sample across process() invocations
 * to eliminate audio popping, clipping, and phase artifacts.
 * 
 * Emits 100ms frames (1,600 samples = 3,200 bytes) matching Google Gemini 3.5 Transcribe Live
 * native audio input specifications (audio/pcm;rate=16000).
 */

class StreamingPCMResamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.targetSampleRate = 16000;
    this.chunkDurationMs = 100;
    // 16000 samples/sec * 0.1 sec = 1600 samples
    this.samplesPerChunk = Math.round((this.targetSampleRate * this.chunkDurationMs) / 1000);

    // Accumulator Int16 buffer
    this.outputBuffer = new Int16Array(this.samplesPerChunk);
    this.outputBufferIndex = 0;

    // Stateful resampler indices between process() callbacks
    this.fractionalIndex = 0.0;
    this.prevSample = 0.0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0]; // mono channel
    const inputLen = channelData.length;
    const inputSampleRate = sampleRate; // Global AudioWorkletGlobalScope sampleRate

    const ratio = inputSampleRate / this.targetSampleRate;
    let inIdx = this.fractionalIndex;

    while (inIdx < inputLen) {
      const idxFloor = Math.floor(inIdx);
      const frac = inIdx - idxFloor;

      const s0 = (idxFloor === 0) ? this.prevSample : channelData[idxFloor - 1];
      const s1 = channelData[idxFloor];

      // Linear interpolation between consecutive points
      const interpolated = s0 + frac * (s1 - s0);

      // Hard clamp [-1.0, 1.0]
      const clamped = Math.max(-1.0, Math.min(1.0, interpolated));

      // Float32 to Signed Int16 Little-Endian
      const int16Val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      this.outputBuffer[this.outputBufferIndex++] = Math.round(int16Val);

      // Despatch when 100ms buffer is full
      if (this.outputBufferIndex >= this.samplesPerChunk) {
        const chunkToSend = this.outputBuffer.slice().buffer;
        this.port.postMessage({
          type: 'pcm_chunk',
          buffer: chunkToSend,
          samples: this.samplesPerChunk,
          sampleRate: this.targetSampleRate
        }, [chunkToSend]);

        this.outputBufferIndex = 0;
      }

      inIdx += ratio;
    }

    // Save state for next audio frame
    this.fractionalIndex = inIdx - inputLen;
    this.prevSample = channelData[inputLen - 1];

    return true;
  }
}

registerProcessor('streaming-pcm-resampler', StreamingPCMResamplerProcessor);
