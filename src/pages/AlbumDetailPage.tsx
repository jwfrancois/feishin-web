import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Shuffle, Heart, Clock } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { TrackRow } from '@/components/TrackRow';
import { usePlayer } from '@/context/PlayerContext';
import type { Album, Track } from '@/types/jellyfin';

function formatDuration(ticks?: number): string {
  if (!ticks) return '';
  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} hr ${mins} min`;
  return `${mins} min`;
}

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks } = usePlayer();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [albumData, tracksData] = await Promise.all([
          jellyfinApi.getAlbum(id),
          jellyfinApi.getAlbumTracks(id),
        ]);
        setAlbum(albumData);
        setTracks(tracksData.Items);
      } catch (err) {
        console.error('Failed to load album:', err);
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

  if (!album) {
    return (
      <div className="p-6 text-center text-neutral-400">Album not found</div>
    );
  }

  const totalDuration = tracks.reduce((acc, t) => acc + (t.RunTimeTicks || 0), 0);

  return (
    <div className="pb-6">
      {/* Header */}
      <div
        className="relative h-80 flex items-end p-6"
        style={{
          background: `linear-gradient(to bottom, rgba(18,18,18,0.4), #121212), url(${jellyfinApi.getImageUrl(album.Id, 'Primary', 600)}) center/cover`,
        }}
      >
        <div className="flex items-end gap-6">
          <img
            src={jellyfinApi.getImageUrl(album.Id, 'Primary', 240)}
            alt={album.Name}
            className="w-48 h-48 rounded-lg shadow-2xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23262626" width="100" height="100"/></svg>';
            }}
          />
          <div>
            <p className="text-sm text-neutral-300 uppercase tracking-wide">Album</p>
            <h1 className="text-4xl font-bold text-white mt-1">{album.Name}</h1>
            <div className="flex items-center gap-2 mt-2 text-neutral-300">
              {album.AlbumArtists?.[0] && (
                <Link
                  to={`/artist/${album.AlbumArtists[0].Id}`}
                  className="hover:underline font-medium"
                >
                  {album.AlbumArtists[0].Name}
                </Link>
              )}
              {album.Year && (
                <>
                  <span className="text-neutral-500">-</span>
                  <span>{album.Year}</span>
                </>
              )}
              <span className="text-neutral-500">-</span>
              <span>{tracks.length} songs</span>
              {totalDuration > 0 && (
                <>
                  <span className="text-neutral-500">-</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
            </div>
          </div>
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
        <button className="p-3 text-neutral-300 hover:text-player-accent transition-colors">
          <Heart className="w-6 h-6" />
        </button>
      </div>

      {/* Track List Header */}
      <div className="px-6">
        <div className="grid gap-4 px-4 py-2 border-b border-neutral-800 text-neutral-400 text-sm"
          style={{ gridTemplateColumns: 'auto 1fr auto auto' }}
        >
          <div className="w-6 text-center">#</div>
          <div>Title</div>
          <div className="opacity-0">Actions</div>
          <div><Clock className="w-4 h-4" /></div>
        </div>

        {/* Tracks */}
        <div className="divide-y divide-neutral-800/50">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.Id}
              track={track}
              index={index}
              onPlay={() => handlePlayTrack(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
