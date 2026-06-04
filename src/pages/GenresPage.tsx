import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, ArrowUpDown } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { SearchBar } from '@/components/SearchBar';
import type { Genre } from '@/types/jellyfin';

export function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'count'>('name');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await jellyfinApi.getGenres();
        setGenres(res.Items);
      } catch (err) {
        console.error('Failed to load genres:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const getItemCount = (genre: Genre): number => {
    if (genre.ItemCounts) {
      return genre.ItemCounts.TotalCount || 
             (genre.ItemCounts.AlbumCount || 0) + (genre.ItemCounts.SongCount || 0);
    }
    return 0;
  };

  const sortedGenres = [...genres].sort((a, b) => {
    if (sortBy === 'count') {
      return getItemCount(b) - getItemCount(a);
    }
    return a.Name.localeCompare(b.Name);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-white">Genres</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSortBy(sortBy === 'name' ? 'count' : 'name')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortBy === 'name' ? 'A-Z' : 'By Count'}
          </button>
          <SearchBar />
        </div>
      </div>

      {sortedGenres.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedGenres.map((genre) => {
            const itemCount = getItemCount(genre);
            return (
              <Link
                key={genre.Id}
                to={`/genre/${genre.Id}`}
                className="block rounded-xl overflow-hidden bg-neutral-800 hover:bg-neutral-700 transition-all group hover:scale-[1.02]"
              >
                {/* Genre Visual */}
                <div className="aspect-square relative bg-gradient-to-br from-primary-600/30 via-neutral-800 to-neutral-900">
                  {/* Genre image from Jellyfin if available */}
                  <img
                    src={jellyfinApi.getImageUrl(genre.Id, 'Primary', 300)}
                    alt={genre.Name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {/* Fallback icon */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Library className="w-12 h-12 text-primary-500/30" />
                  </div>
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                
                {/* Genre Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-white truncate">{genre.Name}</h3>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    {itemCount > 0 ? `${itemCount} items` : 'Browse'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-400">
          <Library className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
          <p>No genres found</p>
        </div>
      )}
    </div>
  );
}
