import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { audioEngine } from '@/lib/audioEngine';

export const ElectricityVisualizer: React.FC<{ height?: number }> = ({ height = 80 }) => {
  const { isPlaying } = usePlayer();
  const analyserNode = audioEngine.getAnalyser();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const drawLightning = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, intensity: number) => {
    const segments = 8;
    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = x1 + (x2 - x1) * t;
      const baseY = y1 + (y2 - y1) * t;
      const offset = (Math.random() - 0.5) * 30 * intensity;
      points.push({ x: baseX + offset, y: baseY + offset * 0.5 });
    }
    points.push({ x: x2, y: y2 });

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Branch
    if (intensity > 0.5 && Math.random() > 0.6) {
      const branchIdx = Math.floor(Math.random() * (points.length - 2)) + 1;
      const branchEnd = {
        x: points[branchIdx].x + (Math.random() - 0.5) * 40,
        y: points[branchIdx].y + Math.random() * 20
      };
      ctx.beginPath();
      ctx.moveTo(points[branchIdx].x, points[branchIdx].y);
      ctx.lineTo(branchEnd.x, branchEnd.y);
      ctx.stroke();
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !analyserNode) return;

    const width = canvas.width;
    const h = canvas.height;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    // Get bass intensity
    let bass = 0;
    for (let i = 0; i < 10; i++) bass += dataArray[i];
    const intensity = bass / (10 * 255);

    ctx.clearRect(0, 0, width, h);

    // Glow effect
    ctx.shadowBlur = 15 + intensity * 20;
    ctx.shadowColor = '#8B5CF6';
    ctx.strokeStyle = `rgba(139, 92, 246, ${0.6 + intensity * 0.4})`;
    ctx.lineWidth = 1 + intensity * 2;

    // Draw lightning bolts based on intensity
    const boltCount = Math.floor(2 + intensity * 4);
    for (let i = 0; i < boltCount; i++) {
      const x1 = Math.random() * width;
      const x2 = x1 + (Math.random() - 0.5) * 100;
      drawLightning(ctx, x1, 0, x2, h, intensity);
    }

    // Electric blue overlay
    ctx.shadowColor = '#06B6D4';
    ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 + intensity * 0.3})`;
    if (intensity > 0.4) {
      drawLightning(ctx, Math.random() * width, 0, Math.random() * width, h, intensity * 0.7);
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [analyserNode, drawLightning]);

  useEffect(() => {
    if (isPlaying && analyserNode) {
      draw();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyserNode, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className="w-full rounded-lg opacity-80"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(139, 92, 246, 0.1))' }}
    />
  );
};

export default ElectricityVisualizer;
