import { Link } from 'react-router-dom';
import type { Artist } from '@/types/jellyfin';
import { jellyfinApi } from '@/lib/jellyfin';

interface Props {
  artist: Artist;
}

export function ArtistCard({ artist }: Props) {
  return (
    <Link to={`/artist/${artist.Id}`} className="block group">
      <div className="relative aspect-square rounded-full overflow-hidden bg-neutral-800 mb-3 mx-auto w-full max-w-[200px]">
        <img
          src={jellyfinApi.getImageUrl(artist.Id, 'Primary', 200)}
          alt={artist.Name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23262626" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" fill="%23525252" font-size="40">&#9834;</text></svg>';
          }}
        />
      </div>
      <h3 className="font-semibold text-white text-center truncate">{artist.Name}</h3>
      {artist.Genres && artist.Genres.length > 0 && (
        <p className="text-sm text-neutral-400 text-center truncate">
          {artist.Genres.slice(0, 2).join(', ')}
        </p>
      )}
    </Link>
  );
}
