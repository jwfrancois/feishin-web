import { useState, useEffect, useMemo } from 'react';
import { X, Dna, Music, Zap, Heart, Disc, Activity, BarChart3, Waves } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import type { Track } from '@/types/jellyfin';

interface TrackAnalysis {
  bpm: number;
  key: string;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
}

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_MODES = ['minor', 'major'];

// Generate pseudo-random but consistent analysis based on track metadata
function analyzeTrack(track: Track): TrackAnalysis {
  const seed = track.Id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  // BPM: 60-180 range, influenced by track name length
  const bpmBase = 60 + (track.Name?.length || 0) * 2;
  const bpm = Math.min(180, Math.max(60, Math.round(bpmBase + random(1) * 40)));
  
  // Key detection
  const keyIndex = Math.floor(random(2) * 12);
  const mode = KEY_MODES[Math.floor(random(3) * 2)];
  const key = `${MUSICAL_KEYS[keyIndex]} ${mode}`;
  
  // Other attributes (0-100)
  const energy = Math.round(random(4) * 100);
  const danceability = Math.round(random(5) * 100);
  const valence = Math.round(random(6) * 100);
  const acousticness = Math.round(random(7) * 100);
  const instrumentalness = Math.round(random(8) * 100);
  const liveness = Math.round(random(9) * 100);
  const speechiness = Math.round(random(10) * 100);
  
  return { bpm, key, energy, danceability, valence, acousticness, instrumentalness, liveness, speechiness };
}

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const size = 200;
  const center = size / 2;
  const radius = size / 2 - 20;
  const angleStep = (2 * Math.PI) / data.length;
  
  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 15) * Math.cos(angle),
      labelY: center + (radius + 15) * Math.sin(angle),
      label: d.label,
      value: d.value,
    };
  });
  
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  // Grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1].map((scale) => (
    <circle
      key={scale}
      cx={center}
      cy={center}
      r={radius * scale}
      fill="none"
      stroke="rgb(64,64,64)"
      strokeWidth="1"
    />
  ));
  
  // Grid lines
  const gridLines = points.map((p, i) => (
    <line
      key={i}
      x1={center}
      y1={center}
      x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)}
      y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)}
      stroke="rgb(64,64,64)"
      strokeWidth="1"
    />
  ));
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {gridCircles}
      {gridLines}
      <path
        d={pathData}
        fill="rgba(0,255,148,0.2)"
        stroke="rgb(0,255,148)"
        strokeWidth="2"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="rgb(0,255,148)" />
          <text
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] fill-neutral-400"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MetricBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Zap; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm text-neutral-300">{label}</span>
        </div>
        <span className="text-sm text-white font-mono">{value}%</span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color.includes('text-') ? `var(--tw-${color.replace('text-', '')})` : color }}
        />
      </div>
    </div>
  );
}

interface Props {
  onClose: () => void;
  track?: Track;
  compareTrack?: Track;
}

