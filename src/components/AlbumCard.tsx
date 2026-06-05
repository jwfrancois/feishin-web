import { Link } from 'react-router-dom';
import type { Album } from '@/types/jellyfin';
import { jellyfinApi } from '@/lib/jellyfin';
import { useBreakpoint } from '@/hooks/use-window-size';

interface Props {
  album: Album;
  onPlay?: () => void;
}

export function AlbumCard({ album, onPlay }: Props) {
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'mobile' || breakpoint === 'tablet';

  return (
    <div className="group relative">
      <Link to={`/album/${album.Id}`} className="block">
        <div className={`relative aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-2 ${
          isCompact ? 'mb-1.5' : 'mb-3'
        }`}>
          <img
            src={jellyfinApi.getImageUrl(album.Id, 'Primary', isCompact ? 200 : 300)}
            alt={album.Name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23262626" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23525252" font-size="40">&#9835;</text></svg>';
            }}
          />
          {onPlay && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay();
              }}
              className={`absolute bottom-2 right-2 flex items-center justify-center bg-player-accent rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-lg ${
                isCompact ? 'w-10 h-10' : 'w-12 h-12'
              }`}
            >
              <Play className={isCompact ? 'w-4 h-4' : 'w-5 h-5 text-black'} />
            </button>
          )}
        </div>
        <h3 className={`font-semibold text-white truncate ${
          isCompact ? 'text-sm' : ''
        }`}>{album.Name}</h3>
        <p className={`text-neutral-400 truncate ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}>
          {album.AlbumArtist}
          {album.Year && ` - ${album.Year}`}
        </p>
      </Link>
    </div>
  );
}

import { Play } from 'lucide-react';