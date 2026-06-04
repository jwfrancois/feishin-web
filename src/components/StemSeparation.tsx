import { useState, useEffect, useRef } from 'react';
import { X, Mic2, Drum, Guitar, Radio, Layers, Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface StemLevels {
  vocals: number;
  drums: number;
  bass: number;
  other: number;
}

const PRESETS: Record<string, StemLevels> = {
  'Full Mix': { vocals: 100, drums: 100, bass: 100, other: 100 },
  'Karaoke': { vocals: 0, drums: 100, bass: 100, other: 100 },
  'Acapella': { vocals: 100, drums: 0, bass: 0, other: 0 },
  'Instrumental': { vocals: 0, drums: 100, bass: 100, other: 100 },
  'Bass Focus': { vocals: 30, drums: 50, bass: 100, other: 30 },
  'Drums Only': { vocals: 0, drums: 100, bass: 20, other: 0 },
};

// Simulated stem separation using Web Audio filters
class StemSeparator {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  
  // Vocal filter chain (mid frequencies, side channel)
  private vocalHighpass: BiquadFilterNode | null = null;
  private vocalLowpass: BiquadFilterNode | null = null;
  private vocalGain: GainNode | null = null;
  
  // Bass filter (low frequencies)
  private bassFilter: BiquadFilterNode | null = null;
  private bassGain: GainNode | null = null;
  
  // Drums (transient emphasis)
  private drumsHighpass: BiquadFilterNode | null = null;
  private drumsCompressor: DynamicsCompressorNode | null = null;
  private drumsGain: GainNode | null = null;
  
  // Other instruments
  private otherBandpass: BiquadFilterNode | null = null;
  private otherGain: GainNode | null = null;
  
  private masterGain: GainNode | null = null;
  private isConnected = false;

  connect(audioElement: HTMLAudioElement): boolean {
    if (this.isConnected) return true;
    
    try {
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      
      // Create filter chains for each "stem"
      this.createVocalChain();
      this.createBassChain();
      this.createDrumsChain();
      this.createOtherChain();
      
      this.masterGain = this.audioContext.createGain();
      
      // Connect all chains to master
      this.vocalGain?.connect(this.masterGain);
      this.bassGain?.connect(this.masterGain);
      this.drumsGain?.connect(this.masterGain);
      this.otherGain?.connect(this.masterGain);
      
      this.masterGain.connect(this.audioContext.destination);
      this.isConnected = true;
      
      return true;
    } catch (err) {
      console.error('[StemSeparator] Failed to connect:', err);
      return false;
    }
  }

  private createVocalChain() {
    if (!this.audioContext || !this.sourceNode) return;
    
    // Vocals typically in 300Hz-4kHz, center channel emphasis
    this.vocalHighpass = this.audioContext.createBiquadFilter();
    this.vocalHighpass.type = 'highpass';
    this.vocalHighpass.frequency.value = 300;
    this.vocalHighpass.Q.value = 0.7;
    
    this.vocalLowpass = this.audioContext.createBiquadFilter();
    this.vocalLowpass.type = 'lowpass';
    this.vocalLowpass.frequency.value = 4000;
    this.vocalLowpass.Q.value = 0.7;
    
    this.vocalGain = this.audioContext.createGain();
    
    this.sourceNode.connect(this.vocalHighpass);
    this.vocalHighpass.connect(this.vocalLowpass);
    this.vocalLowpass.connect(this.vocalGain);
  }

  private createBassChain() {
    if (!this.audioContext || !this.sourceNode) return;
    
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 250;
    this.bassFilter.Q.value = 0.5;
    
    this.bassGain = this.audioContext.createGain();
    
    this.sourceNode.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGain);
  }

  private createDrumsChain() {
    if (!this.audioContext || !this.sourceNode) return;
    
    // Drums: percussive transients, wide frequency but emphasize attack
    this.drumsHighpass = this.audioContext.createBiquadFilter();
    this.drumsHighpass.type = 'highpass';
    this.drumsHighpass.frequency.value = 60;
    
    this.drumsCompressor = this.audioContext.createDynamicsCompressor();
    this.drumsCompressor.threshold.value = -40;
    this.drumsCompressor.knee.value = 0;
    this.drumsCompressor.ratio.value = 20;
    this.drumsCompressor.attack.value = 0.001;
    this.drumsCompressor.release.value = 0.05;
    
    this.drumsGain = this.audioContext.createGain();
    
    this.sourceNode.connect(this.drumsHighpass);
    this.drumsHighpass.connect(this.drumsCompressor);
    this.drumsCompressor.connect(this.drumsGain);
  }

  private createOtherChain() {
    if (!this.audioContext || !this.sourceNode) return;
    
    // Other: mid-high frequencies excluding vocal range
    this.otherBandpass = this.audioContext.createBiquadFilter();
    this.otherBandpass.type = 'bandpass';
    this.otherBandpass.frequency.value = 2000;
    this.otherBandpass.Q.value = 0.5;
    
    this.otherGain = this.audioContext.createGain();
    
    this.sourceNode.connect(this.otherBandpass);
    this.otherBandpass.connect(this.otherGain);
  }

  setLevels(levels: StemLevels) {
    const now = this.audioContext?.currentTime || 0;
    this.vocalGain?.gain.setValueAtTime(levels.vocals / 100, now);
    this.bassGain?.gain.setValueAtTime(levels.bass / 100, now);
    this.drumsGain?.gain.setValueAtTime(levels.drums / 100, now);
    this.otherGain?.gain.setValueAtTime(levels.other / 100, now);
  }

  disconnect() {
    try {
      this.sourceNode?.disconnect();
      this.vocalHighpass?.disconnect();
      this.vocalLowpass?.disconnect();
      this.vocalGain?.disconnect();
      this.bassFilter?.disconnect();
      this.bassGain?.disconnect();
      this.drumsHighpass?.disconnect();
      this.drumsCompressor?.disconnect();
      this.drumsGain?.disconnect();
      this.otherBandpass?.disconnect();
      this.otherGain?.disconnect();
      this.masterGain?.disconnect();
      this.audioContext?.close();
    } catch {}
    this.isConnected = false;
  }
}

