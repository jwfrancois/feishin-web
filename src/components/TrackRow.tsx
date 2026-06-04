import { Play, Pause, MoreHorizontal, Heart, Plus } from 'lucide-react';
import type { Track } from '@/types/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';

interface Props {
  track: Track;
  index?: number;
  showAlbum?: boolean;
  showArt?: boolean;
  onPlay?: () => void;
}

function formatDuration(ticks?: number): string {
  if (!ticks) return '0:00';
  const seconds = Math.floor(ticks / 10000000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackRow({ track, index, showAlbum = false, showArt = false, onPlay }: Props) {
  const { currentTrack, isPlaying, toggle, addToQueue } = usePlayer();
  const isActive = currentTrack?.Id === track.Id;

  const handlePlay = () => {
    if (isActive) {
      toggle();
    } else if (onPlay) {
      onPlay();
    }
  };

  return (
    <div
      className={`group grid gap-4 px-4 py-2 rounded-md hover:bg-neutral-800 items-center ${
        isActive ? 'bg-neutral-800' : ''
      }`}
      style={{
        gridTemplateColumns: showArt
          ? 'auto 48px 1fr 1fr auto auto'
          : showAlbum
          ? 'auto 1fr 1fr auto auto'
          : 'auto 1fr auto auto',
      }}
    >
      <div className="w-6 text-center">
        <span
          className={`text-sm font-mono group-hover:hidden ${
            isActive ? 'text-player-accent' : 'text-neutral-500'
          }`}
        >
          {index !== undefined ? index + 1 : '#'}
        </span>
        <button
          onClick={handlePlay}
          className="hidden group-hover:block text-white"
        >
          {isActive && isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </div>

      {showArt && (
        <img
          src={jellyfinApi.getImageUrl(track.AlbumId || track.Id, 'Primary', 48)}
          alt=""
          className="w-10 h-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>';
          }}
        />
      )}

      <div className="min-w-0">
        <div
          className={`font-medium truncate ${
            isActive ? 'text-player-accent' : 'text-white'
          }`}
        >
          {track.Name}
        </div>
        <div className="text-sm text-neutral-400 truncate">
          {track.Artists?.join(', ')}
        </div>
      </div>

      {showAlbum && (
        <div className="text-sm text-neutral-400 truncate">{track.Album}</div>
      )}

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => addToQueue([track])}
          className="p-1 text-neutral-400 hover:text-white"
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button className="p-1 text-neutral-400 hover:text-white">
          <Heart className="w-4 h-4" />
        </button>
        <button className="p-1 text-neutral-400 hover:text-white">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="text-sm text-neutral-500 font-mono">
        {formatDuration(track.RunTimeTicks)}
      </div>
    </div>
  );
}
