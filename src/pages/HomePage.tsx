import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Mic2, BookOpen, Music, RotateCcw, Clock } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import type { Album, Genre, Track, MediaType, PodcastSeries, Audiobook } from '@/types/jellyfin';
import { detectMediaType } from '@/types/jellyfin';

function HorizontalScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent ${className}`}>
      {children}
    </div>
  );
}

function MediaTypeBadge({ type }: { type: MediaType }) {
  if (type === 'podcasts') {
    return (
      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-500/90 text-white text-[10px] font-medium rounded flex items-center gap-0.5">
        <Mic2 className="w-2.5 h-2.5" />
      </span>
    );
  }
  if (type === 'audiobooks') {
    return (
      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500/90 text-black text-[10px] font-medium rounded flex items-center gap-0.5">
        <BookOpen className="w-2.5 h-2.5" />
      </span>
    );
  }
  return null;
}

function formatTimeLeft(positionTicks?: number, totalTicks?: number): string {
  if (!positionTicks || !totalTicks) return '';
  const remaining = Math.floor((totalTicks - positionTicks) / 10000000 / 60);
  if (remaining > 60) return `${Math.floor(remaining / 60)}h left`;
  return `${remaining}m left`;
}

function formatDuration(ticks?: number): string {
  if (!ticks) return '';
  const seconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface ContinueListeningCardProps {
  track: Track;
  onPlay: () => void;
}

function ContinueListeningCard({ track, onPlay }: ContinueListeningCardProps) {
  const imageUrl = jellyfinApi.getImageUrl(track.AlbumId || track.Id, 'Primary', 300);
  const progress = track.UserData?.PlayedPercentage || 0;
  const mediaType = detectMediaType(track);
  
  return (
    <div className="flex-shrink-0 w-[280px] group cursor-pointer" onClick={onPlay}>
      <div className="relative flex gap-3 p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors">
        {/* Image with progress */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
          <img src={imageUrl} alt={track.Name} className="w-full h-full object-cover" />
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-900">
            <div 
              className={`h-full ${mediaType === 'podcasts' ? 'bg-purple-500' : mediaType === 'audiobooks' ? 'bg-amber-500' : 'bg-player-accent'}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
          {/* Badge */}
          <MediaTypeBadge type={mediaType} />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-sm font-medium text-white truncate">{track.Name}</h3>
          <p className="text-xs text-neutral-400 truncate">{track.Artists?.join(', ') || track.Album}</p>
          <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {formatTimeLeft(track.UserData?.PlaybackPositionTicks, track.RunTimeTicks) || `${Math.round(progress)}%`}
          </p>
        </div>
        
        {/* Play Button */}
        <div className="flex items-center">
          <div className="w-10 h-10 bg-player-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
            <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumCardCompact({ album, onPlay }: { album: Album; onPlay: () => void }) {
  const imageUrl = jellyfinApi.getImageUrl(album.Id, 'Primary', 300);
  const mediaType = detectMediaType(album);
  
  return (
    <div className="flex-shrink-0 w-[160px] group cursor-pointer" onClick={onPlay}>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-2">
        {imageUrl ? (
          <img src={imageUrl} alt={album.Name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-800">
            <span className="text-4xl text-neutral-600">♪</span>
          </div>
        )}
        <MediaTypeBadge type={mediaType} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-player-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg">
            <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-white truncate">{album.Name}</h3>
      <p className="text-xs text-neutral-400 truncate">{album.AlbumArtist || 'Unknown Artist'}</p>
    </div>
  );
}

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Podcast Card for Home Page
function PodcastCardCompact({ podcast, onClick }: { podcast: PodcastSeries; onClick: () => void }) {
  const latestDate = podcast.DateLastMediaAdded || podcast.PremiereDate;
  
  return (
    <div className="flex-shrink-0 w-[160px] group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-2">
        <img
          src={jellyfinApi.getImageUrl(podcast.Id, 'Primary', 300)}
          alt={podcast.Name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="40">🎙</text></svg>';
          }}
        />
        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-500/90 text-white text-[10px] font-medium rounded flex items-center gap-0.5">
          <Mic2 className="w-2.5 h-2.5" />
        </span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg">
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-white truncate">{podcast.Name}</h3>
      <p className="text-xs text-neutral-400 truncate">
        {podcast.ChildCount ? `${podcast.ChildCount} episodes` : 'Podcast'}
      </p>
      {latestDate && (
        <p className="text-xs text-neutral-500 truncate">
          Latest: {formatRelativeDate(latestDate)}
        </p>
      )}
    </div>
  );
}

