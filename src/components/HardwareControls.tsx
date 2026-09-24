import React, { useState, useEffect, useRef } from 'react';

// Countersunk Industrial Hex Screw Component
export const HexScrew: React.FC = () => (
  <div className="w-4 h-4 rounded-full bg-[#181d28] border border-[#2d364a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center select-none shrink-0">
    <div className="w-2 h-2 rounded-xs bg-[#0b0d13] border border-[#202738] flex items-center justify-center">
      <div className="w-1.5 h-[1.5px] bg-[#4a556d] rotate-45" />
    </div>
  </div>
);

// 19-Inch Rack Unit Chassis (EIA-310-D Standard)
interface RackUnitProps {
  unitId?: string;
  title: string;
  subTitle?: string;
  uHeight?: '1U' | '2U' | '3U' | '4U';
  children: React.ReactNode;
  rightBadge?: React.ReactNode;
}

export const RackUnit: React.FC<RackUnitProps> = ({
  unitId = 'UNIT_01',
  title,
  subTitle,
  uHeight = '2U',
  children,
  rightBadge,
}) => {
  return (
    <div className="relative bg-[#090b10] border-y-2 border-[#1c2333] shadow-2xl rounded-sm my-4">
      {/* Top Machined Chamfer Lip with Reflective Highlight */}
      <div className="h-1 w-full bg-gradient-to-r from-[#171d2b] via-[#2c364c] to-[#171d2b] border-b border-[#06080c]" />

      <div className="flex">
        {/* Left 19-Inch Rack Ear with Hex Screws */}
        <div className="w-7 sm:w-8 bg-[#0b0e14] border-r border-[#161b26] flex flex-col justify-between items-center py-3 select-none shrink-0">
          <HexScrew />
          <div className="text-[7px] font-mono font-bold tracking-widest text-[#3d465c] -rotate-90 origin-center whitespace-nowrap hidden sm:block">
            EIA-310
          </div>
          <HexScrew />
        </div>

        {/* Central Equipment Faceplate Panel */}
        <div className="flex-1 p-3 sm:p-5 bg-gradient-to-b from-[#0f121a] to-[#090b10] overflow-hidden">
          {/* Chassis Silkscreen Header Strip */}
          <div className="flex items-center justify-between border-b border-[#181d2a] pb-2.5 mb-3.5">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-[#131722] text-[#00f5ff] border border-[#22293b] tracking-wider">
                {unitId}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#131722] text-[#64748b] border border-[#22293b] tracking-wider">
                {uHeight}
              </span>
              <div>
                <h3 className="font-mono font-black text-xs text-white uppercase tracking-wider">
                  {title}
                </h3>
                {subTitle && (
                  <p className="font-mono text-[10px] text-[#64748b] hidden sm:block">
                    {subTitle}
                  </p>
                )}
              </div>
            </div>

            {rightBadge && (
              <div className="flex items-center gap-2">
                {rightBadge}
              </div>
            )}
          </div>

          {/* Module Payload Slot */}
          <div className="space-y-4">
            {children}
          </div>
        </div>

        {/* Right 19-Inch Rack Ear with Hex Screws */}
        <div className="w-7 sm:w-8 bg-[#0b0e14] border-l border-[#161b26] flex flex-col justify-between items-center py-3 select-none shrink-0">
          <HexScrew />
          <div className="text-[7px] font-mono font-bold tracking-widest text-[#3d465c] rotate-90 origin-center whitespace-nowrap hidden sm:block">
            19-INCH
          </div>
          <HexScrew />
        </div>
      </div>

      {/* Bottom Chassis Bevel Line */}
      <div className="h-1 w-full bg-[#06080c] border-t border-[#141824]" />
    </div>
  );
};

// 14-Segment Discrete LED VU Meter with Peak Hold (calibrated dBFS)
interface HardwareVuMeterProps {
  levelPercent: number; // 0 to 100
  label?: string;
  peakDb?: number;
  isClipping?: boolean;
}

export const HardwareVuMeter: React.FC<HardwareVuMeterProps> = ({
  levelPercent,
  label = 'CH_01 PGM',
  peakDb = -18,
  isClipping = false,
}) => {
  const [peakHoldIndex, setPeakHoldIndex] = useState(0);

  const totalSegments = 14;
  const currentSegment = Math.round((levelPercent / 100) * totalSegments);

  useEffect(() => {
    if (currentSegment > peakHoldIndex) {
      setPeakHoldIndex(currentSegment);
    } else {
      const timer = setTimeout(() => {
        setPeakHoldIndex((prev) => Math.max(0, prev - 1));
      }, 550); // 550ms peak decay
      return () => clearTimeout(timer);
    }
  }, [currentSegment, peakHoldIndex]);

  return (
    <div className="bg-[#05070a] border border-[#141822] rounded p-2.5 font-mono select-none">
      <div className="flex items-center justify-between text-[9px] text-[#64748b] mb-1.5">
        <span className="font-bold text-gray-400">{label}</span>
        <span className={`${isClipping ? 'text-[#ff1744] font-black animate-pulse' : 'text-gray-300'}`}>
          {isClipping ? 'CLIP' : `${peakDb.toFixed(1)} dBFS`}
        </span>
      </div>

      {/* Discrete Segmented Ladder */}
      <div className="grid grid-cols-14 gap-[2px] h-3 bg-[#080a0f] p-[2px] rounded border border-[#10131a]">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isActive = i < currentSegment;
          const isPeak = i === peakHoldIndex - 1;
          const isRed = i >= 12;
          const isAmber = i >= 9 && i < 12;

          let colorClass = 'bg-[#10131a] opacity-35';

          if (isActive || isPeak) {
            if (isRed) {
              colorClass = 'bg-[#ff1744] shadow-[0_0_6px_#ff1744] opacity-100';
            } else if (isAmber) {
              colorClass = 'bg-[#ffb800] shadow-[0_0_5px_#ffb800] opacity-100';
            } else {
              colorClass = 'bg-[#00ff66] shadow-[0_0_5px_#00ff66] opacity-100';
            }
          }

          return (
            <div
              key={i}
              className={`h-full rounded-[1px] transition-all duration-75 ${colorClass}`}
            />
          );
        })}
      </div>

      {/* Calibrated Silkscreen Tick Marks */}
      <div className="flex justify-between text-[7px] text-[#475569] font-mono pt-1 px-0.5">
        <span>-∞</span>
        <span>-24</span>
        <span>-18</span>
        <span>-12</span>
        <span>-6</span>
        <span>0</span>
        <span className="text-[#ff1744]">CLIP</span>
      </div>
    </div>
  );
};

