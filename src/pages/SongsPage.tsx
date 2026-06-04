import { useEffect, useState, useCallback } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import { TrackRow } from '@/components/TrackRow';
import { SearchBar } from '@/components/SearchBar';
import { usePlayer } from '@/context/PlayerContext';
import type { Track } from '@/types/jellyfin';
import { ChevronDown, Clock } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name' },
  { value: 'DateCreated', label: 'Date Added' },
  { value: 'Album', label: 'Album' },
  { value: 'Random', label: 'Random' },
];

export function SongsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('SortName');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { playTracks } = usePlayer();

  const LIMIT = 100;

  const loadTracks = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const startIndex = reset ? 0 : page * LIMIT;
      const res = await jellyfinApi.getTracks(LIMIT, startIndex, sortBy);
      if (reset) {
        setTracks(res.Items);
        setPage(0);
      } else {
        setTracks((prev) => [...prev, ...res.Items]);
      }
      setHasMore(res.Items.length === LIMIT);
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, page]);

  useEffect(() => {
    loadTracks(true);
  }, [sortBy]);

  const handlePlayTrack = (index: number) => {
    playTracks(tracks, index);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
    loadTracks();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-white">Songs</h1>
        <div className="flex items-center gap-4">
          <SearchBar />
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        className="grid gap-4 px-4 py-2 border-b border-neutral-800 text-neutral-400 text-sm"
        style={{ gridTemplateColumns: 'auto 48px 1fr 1fr auto auto' }}
      >
        <div className="w-6 text-center">#</div>
        <div></div>
        <div>Title</div>
        <div>Album</div>
        <div className="opacity-0">Actions</div>
        <div><Clock className="w-4 h-4" /></div>
      </div>

      {tracks.length > 0 ? (
        <div className="divide-y divide-neutral-800/50">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.Id}
              track={track}
              index={index}
              showAlbum
              showArt
              onPlay={() => handlePlayTrack(index)}
            />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-12 text-neutral-400">
          No songs found in your library
        </div>
      ) : null}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !isLoading && tracks.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
