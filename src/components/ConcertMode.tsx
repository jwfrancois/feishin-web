import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Music2, Building2, Church, Tent, Coffee, Theater, Volume2, Users } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface VenuePreset {
  id: string;
  name: string;
  icon: typeof Building2;
  description: string;
  decayTime: number;
  wetDry: number;
  preDelay: number;
  roomSize: number;
  highFreqDamping: number;
  color: string;
}

const VENUE_PRESETS: VenuePreset[] = [
  {
    id: 'club',
    name: 'Intimate Club',
    icon: Music2,
    description: 'Close, warm reverb like a small music venue',
    decayTime: 1.2,
    wetDry: 0.4,
    preDelay: 0.01,
    roomSize: 0.3,
    highFreqDamping: 0.5,
    color: '#ef4444',
  },
  {
    id: 'hall',
    name: 'Concert Hall',
    icon: Building2,
    description: 'Large hall with natural acoustics',
    decayTime: 2.5,
    wetDry: 0.45,
    preDelay: 0.025,
    roomSize: 0.7,
    highFreqDamping: 0.35,
    color: '#3b82f6',
  },
  {
    id: 'stadium',
    name: 'Stadium',
    icon: Tent,
    description: 'Massive echo with crowd ambience',
    decayTime: 4.5,
    wetDry: 0.5,
    preDelay: 0.05,
    roomSize: 1.0,
    highFreqDamping: 0.25,
    color: '#22c55e',
  },
  {
    id: 'jazz',
    name: 'Jazz Lounge',
    icon: Coffee,
    description: 'Smooth, intimate atmosphere',
    decayTime: 1.4,
    wetDry: 0.35,
    preDelay: 0.015,
    roomSize: 0.4,
    highFreqDamping: 0.6,
    color: '#f59e0b',
  },
  {
    id: 'cathedral',
    name: 'Cathedral',
    icon: Church,
    description: 'Massive reverb with ethereal quality',
    decayTime: 6.0,
    wetDry: 0.6,
    preDelay: 0.08,
    roomSize: 1.0,
    highFreqDamping: 0.15,
    color: '#8b5cf6',
  },
  {
    id: 'theater',
    name: 'Theater',
    icon: Theater,
    description: 'Balanced acoustics for clarity',
    decayTime: 1.8,
    wetDry: 0.4,
    preDelay: 0.02,
    roomSize: 0.6,
    highFreqDamping: 0.45,
    color: '#ec4899',
  },
];

const STORAGE_KEY = 'concertModeSettings';

interface StoredSettings {
  enabled: boolean;
  venue: string;
  wetDry: number;
  crowdAmbience: number;
}

function loadSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[ConcertMode] Failed to load settings:', e);
  }
  return { enabled: false, venue: 'hall', wetDry: 0.4, crowdAmbience: 0 };
}

function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('[ConcertMode] Settings saved:', settings);
  } catch (e) {
    console.warn('[ConcertMode] Failed to save settings:', e);
  }
}

// Generate stronger impulse response
function generateImpulseResponse(
  audioContext: AudioContext,
  preset: VenuePreset
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  // Ensure minimum 2 seconds for audible reverb tail
  const length = Math.max(Math.floor(preset.decayTime * sampleRate), sampleRate * 2);
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  
  console.log('[ConcertMode] Generating impulse response:', {
    preset: preset.name,
    decayTime: preset.decayTime,
    bufferLength: length,
    sampleRate
  });
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    
    // Initial spike for early reflections
    data[0] = 0.5;
    
    for (let i = 1; i < length; i++) {
      const t = i / sampleRate;
      
      // Stronger exponential decay curve
      const decay = Math.exp(-2.5 * t / preset.decayTime);
      
      // Early reflections (first 80ms) - more prominent
      let earlyReflections = 0;
      if (t < 0.08) {
        const numReflections = Math.floor(t * 100);
        for (let r = 0; r < numReflections; r++) {
          const reflectionTime = (r + 1) * 0.008;
          const reflectionSample = Math.floor(reflectionTime * sampleRate);
          if (i === reflectionSample) {
            earlyReflections = (0.5 - r * 0.05) * (Math.random() > 0.5 ? 1 : -1);
          }
        }
      }
      
      // Late diffuse reverb - stronger amplitude
      const lateReverb = (Math.random() * 2 - 1) * decay * 0.8;
      
      // High frequency damping
      const dampingFactor = Math.exp(-t * preset.highFreqDamping * 3);
      
      // Room size affects density and amplitude
      const roomFactor = 0.6 + preset.roomSize * 0.4;
      
      data[i] = (earlyReflections + lateReverb * dampingFactor) * roomFactor;
    }
  }
  
  return buffer;
}

