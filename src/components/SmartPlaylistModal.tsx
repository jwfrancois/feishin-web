import { useState } from 'react';
import { X, Sparkles, Play, Plus } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { loadStats } from '@/lib/listeningStats';
import { jellyfinApi } from '@/lib/jellyfin';
import type { Track } from '@/types/jellyfin';

interface Props {
  onClose: () => void;
}

type SmartPlaylistRule = 
  | 'not_played_6_months'
  | 'high_play_count'
  | 'recently_added'
  | 'short_tracks';

const SMART_PLAYLISTS: { id: SmartPlaylistRule; name: string; description: string }[] = [
  { id: 'not_played_6_months', name: 'Not Played in 6 Months', description: 'Rediscover forgotten tracks' },
  { id: 'high_play_count', name: 'High Play Count', description: 'Your most played tracks' },
  { id: 'recently_added', name: 'Recently Added', description: 'New additions to your library' },
  { id: 'short_tracks', name: 'Short Tracks', description: 'Tracks under 3 minutes' },
];

export function SmartPlaylistModal({ onClose }: Props) {
  const { playTracks, addToQueue } = usePlayer();
  const [loading, setLoading] = useState<SmartPlaylistRule | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [selectedRule, setSelectedRule] = useState<SmartPlaylistRule | null>(null);

  const generatePlaylist = async (rule: SmartPlaylistRule) => {
    setLoading(rule);
    setSelectedRule(rule);
    setGeneratedTracks([]);

    try {
      const allTracks = await jellyfinApi.getTracks(500, 0, 'Random');
      const stats = loadStats();
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

      let filtered: Track[] = [];

      switch (rule) {
        case 'not_played_6_months':
          const recentlyPlayedIds = new Set(
            stats.plays
              .filter(p => p.timestamp > sixMonthsAgo)
              .map(p => p.trackId)
          );
          filtered = allTracks.Items.filter(t => !recentlyPlayedIds.has(t.Id));
          break;

        case 'high_play_count':
          const playCounts = new Map<string, number>();
          stats.plays.forEach(p => {
            playCounts.set(p.trackId, (playCounts.get(p.trackId) || 0) + 1);
          });
          filtered = allTracks.Items
            .filter(t => playCounts.has(t.Id))
            .sort((a, b) => (playCounts.get(b.Id) || 0) - (playCounts.get(a.Id) || 0));
          break;

        case 'recently_added':
          // Sort by DateCreated would require API support, use random for now
          filtered = allTracks.Items.slice(0, 50);
          break;

        case 'short_tracks':
          filtered = allTracks.Items.filter(t => {
            const duration = (t.RunTimeTicks || 0) / 10000000;
            return duration > 0 && duration < 180;
          });
          break;
      }

      setGeneratedTracks(filtered.slice(0, 50));
    } catch (err) {
      console.error('Failed to generate playlist:', err);
    } finally {
      setLoading(null);
    }
  };

  const handlePlay = () => {
    if (generatedTracks.length > 0) {
      playTracks(generatedTracks);
      onClose();
    }
  };

  const handleAddToQueue = () => {
    if (generatedTracks.length > 0) {
      addToQueue(generatedTracks);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-player-accent" />
            Smart Playlists
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {SMART_PLAYLISTS.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => generatePlaylist(playlist.id)}
              disabled={loading !== null}
              className={`w-full p-4 rounded-lg text-left transition-colors ${
                selectedRule === playlist.id
                  ? 'bg-player-accent/20 border border-player-accent'
                  : 'bg-neutral-800 hover:bg-neutral-700 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{playlist.name}</div>
                  <div className="text-sm text-neutral-400">{playlist.description}</div>
                </div>
                {loading === playlist.id && (
                  <div className="w-5 h-5 border-2 border-player-accent border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </button>
          ))}
        </div>

        {generatedTracks.length > 0 && (
          <div className="border-t border-neutral-800 pt-4">
            <div className="text-sm text-neutral-400 mb-3">
              Generated {generatedTracks.length} tracks
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {generatedTracks.slice(0, 10).map((track) => (
                <div key={track.Id} className="flex items-center gap-2 py-1 text-sm">
                  <span className="text-white truncate flex-1">{track.Name}</span>
                  <span className="text-neutral-500 truncate">{track.Artists?.join(', ')}</span>
                </div>
              ))}
              {generatedTracks.length > 10 && (
                <div className="text-neutral-500 text-sm py-1">
                  ... and {generatedTracks.length - 10} more
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePlay}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-player-accent text-black font-medium rounded-lg hover:bg-player-accent/90 transition-colors"
              >
                <Play className="w-4 h-4" />
                Play Now
              </button>
              <button
                onClick={handleAddToQueue}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add to Queue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
