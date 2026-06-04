import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Shuffle, ListMusic, Clock } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { TrackRow } from '@/components/TrackRow';
import { usePlayer } from '@/context/PlayerContext';
import type { Playlist, Track } from '@/types/jellyfin';

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks } = usePlayer();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const tracksData = await jellyfinApi.getPlaylistTracks(id);
        setTracks(tracksData.Items);
        setPlaylist({
          Id: id,
          Name: 'Playlist',
          Type: 'Playlist',
          ChildCount: tracksData.TotalRecordCount,
        });
      } catch (err) {
        console.error('Failed to load playlist:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePlay = () => {
    if (tracks.length > 0) {
      playTracks(tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTracks(shuffled);
    }
  };

  const handlePlayTrack = (index: number) => {
    playTracks(tracks, index);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="p-6 flex items-end gap-6 bg-gradient-to-b from-neutral-800 to-neutral-950">
        <div className="w-48 h-48 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center shadow-2xl">
          {playlist?.ImageTags?.Primary ? (
            <img
              src={jellyfinApi.getImageUrl(playlist.Id, 'Primary', 240)}
              alt={playlist.Name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <ListMusic className="w-20 h-20 text-neutral-500" />
          )}
        </div>
        <div>
          <p className="text-sm text-neutral-300 uppercase tracking-wide">Playlist</p>
          <h1 className="text-4xl font-bold text-white mt-1">{playlist?.Name}</h1>
          <p className="text-neutral-300 mt-2">{tracks.length} tracks</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 flex items-center gap-4">
        <button
          onClick={handlePlay}
          className="w-14 h-14 flex items-center justify-center bg-player-accent rounded-full hover:scale-105 transition-transform"
        >
          <Play className="w-6 h-6 text-black ml-1" />
        </button>
        <button
          onClick={handleShuffle}
          className="p-3 text-neutral-300 hover:text-white transition-colors"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {/* Track List */}
      <div className="px-6">
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
                key={`${track.Id}-${index}`}
                track={track}
                index={index}
                showAlbum
                showArt
                onPlay={() => handlePlayTrack(index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-400">
            This playlist is empty
          </div>
        )}
      </div>
    </div>
  );
}