function generateCrowdAmbience(audioContext: AudioContext, duration: number): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(duration * sampleRate);
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const rumble = (Math.random() * 2 - 1) * 0.03;
      const crowd = Math.random() * 0.015;
      const mod = Math.sin(t * 0.5) * 0.3 + 0.7;
      data[i] = (rumble + crowd) * mod;
    }
  }
  
  return buffer;
}

// Singleton engine that persists across modal open/close
class ConcertModeEngine {
  private static instance: ConcertModeEngine | null = null;
  
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private convolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isConnected = false;
  private currentPreset: VenuePreset | null = null;
  private currentWetDry = 0.4;
  private connectedElement: HTMLAudioElement | null = null;

  static getInstance(): ConcertModeEngine {
    if (!ConcertModeEngine.instance) {
      ConcertModeEngine.instance = new ConcertModeEngine();
    }
    return ConcertModeEngine.instance;
  }

  async connect(audioElement: HTMLAudioElement): Promise<boolean> {
    // If already connected to this element, just resume
    if (this.isConnected && this.connectedElement === audioElement) {
      await this.ensureRunning();
      return true;
    }
    
    // If connected to different element, disconnect first
    if (this.isConnected && this.connectedElement !== audioElement) {
      this.disconnect();
    }
    
    try {
      console.log('[ConcertMode] Connecting audio chain...');
      
      this.audioContext = new AudioContext();
      await this.ensureRunning();
      
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.connectedElement = audioElement;
      
      // Create nodes
      this.convolver = this.audioContext.createConvolver();
      this.dryGain = this.audioContext.createGain();
      this.wetGain = this.audioContext.createGain();
      this.crowdGain = this.audioContext.createGain();
      this.masterGain = this.audioContext.createGain();
      
      // Start with dry signal only
      this.dryGain.gain.value = 1;
      this.wetGain.gain.value = 0;
      this.crowdGain.gain.value = 0;
      this.masterGain.gain.value = 1;
      
      // Connect dry path: source -> dryGain -> master
      this.sourceNode.connect(this.dryGain);
      this.dryGain.connect(this.masterGain);
      
      // Connect wet path: source -> convolver -> wetGain -> master
      this.sourceNode.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);
      
      // Crowd ambience -> master
      this.crowdGain.connect(this.masterGain);
      
      // Master -> output
      this.masterGain.connect(this.audioContext.destination);
      
      this.isConnected = true;
      console.log('[ConcertMode] Audio chain connected successfully');
      return true;
    } catch (err) {
      console.error('[ConcertMode] Failed to connect:', err);
      return false;
    }
  }

  private async ensureRunning() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[ConcertMode] Resuming suspended AudioContext...');
      await this.audioContext.resume();
      console.log('[ConcertMode] AudioContext state:', this.audioContext.state);
    }
  }

  async setPreset(preset: VenuePreset | null, wetDryOverride?: number) {
    if (!this.audioContext || !this.convolver || !this.wetGain || !this.dryGain) {
      console.warn('[ConcertMode] Cannot set preset - not connected');
      return;
    }
    
    await this.ensureRunning();
    
    this.currentPreset = preset;
    const now = this.audioContext.currentTime;
    
    if (!preset) {
      console.log('[ConcertMode] Disabling effect (dry signal only)');
      this.dryGain.gain.setTargetAtTime(1, now, 0.1);
      this.wetGain.gain.setTargetAtTime(0, now, 0.1);
      this.stopCrowd();
      return;
    }
    
    // Generate impulse response
    const impulse = generateImpulseResponse(this.audioContext, preset);
    this.convolver.buffer = impulse;
    
    // Use override or preset wetDry
    const wetLevel = wetDryOverride ?? preset.wetDry;
    this.currentWetDry = wetLevel;
    
    console.log('[ConcertMode] Applying preset:', {
      name: preset.name,
      wetLevel,
      dryLevel: 1 - wetLevel * 0.5 // Keep dry relatively strong
    });
    
    // Mix: keep dry signal strong, add wet on top
    // This makes the reverb additive rather than replacing the dry signal
    this.dryGain.gain.setTargetAtTime(1 - wetLevel * 0.3, now, 0.1);
    this.wetGain.gain.setTargetAtTime(wetLevel, now, 0.1);
  }

  async setWetDry(level: number) {
    if (!this.audioContext || !this.wetGain || !this.dryGain) return;
    
    await this.ensureRunning();
    this.currentWetDry = level;
    
    const now = this.audioContext.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - level * 0.3, now, 0.1);
    this.wetGain.gain.setTargetAtTime(level, now, 0.1);
    
    console.log('[ConcertMode] Wet/dry adjusted:', { wet: level, dry: 1 - level * 0.3 });
  }

  async setCrowdLevel(level: number) {
    if (!this.audioContext || !this.crowdGain) return;
    
    await this.ensureRunning();
    const now = this.audioContext.currentTime;
    this.crowdGain.gain.setTargetAtTime(level * 0.5, now, 0.1);
    
    if (level > 0 && !this.crowdSource) {
      this.startCrowd();
    } else if (level === 0) {
      this.stopCrowd();
    }
  }

  private startCrowd() {
    if (!this.audioContext || !this.crowdGain) return;
    
    const crowdBuffer = generateCrowdAmbience(this.audioContext, 30);
    this.crowdSource = this.audioContext.createBufferSource();
    this.crowdSource.buffer = crowdBuffer;
    this.crowdSource.loop = true;
    this.crowdSource.connect(this.crowdGain);
    this.crowdSource.start();
    console.log('[ConcertMode] Crowd ambience started');
  }

  private stopCrowd() {
    try {
      this.crowdSource?.stop();
    } catch {}
    this.crowdSource = null;
  }

  disconnect() {
    console.log('[ConcertMode] Disconnecting audio chain');
    try {
      this.stopCrowd();
      this.sourceNode?.disconnect();
      this.convolver?.disconnect();
      this.dryGain?.disconnect();
      this.wetGain?.disconnect();
      this.crowdGain?.disconnect();
      this.masterGain?.disconnect();
      this.audioContext?.close();
    } catch {}
    
    this.audioContext = null;
    this.sourceNode = null;
    this.convolver = null;
    this.dryGain = null;
    this.wetGain = null;
    this.crowdGain = null;
    this.masterGain = null;
    this.isConnected = false;
    this.currentPreset = null;
    this.connectedElement = null;
  }

  getPreset(): VenuePreset | null {
    return this.currentPreset;
  }
  
  getWetDry(): number {
    return this.currentWetDry;
  }
  
  isActive(): boolean {
    return this.isConnected && this.currentPreset !== null;
  }
}

