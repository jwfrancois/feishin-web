import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Shuffle, Heart, ExternalLink, Music } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { AlbumCard } from '@/components/AlbumCard';
import { usePlayer } from '@/context/PlayerContext';
import type { Artist, Album, Track } from '@/types/jellyfin';

function formatDuration(ticks?: number): string {
  if (!ticks) return '0:00';
  const seconds = Math.floor(ticks / 10000000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ArtistDetails extends Artist {
  Overview?: string;
}

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const { playTracks, playTrack } = usePlayer();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [artistData, albumsData, topTracksData] = await Promise.all([
          jellyfinApi.getArtist(id),
          jellyfinApi.getArtistAlbums(id),
          jellyfinApi.getArtistTopTracks(id, 10),
        ]);
        setArtist(artistData as ArtistDetails);
        setAlbums(albumsData.Items);
        setTopTracks(topTracksData.Items);
      } catch (err) {
        console.error('Failed to load artist:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePlayAll = async () => {
    const allTracks: Track[] = [];
    for (const album of albums) {
      try {
        const tracksRes = await jellyfinApi.getAlbumTracks(album.Id);
        allTracks.push(...tracksRes.Items);
      } catch (err) {
        console.error('Failed to fetch tracks for album:', album.Id);
      }
    }
    if (allTracks.length > 0) {
      playTracks(allTracks);
    }
  };

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

  const handleShuffleAll = async () => {
    const allTracks: Track[] = [];
    for (const album of albums) {
      try {
        const tracksRes = await jellyfinApi.getAlbumTracks(album.Id);
        allTracks.push(...tracksRes.Items);
      } catch (err) {
        console.error('Failed to fetch tracks for album:', album.Id);
      }
    }
    if (allTracks.length > 0) {
      // Shuffle the tracks
      const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
      playTracks(shuffled);
    }
  };

  // External links
  const getExternalLinks = (artistName: string) => [
    {
      name: 'MusicBrainz',
      url: `https://musicbrainz.org/search?query=${encodeURIComponent(artistName)}&type=artist`,
    },
    {
      name: 'Last.fm',
      url: `https://www.last.fm/music/${encodeURIComponent(artistName)}`,
    },
    {
      name: 'AllMusic',
      url: `https://www.allmusic.com/search/artists/${encodeURIComponent(artistName)}`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="p-6 text-center text-neutral-400">Artist not found</div>
    );
  }

  const displayedTracks = showAllTracks ? topTracks : topTracks.slice(0, 5);

  return (
    <div className="pb-6">
      {/* Header */}
      <div
        className="relative h-72 flex items-end p-6"
        style={{
          background: `linear-gradient(to bottom, rgba(18,18,18,0.3), #121212), url(${jellyfinApi.getImageUrl(artist.Id, 'Primary', 600)}) center/cover`,
        }}
      >
        <div className="flex items-end gap-6">
          <img
            src={jellyfinApi.getImageUrl(artist.Id, 'Primary', 200)}
            alt={artist.Name}
            className="w-40 h-40 rounded-full shadow-2xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23262626" width="100" height="100" rx="50"/></svg>';
            }}
          />
          <div>
            <p className="text-sm text-neutral-300 uppercase tracking-wide">Artist</p>
            <h1 className="text-4xl font-bold text-white mt-1">{artist.Name}</h1>
            <div className="flex items-center gap-2 mt-2 text-neutral-300">
              <span>{albums.length} albums</span>
              {artist.Genres && artist.Genres.length > 0 && (
                <>
                  <span className="text-neutral-500">-</span>
                  <span>{artist.Genres.slice(0, 3).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 flex items-center gap-4">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 flex items-center justify-center bg-player-accent rounded-full hover:scale-105 transition-transform"
        >
          <Play className="w-6 h-6 text-black ml-1" />
        </button>
        <button
          onClick={handleShuffleAll}
          className="p-3 text-neutral-300 hover:text-white transition-colors"
        >
          <Shuffle className="w-6 h-6" />
        </button>
        <button className="p-3 text-neutral-300 hover:text-player-accent transition-colors">
          <Heart className="w-6 h-6" />
        </button>
      </div>

      {/* Artist Bio */}
      {artist.Overview && (
        <div className="px-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">About</h2>
          <p className="text-neutral-400 leading-relaxed max-w-3xl">{artist.Overview}</p>
        </div>
      )}

      {/* External Links */}
      <div className="px-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Find More</h2>
        <div className="flex flex-wrap gap-3">
          {getExternalLinks(artist.Name).map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm text-neutral-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {link.name}
            </a>
          ))}
        </div>
      </div>

      {/* Top Songs */}
      {topTracks.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Popular Tracks</h2>
          <div className="space-y-1">
            {displayedTracks.map((track, index) => (
              <div
                key={track.Id}
                onClick={() => playTrack(track)}
                className="flex items-center gap-4 p-3 hover:bg-neutral-800/50 rounded-lg cursor-pointer group transition-colors"
              >
                <span className="w-6 text-sm text-neutral-500 text-right">{index + 1}</span>
                <img
                  src={jellyfinApi.getImageUrl(track.AlbumId || track.Id, 'Primary', 48)}
                  alt=""
                  className="w-12 h-12 rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{track.Name}</div>
                  <div className="text-sm text-neutral-400 truncate">{track.Album}</div>
                </div>
                {track.UserData?.PlayCount && track.UserData.PlayCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <Music className="w-3 h-3" />
                    {track.UserData.PlayCount} plays
                  </div>
                )}
                <span className="text-sm text-neutral-500">{formatDuration(track.RunTimeTicks)}</span>
                <button className="opacity-0 group-hover:opacity-100 p-2 text-player-accent transition-opacity">
                  <Play className="w-5 h-5" fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
          {topTracks.length > 5 && (
            <button
              onClick={() => setShowAllTracks(!showAllTracks)}
              className="mt-3 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {showAllTracks ? 'Show less' : `Show all ${topTracks.length} tracks`}
            </button>
          )}
        </div>
      )}

      {/* Discography */}
      <div className="px-6">
        <h2 className="text-xl font-semibold text-white mb-4">Discography</h2>
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
          <div className="text-neutral-400">No albums found</div>
        )}
      </div>
    </div>
  );
}
