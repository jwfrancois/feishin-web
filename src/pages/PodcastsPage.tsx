import { useEffect, useState } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import type { PodcastSeries, PodcastEpisode, Track } from '@/types/jellyfin';
import { Play, Pause, Check, Mic2, ChevronRight, Clock, RotateCcw } from 'lucide-react';

function formatDuration(ticks?: number): string {
  if (!ticks) return '';
  const seconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface EpisodeCardProps {
  episode: PodcastEpisode;
  onPlay: () => void;
  isPlaying: boolean;
  isCurrent: boolean;
}

function EpisodeCard({ episode, onPlay, isPlaying, isCurrent }: EpisodeCardProps) {
  const progress = episode.UserData?.PlayedPercentage || 0;
  const isCompleted = episode.UserData?.Played;

  const handleTogglePlayed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isCompleted) {
        await jellyfinApi.markAsUnplayed(episode.Id);
      } else {
        await jellyfinApi.markAsPlayed(episode.Id);
      }
    } catch (err) {
      console.error('Failed to update played status:', err);
    }
  };

  return (
    <div
      className={`group p-4 rounded-lg border transition-all cursor-pointer ${
        isCurrent
          ? 'bg-purple-500/10 border-purple-500/30'
          : 'bg-neutral-800/50 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-600'
      }`}
      onClick={onPlay}
    >
      <div className="flex gap-4">
        {/* Episode Image */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-700">
          <img
            src={jellyfinApi.getImageUrl(episode.AlbumId || episode.Id, 'Primary', 160)}
            alt={episode.Name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="40">🎙</text></svg>';
            }}
          />
          {/* Progress Overlay */}
          {progress > 0 && progress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-900">
              <div className="h-full bg-purple-500" style={{ width: `${progress}%` }} />
            </div>
          )}
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {isCurrent && isPlaying ? (
              <Pause className="w-8 h-8 text-white" fill="white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            )}
          </div>
        </div>

        {/* Episode Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium truncate ${isCompleted ? 'text-neutral-500' : 'text-white'}`}>
              {episode.Name}
            </h3>
            <button
              onClick={handleTogglePlayed}
              className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                isCompleted
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-neutral-700 text-neutral-400 hover:text-white'
              }`}
              title={isCompleted ? 'Mark as unplayed' : 'Mark as played'}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          <p className="text-sm text-neutral-400 line-clamp-2 mt-1">
            {episode.Overview || 'No description available'}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(episode.RunTimeTicks)}
            </span>
            {episode.PremiereDate && (
              <span>{formatDate(episode.PremiereDate)}</span>
            )}
            {progress > 0 && progress < 100 && (
              <span className="text-purple-400">{Math.round(progress)}% played</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PodcastCardProps {
  podcast: PodcastSeries;
  onClick: () => void;
}

function PodcastCard({ podcast, onClick }: PodcastCardProps) {
  return (
    <div
      className="group p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-800 hover:border-purple-500/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-700 mb-3">
        <img
          src={jellyfinApi.getImageUrl(podcast.Id, 'Primary', 300)}
          alt={podcast.Name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="40">🎙</text></svg>';
          }}
        />
        {/* Podcast Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <Mic2 className="w-3 h-3" />
          Podcast
        </div>
      </div>
      <h3 className="font-semibold text-white truncate">{podcast.Name}</h3>
      <p className="text-sm text-neutral-400 mt-1">
        {podcast.ChildCount ? `${podcast.ChildCount} episodes` : 'No episodes'}
      </p>
    </div>
  );
}

export function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastSeries[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSeries | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks, currentTrack, isPlaying, toggle } = usePlayer();

  useEffect(() => {
    async function load() {
      try {
        const res = await jellyfinApi.getPodcasts(50, 0);
        setPodcasts(res.Items);
      } catch (err) {
        console.error('Failed to load podcasts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSelectPodcast = async (podcast: PodcastSeries) => {
    setSelectedPodcast(podcast);
    try {
      const res = await jellyfinApi.getPodcastEpisodes(podcast.Id);
      setEpisodes(res.Items);
    } catch (err) {
      console.error('Failed to load episodes:', err);
    }
  };

  const handlePlayEpisode = (episode: PodcastEpisode, index: number) => {
    if (currentTrack?.Id === episode.Id) {
      toggle();
    } else {
      playTracks(episodes as Track[], index);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Mic2 className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Podcasts</h1>
          <p className="text-neutral-400">{podcasts.length} shows</p>
        </div>
      </div>

      {selectedPodcast ? (
        /* Episode List View */
        <div>
          <button
            onClick={() => setSelectedPodcast(null)}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to shows
          </button>

          <div className="flex gap-6 mb-6">
            <img
              src={jellyfinApi.getImageUrl(selectedPodcast.Id, 'Primary', 200)}
              alt={selectedPodcast.Name}
              className="w-32 h-32 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedPodcast.Name}</h2>
              <p className="text-neutral-400 mt-1">{episodes.length} episodes</p>
              {selectedPodcast.Overview && (
                <p className="text-neutral-500 text-sm mt-2 line-clamp-3">{selectedPodcast.Overview}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {episodes.map((episode, idx) => (
              <EpisodeCard
                key={episode.Id}
                episode={episode}
                onPlay={() => handlePlayEpisode(episode, idx)}
                isPlaying={isPlaying}
                isCurrent={currentTrack?.Id === episode.Id}
              />
            ))}
          </div>

          {episodes.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              No episodes found for this podcast
            </div>
          )}
        </div>
      ) : (
        /* Podcast Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {podcasts.map((podcast) => (
            <PodcastCard
              key={podcast.Id}
              podcast={podcast}
              onClick={() => handleSelectPodcast(podcast)}
            />
          ))}
        </div>
      )}

      {podcasts.length === 0 && !selectedPodcast && (
        <div className="text-center py-12 text-neutral-500">
          <Mic2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No podcasts found in your library</p>
          <p className="text-sm mt-1">Add media with the "Podcast" genre tag to see them here</p>
        </div>
      )}
    </div>
  );
}
