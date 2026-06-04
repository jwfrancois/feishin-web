import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jellyfinApi } from '@/lib/jellyfin';
import { AlbumCard } from '@/components/AlbumCard';
import { usePlayer } from '@/context/PlayerContext';
import type { Album, Genre } from '@/types/jellyfin';

export function GenreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [genre, setGenre] = useState<Genre | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks } = usePlayer();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const albumsRes = await jellyfinApi.getGenreItems(id);
        setAlbums(albumsRes.Items);
        if (albumsRes.Items.length > 0) {
          setGenre({ Id: id, Name: id, Type: 'MusicGenre' });
        }
      } catch (err) {
        console.error('Failed to load genre:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">{genre?.Name || 'Genre'}</h1>

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
      ) : (
        <div className="text-center py-12 text-neutral-400">
          No albums found in this genre
        </div>
      )}
    </div>
  );
}
