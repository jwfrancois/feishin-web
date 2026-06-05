import { useEffect, useState, useCallback } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import { AlbumCard } from '@/components/AlbumCard';
import { SearchBar } from '@/components/SearchBar';
import { usePlayer } from '@/context/PlayerContext';
import type { Album } from '@/types/jellyfin';
import { ChevronDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name' },
  { value: 'DateCreated', label: 'Date Added' },
  { value: 'ProductionYear', label: 'Year' },
  { value: 'Random', label: 'Random' },
];

export function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('SortName');
  const [sortOrder, setSortOrder] = useState<'Ascending' | 'Descending'>('Ascending');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { playTracks } = usePlayer();

  const LIMIT = 50;

  const loadAlbums = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const startIndex = reset ? 0 : page * LIMIT;
      const res = await jellyfinApi.getAlbums(LIMIT, startIndex, sortBy, sortOrder);
      if (reset) {
        setAlbums(res.Items);
        setPage(0);
      } else {
        setAlbums((prev) => [...prev, ...res.Items]);
      }
      setHasMore(res.Items.length === LIMIT);
    } catch (err) {
      console.error('Failed to load albums:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, sortOrder, page]);

  useEffect(() => {
    loadAlbums(true);
  }, [sortBy, sortOrder]);

  const handlePlayAlbum = async (album: Album) => {
    try {
      const tracks = await jellyfinApi.getAlbumTracks(album.Id);
      if (tracks.Items.length > 0) {
        playTracks(tracks.Items);
      }
    } catch (err) {
      console.error('Failed to play album:', err);
    }
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
    loadAlbums();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-white">Albums</h1>
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
          <button
            onClick={() =>
              setSortOrder((o) => (o === 'Ascending' ? 'Descending' : 'Ascending'))
            }
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm hover:bg-neutral-700"
          >
            {sortOrder === 'Ascending' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {albums.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {albums.map((album) => (
            <AlbumCard
              key={album.Id}
              album={album}
              onPlay={() => handlePlayAlbum(album)}
            />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-12 text-neutral-400">
          No albums found in your library
        </div>
      ) : null}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !isLoading && albums.length > 0 && (
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