// Audiobook Card for Home Page
function AudiobookCardCompact({ audiobook, onClick }: { audiobook: Audiobook; onClick: () => void }) {
  const progress = audiobook.UserData?.PlayedPercentage || 0;
  
  return (
    <div className="flex-shrink-0 w-[140px] group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-800 mb-2 shadow-lg">
        <img
          src={jellyfinApi.getImageUrl(audiobook.Id, 'Primary', 300)}
          alt={audiobook.Name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="%23333" width="100" height="150"/><text x="50" y="80" text-anchor="middle" fill="%23666" font-size="40">📚</text></svg>';
          }}
        />
        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500/90 text-black text-[10px] font-medium rounded flex items-center gap-0.5">
          <BookOpen className="w-2.5 h-2.5" />
        </span>
        {/* Progress bar */}
        {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
            <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg">
            <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-white truncate">{audiobook.Name}</h3>
      <p className="text-xs text-neutral-400 truncate">{audiobook.AlbumArtist || 'Unknown Author'}</p>
      {audiobook.RunTimeTicks && (
        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {formatDuration(audiobook.RunTimeTicks)}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title, viewMoreLink, icon }: { title: string; viewMoreLink?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {viewMoreLink && (
        <Link to={viewMoreLink} className="text-sm text-neutral-400 hover:text-white transition-colors">
          View more
        </Link>
      )}
    </div>
  );
}

type FilterType = 'all' | 'music' | 'podcasts' | 'audiobooks';

export function HomePage() {
  const [featuredAlbum, setFeaturedAlbum] = useState<Album | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Album[]>([]);
  const [exploreAlbums, setExploreAlbums] = useState<Album[]>([]);
  const [newlyAdded, setNewlyAdded] = useState<Album[]>([]);
  const [recentReleases, setRecentReleases] = useState<Album[]>([]);
  const [continueListening, setContinueListening] = useState<Track[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastSeries[]>([]);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { playTracks, playTrack } = usePlayer();

  // Load music content
  const loadMusicContent = useCallback(async () => {
    try {
      const [randomRes, genresRes, playedRes, addedRes, inProgressRes] = await Promise.all([
        jellyfinApi.getRandomAlbums(20),
        jellyfinApi.getGenres(),
        jellyfinApi.getRecentlyPlayed(12),
        jellyfinApi.getRecentlyAdded(24),
        jellyfinApi.getInProgress(10),
      ]);
      
      if (randomRes.Items.length > 0) {
        setFeaturedAlbum(randomRes.Items[0]);
        setExploreAlbums(randomRes.Items.slice(1, 13));
      }
      
      setGenres(genresRes.Items.slice(0, 8));
      setMostPlayed(playedRes.Items);
      setNewlyAdded(addedRes.Items.slice(0, 12));
      setRecentReleases(addedRes.Items.slice(12, 24));
      setContinueListening(inProgressRes.Items);
    } catch (err) {
      console.error('Failed to load music data:', err);
    }
  }, []);

  // Load podcasts
  const loadPodcasts = useCallback(async () => {
    try {
      const res = await jellyfinApi.getPodcasts(50, 0);
      setPodcasts(res.Items);
    } catch (err) {
      console.error('Failed to load podcasts:', err);
    }
  }, []);

  // Load audiobooks
  const loadAudiobooks = useCallback(async () => {
    try {
      const res = await jellyfinApi.getAudiobooks(50, 0);
      setAudiobooks(res.Items);
    } catch (err) {
      console.error('Failed to load audiobooks:', err);
    }
  }, []);

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      await Promise.all([loadMusicContent(), loadPodcasts(), loadAudiobooks()]);
      setIsLoading(false);
    }
    initialLoad();
  }, [loadMusicContent, loadPodcasts, loadAudiobooks]);

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

  const handleContinueTrack = (track: Track) => {
    playTrack(track);
  };

  const handlePlayPodcast = async (podcast: PodcastSeries) => {
    try {
      const episodes = await jellyfinApi.getPodcastEpisodes(podcast.Id);
      if (episodes.Items.length > 0) {
        playTracks(episodes.Items);
      }
    } catch (err) {
      console.error('Failed to play podcast:', err);
    }
  };

  const handlePlayAudiobook = async (audiobook: Audiobook) => {
    try {
      const chapters = await jellyfinApi.getAudiobookChapters(audiobook.Id);
      if (chapters.Items.length > 0) {
        playTracks(chapters.Items);
      }
    } catch (err) {
      console.error('Failed to play audiobook:', err);
    }
  };

  // Filter albums by media type
  const filterByType = (items: Album[]) => {
    if (activeFilter === 'all') return items;
    return items.filter(item => detectMediaType(item) === activeFilter);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-player-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render Podcasts Tab Content
  const renderPodcastsContent = () => (
    <div className="space-y-8">
      {podcasts.length > 0 ? (
        <>
          <section>
            <SectionHeader 
              title="Your Podcasts" 
              viewMoreLink="/podcasts"
              icon={<Mic2 className="w-5 h-5 text-purple-400" />}
            />
            <HorizontalScroll>
              {podcasts.map((podcast) => (
                <PodcastCardCompact
                  key={podcast.Id}
                  podcast={podcast}
                  onClick={() => handlePlayPodcast(podcast)}
                />
              ))}
            </HorizontalScroll>
          </section>
        </>
      ) : (
        <div className="text-center py-16 text-neutral-400">
          <Mic2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-white mb-2">No Podcasts Found</h3>
          <p className="text-sm max-w-md mx-auto">
            Add podcast content to your Jellyfin library with the "Podcast" genre tag, 
            or create a dedicated Podcasts library to see them here.
          </p>
        </div>
      )}
    </div>
  );

  // Render Audiobooks Tab Content
  const renderAudiobooksContent = () => (
    <div className="space-y-8">
      {audiobooks.length > 0 ? (
        <>
          <section>
            <SectionHeader 
              title="Your Audiobooks" 
              viewMoreLink="/audiobooks"
              icon={<BookOpen className="w-5 h-5 text-amber-400" />}
            />
            <HorizontalScroll>
              {audiobooks.map((audiobook) => (
                <AudiobookCardCompact
                  key={audiobook.Id}
                  audiobook={audiobook}
                  onClick={() => handlePlayAudiobook(audiobook)}
                />
              ))}
            </HorizontalScroll>
          </section>
        </>
      ) : (
        <div className="text-center py-16 text-neutral-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-white mb-2">No Audiobooks Found</h3>
          <p className="text-sm max-w-md mx-auto">
            Add audiobook content to your Jellyfin library with the "Audiobook" genre tag,
            use the AudioBook item type, or create a dedicated Audiobooks library.
          </p>
        </div>
      )}
    </div>
  );

  // Render Music/All Tab Content
  const renderMusicContent = () => (
    <div className="space-y-8">
      {/* Continue Listening */}
      {continueListening.length > 0 && (
        <section>
          <SectionHeader 
            title="Continue Listening" 
            icon={<RotateCcw className="w-5 h-5 text-player-accent" />}
          />
          <HorizontalScroll>
            {continueListening.map((track) => (
              <ContinueListeningCard
                key={track.Id}
                track={track}
                onPlay={() => handleContinueTrack(track)}
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Hero Featured Album */}
      {featuredAlbum && activeFilter === 'all' && (
        <section 
          className="relative h-[320px] rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => handlePlayAlbum(featuredAlbum)}
        >
          <div className="absolute inset-0">
            <img 
              src={jellyfinApi.getImageUrl(featuredAlbum.Id, 'Primary', 800)} 
              alt={featuredAlbum.Name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-transparent" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="flex items-end gap-6">
              <img 
                src={jellyfinApi.getImageUrl(featuredAlbum.Id, 'Primary', 200)} 
                alt={featuredAlbum.Name}
                className="w-32 h-32 rounded-lg shadow-2xl hidden sm:block"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-300 mb-1">{featuredAlbum.Year || ''}</p>
                <h1 className="text-4xl font-bold text-white mb-2">{featuredAlbum.Name}</h1>
                <p className="text-lg text-neutral-300">{featuredAlbum.AlbumArtist}</p>
              </div>
              <div className="w-14 h-14 bg-player-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg">
                <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Genres Section */}
      {genres.length > 0 && activeFilter === 'all' && (
        <section>
          <SectionHeader title="Genres" viewMoreLink="/genres" />
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link
                key={genre.Id}
                to={`/genre/${genre.Id}`}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full text-sm transition-colors"
              >
                {genre.Name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Most Played */}
      {filterByType(mostPlayed).length > 0 && (
        <section>
          <SectionHeader title="Most Played" />
          <HorizontalScroll>
            {filterByType(mostPlayed).map((album) => (
              <AlbumCardCompact 
                key={album.Id} 
                album={album} 
                onPlay={() => handlePlayAlbum(album)} 
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Explore from your Library */}
      {filterByType(exploreAlbums).length > 0 && (
        <section>
          <SectionHeader title="Explore from your Library" viewMoreLink="/albums" />
          <HorizontalScroll>
            {filterByType(exploreAlbums).map((album) => (
              <AlbumCardCompact 
                key={album.Id} 
                album={album} 
                onPlay={() => handlePlayAlbum(album)} 
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Newly Added Releases */}
      {filterByType(newlyAdded).length > 0 && (
        <section>
          <SectionHeader title="Newly Added Releases" viewMoreLink="/albums" />
          <HorizontalScroll>
            {filterByType(newlyAdded).map((album) => (
              <AlbumCardCompact 
                key={album.Id} 
                album={album} 
                onPlay={() => handlePlayAlbum(album)} 
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Recent Releases */}
      {filterByType(recentReleases).length > 0 && (
        <section>
          <SectionHeader title="Recent Releases" />
          <HorizontalScroll>
            {filterByType(recentReleases).map((album) => (
              <AlbumCardCompact 
                key={album.Id} 
                album={album} 
                onPlay={() => handlePlayAlbum(album)} 
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Empty State */}
      {!featuredAlbum && mostPlayed.length === 0 && newlyAdded.length === 0 && (
        <div className="text-center py-12 text-neutral-400">
          <p>Your library appears empty. Add some music to your Jellyfin server!</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-8 overflow-y-auto">
      {/* Media Type Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'music', label: 'Music', icon: <Music className="w-4 h-4" /> },
          { key: 'podcasts', label: 'Podcasts', icon: <Mic2 className="w-4 h-4" /> },
          { key: 'audiobooks', label: 'Audiobooks', icon: <BookOpen className="w-4 h-4" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as FilterType)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              activeFilter === key
                ? 'bg-white text-black'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Render content based on active filter */}
      {activeFilter === 'podcasts' && renderPodcastsContent()}
      {activeFilter === 'audiobooks' && renderAudiobooksContent()}
      {(activeFilter === 'all' || activeFilter === 'music') && renderMusicContent()}
    </div>
  );
}
