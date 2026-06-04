import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/lib/audioEngine';

export type VisualizerType = 'bars' | 'wave' | 'circle' | 'spectrum' | 'particles';

const VISUALIZER_KEY = 'visualizer_type';

export function getStoredVisualizerType(): VisualizerType {
  try {
    const stored = localStorage.getItem(VISUALIZER_KEY);
    if (stored && ['bars', 'wave', 'circle', 'spectrum', 'particles'].includes(stored)) {
      return stored as VisualizerType;
    }
  } catch {}
  return 'bars';
}

export function setStoredVisualizerType(type: VisualizerType) {
  try {
    localStorage.setItem(VISUALIZER_KEY, type);
  } catch {}
}

interface MultiVisualizerProps {
  isPlaying: boolean;
  type: VisualizerType;
  width?: number;
  height?: number;
}

// Main multi-type visualizer for player bar
export function MultiVisualizer({ isPlaying, type, width = 180, height = 50 }: MultiVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const smoothedRef = useRef<Float32Array | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    if (analyser) {
      if (!dataArrayRef.current) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      if (!smoothedRef.current) {
        smoothedRef.current = new Float32Array(64).fill(0);
      }
    }

    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 30; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: Math.random(),
        });
      }
    }

    const draw = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, width, height);

      let bassLevel = 0;
      if (analyser && dataArrayRef.current && smoothedRef.current) {
        if (isPlaying) {
          analyser.getByteFrequencyData(dataArrayRef.current);
        }
        
        // Calculate bass level (first few bins)
        for (let i = 0; i < 8; i++) {
          bassLevel += dataArrayRef.current[i];
        }
        bassLevel = isPlaying ? bassLevel / (8 * 255) : 0;

        // Update smoothed data
        const barCount = 32;
        const step = Math.floor(dataArrayRef.current.length / barCount);
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArrayRef.current[i * step + j];
          }
          const target = isPlaying ? sum / step : 0;
          smoothedRef.current[i] += (target - smoothedRef.current[i]) * 0.2;
        }
      }

      // Draw based on type
      switch (type) {
        case 'bars':
          drawBars(ctx, width, height, smoothedRef.current, isPlaying);
          break;
        case 'wave':
          drawWave(ctx, width, height, smoothedRef.current, isPlaying, timeRef.current);
          break;
        case 'circle':
          drawCircle(ctx, width, height, smoothedRef.current, isPlaying, timeRef.current);
          break;
        case 'spectrum':
          drawSpectrum(ctx, width, height, smoothedRef.current, isPlaying);
          break;
        case 'particles':
          drawParticles(ctx, width, height, particlesRef.current, bassLevel, isPlaying);
          break;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, type, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded"
      style={{ 
        filter: isPlaying ? 'drop-shadow(0 0 4px rgba(0, 255, 148, 0.4))' : 'none',
      }}
    />
  );
}

