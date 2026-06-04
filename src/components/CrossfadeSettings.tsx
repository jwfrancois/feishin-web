import { useState, useEffect } from 'react';
import { Waves } from 'lucide-react';

const CROSSFADE_KEY = 'crossfade_duration';

export function useCrossfade() {
  const [duration, setDuration] = useState(() => {
    const stored = localStorage.getItem(CROSSFADE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem(CROSSFADE_KEY, String(duration));
  }, [duration]);

  return { duration, setDuration };
}

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function CrossfadeSlider({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-300 flex items-center gap-2">
          <Waves className="w-4 h-4" />
          Crossfade
        </span>
        <span className="text-sm text-neutral-400">
          {value === 0 ? 'Off' : `${value}s`}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="12"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-player-accent [&::-webkit-slider-thumb]:rounded-full"
      />
      <div className="flex justify-between text-xs text-neutral-500">
        <span>Off</span>
        <span>12s</span>
      </div>
    </div>
  );
}