interface Props {
  onClose: () => void;
}

export function ConcertMode({ onClose }: Props) {
  const { audioRef, currentTrack } = usePlayer();
  const [isActive, setIsActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<VenuePreset | null>(null);
  const [crowdLevel, setCrowdLevel] = useState(0);
  const [wetDryMix, setWetDryMix] = useState(0.4);
  const [isConnecting, setIsConnecting] = useState(false);
  const engineRef = useRef<ConcertModeEngine>(ConcertModeEngine.getInstance());
  const initializedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const settings = loadSettings();
    console.log('[ConcertMode] Loading saved settings:', settings);
    
    const preset = VENUE_PRESETS.find(p => p.id === settings.venue) || VENUE_PRESETS[1];
    setSelectedPreset(preset);
    setWetDryMix(settings.wetDry);
    setCrowdLevel(settings.crowdAmbience);
    
    // If was enabled, restore
    if (settings.enabled && audioRef.current) {
      restoreSettings(settings, preset);
    }
  }, []);
  
  const restoreSettings = async (settings: StoredSettings, preset: VenuePreset) => {
    if (!audioRef.current) return;
    
    const engine = engineRef.current;
    const connected = await engine.connect(audioRef.current);
    if (connected) {
      await engine.setPreset(preset, settings.wetDry);
      await engine.setCrowdLevel(settings.crowdAmbience);
      setIsActive(true);
    }
  };

  // Save settings on change
  useEffect(() => {
    if (!initializedRef.current) return;
    
    saveSettings({
      enabled: isActive,
      venue: selectedPreset?.id || 'hall',
      wetDry: wetDryMix,
      crowdAmbience: crowdLevel
    });
  }, [isActive, selectedPreset, wetDryMix, crowdLevel]);

  const toggleActive = useCallback(async () => {
    console.log('[ConcertMode] Toggle clicked. isActive:', isActive, 'audioRef:', audioRef.current);
    
    if (isConnecting) {
      console.log('[ConcertMode] Already connecting, ignoring');
      return;
    }
    
    const engine = engineRef.current;
    
    if (!isActive) {
      // Enable concert mode
      if (!audioRef.current) {
        console.error('[ConcertMode] No audio element available');
        alert('Please play a track first before enabling Concert Mode');
        return;
      }
      
      setIsConnecting(true);
      console.log('[ConcertMode] Enabling concert mode...');
      
      try {
        const connected = await engine.connect(audioRef.current);
        console.log('[ConcertMode] Connection result:', connected);
        
        if (connected) {
          // Use selected preset or default to hall
          const presetToUse = selectedPreset || VENUE_PRESETS[1];
          if (!selectedPreset) {
            setSelectedPreset(presetToUse);
          }
          
          await engine.setPreset(presetToUse, wetDryMix);
          await engine.setCrowdLevel(crowdLevel);
          setIsActive(true);
          console.log('[ConcertMode] Successfully enabled with preset:', presetToUse.name);
        } else {
          console.error('[ConcertMode] Failed to connect audio engine');
        }
      } catch (err) {
        console.error('[ConcertMode] Error enabling:', err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      // Disable concert mode
      console.log('[ConcertMode] Disabling concert mode...');
      try {
        await engine.setPreset(null);
        await engine.setCrowdLevel(0);
        setIsActive(false);
        console.log('[ConcertMode] Successfully disabled');
      } catch (err) {
        console.error('[ConcertMode] Error disabling:', err);
      }
    }
  }, [isActive, isConnecting, audioRef, selectedPreset, wetDryMix, crowdLevel]);

  const selectPreset = useCallback(async (preset: VenuePreset) => {
    setSelectedPreset(preset);
    setWetDryMix(preset.wetDry);
    if (isActive) {
      await engineRef.current.setPreset(preset, preset.wetDry);
    }
  }, [isActive]);

  const handleWetDryChange = useCallback(async (val: number) => {
    setWetDryMix(val);
    if (isActive) {
      await engineRef.current.setWetDry(val);
    }
  }, [isActive]);

  const handleCrowdChange = useCallback(async (val: number) => {
    setCrowdLevel(val);
    if (isActive) {
      await engineRef.current.setCrowdLevel(val);
    }
  }, [isActive]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-lg border border-neutral-800">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            <h2 className="text-white font-semibold">Concert Mode</h2>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">
                {isActive ? 'Concert mode active' : 'Simulate live venue acoustics'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Adds spatial reverb and ambience
              </p>
            </div>
            <button
              onClick={toggleActive}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-black'
                  : 'bg-neutral-700 text-white hover:bg-neutral-600'
              }`}
            >
              {isConnecting ? 'Connecting...' : isActive ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Venue Presets */}
          <div className="space-y-3">
            <label className="text-sm text-neutral-400">Venue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {VENUE_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    className={`p-3 rounded-lg text-left transition-all border-2 ${
                      isSelected
                        ? 'bg-neutral-700'
                        : 'bg-neutral-800/50 hover:bg-neutral-800 border-transparent'
                    }`}
                    style={{ borderColor: isSelected ? preset.color : 'transparent' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: preset.color }} />
                      <span className="text-sm font-medium text-white">{preset.name}</span>
                    </div>
                    <p className="text-xs text-neutral-400">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reverb Mix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-300">Reverb Mix</span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">{Math.round(wetDryMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={wetDryMix * 100}
              onChange={(e) => handleWetDryChange(parseInt(e.target.value) / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Dry</span>
              <span>Wet</span>
            </div>
          </div>

          {/* Crowd Ambience */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-300">Crowd Ambience</span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">{Math.round(crowdLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={crowdLevel * 100}
              onChange={(e) => handleCrowdChange(parseInt(e.target.value) / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>None</span>
              <span>Full</span>
            </div>
          </div>

          {/* Visual indicator */}
          {isActive && selectedPreset && (
            <div 
              className="h-20 rounded-lg flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: selectedPreset.color + '20' }}
            >
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  background: `radial-gradient(circle at center, ${selectedPreset.color}40, transparent)`,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <div className="flex items-center gap-3 z-10">
                {React.createElement(selectedPreset.icon, { 
                  className: 'w-8 h-8',
                  style: { color: selectedPreset.color }
                })}
                <div>
                  <p className="text-white font-medium">{selectedPreset.name}</p>
                  <p className="text-xs text-neutral-400">Concert mode active</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConcertModeButton() {
  const [showModal, setShowModal] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Check if concert mode is active on mount
  useEffect(() => {
    const settings = loadSettings();
    setIsActive(settings.enabled);
    
    // Listen for storage changes
    const handleStorage = () => {
      const s = loadSettings();
      setIsActive(s.enabled);
    };
    window.addEventListener('storage', handleStorage);
    
    // Poll for local changes
    const interval = setInterval(() => {
      const s = loadSettings();
      setIsActive(s.enabled);
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`p-2 transition-colors ${isActive ? 'text-primary-500' : 'text-neutral-400 hover:text-white'}`}
        title="Concert Mode"
      >
        <Building2 className="w-4 h-4" />
      </button>
      {showModal && <ConcertMode onClose={() => setShowModal(false)} />}
    </>
  );
}