function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, data: Float32Array | null, isPlaying: boolean) {
  const barCount = 24;
  const barWidth = Math.floor((w - (barCount - 1) * 2) / barCount);
  const gap = 2;

  for (let i = 0; i < barCount; i++) {
    const value = data ? data[i] : 0;
    const barHeight = Math.max(3, (value / 255) * h * 0.9);
    const x = i * (barWidth + gap);
    const y = h - barHeight;

    const gradient = ctx.createLinearGradient(x, h, x, y);
    gradient.addColorStop(0, '#00FF94');
    gradient.addColorStop(1, '#00CC76');

    ctx.shadowColor = '#00FF94';
    ctx.shadowBlur = isPlaying && value > 50 ? 6 : 0;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawWave(ctx: CanvasRenderingContext2D, w: number, h: number, data: Float32Array | null, isPlaying: boolean, time: number) {
  ctx.strokeStyle = '#00FF94';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00FF94';
  ctx.shadowBlur = isPlaying ? 8 : 0;
  ctx.beginPath();

  const points = 32;
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * w;
    const dataIndex = Math.floor((i / points) * 32);
    const value = data ? data[dataIndex] / 255 : 0;
    const wave = Math.sin(time * 2 + i * 0.3) * 3;
    const y = h / 2 - value * h * 0.4 + wave;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Mirror wave
  ctx.strokeStyle = 'rgba(0, 255, 148, 0.3)';
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * w;
    const dataIndex = Math.floor((i / points) * 32);
    const value = data ? data[dataIndex] / 255 : 0;
    const wave = Math.sin(time * 2 + i * 0.3) * 3;
    const y = h / 2 + value * h * 0.4 - wave;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCircle(ctx: CanvasRenderingContext2D, w: number, h: number, data: Float32Array | null, isPlaying: boolean, time: number) {
  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.25;
  const bars = 24;

  ctx.shadowColor = '#00FF94';
  ctx.shadowBlur = isPlaying ? 6 : 0;

  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2 + time * 0.5;
    const value = data ? data[i % 32] / 255 : 0;
    const length = baseRadius * 0.3 + value * baseRadius * 0.8;

    const x1 = cx + Math.cos(angle) * baseRadius;
    const y1 = cy + Math.sin(angle) * baseRadius;
    const x2 = cx + Math.cos(angle) * (baseRadius + length);
    const y2 = cy + Math.sin(angle) * (baseRadius + length);

    ctx.strokeStyle = `rgba(0, 255, 148, ${0.5 + value * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Center circle
  ctx.fillStyle = '#00FF94';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, data: Float32Array | null, isPlaying: boolean) {
  const barCount = 16;
  const barWidth = Math.floor((w - (barCount - 1) * 2) / barCount);
  const gap = 2;
  const centerY = h / 2;

  ctx.shadowColor = '#00FF94';
  ctx.shadowBlur = isPlaying ? 4 : 0;

  for (let i = 0; i < barCount; i++) {
    const value = data ? data[i] : 0;
    const barHeight = Math.max(2, (value / 255) * (h / 2 - 2));
    const x = i * (barWidth + gap);

    const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
    gradient.addColorStop(0, '#00CC76');
    gradient.addColorStop(0.5, '#00FF94');
    gradient.addColorStop(1, '#00CC76');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawParticles(
  ctx: CanvasRenderingContext2D, 
  w: number, 
  h: number, 
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>,
  bassLevel: number,
  isPlaying: boolean
) {
  const force = isPlaying ? bassLevel * 3 : 0;

  ctx.shadowColor = '#00FF94';
  ctx.shadowBlur = isPlaying ? 6 : 0;

  particles.forEach(p => {
    // Update particle
    p.vy -= 0.02 + force * 0.1;
    p.x += p.vx + (Math.random() - 0.5) * force * 2;
    p.y += p.vy;
    p.life -= 0.005;

    // Reset if out of bounds or dead
    if (p.y < 0 || p.life <= 0) {
      p.x = Math.random() * w;
      p.y = h;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = -1 - Math.random() * 2;
      p.life = 0.5 + Math.random() * 0.5;
    }

    // Draw particle
    const size = 2 + bassLevel * 4;
    const alpha = p.life * (isPlaying ? 1 : 0.3);
    ctx.fillStyle = `rgba(0, 255, 148, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

// Electricity visualizer for queue panel
export function ElectricityVisualizer({ isPlaying, width = 300, height = 80 }: { isPlaying: boolean; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const boltsRef = useRef<Array<{ points: Array<{ x: number; y: number }>; life: number; maxLife: number }>>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    if (analyser && !dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const draw = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, width, height);

      let bassLevel = 0;
      let midLevel = 0;
      if (analyser && dataArrayRef.current) {
        if (isPlaying) {
          analyser.getByteFrequencyData(dataArrayRef.current);
        }
        
        for (let i = 0; i < 8; i++) bassLevel += dataArrayRef.current[i];
        bassLevel = isPlaying ? bassLevel / (8 * 255) : 0;
        
        for (let i = 8; i < 32; i++) midLevel += dataArrayRef.current[i];
        midLevel = isPlaying ? midLevel / (24 * 255) : 0;
      }

      // Generate new bolts based on audio intensity
      if (isPlaying && Math.random() < bassLevel * 0.8 + 0.05) {
        const startX = Math.random() * width;
        const endX = startX + (Math.random() - 0.5) * width * 0.6;
        const bolt = generateLightningBolt(startX, 0, endX, height, 4 + Math.floor(bassLevel * 4));
        boltsRef.current.push({ points: bolt, life: 1, maxLife: 0.2 + bassLevel * 0.3 });
      }

      // Draw and update bolts
      boltsRef.current = boltsRef.current.filter(bolt => {
        bolt.life -= 0.05;
        if (bolt.life <= 0) return false;

        const alpha = bolt.life / bolt.maxLife;
        const intensity = bassLevel + midLevel;

        // Main bolt
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
        ctx.lineWidth = 2 + intensity * 2;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 15 + intensity * 10;
        ctx.beginPath();
        bolt.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Core glow
        ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        bolt.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw branches
        if (bolt.points.length > 3) {
          for (let i = 2; i < bolt.points.length - 1; i += 2) {
            if (Math.random() < 0.5) {
              const branchLen = 10 + Math.random() * 20 * intensity;
              const angle = (Math.random() - 0.5) * Math.PI;
              const endX = bolt.points[i].x + Math.cos(angle) * branchLen;
              const endY = bolt.points[i].y + Math.sin(angle) * branchLen * 0.5 + branchLen * 0.5;
              
              ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.5})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(bolt.points[i].x, bolt.points[i].y);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
          }
        }

        return true;
      });

      ctx.shadowBlur = 0;

      // Ambient electrical particles
      if (isPlaying) {
        for (let i = 0; i < 3 + bassLevel * 5; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const size = 1 + Math.random() * 2;
          
          ctx.fillStyle = `rgba(100, 180, 255, ${0.3 + Math.random() * 0.3})`;
          ctx.shadowColor = '#4488ff';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded"
      style={{ 
        filter: isPlaying ? 'drop-shadow(0 0 8px rgba(68, 136, 255, 0.5))' : 'none',
      }}
    />
  );
}

function generateLightningBolt(x1: number, y1: number, x2: number, y2: number, segments: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;

  for (let i = 1; i < segments; i++) {
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 10;
    points.push({
      x: x1 + dx * i + offsetX,
      y: y1 + dy * i + offsetY,
    });
  }
  points.push({ x: x2, y: y2 });
  return points;
}

// Visualizer type selector button
export function VisualizerTypeSelector({ 
  currentType, 
  onChange 
}: { 
  currentType: VisualizerType; 
  onChange: (type: VisualizerType) => void;
}) {
  const types: VisualizerType[] = ['bars', 'wave', 'circle', 'spectrum', 'particles'];
  
  const cycleType = () => {
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    const nextType = types[nextIndex];
    setStoredVisualizerType(nextType);
    onChange(nextType);
  };

  const labels: Record<VisualizerType, string> = {
    bars: '▮▮▮',
    wave: '∿∿∿',
    circle: '◉',
    spectrum: '▮▯▮',
    particles: '✦',
  };

  return (
    <button
      onClick={cycleType}
      className="px-2 py-1 text-xs text-neutral-400 hover:text-[#00FF94] bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
      title={`Visualizer: ${currentType}`}
    >
      {labels[currentType]}
    </button>
  );
}
