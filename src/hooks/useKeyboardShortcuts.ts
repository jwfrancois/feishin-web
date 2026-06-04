import { useEffect, useCallback } from 'react';
import { usePlayer } from '@/context/PlayerContext';

interface ShortcutHandlers {
  onToggleFullscreen?: () => void;
  onToggleMiniPlayer?: () => void;
  onToggleLyrics?: () => void;
  onShowHelp?: () => void;
}

export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause', group: 'Playback' },
  { key: '←', action: 'Seek backward 10s', group: 'Playback' },
  { key: '→', action: 'Seek forward 10s', group: 'Playback' },
  { key: 'N', action: 'Next track', group: 'Playback' },
  { key: 'P', action: 'Previous track', group: 'Playback' },
  { key: '↑', action: 'Volume up', group: 'Volume' },
  { key: '↓', action: 'Volume down', group: 'Volume' },
  { key: 'M', action: 'Mute / Unmute', group: 'Volume' },
  { key: 'S', action: 'Toggle shuffle', group: 'Playback' },
  { key: 'R', action: 'Cycle repeat mode', group: 'Playback' },
  { key: 'L', action: 'Toggle lyrics', group: 'View' },
  { key: 'Q', action: 'Toggle queue', group: 'View' },
  { key: 'F', action: 'Toggle fullscreen mode', group: 'View' },
  { key: 'Escape', action: 'Exit fullscreen / Close modal', group: 'View' },
  { key: '?', action: 'Show keyboard shortcuts', group: 'Help' },
];

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const {
    toggle,
    next,
    previous,
    seek,
    currentTime,
    duration,
    volume,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleQueue,
    isPlaying,
  } = usePlayer();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ignore if modifier keys are pressed (except for ?)
    if ((e.ctrlKey || e.metaKey || e.altKey) && e.key !== '?') {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        toggle();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seek(Math.max(0, currentTime - 10));
        break;
      case 'ArrowRight':
        e.preventDefault();
        seek(Math.min(duration, currentTime + 10));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        next();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        previous();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 's':
      case 'S':
        e.preventDefault();
        toggleShuffle();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        cycleRepeat();
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        handlers.onToggleLyrics?.();
        break;
      case 'q':
      case 'Q':
        e.preventDefault();
        toggleQueue();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        handlers.onToggleFullscreen?.();
        break;
      case 'Escape':
        handlers.onToggleFullscreen?.();
        break;
      case '?':
        e.preventDefault();
        handlers.onShowHelp?.();
        break;
    }
  }, [
    toggle, next, previous, seek, currentTime, duration,
    volume, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    toggleQueue, handlers,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
