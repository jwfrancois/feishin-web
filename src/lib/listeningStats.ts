// Listening Statistics Storage

export interface TrackPlay {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number; // seconds
  timestamp: number; // epoch ms
}

export interface ListeningStats {
  plays: TrackPlay[];
  totalListeningTime: number; // seconds
}

const STATS_KEY = 'listening_stats';
const MAX_PLAYS = 10000; // Limit stored plays

export function loadStats(): ListeningStats {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { plays: [], totalListeningTime: 0 };
}

export function saveStats(stats: ListeningStats) {
  try {
    // Trim old plays if too many
    if (stats.plays.length > MAX_PLAYS) {
      stats.plays = stats.plays.slice(-MAX_PLAYS);
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordPlay(
  trackId: string,
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number
) {
  const stats = loadStats();
  stats.plays.push({
    trackId,
    trackName,
    artistName,
    albumName,
    duration,
    timestamp: Date.now(),
  });
  stats.totalListeningTime += duration;
  saveStats(stats);
}

export function getTopArtists(limit = 10, days?: number): { name: string; count: number; time: number }[] {
  const stats = loadStats();
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  
  const artistMap = new Map<string, { count: number; time: number }>();
  
  stats.plays
    .filter(p => p.timestamp >= cutoff)
    .forEach(p => {
      const existing = artistMap.get(p.artistName) || { count: 0, time: 0 };
      artistMap.set(p.artistName, {
        count: existing.count + 1,
        time: existing.time + p.duration,
      });
    });
  
  return Array.from(artistMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopAlbums(limit = 10, days?: number): { name: string; artist: string; count: number }[] {
  const stats = loadStats();
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  
  const albumMap = new Map<string, { artist: string; count: number }>();
  
  stats.plays
    .filter(p => p.timestamp >= cutoff)
    .forEach(p => {
      const key = `${p.albumName}|||${p.artistName}`;
      const existing = albumMap.get(key) || { artist: p.artistName, count: 0 };
      albumMap.set(key, { artist: existing.artist, count: existing.count + 1 });
    });
  
  return Array.from(albumMap.entries())
    .map(([key, data]) => ({ name: key.split('|||')[0], ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopTracks(limit = 10, days?: number): { name: string; artist: string; count: number }[] {
  const stats = loadStats();
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  
  const trackMap = new Map<string, { artist: string; count: number }>();
  
  stats.plays
    .filter(p => p.timestamp >= cutoff)
    .forEach(p => {
      const existing = trackMap.get(p.trackId) || { artist: p.artistName, count: 0 };
      trackMap.set(p.trackId, { artist: existing.artist, count: existing.count + 1 });
      // Store name
      if (!trackMap.has(p.trackId + '_name')) {
        trackMap.set(p.trackId + '_name', { artist: p.trackName, count: 0 });
      }
    });
  
  const tracks: { id: string; name: string; artist: string; count: number }[] = [];
  trackMap.forEach((val, key) => {
    if (!key.endsWith('_name')) {
      const nameData = trackMap.get(key + '_name');
      tracks.push({ id: key, name: nameData?.artist || 'Unknown', artist: val.artist, count: val.count });
    }
  });
  
  return tracks
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(t => ({ name: t.name, artist: t.artist, count: t.count }));
}

export function getListeningTimeByPeriod(days: number): number {
  const stats = loadStats();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  
  return stats.plays
    .filter(p => p.timestamp >= cutoff)
    .reduce((sum, p) => sum + p.duration, 0);
}

export function getPlayCountByPeriod(days: number): number {
  const stats = loadStats();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return stats.plays.filter(p => p.timestamp >= cutoff).length;
}

export function formatListeningTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
