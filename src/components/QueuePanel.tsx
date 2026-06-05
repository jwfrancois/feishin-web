import { useState, useRef } from 'react';
import { GripVertical, X, Sparkles, ChevronDown } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';
import { ElectricityVisualizer } from './ElectricityVisualizer';
import { useIsMobile } from '@/hooks/use-window-size';

function formatDuration(ticks?: number): string {
  if (!ticks) return '0:00';
  const seconds = Math.floor(ticks / 10000000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function QueuePanel() {
  const {
    queue,
    queueIndex,
    currentTrack,
    isPlaying,
    autoDJ,
    removeFromQueue,
    playTracks,
    moveInQueue,
    toggleAutoDJ,
  } = usePlayer();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    dragNode.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      moveInQueue(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  if (!currentTrack) return null;

  // Mobile-optimized queue view
  if (isMobile) {
    return (
      <div className="max-h-[60vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Queue ({queue.length})</h2>
          {autoDJ && (
            <span className="flex items-center gap-1 text-xs text-player-accent">
              <Sparkles className="w-3 h-3" />
              Auto DJ
            </span>
          )}
        </div>

        {/* Current track - featured */}
        {queue.length > 0 && (
          <div className="p-3 border-b border-neutral-800">
            <div className="text-xs text-neutral-500 mb-2">NOW PLAYING</div>
            <div className="flex items-center gap-3">
              <img
                src={jellyfinApi.getImageUrl(queue[queueIndex]?.AlbumId || queue[queueIndex]?.Id, 'Primary', 56)}
                alt=""
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-player-accent font-medium truncate">
                  {queue[queueIndex]?.Name}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {queue[queueIndex]?.Artists?.join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming tracks */}
        <div className="p-3">
          <div className="text-xs text-neutral-500 mb-2">UP NEXT</div>
          <div className="divide-y divide-neutral-800/50">
            {queue.map((track, index) => {
              if (index === queueIndex) return null;
              return (
                <div
                  key={`${track.Id}-${index}`}
                  className="flex items-center gap-2 py-2"
                  onClick={() => playTracks(queue, index)}
                >
                  <span className="w-6 text-xs text-neutral-500 text-right flex-shrink-0">
                    {index + 1}
                  </span>
                  <img
                    src={jellyfinApi.getImageUrl(track.AlbumId || track.Id, 'Primary', 40)}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{track.Name}</div>
                    <div className="text-xs text-neutral-400 truncate">{track.Artists?.join(', ')}</div>
                  </div>
                  <span className="text-xs text-neutral-500 flex-shrink-0">
                    {formatDuration(track.RunTimeTicks)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                    }}
                    className="p-1 text-neutral-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto DJ */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={toggleAutoDJ}
            className={`w-full py-2.5 px-4 text-sm font-medium rounded flex items-center justify-center gap-2 ${
              autoDJ
                ? 'bg-player-accent text-black'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AUTO DJ {autoDJ ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="hidden lg:flex w-[300px] xl:w-[380px] flex-shrink-0 bg-neutral-900/50 border-l border-neutral-800 flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Now Playing ({queue.length})</h2>
        {autoDJ && (
          <span className="flex items-center gap-1 text-xs text-player-accent">
            <Sparkles className="w-3 h-3" />
            Auto DJ
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-neutral-800/50 text-[10px] text-neutral-500 uppercase tracking-wider">
        <span className="w-6 text-right">#</span>
        <span className="w-3"></span>
        <span className="w-10"></span>
        <span className="flex-1">Title</span>
        <span className="w-10 text-right">Time</span>
        <span className="w-20 text-right">Album</span>
        <span className="w-5"></span>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="p-4 text-neutral-500 text-sm text-center">
            Queue is empty
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {queue.map((track, index) => (
              <div
                key={`${track.Id}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-800/50 cursor-pointer group transition-colors ${
                  index === queueIndex ? 'bg-player-accent/10' : ''
                } ${dragOverIndex === index ? 'border-t-2 border-player-accent' : ''}`}
                onClick={() => playTracks(queue, index)}
              >
                <span className={`w-6 text-xs text-right flex-shrink-0 ${
                  index === queueIndex ? 'text-player-accent' : 'text-neutral-500'
                }`}>
                  {index + 1}
                </span>

                <div className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 opacity-0 group-hover:opacity-100">
                  <GripVertical className="w-3 h-3" />
                </div>

                <img
                  src={jellyfinApi.getImageUrl(track.AlbumId || track.Id, 'Primary', 40)}
                  alt=""
                  className="w-10 h-10 object-cover flex-shrink-0 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>';
                  }}
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  <span className={`text-sm truncate ${
                    index === queueIndex ? 'text-player-accent font-medium' : 'text-white'
                  }`}>
                    {track.Name}
                  </span>
                  <span className="text-xs text-neutral-400 truncate">
                    {track.Artists?.join(', ')}
                  </span>
                </div>

                <span className="text-[11px] text-neutral-500 flex-shrink-0 w-10 text-right">
                  {formatDuration(track.RunTimeTicks)}
                </span>

                <span className="text-[11px] text-neutral-400 truncate w-20 flex-shrink-0 text-right" title={track.Album}>
                  {track.Album}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(index);
                  }}
                  className="p-1 text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visualizer */}
      <ElectricityVisualizer height={80} />

      {/* Auto DJ Button */}
      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={toggleAutoDJ}
          className={`w-full py-2 px-4 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 ${
            autoDJ
              ? 'bg-player-accent text-black hover:bg-player-accent/90'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AUTO DJ {autoDJ ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}