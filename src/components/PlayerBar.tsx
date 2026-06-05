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
  Music2,
  Sliders,
  Settings2,
  Maximize2,
  Minimize2,
  Share2,
  RotateCcw,
  RotateCw,
  Mic2,
  BookOpen,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { LyricsPanel } from './LyricsPanel';
import { ParametricEQ } from './ParametricEQ';
import { AudioSettings } from './AudioSettings';
import { QualityBadge } from './QualityBadge';
import { VisualizerSwitcher } from './VisualizerSwitcher';
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
import { detectMediaType } from '@/types/jellyfin';

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Skip interval options (in seconds)
const SKIP_INTERVALS = [10, 15, 30, 45, 60];

function SkipControls({ seek, currentTime, duration }: { seek: (t: number) => void; currentTime: number; duration: number }) {
  const [skipInterval, setSkipInterval] = useState(() => {
    const stored = localStorage.getItem('skip_interval');
    return stored ? parseInt(stored, 10) : 15;
  });
  const [showOptions, setShowOptions] = useState(false);

  const handleSkipBack = () => {
    seek(Math.max(0, currentTime - skipInterval));
  };

  const handleSkipForward = () => {
    seek(Math.min(duration, currentTime + skipInterval));
  };

  const handleSetInterval = (interval: number) => {
    setSkipInterval(interval);
    localStorage.setItem('skip_interval', String(interval));
    setShowOptions(false);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <button
        onClick={handleSkipBack}
        className="p-1.5 text-neutral-400 hover:text-white transition-colors relative group"
        title={`Skip back ${skipInterval}s`}
      >
        <RotateCcw className="w-4 h-4" />
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-neutral-500 group-hover:text-white">
          {skipInterval}
        </span>
      </button>
      
      <button
        onClick={handleSkipForward}
        onContextMenu={(e) => { e.preventDefault(); setShowOptions(!showOptions); }}
        className="p-1.5 text-neutral-400 hover:text-white transition-colors relative group"
        title={`Skip forward ${skipInterval}s (right-click to change)`}
      >
        <RotateCw className="w-4 h-4" />
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-neutral-500 group-hover:text-white">
          {skipInterval}
        </span>
      </button>

      {/* Interval Options Popup */}
      {showOptions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg p-2 z-50 shadow-xl">
            <p className="text-xs text-neutral-400 mb-2 whitespace-nowrap">Skip interval</p>
            <div className="flex gap-1">
              {SKIP_INTERVALS.map((interval) => (
                <button
                  key={interval}
                  onClick={() => handleSetInterval(interval)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    skipInterval === interval
                      ? 'bg-player-accent text-black font-medium'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {interval}s
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date());
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="flex flex-col items-end cursor-default select-none"
      onMouseEnter={() => setShowDate(true)}
      onMouseLeave={() => setShowDate(false)}
    >
      <span className="text-xs text-neutral-500 font-mono tabular-nums">{timeStr}</span>
      {showDate && <span className="text-[10px] text-neutral-600 font-mono">{dateStr}</span>}
    </div>
  );
}

function MediaTypeBadge({ type }: { type: 'music' | 'podcasts' | 'audiobooks' }) {
  if (type === 'podcasts') {
    return (
      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded flex items-center gap-0.5">
        <Mic2 className="w-2.5 h-2.5" />
        Podcast
      </span>
    );
  }
  if (type === 'audiobooks') {
    return (
      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded flex items-center gap-0.5">
        <BookOpen className="w-2.5 h-2.5" />
        Audiobook
      </span>
    );
  }
  return null;
}

export function PlayerBar() {
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

  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Detect if current track is spoken content
  const mediaType = currentTrack ? detectMediaType(currentTrack) : 'music';
  const isSpokenContent = mediaType === 'podcasts' || mediaType === 'audiobooks';

  // Dynamic theme color from album art
  const imageUrl = currentTrack
    ? jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 100)
    : null;
  useThemeColorCSS(imageUrl);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleFullscreen: () => {
      if (showFullscreen) setShowFullscreen(false);
      else if (currentTrack) setShowFullscreen(true);
    },
    onToggleLyrics: () => setShowLyrics(!showLyrics),
    onShowHelp: () => setShowShortcuts(true),
  });

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  // Close fullscreen on escape
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
        className="h-24 bg-neutral-900 border-t border-neutral-800 flex items-center px-4 gap-4 relative overflow-hidden transition-all duration-500"
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
                {isSpokenContent ? (
                  <MediaTypeBadge type={mediaType} />
                ) : (
                  <QualityBadge track={currentTrack} size="sm" />
                )}
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
            {/* Skip controls for spoken content */}
            {isSpokenContent && (
              <SkipControls seek={seek} currentTime={currentTime} duration={duration} />
            )}

            <button onClick={previous} className="p-2 text-neutral-400 hover:text-white transition-colors">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>

            <button
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full text-black hover:scale-105 transition-transform shadow-lg"
              style={{ 
                backgroundColor: 'var(--theme-color, #00FF94)',
                boxShadow: '0 4px 20px var(--theme-color-50, rgba(0,255,148,0.3))'
              }}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </button>

            <button onClick={next} className="p-2 text-neutral-400 hover:text-white transition-colors">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>

            {/* Spacer for symmetry when skip controls shown */}
            {isSpokenContent && <div className="w-14" />}
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2 relative z-10">
            <span className="text-xs text-neutral-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
            <div onClick={handleSeek} className="flex-1 h-1.5 bg-neutral-700/80 rounded-full cursor-pointer group relative backdrop-blur-sm">
              {/* A-B Loop markers */}
              <ABLoopMarkers duration={duration} />
              <div 
                className="h-full rounded-full relative shadow-sm transition-all" 
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: isSpokenContent 
                    ? (mediaType === 'podcasts' ? '#a855f7' : '#f59e0b')
                    : 'var(--theme-color, #00FF94)',
                  boxShadow: isSpokenContent
                    ? (mediaType === 'podcasts' ? '0 0 8px rgba(168,85,247,0.5)' : '0 0 8px rgba(245,158,11,0.5)')
                    : '0 0 8px var(--theme-color-50, rgba(0,255,148,0.5))'
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
              </div>
            </div>
            <span className="text-xs text-neutral-400 font-mono w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 w-80 justify-end z-10">
          {/* Visualizer Switcher - hide for spoken content */}
          {!isSpokenContent && <VisualizerSwitcher />}

          {/* Lyrics button - hide for spoken content */}
          {!isSpokenContent && (
            <button
              onClick={() => setShowLyrics(true)}
              className={`p-2 transition-colors ${showLyrics ? 'text-[var(--theme-color,#00FF94)]' : 'text-neutral-400 hover:text-white'}`}
              title="Lyrics (L)"
              disabled={!currentTrack}
            >
              <Music2 className="w-4 h-4" />
            </button>
          )}

          {/* A-B Loop */}
          <ABLoop />

          {/* Playback Speed - more prominent for spoken content */}
          <PlaybackSpeedButton prominent={isSpokenContent} />

          {/* Sleep Timer */}
          <SleepTimerButton />

          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Share Now Playing"
            disabled={!currentTrack}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Equalizer button - hide for spoken content */}
          {!isSpokenContent && (
            <button
              onClick={() => setShowEqualizer(true)}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
              title="Parametric EQ"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Stem Separation */}
          {!isSpokenContent && <StemSeparationButton />}

          {/* Concert Mode */}
          {!isSpokenContent && <ConcertModeButton />}

          {/* Music DNA */}
          {!isSpokenContent && <MusicDNAButton />}

          {/* Audio Settings button */}
          <button
            onClick={() => setShowAudioSettings(true)}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Audio Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${shuffle ? 'text-[var(--theme-color,#00FF94)]' : 'text-neutral-400 hover:text-white'}`}
            title="Shuffle (S)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-2 transition-colors ${repeat !== 'off' ? 'text-[var(--theme-color,#00FF94)]' : 'text-neutral-400 hover:text-white'}`}
            title="Repeat (R)"
          >
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1 ml-2">
            <button onClick={toggleMute} className="p-2 text-neutral-400 hover:text-white transition-colors" title="Mute (M)">
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

          {/* Fullscreen toggle */}
          <button
            onClick={() => setShowFullscreen(true)}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Fullscreen (F)"
            disabled={!currentTrack}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Mini player toggle */}
          <button
            onClick={() => setShowMiniPlayer(!showMiniPlayer)}
            className={`p-2 transition-colors ${showMiniPlayer ? 'text-[var(--theme-color,#00FF94)]' : 'text-neutral-400 hover:text-white'}`}
            title="Mini Player"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleQueue}
            className={`p-2 ml-2 transition-colors ${isQueueOpen ? 'text-[var(--theme-color,#00FF94)]' : 'text-neutral-400 hover:text-white'}`}
            title="Queue (Q)"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          <div className="ml-3 pl-3 border-l border-neutral-700">
            <ClockDisplay />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLyrics && <LyricsPanel onClose={() => setShowLyrics(false)} />}
      {showEqualizer && <ParametricEQ onClose={() => setShowEqualizer(false)} />}
      {showAudioSettings && <AudioSettings onClose={() => setShowAudioSettings(false)} />}
      {showFullscreen && <FullscreenPlayer onClose={() => setShowFullscreen(false)} />}
      {showShare && <ShareNowPlaying onClose={() => setShowShare(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
      
      {/* Mini Player */}
      {showMiniPlayer && currentTrack && (
        <MiniPlayer 
          onClose={() => setShowMiniPlayer(false)} 
          onExpand={() => {
            setShowMiniPlayer(false);
            setShowFullscreen(true);
          }}
        />
      )}
    </>
  );
}
