import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { audioEngine } from '@/lib/audioEngine';

type VisualizerType = 'BARS' | 'WAVE' | 'CIRCLE' | 'SPECTRUM' | 'PARTICLES';

const VISUALIZER_TYPES: VisualizerType[] = ['BARS', 'WAVE', 'CIRCLE', 'SPECTRUM', 'PARTICLES'];

interface VisualizerSwitcherProps {
  compact?: boolean;
}

export const VisualizerSwitcher: React.FC<VisualizerSwitcherProps> = ({ compact = false }) => {
  const { isPlaying } = usePlayer();
  const analyserNode = audioEngine.getAnalyser();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [type, setType] = useState<VisualizerType>(() => {
    return (localStorage.getItem('visualizerType') as VisualizerType) || 'BARS';
  });

  const cycleType = () => {
    const idx = VISUALIZER_TYPES.indexOf(type);
    const next = VISUALIZER_TYPES[(idx + 1) % VISUALIZER_TYPES.length];
    setType(next);
    localStorage.setItem('visualizerType', next);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !analyserNode) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00FF94');
    gradient.addColorStop(1, '#00C875');

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00FF94';
    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;

    if (type === 'BARS') {
      const barCount = 24;
      const barWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufferLength * 0.7);
        const value = dataArray[idx] / 255;
        const barHeight = value * height * 0.9;
        ctx.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight);
      }
    } else if (type === 'WAVE') {
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;
      analyserNode.getByteTimeDomainData(dataArray);
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    } else if (type === 'CIRCLE') {
      const cx = width / 2, cy = height / 2, radius = Math.min(width, height) / 3;
      const bars = 32;
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * bufferLength * 0.5);
        const value = dataArray[idx] / 255;
        const angle = (i / bars) * Math.PI * 2;
        const len = value * radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius * 0.3, cy + Math.sin(angle) * radius * 0.3);
        ctx.lineTo(cx + Math.cos(angle) * (radius * 0.3 + len), cy + Math.sin(angle) * (radius * 0.3 + len));
        ctx.stroke();
      }
    } else if (type === 'SPECTRUM') {
      const barCount = 16;
      const barWidth = width / (barCount * 2) - 1;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufferLength * 0.5);
        const value = dataArray[idx] / 255;
        const barHeight = value * height * 0.45;
        const xLeft = width / 2 - (i + 1) * (barWidth + 1);
        const xRight = width / 2 + i * (barWidth + 1);
        ctx.fillRect(xLeft, height / 2 - barHeight, barWidth, barHeight);
        ctx.fillRect(xLeft, height / 2, barWidth, barHeight);
        ctx.fillRect(xRight, height / 2 - barHeight, barWidth, barHeight);
        ctx.fillRect(xRight, height / 2, barWidth, barHeight);
      }
    } else if (type === 'PARTICLES') {
      const particleCount = 20;
      for (let i = 0; i < particleCount; i++) {
        const idx = Math.floor((i / particleCount) * bufferLength * 0.3);
        const value = dataArray[idx] / 255;
        const size = 2 + value * 6;
        const x = (i / particleCount) * width;
        const y = height / 2 + (Math.sin(Date.now() / 200 + i) * value * height * 0.3);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [analyserNode, type]);

  useEffect(() => {
    if (isPlaying && analyserNode) {
      draw();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyserNode, draw]);

  if (compact) {
    return (
      <div className="flex items-center">
        <canvas ref={canvasRef} width={60} height={24} className="rounded opacity-80" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <canvas ref={canvasRef} width={100} height={32} className="rounded" />
      <button
        onClick={cycleType}
        className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
        title={`Visualizer: ${type}`}
      >
        {type}
      </button>
    </div>
  );
};

export default VisualizerSwitcher;
