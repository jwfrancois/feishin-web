import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

const BANDS = [
  { freq: 60, label: '60' },
  { freq: 170, label: '170' },
  { freq: 310, label: '310' },
  { freq: 600, label: '600' },
  { freq: 1000, label: '1k' },
  { freq: 3000, label: '3k' },
  { freq: 6000, label: '6k' },
  { freq: 12000, label: '12k' },
  { freq: 14000, label: '14k' },
  { freq: 16000, label: '16k' },
];

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 5, 6, 6],
  Vocal: [-2, -1, 0, 3, 5, 5, 3, 0, -1, -2],
  Rock: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
  Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 0, 1],
  Jazz: [3, 2, 0, 1, -1, -1, 0, 1, 2, 3],
};

const EQ_STORAGE_KEY = 'equalizer_settings';

interface EqualizerSettings {
  enabled: boolean;
  gains: number[];
  preset: string;
}

function loadSettings(): EqualizerSettings {
  try {
    const stored = localStorage.getItem(EQ_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { enabled: true, gains: PRESETS.Flat, preset: 'Flat' };
}

function saveSettings(settings: EqualizerSettings) {
  try {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// Global audio context and filters for the equalizer
let audioContext: AudioContext | null = null;
let filters: BiquadFilterNode[] = [];
let sourceNode: MediaElementAudioSourceNode | null = null;
let isConnected = false;
let connectionFailed = false;
let connectedAudioElement: HTMLAudioElement | null = null;

export function connectEqualizer(audioElement: HTMLAudioElement): boolean {
  // Already connected to this element
  if (isConnected && connectedAudioElement === audioElement) {
    console.log('[EQ Debug] Already connected to this audio element');
    return true;
  }
  
  // If previous connection failed, don't retry (audio plays without EQ)
  if (connectionFailed) {
    console.log('[EQ Debug] Previous connection failed, skipping (audio plays directly)');
    return false;
  }
  
  // If connected to different element, we can't reconnect (MediaElementSource limitation)
  if (isConnected && connectedAudioElement !== audioElement) {
    console.warn('[EQ Debug] Cannot reconnect to different audio element');
    return false;
  }
  
  try {
    console.log('[EQ Debug] Connecting equalizer...');
    audioContext = new AudioContext();
    console.log('[EQ Debug] AudioContext created, state:', audioContext.state);
    
    sourceNode = audioContext.createMediaElementSource(audioElement);
    connectedAudioElement = audioElement;
    
    // Create filters for each band
    filters = BANDS.map((band, i) => {
      const filter = audioContext!.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = band.freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
    
    // Chain: source -> filters -> destination
    sourceNode.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(audioContext.destination);
    
    isConnected = true;
    console.log('[EQ Debug] Equalizer connected successfully');
    
    // Apply saved settings
    const settings = loadSettings();
    if (settings.enabled) {
      applyGains(settings.gains);
    }
    
    return true;
  } catch (err) {
    console.error('[EQ Debug] Failed to connect equalizer:', err);
    connectionFailed = true;
    
    // Fallback: ensure audio still plays without equalizer
    // If we partially connected, try to route source directly to destination
    if (sourceNode && audioContext) {
      try {
        sourceNode.disconnect();
        sourceNode.connect(audioContext.destination);
        console.log('[EQ Debug] Fallback: routed audio directly to output');
      } catch (fallbackErr) {
        console.error('[EQ Debug] Fallback routing also failed:', fallbackErr);
      }
    }
    
    return false;
  }
}

// Resume AudioContext (must be called from user interaction)
export async function resumeAudioContext(): Promise<boolean> {
  if (!audioContext) {
    console.log('[EQ Debug] No AudioContext to resume');
    return true; // No context means audio plays directly
  }
  
  if (audioContext.state === 'suspended') {
    console.log('[EQ Debug] Resuming suspended AudioContext...');
    try {
      await audioContext.resume();
      console.log('[EQ Debug] AudioContext resumed, state:', audioContext.state);
      return true;
    } catch (err) {
      console.error('[EQ Debug] Failed to resume AudioContext:', err);
      return false;
    }
  }
  
  console.log('[EQ Debug] AudioContext state:', audioContext.state);
  return audioContext.state === 'running';
}

export function isEqualizerConnected(): boolean {
  return isConnected;
}

export function applyGains(gains: number[]) {
  filters.forEach((filter, i) => {
    if (gains[i] !== undefined) {
      filter.gain.value = gains[i];
    }
  });
}

export function Equalizer({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<EqualizerSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    // When disabled, set all gains to 0 (flat) - this is the bypass
    if (settings.enabled) {
      applyGains(settings.gains);
    } else {
      applyGains(PRESETS.Flat);
    }
  }, [settings]);

  const handleGainChange = (index: number, value: number) => {
    const newGains = [...settings.gains];
    newGains[index] = value;
    setSettings({ ...settings, gains: newGains, preset: 'Custom' });
  };

  const handlePresetChange = (presetName: string) => {
    const gains = PRESETS[presetName] || PRESETS.Flat;
    setSettings({ ...settings, gains, preset: presetName });
  };

  const handleReset = () => {
    setSettings({ enabled: true, gains: PRESETS.Flat, preset: 'Flat' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-2xl border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-white font-semibold">Equalizer</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Reset to flat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Enable Equalizer</span>
            <button
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.enabled ? 'bg-player-accent' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Presets</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => handlePresetChange(name)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    settings.preset === name
                      ? 'bg-player-accent text-black font-medium'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {name}
                </button>
              ))}
              {settings.preset === 'Custom' && (
                <span className="px-3 py-1.5 rounded-lg text-sm bg-neutral-700 text-neutral-300">
                  Custom
                </span>
              )}
            </div>
          </div>

          {/* Frequency bands */}
          <div className="flex items-end justify-between gap-2 h-48 pt-4">
            {BANDS.map((band, i) => (
              <div key={band.freq} className="flex flex-col items-center flex-1">
                <div className="relative h-32 w-full flex justify-center">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={settings.gains[i]}
                    onChange={(e) => handleGainChange(i, parseFloat(e.target.value))}
                    disabled={!settings.enabled}
                    className="h-32 w-2 appearance-none bg-neutral-700 rounded-full cursor-pointer disabled:opacity-50"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                    }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-2">{band.label}</span>
                <span className={`text-[10px] ${settings.gains[i] >= 0 ? 'text-player-accent' : 'text-red-400'}`}>
                  {settings.gains[i] > 0 ? '+' : ''}{settings.gains[i]}dB
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