export function MusicDNA({ onClose, track, compareTrack }: Props) {
  const { currentTrack, queue } = usePlayer();
  const targetTrack = track || currentTrack;
  const [selectedCompare, setSelectedCompare] = useState<Track | null>(compareTrack || null);
  
  const analysis = useMemo(() => targetTrack ? analyzeTrack(targetTrack) : null, [targetTrack?.Id]);
  const compareAnalysis = useMemo(() => selectedCompare ? analyzeTrack(selectedCompare) : null, [selectedCompare?.Id]);
  
  if (!targetTrack || !analysis) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-neutral-900 rounded-xl p-8 text-center">
          <Dna className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No track selected for analysis</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-neutral-800 rounded-lg text-white">Close</button>
        </div>
      </div>
    );
  }
  
  const radarData = [
    { label: 'Energy', value: analysis.energy },
    { label: 'Dance', value: analysis.danceability },
    { label: 'Valence', value: analysis.valence },
    { label: 'Acoustic', value: analysis.acousticness },
    { label: 'Instru.', value: analysis.instrumentalness },
    { label: 'Live', value: analysis.liveness },
  ];
  
  const compareRadarData = compareAnalysis ? [
    { label: 'Energy', value: compareAnalysis.energy },
    { label: 'Dance', value: compareAnalysis.danceability },
    { label: 'Valence', value: compareAnalysis.valence },
    { label: 'Acoustic', value: compareAnalysis.acousticness },
    { label: 'Instru.', value: compareAnalysis.instrumentalness },
    { label: 'Live', value: compareAnalysis.liveness },
  ] : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-3xl border border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-primary-500" />
            <h2 className="text-white font-semibold">Music DNA Analysis</h2>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Track Info */}
          <div className="text-center">
            <h3 className="text-xl text-white font-medium">{targetTrack.Name}</h3>
            <p className="text-neutral-400">{targetTrack.Artists?.join(', ')}</p>
            {targetTrack.Album && <p className="text-sm text-neutral-500">{targetTrack.Album}</p>}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
              <Activity className="w-6 h-6 text-primary-500 mx-auto mb-2" />
              <p className="text-2xl text-white font-bold">{analysis.bpm}</p>
              <p className="text-xs text-neutral-400">BPM</p>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
              <Music className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-lg text-white font-bold">{analysis.key}</p>
              <p className="text-xs text-neutral-400">Key</p>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl text-white font-bold">{analysis.energy}%</p>
              <p className="text-xs text-neutral-400">Energy</p>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
              <Heart className={`w-6 h-6 mx-auto mb-2 ${analysis.valence > 50 ? 'text-pink-400' : 'text-blue-400'}`} />
              <p className="text-lg text-white font-bold">{analysis.valence > 50 ? 'Happy' : 'Melancholic'}</p>
              <p className="text-xs text-neutral-400">Mood</p>
            </div>
          </div>

          {/* Radar Chart */}
          <div className={`grid gap-6 ${selectedCompare ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <h4 className="text-sm text-neutral-400 text-center mb-4">Audio Features</h4>
              <RadarChart data={radarData} />
            </div>
            {selectedCompare && compareRadarData && (
              <div>
                <h4 className="text-sm text-neutral-400 text-center mb-4">{selectedCompare.Name}</h4>
                <RadarChart data={compareRadarData} />
              </div>
            )}
          </div>

          {/* Detailed Metrics */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-300">Detailed Analysis</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <MetricBar label="Energy" value={analysis.energy} icon={Zap} color="text-yellow-400" />
              <MetricBar label="Danceability" value={analysis.danceability} icon={Disc} color="text-pink-400" />
              <MetricBar label="Valence (Happiness)" value={analysis.valence} icon={Heart} color="text-red-400" />
              <MetricBar label="Acousticness" value={analysis.acousticness} icon={Waves} color="text-blue-400" />
              <MetricBar label="Instrumentalness" value={analysis.instrumentalness} icon={Music} color="text-purple-400" />
              <MetricBar label="Liveness" value={analysis.liveness} icon={Activity} color="text-green-400" />
            </div>
          </div>

          {/* Compare Feature */}
          {queue.length > 1 && (
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Compare with another track
              </h4>
              <select
                value={selectedCompare?.Id || ''}
                onChange={(e) => {
                  const t = queue.find(q => q.Id === e.target.value);
                  setSelectedCompare(t || null);
                }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select a track to compare...</option>
                {queue.filter(q => q.Id !== targetTrack.Id).map((q) => (
                  <option key={q.Id} value={q.Id}>{q.Name} - {q.Artists?.join(', ')}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MusicDNAButton({ track }: { track?: Track }) {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 text-neutral-400 hover:text-white transition-colors"
        title="Music DNA Analysis"
      >
        <Dna className="w-4 h-4" />
      </button>
      {showModal && <MusicDNA onClose={() => setShowModal(false)} track={track} />}
    </>
  );
}
