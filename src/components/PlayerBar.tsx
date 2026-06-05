import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Settings2,
  Maximize2,
  RotateCcw,
  RotateCw,
  Music2,
  ChevronUp,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { AudioSettings } from './AudioSettings';
import { FullscreenPlayer } from './FullscreenPlayer';
import { MiniPlayer } from './MiniPlayer';
import { SleepTimerButton } from './SleepTimer';
import { PlaybackSpeedButton } from './PlaybackSpeed';
import { ABLoop, ABLoopMarkers } from './ABLoop';
import { ShareNowPlaying } from './ShareNowPlaying';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { StemSeparationButton } from './StemSeparation';
import { MusicDNAButton } from './MusicDNA';
import { ConcertModeButton } from './ConcertMode';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { jellyfinApi } from '@/lib/jellyfin';
import { useThemeColorCSS } from '@/hooks/useThemeColor';
import { useIsMobile, useBreakpoint, BREAKPOINTS } from '@/hooks/use-window-size';
import { detectMediaType } from '@/types/jellyfin';

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SKIP_INTERVALS = [10, 15, 30, 45, 60];

function SkipControlsMobile({ seek, currentTime, duration }: { seek: (t: number) => void; currentTime: number; duration: number }) {
  const [skipInterval, setSkipInterval] = useState(() => {
    const stored = localStorage.getItem('skip_interval');
    return stored ? parseInt(stored, 10) : 15;
  });

  const handleSkipBack = () => seek(Math.max(0, currentTime - skipInterval));
  const handleSkipForward = () => seek(Math.min(duration, currentTime + skipInterval));

  return (
    <div className="flex items-center gap-4">
      <button onClick={handleSkipBack} className="p-2 text-neutral-400" title={`-${skipInterval}s`}>
        <RotateCcw className="w-5 h-5" />
      </button>
      <button onClick={handleSkipForward} className="p-2 text-neutral-400" title={`+${skipInterval}s`}>
        <RotateCw className="w-5 h-5" />
      </button>
    </div>
  );
}

// Mobile compact player bar
function MobilePlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    shuffle,
    repeat,
  } = usePlayer();

  const [showVolume, setShowVolume] = useState(false);

  const breakpoint = useBreakpoint();
  const mediaType = currentTrack ? detectMediaType(currentTrack) : 'music';
  const isSpokenContent = mediaType === 'podcasts' || mediaType === 'audiobooks';

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const imageUrl = currentTrack
    ? jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 100)
    : null;
  useThemeColorCSS(imageUrl);

  if (!currentTrack) {
    return (
      <div className="h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-center px-4">
        <span className="text-sm text-neutral-500">No track playing</span>
      </div>
    );
  }

  return (
    <div className="h-16 bg-neutral-900 border-t border-neutral-800 flex items-center gap-3 px-3">
      {/* Track art and info - stacked */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src={jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 48)}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white truncate">{currentTrack.Name}</div>
          <div className="text-xs text-neutral-400 truncate">{currentTrack.Artists?.join(', ')}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {isSpokenContent && (
          <SkipControlsMobile seek={seek} currentTime={currentTime} duration={duration} />
        )}

        <button onClick={toggle} className="w-10 h-10 flex items-center justify-center rounded-full bg-player-accent">
          {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
        </button>

        <button onClick={next} className="p-2 text-neutral-400">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Progress indicator (simple line) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-800">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--theme-color, #00FF94)',
          }}
        />
      </div>
    </div>
  );
}

