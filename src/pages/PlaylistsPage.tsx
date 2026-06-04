import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Play } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { SearchBar } from '@/components/SearchBar';
import { usePlayer } from '@/context/PlayerContext';
import type { Playlist } from '@/types/jellyfin';

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks } = usePlayer();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await jellyfinApi.getPlaylists();
        setPlaylists(res.Items);
      } catch (err) {
        console.error('Failed to load playlists:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handlePlayPlaylist = async (playlist: Playlist) => {
    try {
      const tracks = await jellyfinApi.getPlaylistTracks(playlist.Id);
      if (tracks.Items.length > 0) {
        playTracks(tracks.Items);
      }
    } catch (err) {
      console.error('Failed to play playlist:', err);
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-white">Playlists</h1>
        <SearchBar />
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {playlists.map((playlist) => (
            <div key={playlist.Id} className="group relative">
              <Link to={`/playlist/${playlist.Id}`} className="block">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-neutral-700 to-neutral-800 mb-3 flex items-center justify-center">
                  {playlist.ImageTags?.Primary ? (
                    <img
                      src={jellyfinApi.getImageUrl(playlist.Id, 'Primary', 300)}
                      alt={playlist.Name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ListMusic className="w-16 h-16 text-neutral-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePlayPlaylist(playlist);
                    }}
                    className="absolute bottom-2 right-2 w-12 h-12 flex items-center justify-center bg-player-accent rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-lg"
                  >
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  </button>
                </div>
                <h3 className="font-semibold text-white truncate">{playlist.Name}</h3>
                <p className="text-sm text-neutral-400">
                  {playlist.ChildCount || 0} tracks
                </p>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-400">
          <ListMusic className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
          <p>No playlists found</p>
          <p className="text-sm mt-1">Create playlists in your Jellyfin server</p>
        </div>
      )}
    </div>
  );
}