// CRT Vector Oscilloscope Canvas
interface HardwareOscilloscopeProps {
  analyserNode: AnalyserNode | null;
  sampleRate?: number;
  height?: number;
}

export const HardwareOscilloscope: React.FC<HardwareOscilloscopeProps> = ({
  analyserNode,
  sampleRate = 48000,
  height = 90,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const canvasHeight = canvas.height;

      // 1. Phosphor Persistence Decay
      ctx.fillStyle = 'rgba(5, 7, 10, 0.28)';
      ctx.fillRect(0, 0, width, canvasHeight);

      // 2. Center Zero-Crossing Axis Line
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(width, canvasHeight / 2);
      ctx.stroke();

      // 3. Audio Waveform Plotting
      if (analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#00f5ff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvasHeight) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, canvasHeight / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [analyserNode]);

  return (
    <div className="relative rounded overflow-hidden border border-[#1b2230] hw-crt-graticule">
      <div className="absolute top-1 left-2 flex items-center gap-3 text-[8px] font-mono text-[#00f5ff] select-none pointer-events-none z-10">
        <span>TIMEBASE: 2.5ms/DIV</span>
        <span>TRIG: AUTO CH1</span>
        <span>SR: {sampleRate / 1000} kHz</span>
      </div>

      <canvas 
        ref={canvasRef} 
        width={640} 
        height={height} 
        className="w-full h-full block"
      />
    </div>
  );
};