// Desktop full player bar
function DesktopPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isQueueOpen,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleQueue,
  } = usePlayer();

  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const mediaType = currentTrack ? detectMediaType(currentTrack) : 'music';
  const isSpokenContent = mediaType === 'podcasts' || mediaType === 'audiobooks';

  const imageUrl = currentTrack
    ? jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 100)
    : null;
  useThemeColorCSS(imageUrl);

  useKeyboardShortcuts({
    onToggleFullscreen: () => {
      if (showFullscreen) setShowFullscreen(false);
      else if (currentTrack) setShowFullscreen(true);
    },
    onToggleLyrics: () => {},
    onShowHelp: () => setShowShortcuts(true),
  });

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  useEffect(() => {
    if (!showFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showFullscreen]);

  return (
    <>
      <div 
        className="h-24 bg-neutral-900 border-t border-neutral-800 flex items-center px-4 gap-4 relative overflow-hidden"
        style={{
          background: currentTrack ? 
            `linear-gradient(to right, rgba(var(--theme-color-r, 0), var(--theme-color-g, 0), var(--theme-color-b, 0), 0.1), transparent)` 
            : undefined
        }}
      >
        {/* Left: Track Metadata */}
        <div className="flex flex-col justify-center w-64 min-w-0 z-10">
          {currentTrack ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate text-sm">{currentTrack.Name}</span>
              </div>
              <div className="text-neutral-400 text-xs truncate">{currentTrack.Artists?.join(', ')}</div>
              <div className="text-neutral-500 text-xs truncate">{currentTrack.Album}</div>
            </>
          ) : (
            <div className="text-neutral-500 text-sm">No track playing</div>
          )}
        </div>

        {/* Center: Controls + Progress */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-3xl mx-auto relative z-10">
          {/* Controls */}
          <div className="flex items-center gap-2 relative z-10">
            {isSpokenContent && <SkipControls seek={seek} currentTime={currentTime} duration={duration} />}

            <button onClick={previous} className="p-2 text-neutral-400 hover:text-white">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>

            <button
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full text-black hover:scale-105"
              style={{ 
                backgroundColor: 'var(--theme-color, #00FF94)',
              }}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </button>

            <button onClick={next} className="p-2 text-neutral-400 hover:text-white">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>

            {isSpokenContent && <div className="w-14" />}
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2 relative z-10">
            <span className="text-xs text-neutral-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
            <div onClick={handleSeek} className="flex-1 h-1.5 bg-neutral-700/80 rounded-full cursor-pointer group">
              <ABLoopMarkers duration={duration} />
              <div 
                className="h-full rounded-full relative" 
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: 'var(--theme-color, #00FF94)',
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100" />
              </div>
            </div>
            <span className="text-xs text-neutral-400 font-mono w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 w-80 justify-end z-10">
          {!isSpokenContent && <StemSeparationButton />}
          {!isSpokenContent && <ConcertModeButton />}
          {!isSpokenContent && <MusicDNAButton />}
          
          <PlaybackSpeedButton prominent={isSpokenContent} />
          <SleepTimerButton />

          <button onClick={toggleShuffle} className={`p-2 ${shuffle ? 'text-player-accent' : 'text-neutral-400'}`}>
            <Shuffle className="w-4 h-4" />
          </button>

          <button onClick={cycleRepeat} className={`p-2 ${repeat !== 'off' ? 'text-player-accent' : 'text-neutral-400'}`}>
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1 ml-2">
            <button onClick={toggleMute} className="p-2 text-neutral-400">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <button onClick={() => setShowFullscreen(true)} className="p-2 text-neutral-400" disabled={!currentTrack}>
            <Maximize2 className="w-4 h-4" />
          </button>

          <button onClick={toggleQueue} className={`p-2 ml-2 ${isQueueOpen ? 'text-player-accent' : 'text-neutral-400'}`}>
            <ListMusic className="w-5 h-5" />
          </button>

          <button onClick={() => setShowAudioSettings(true)} className="p-2 text-neutral-400">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAudioSettings && <AudioSettings onClose={() => setShowAudioSettings(false)} />}
      {showFullscreen && <FullscreenPlayer onClose={() => setShowFullscreen(false)} />}
      {showShare && <ShareNowPlaying onClose={() => setShowShare(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

// Main export function
export function PlayerBar() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobilePlayerBar />;
  }
  
  return <DesktopPlayerBar />;
}

// Need this for desktop
function SkipControls({ seek, currentTime, duration }: { seek: (t: number) => void; currentTime: number; duration: number }) {
  const [skipInterval, setSkipInterval] = useState(() => {
    const stored = localStorage.getItem('skip_interval');
    return stored ? parseInt(stored, 10) : 15;
  });

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => seek(Math.max(0, currentTime - skipInterval))} className="p-1.5 text-neutral-400">
        <RotateCcw className="w-4 h-4" />
      </button>
      <button onClick={() => seek(Math.min(duration, currentTime + skipInterval))} className="p-1.5 text-neutral-400">
        <RotateCw className="w-4 h-4" />
      </button>
    </div>
  );
}