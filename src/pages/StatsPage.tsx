import { useState } from 'react';
import { BarChart3, Clock, Music, User, Disc, Calendar } from 'lucide-react';
import {
  loadStats,
  getTopArtists,
  getTopAlbums,
  getTopTracks,
  getListeningTimeByPeriod,
  getPlayCountByPeriod,
  formatListeningTime,
} from '@/lib/listeningStats';

type Period = 7 | 30 | 90 | 365 | 0;

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: 'Week' },
  { value: 30, label: 'Month' },
  { value: 90, label: '3 Months' },
  { value: 365, label: 'Year' },
  { value: 0, label: 'All Time' },
];

function StatCard({ icon: Icon, label, value, subValue }: { 
  icon: typeof Clock; 
  label: string; 
  value: string; 
  subValue?: string;
}) {
  return (
    <div className="bg-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-neutral-400 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subValue && <div className="text-sm text-neutral-500">{subValue}</div>}
    </div>
  );
}

function RankingList({ 
  items, 
  type 
}: { 
  items: { name: string; artist?: string; count: number; time?: number }[]; 
  type: 'artist' | 'album' | 'track';
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        No data yet. Start listening to build your stats!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div 
          key={i} 
          className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            i === 0 ? 'bg-yellow-500 text-black' :
            i === 1 ? 'bg-gray-400 text-black' :
            i === 2 ? 'bg-amber-700 text-white' :
            'bg-neutral-700 text-neutral-300'
          }`}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{item.name}</div>
            {item.artist && (
              <div className="text-sm text-neutral-400 truncate">{item.artist}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-player-accent font-medium">{item.count}</div>
            <div className="text-xs text-neutral-500">plays</div>
          </div>
          {item.time && (
            <div className="text-right ml-2">
              <div className="text-neutral-300 text-sm">{formatListeningTime(item.time)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function StatsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const stats = loadStats();
  
  const days = period === 0 ? undefined : period;
  const topArtists = getTopArtists(10, days);
  const topAlbums = getTopAlbums(10, days);
  const topTracks = getTopTracks(10, days);
  const listeningTime = days ? getListeningTimeByPeriod(days) : stats.totalListeningTime;
  const playCount = days ? getPlayCountByPeriod(days) : stats.plays.length;

  const avgPerDay = days && days > 0 ? listeningTime / days : 0;

  return (
    <div className="p-6 space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-player-accent" />
          <h1 className="text-3xl font-bold text-white">Listening Stats</h1>
        </div>
        
        {/* Period Selector */}
        <div className="flex bg-neutral-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                period === p.value
                  ? 'bg-player-accent text-black font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Listening Time"
          value={formatListeningTime(listeningTime)}
          subValue={days ? `${formatListeningTime(avgPerDay)} / day avg` : undefined}
        />
        <StatCard
          icon={Music}
          label="Tracks Played"
          value={playCount.toLocaleString()}
        />
        <StatCard
          icon={User}
          label="Artists"
          value={topArtists.length.toString()}
          subValue="unique artists"
        />
        <StatCard
          icon={Disc}
          label="Albums"
          value={topAlbums.length.toString()}
          subValue="unique albums"
        />
      </div>

      {/* Rankings */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Artists */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-player-accent" />
            Top Artists
          </h2>
          <RankingList items={topArtists} type="artist" />
        </div>

        {/* Top Albums */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-player-accent" />
            Top Albums
          </h2>
          <RankingList items={topAlbums} type="album" />
        </div>

        {/* Top Tracks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-player-accent" />
            Top Tracks
          </h2>
          <RankingList items={topTracks} type="track" />
        </div>
      </div>

      {/* Empty State */}
      {stats.plays.length === 0 && (
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No Listening Data Yet</h3>
          <p className="text-neutral-400">
            Start playing music to see your listening statistics here.
          </p>
        </div>
      )}
    </div>
  );
}
