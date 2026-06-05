import { useEffect, useState, useCallback } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import { ArtistCard } from '@/components/ArtistCard';
import { SearchBar } from '@/components/SearchBar';
import type { Artist } from '@/types/jellyfin';

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 50;

  const loadArtists = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const startIndex = reset ? 0 : page * LIMIT;
      const res = await jellyfinApi.getArtists(LIMIT, startIndex);
      if (reset) {
        setArtists(res.Items);
        setPage(0);
      } else {
        setArtists((prev) => [...prev, ...res.Items]);
      }
      setHasMore(res.Items.length === LIMIT);
    } catch (err) {
      console.error('Failed to load artists:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadArtists(true);
  }, []);

  const handleLoadMore = () => {
    setPage((p) => p + 1);
    loadArtists();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-white">Artists</h1>
        <SearchBar />
      </div>

      {artists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {artists.map((artist) => (
            <ArtistCard key={artist.Id} artist={artist} />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-12 text-neutral-400">
          No artists found in your library
        </div>
      ) : null}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !isLoading && artists.length > 0 && (
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