interface Props {
  onClose: () => void;
}

export function StemSeparation({ onClose }: Props) {
  const { currentTrack, audioRef } = usePlayer();
  const [isActive, setIsActive] = useState(false);
  const [levels, setLevels] = useState<StemLevels>(PRESETS['Full Mix']);
  const [activePreset, setActivePreset] = useState('Full Mix');
  const separatorRef = useRef<StemSeparator | null>(null);

  const updateLevel = (stem: keyof StemLevels, value: number) => {
    const newLevels = { ...levels, [stem]: value };
    setLevels(newLevels);
    setActivePreset('Custom');
    separatorRef.current?.setLevels(newLevels);
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      setLevels(preset);
      setActivePreset(name);
      separatorRef.current?.setLevels(preset);
    }
  };

  const toggleActive = () => {
    if (!isActive && audioRef.current) {
      separatorRef.current = new StemSeparator();
      separatorRef.current.connect(audioRef.current);
      separatorRef.current.setLevels(levels);
      setIsActive(true);
    } else {
      separatorRef.current?.disconnect();
      separatorRef.current = null;
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => {
      separatorRef.current?.disconnect();
    };
  }, []);

  const stemConfig = [
    { key: 'vocals' as const, label: 'Vocals', icon: Mic2, color: 'text-pink-400', bgColor: 'bg-pink-500' },
    { key: 'drums' as const, label: 'Drums', icon: Drum, color: 'text-orange-400', bgColor: 'bg-orange-500' },
    { key: 'bass' as const, label: 'Bass', icon: Guitar, color: 'text-blue-400', bgColor: 'bg-blue-500' },
    { key: 'other' as const, label: 'Other', icon: Radio, color: 'text-green-400', bgColor: 'bg-green-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-lg border border-neutral-800">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <h2 className="text-white font-semibold">Stem Separation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">
                {isActive ? 'Stem isolation active' : 'Enable to isolate stems'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Simulated separation using frequency filters
              </p>
            </div>
            <button
              onClick={toggleActive}
              disabled={!currentTrack}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-black'
                  : 'bg-neutral-700 text-white hover:bg-neutral-600'
              } disabled:opacity-50`}
            >
              {isActive ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-400">Presets</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => applyPreset(name)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    activePreset === name
                      ? 'bg-primary-500 text-black font-medium'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Stem Sliders */}
          <div className="space-y-4">
            <label className="text-sm text-neutral-400">Stem Levels</label>
            {stemConfig.map(({ key, label, icon: Icon, color, bgColor }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm text-white">{label}</span>
                  </div>
                  <span className="text-xs text-neutral-400 font-mono w-10 text-right">
                    {levels[key]}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={levels[key]}
                    onChange={(e) => updateLevel(key, parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${bgColor.replace('bg-', 'rgb(var(--')} ${levels[key]}%, rgb(64,64,64) ${levels[key]}%)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Visual indicator */}
          <div className="flex items-end justify-center gap-3 h-24 bg-neutral-800/50 rounded-lg p-4">
            {stemConfig.map(({ key, label, bgColor }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 rounded-t transition-all duration-300 ${bgColor}`}
                  style={{ height: `${levels[key] * 0.6}px`, opacity: levels[key] / 100 }}
                />
                <span className="text-[10px] text-neutral-500">{label.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StemSeparationButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 text-neutral-400 hover:text-white transition-colors"
        title="Stem Separation"
      >
        <Layers className="w-4 h-4" />
      </button>
      {showModal && <StemSeparation onClose={() => setShowModal(false)} />}
    </>
  );
}
