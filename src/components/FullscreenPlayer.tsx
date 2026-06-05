import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music2,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronDown,
  ListMusic,
  Disc3,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';
import { useThemeColorCSS } from '@/hooks/useThemeColor';
import { useIsMobile } from '@/hooks/use-window-size';
import { ABLoopMarkers } from './ABLoop';

interface LyricLine {
  time: number;
  text: string;
}

function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match;
  while ((match = regex.exec(lrc)) !== null) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const time = mins * 60 + secs + ms / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface Props {
  onClose: () => void;
}

export function FullscreenPlayer({ onClose }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [showLyrics, setShowLyrics] = useState(true);
  const [kenBurnsPhase, setKenBurnsPhase] = useState(0);
  const isMobile = useIsMobile();

  const imageUrl = currentTrack 
    ? jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 800)
    : null;

  useThemeColorCSS(imageUrl);

  useEffect(() => {
    const interval = setInterval(() => {
      setKenBurnsPhase(p => (p + 1) % 4);
    }, 8000);
    return () => clearInterval(interval);
  }, [currentTrack?.Id]);

  useEffect(() => {
    if (!currentTrack) return;

    const fetchLyrics = async () => {
      try {
        const artist = currentTrack.Artists?.[0] || '';
        const track = currentTrack.Name || '';
        if (!artist || !track) return;

        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        if (data.syncedLyrics) {
          setLyrics(parseLRC(data.syncedLyrics));
        }
      } catch {}
    };

    setLyrics([]);
    fetchLyrics();
  }, [currentTrack?.Id]);

  const getActiveLine = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return -1;
  };

  const activeLine = getActiveLine();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const kenBurnsStyles = [
    { transform: 'scale(1.1) translate(2%, 2%)' },
    { transform: 'scale(1.15) translate(-2%, 1%)' },
    { transform: 'scale(1.1) translate(1%, -2%)' },
    { transform: 'scale(1.12) translate(-1%, -1%)' },
  ];

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 z-[100] bg-black flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Background blur */}
        {imageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white/80"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Main content - stacked vertically on mobile */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
          {/* Album art - smaller on mobile */}
          <div className="w-56 h-56 max-w-[80vw] max-h-[80vw] relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={currentTrack?.Album || ''}
                className="w-full h-full object-cover rounded-lg shadow-xl"
              />
            ) : (
              <div className="w-full h-full bg-neutral-800 rounded-lg flex items-center justify-center">
                <Disc3 className="w-16 h-16 text-neutral-600" />
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">{currentTrack?.Name || 'No track'}</h2>
            <p className="text-base text-white/60">{currentTrack?.Artists?.join(', ')}</p>
          </div>

          {/* Lyrics - hide on mobile if no lyrics */}
          {showLyrics && lyrics.length > 0 && (
            <div className="flex-1 max-h-32 overflow-hidden text-center px-2">
              <div className="space-y-2">
                {lyrics.slice(0, 3).map((line, i) => (
                  <div
                    key={i}
                    className={`text-sm ${
                      i === activeLine - Math.min(activeLine, 1)
                        ? 'text-white font-medium'
                        : 'text-white/40'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-6">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-white/50 font-mono w-10">{formatTime(currentTime)}</span>
            <div
              onClick={handleSeek}
              className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer"
            >
              <ABLoopMarkers duration={duration} />
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  backgroundColor: 'var(--theme-color, #00FF94)',
                }}
              />
            </div>
            <span className="text-xs text-white/50 font-mono w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls - touch-friendly */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={toggleShuffle} className={`p-3 ${shuffle ? 'text-player-accent' : 'text-white/60'}`}>
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={previous} className="p-3 text-white/80">
              <SkipBack className="w-7 h-7" fill="currentColor" />
            </button>

            <button
              onClick={toggle}
              className="w-14 h-14 flex items-center justify-center rounded-full text-black"
              style={{ backgroundColor: 'var(--theme-color, #00FF94)' }}
            >
              {isPlaying ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
            </button>

            <button onClick={next} className="p-3 text-white/80">
              <SkipForward className="w-7 h-7" fill="currentColor" />
            </button>

            <button onClick={cycleRepeat} className={`p-3 ${repeat !== 'off' ? 'text-player-accent' : 'text-white/60'}`}>
              {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Volume and extra controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-2 text-white/60">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {lyrics.length > 0 && (
              <button
                onClick={() => setShowLyrics(!showLyrics)}
                className={`p-2 ${showLyrics ? 'text-player-accent' : 'text-white/60'}`}
              >
                <Music2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout (original)
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Background blur */}
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl transition-transform duration-[8000ms] ease-in-out"
          style={{
            backgroundImage: `url(${imageUrl})`,
            ...kenBurnsStyles[kenBurnsPhase],
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 text-white/60 hover:text-white bg-white/10 rounded-full backdrop-blur-sm"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-16 gap-12">
        {/* Album art */}
        <div className="relative w-[50vh] h-[50vh] max-w-[500px] max-h-[500px] flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={currentTrack?.Album || ''}
              className="w-full h-full object-cover rounded-lg shadow-2xl transition-transform duration-[8000ms] ease-in-out"
              style={kenBurnsStyles[kenBurnsPhase]}
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 rounded-lg flex items-center justify-center">
              <Music2 className="w-24 h-24 text-neutral-600" />
            </div>
          )}
        </div>

        {/* Lyrics panel */}
        {showLyrics && lyrics.length > 0 && (
          <div className="flex-1 max-w-lg h-[50vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-4 py-8">
              {lyrics.map((line, i) => (
                <div
                  key={i}
                  className={`text-2xl transition-all duration-500 ${
                    i === activeLine
                      ? 'text-white font-semibold scale-105 origin-left'
                      : i < activeLine
                      ? 'text-white/30'
                      : 'text-white/50'
                  }`}
                  style={i === activeLine ? { color: 'var(--theme-color, #00FF94)' } : {}}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-8 pb-8">
        {/* Track info */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-1">{currentTrack?.Name || 'No track'}</h2>
          <p className="text-lg text-white/60">{currentTrack?.Artists?.join(', ')}</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-6 max-w-2xl mx-auto">
          <span className="text-sm text-white/60 font-mono w-12 text-right">{formatTime(currentTime)}</span>
          <div
            onClick={handleSeek}
            className="flex-1 h-2 bg-white/20 rounded-full cursor-pointer group relative"
          >
            <ABLoopMarkers duration={duration} />
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--theme-color, #00FF94)',
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>
          <span className="text-sm text-white/60 font-mono w-12">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={toggleShuffle}
            className={`p-3 transition-colors ${shuffle ? 'text-[var(--theme-color,#00FF94)]' : 'text-white/60 hover:text-white'}`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button onClick={previous} className="p-3 text-white/80 hover:text-white">
            <SkipBack className="w-8 h-8" fill="currentColor" />
          </button>

          <button
            onClick={toggle}
            className="w-16 h-16 flex items-center justify-center rounded-full text-black transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--theme-color, #00FF94)' }}
          >
            {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
          </button>

          <button onClick={next} className="p-3 text-white/80 hover:text-white">
            <SkipForward className="w-8 h-8" fill="currentColor" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-3 transition-colors ${repeat !== 'off' ? 'text-[var(--theme-color,#00FF94)]' : 'text-white/60 hover:text-white'}`}
          >
            {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={toggleMute} className="p-2 text-white/60 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className={`p-3 ml-2 transition-colors ${showLyrics ? 'text-[var(--theme-color,#00FF94)]' : 'text-white/60 hover:text-white'}`}
          >
            <Music2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}