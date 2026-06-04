import { Play, Pause, SkipForward, X } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';

interface Props {
  onClose: () => void;
  onExpand: () => void;
}

export function MiniPlayer({ onClose, onExpand }: Props) {
  const { currentTrack, isPlaying, toggle, next, currentTime, duration } = usePlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const imageUrl = currentTrack
    ? jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 100)
    : null;

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-28 right-4 z-50 bg-neutral-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-neutral-700 overflow-hidden w-72">
      {/* Progress bar */}
      <div className="h-1 bg-neutral-700">
        <div
          className="h-full bg-player-accent transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 p-3">
        {/* Album art */}
        <div
          className="w-12 h-12 rounded-lg bg-neutral-800 flex-shrink-0 cursor-pointer overflow-hidden"
          onClick={onExpand}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-neutral-700" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="text-white text-sm font-medium truncate">{currentTrack.Name}</div>
          <div className="text-neutral-400 text-xs truncate">{currentTrack.Artists?.join(', ')}</div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 text-white hover:text-player-accent transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={next}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
