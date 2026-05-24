import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  glowColor: string; // e.g., 'rgba(0, 240, 255, 0.5)'
  color: string; // #00f0ff etc
}

export default function AudioVisualizer({ analyser, isPlaying, glowColor, color }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI or sizes
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
        canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Audio animation loop
    const renderFrame = () => {
      if (!ctx || !canvas) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      const bufferLength = analyser ? analyser.frequencyBinCount : 32;
      const dataArray = new Uint8Array(bufferLength);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Mock idle waves if not playing for visual continuity
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 5 + Math.sin(Date.now() * 0.005 + i * 0.2) * 10;
        }
      }

      // Draw neon grid background in visualizer
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 12;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw frequency spectrum
      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      // Draw ambient backdrop glow
      ctx.fillStyle = isPlaying ? `rgba(${glowColor}, 0.03)` : 'rgba(255, 255, 255, 0.01)';
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;

      for (let i = 0; i < bufferLength; i++) {
        // Amplify values visually
        const raw = dataArray[i];
        barHeight = isPlaying ? (raw / 255) * height * 0.85 : raw;

        // Draw double-sided bars or waves
        const yTop = height / 2 - barHeight / 2;
        const yBottom = height / 2 + barHeight / 2;

        if (i === 0) {
          ctx.moveTo(x, yTop);
        } else {
          ctx.lineTo(x, yTop);
        }

        x += barWidth;
      }
      ctx.stroke();

      // Reset paths shadow
      ctx.shadowBlur = 0;

      // Secondary mirroring outline in deep blue
      x = 0;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < bufferLength; i++) {
        const raw = dataArray[i];
        barHeight = isPlaying ? (raw / 255) * height * 0.85 : raw;
        const yBottom = height / 2 + barHeight / 2;
        if (i === 0) {
          ctx.moveTo(x, yBottom);
        } else {
          ctx.lineTo(x, yBottom);
        }
        x += barWidth;
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, color, glowColor]);

  return (
    <div id="visualizer-container" className="relative w-full h-full bg-slate-950/60 rounded-lg overflow-hidden border border-slate-800/80">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none select-none">
        <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">Spectrum Analyzer</span>
      </div>
    </div>
  );
}
