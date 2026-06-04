import { useState, useEffect } from 'react';
import { Gauge, X } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaybackSpeedPanel({ isOpen, onClose }: Props) {
  const { audioRef } = usePlayer();
  const [speed, setSpeed] = useState(() => {
    const stored = localStorage.getItem('playback_speed');
    return stored ? parseFloat(stored) : 1;
  });

  // Apply stored speed on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [audioRef, speed]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    localStorage.setItem('playback_speed', String(newSpeed));
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  if (!isOpen) {
    if (speed !== 1) {
      return (
        <button
          onClick={() => handleSpeedChange(1)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-player-accent bg-player-accent/10 rounded-full"
          title="Click to reset"
        >
          {speed}x
        </button>
      );
    }
    return null;
  }

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-player-accent" />
          Playback Speed
        </span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-player-accent text-black'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <input
        type="range"
        min="0.5"
        max="2"
        step="0.05"
        value={speed}
        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        className="w-full mt-3 h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-player-accent [&::-webkit-slider-thumb]:rounded-full"
      />
      <div className="text-center text-xs text-neutral-400 mt-1">{speed.toFixed(2)}x</div>
    </div>
  );
}

interface ButtonProps {
  prominent?: boolean;
}

export function PlaybackSpeedButton({ prominent = false }: ButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { audioRef } = usePlayer();
  const [currentSpeed, setCurrentSpeed] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem('playback_speed');
    if (stored) {
      const speed = parseFloat(stored);
      setCurrentSpeed(speed);
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    }
  }, [audioRef]);

  // Listen for speed changes
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('playback_speed');
      if (stored) setCurrentSpeed(parseFloat(stored));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (prominent) {
    // Prominent display for spoken content
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            currentSpeed !== 1
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
          title="Playback Speed"
        >
          <Gauge className="w-3.5 h-3.5" />
          {currentSpeed}x
        </button>
        <PlaybackSpeedPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 transition-colors ${
          currentSpeed !== 1 ? 'text-player-accent' : 'text-neutral-400 hover:text-white'
        }`}
        title="Playback Speed"
      >
        <Gauge className="w-4 h-4" />
      </button>
      <PlaybackSpeedPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
