import { useState, useEffect, useRef } from 'react';
import { Moon, X } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90];

export function SleepTimer({ isOpen, onClose }: Props) {
  const { pause, audioRef, queue, queueIndex } = usePlayer();
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [endOfAlbum, setEndOfAlbum] = useState(false);
  const fadeIntervalRef = useRef<number>();

  // Update remaining time
  useEffect(() => {
    if (!endTime) {
      setRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        fadeOutAndStop();
      } else if (remaining <= 30) {
        // Start fading out in the last 30 seconds
        startFadeOut(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  // Handle end of album/playlist
  useEffect(() => {
    if (endOfAlbum && queueIndex >= queue.length - 1) {
      // On last track
      const audio = audioRef.current;
      if (audio) {
        const handleEnded = () => {
          setEndOfAlbum(false);
          setEndTime(null);
        };
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
      }
    }
  }, [endOfAlbum, queueIndex, queue.length, audioRef]);

  const startFadeOut = (remainingSeconds: number) => {
    if (fadeIntervalRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    const startVolume = audio.volume;
    const steps = remainingSeconds * 10;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = startVolume * (1 - currentStep / steps);
      audio.volume = Math.max(0, newVolume);

      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = undefined;
      }
    }, 100);
  };

  const fadeOutAndStop = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = undefined;
    }
    pause();
    setEndTime(null);
    setEndOfAlbum(false);
    // Reset volume
    if (audioRef.current) {
      audioRef.current.volume = 1;
    }
  };

  const setTimer = (minutes: number) => {
    setEndTime(Date.now() + minutes * 60 * 1000);
    setEndOfAlbum(false);
    onClose();
  };

  const setEndOfPlaylist = () => {
    setEndOfAlbum(true);
    setEndTime(null);
    onClose();
  };

  const cancelTimer = () => {
    setEndTime(null);
    setEndOfAlbum(false);
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = undefined;
    }
    if (audioRef.current) {
      audioRef.current.volume = 1;
    }
  };

  const formatRemaining = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isActive = endTime !== null || endOfAlbum;

  if (!isOpen) {
    // Show indicator if timer is active
    if (isActive) {
      return (
        <button
          onClick={cancelTimer}
          className="flex items-center gap-1 px-2 py-1 text-xs text-player-accent bg-player-accent/10 rounded-full"
          title="Click to cancel"
        >
          <Moon className="w-3 h-3" />
          {endOfAlbum ? 'End of album' : formatRemaining(remainingSeconds)}
        </button>
      );
    }
    return null;
  }

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white flex items-center gap-2">
          <Moon className="w-4 h-4 text-player-accent" />
          Sleep Timer
        </span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isActive && (
        <div className="mb-3 p-2 bg-player-accent/10 rounded-lg text-center">
          <div className="text-player-accent text-lg font-mono">
            {endOfAlbum ? 'End of album' : formatRemaining(remainingSeconds)}
          </div>
          <button
            onClick={cancelTimer}
            className="text-xs text-neutral-400 hover:text-white mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-1">
        {PRESET_MINUTES.map((mins) => (
          <button
            key={mins}
            onClick={() => setTimer(mins)}
            className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
          >
            {mins} minutes
          </button>
        ))}
        <button
          onClick={setEndOfPlaylist}
          className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
        >
          End of album/playlist
        </button>
      </div>
    </div>
  );
}

export function SleepTimerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-neutral-400 hover:text-white transition-colors"
        title="Sleep Timer"
      >
        <Moon className="w-4 h-4" />
      </button>
      <SleepTimer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
