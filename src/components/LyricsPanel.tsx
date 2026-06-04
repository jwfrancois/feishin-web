import { useState, useEffect, useRef } from 'react';
import { X, Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

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
    if (text) {
      lines.push({ time, text });
    }
  }
  
  return lines.sort((a, b) => a.time - b.time);
}

export function LyricsPanel({ onClose }: { onClose: () => void }) {
  const { currentTrack, currentTime } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyrics([]);

      try {
        const artist = currentTrack.Artists?.[0] || '';
        const track = currentTrack.Name || '';
        
        if (!artist || !track) {
          setError('No artist or track name available');
          return;
        }

        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          setError('Lyrics not found');
          return;
        }

        const data = await res.json();
        
        if (data.syncedLyrics) {
          setLyrics(parseLRC(data.syncedLyrics));
        } else if (data.plainLyrics) {
          // Plain lyrics without timestamps
          setLyrics(data.plainLyrics.split('\n').map((text: string, i: number) => ({
            time: i * 5,
            text: text.trim(),
          })).filter((l: LyricLine) => l.text));
        } else {
          setError('No lyrics available');
        }
      } catch (err) {
        console.error('Failed to fetch lyrics:', err);
        setError('Failed to load lyrics');
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack?.Id]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, lyrics]);

  const getActiveLine = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        return i;
      }
    }
    return -1;
  };

  const activeLine = getActiveLine();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-lg h-[70vh] flex flex-col border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-player-accent" />
            <div>
              <h2 className="text-white font-semibold">{currentTrack?.Name || 'No track'}</h2>
              <p className="text-sm text-neutral-400">{currentTrack?.Artists?.join(', ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lyrics content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-player-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <Music2 className="w-12 h-12 mb-3 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && lyrics.length > 0 && (
            <div className="space-y-4">
              {lyrics.map((line, i) => (
                <div
                  key={i}
                  ref={i === activeLine ? activeLineRef : null}
                  className={`text-lg transition-all duration-300 ${
                    i === activeLine
                      ? 'text-player-accent font-semibold scale-105 origin-left'
                      : i < activeLine
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}

          {!loading && !error && lyrics.length === 0 && currentTrack && (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <Music2 className="w-12 h-12 mb-3 opacity-50" />
              <p>No lyrics available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
