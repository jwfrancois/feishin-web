// Advanced Audio Processing Engine
// Handles: Parametric EQ, Crossfeed, Normalization, Waveform Analysis

export type FilterType = 'peaking' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass';

export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: FilterType;
  enabled: boolean;
}

export interface AudioSettings {
  eqEnabled: boolean;
  eqBands: EQBand[];
  eqPreset: string;
  crossfeedEnabled: boolean;
  crossfeedAmount: number; // 0-100
  normalizationEnabled: boolean;
  normalizationTarget: number; // LUFS, typically -14
  gaplessEnabled: boolean;
  noRepeatArtist: boolean;
}

const AUDIO_SETTINGS_KEY = 'audio_settings';
const CUSTOM_PRESETS_KEY = 'eq_custom_presets';

// Default 5-band parametric EQ
const DEFAULT_BANDS: EQBand[] = [
  { frequency: 60, gain: 0, q: 1.0, type: 'lowshelf', enabled: true },
  { frequency: 250, gain: 0, q: 1.0, type: 'peaking', enabled: true },
  { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
  { frequency: 4000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
  { frequency: 12000, gain: 0, q: 1.0, type: 'highshelf', enabled: true },
];

export const EQ_PRESETS: Record<string, EQBand[]> = {
  'Flat': DEFAULT_BANDS.map(b => ({ ...b, gain: 0 })),
  'Bass Boost': [
    { frequency: 60, gain: 6, q: 0.8, type: 'lowshelf', enabled: true },
    { frequency: 150, gain: 4, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 4000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 12000, gain: 0, q: 1.0, type: 'highshelf', enabled: true },
  ],
  'Treble Boost': [
    { frequency: 60, gain: 0, q: 1.0, type: 'lowshelf', enabled: true },
    { frequency: 250, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 4000, gain: 3, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 12000, gain: 6, q: 0.8, type: 'highshelf', enabled: true },
  ],
  'Vocal Presence': [
    { frequency: 60, gain: -2, q: 1.0, type: 'lowshelf', enabled: true },
    { frequency: 250, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 2500, gain: 4, q: 1.5, type: 'peaking', enabled: true },
    { frequency: 5000, gain: 2, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 12000, gain: 1, q: 1.0, type: 'highshelf', enabled: true },
  ],
  'Loudness': [
    { frequency: 60, gain: 5, q: 0.7, type: 'lowshelf', enabled: true },
    { frequency: 250, gain: 2, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 4000, gain: 2, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 12000, gain: 4, q: 0.7, type: 'highshelf', enabled: true },
  ],
  'Electronic': [
    { frequency: 50, gain: 5, q: 0.8, type: 'lowshelf', enabled: true },
    { frequency: 200, gain: -2, q: 1.5, type: 'peaking', enabled: true },
    { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 3500, gain: 3, q: 1.2, type: 'peaking', enabled: true },
    { frequency: 10000, gain: 4, q: 0.8, type: 'highshelf', enabled: true },
  ],
  'Acoustic': [
    { frequency: 80, gain: 2, q: 1.0, type: 'lowshelf', enabled: true },
    { frequency: 300, gain: 1, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 1200, gain: 2, q: 1.2, type: 'peaking', enabled: true },
    { frequency: 3000, gain: 3, q: 1.0, type: 'peaking', enabled: true },
    { frequency: 8000, gain: 2, q: 1.0, type: 'highshelf', enabled: true },
  ],
};

export function loadAudioSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    eqEnabled: true,
    eqBands: [...DEFAULT_BANDS],
    eqPreset: 'Flat',
    crossfeedEnabled: false,
    crossfeedAmount: 30,
    normalizationEnabled: false,
    normalizationTarget: -14,
    gaplessEnabled: true,
    noRepeatArtist: false,
  };
}

export function saveAudioSettings(settings: AudioSettings) {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadCustomPresets(): Record<string, EQBand[]> {
  try {
    const stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export function saveCustomPresets(presets: Record<string, EQBand[]>) {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  } catch {}
}

// Audio Engine Class
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private crossfeedSplitter: ChannelSplitterNode | null = null;
  private crossfeedMerger: ChannelMergerNode | null = null;
  private crossfeedDelayL: DelayNode | null = null;
  private crossfeedDelayR: DelayNode | null = null;
  private crossfeedGainL: GainNode | null = null;
  private crossfeedGainR: GainNode | null = null;
  private crossfeedGainCrossL: GainNode | null = null;
  private crossfeedGainCrossR: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isConnected = false;
  private connectedElement: HTMLAudioElement | null = null;
  private settings: AudioSettings;

  constructor() {
    this.settings = loadAudioSettings();
  }

  connect(audioElement: HTMLAudioElement): boolean {
    if (this.isConnected && this.connectedElement === audioElement) {
      return true;
    }
    if (this.isConnected) {
      console.warn('[AudioEngine] Already connected to different element');
      return false;
    }

    try {
      console.log('[AudioEngine] Connecting...');
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.connectedElement = audioElement;

      // Create processing chain
      this.createEQFilters();
      this.createCrossfeed();
      this.createCompressor();
      this.createAnalyser();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;

      // Connect chain: source -> EQ -> crossfeed -> compressor -> analyser -> master -> destination
      this.connectChain();
      
      this.isConnected = true;
      this.applySettings(this.settings);
      console.log('[AudioEngine] Connected successfully');
      return true;
    } catch (err) {
      console.error('[AudioEngine] Connection failed:', err);
      // Fallback: direct connection
      if (this.sourceNode && this.audioContext) {
        try {
          this.sourceNode.connect(this.audioContext.destination);
        } catch {}
      }
      return false;
    }
  }

  private createEQFilters() {
    if (!this.audioContext) return;
    
    this.eqFilters = this.settings.eqBands.map(band => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.enabled ? band.gain : 0;
      filter.Q.value = band.q;
      return filter;
    });
  }

  private createCrossfeed() {
    if (!this.audioContext) return;

    this.crossfeedSplitter = this.audioContext.createChannelSplitter(2);
    this.crossfeedMerger = this.audioContext.createChannelMerger(2);
    
    // Delays for crossfeed (simulates head shadow)
    this.crossfeedDelayL = this.audioContext.createDelay(0.01);
    this.crossfeedDelayR = this.audioContext.createDelay(0.01);
    this.crossfeedDelayL.delayTime.value = 0.0003; // ~0.3ms
    this.crossfeedDelayR.delayTime.value = 0.0003;
    
    // Gains for direct signal
    this.crossfeedGainL = this.audioContext.createGain();
    this.crossfeedGainR = this.audioContext.createGain();
    
    // Gains for crossfeed signal
    this.crossfeedGainCrossL = this.audioContext.createGain();
    this.crossfeedGainCrossR = this.audioContext.createGain();
    
    this.updateCrossfeed(this.settings.crossfeedAmount);
  }

  private createCompressor() {
    if (!this.audioContext) return;
    
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
  }

  private createAnalyser() {
    if (!this.audioContext) return;
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
  }

  private connectChain() {
    if (!this.sourceNode || !this.audioContext) return;

    let currentNode: AudioNode = this.sourceNode;

    // EQ chain
    if (this.eqFilters.length > 0 && this.settings.eqEnabled) {
      currentNode.connect(this.eqFilters[0]);
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }
      currentNode = this.eqFilters[this.eqFilters.length - 1];
    }

    // Crossfeed
    if (this.settings.crossfeedEnabled && this.crossfeedSplitter && this.crossfeedMerger) {
      currentNode.connect(this.crossfeedSplitter);
      
      // Left channel: direct + delayed right
      this.crossfeedSplitter.connect(this.crossfeedGainL!, 0);
      this.crossfeedGainL!.connect(this.crossfeedMerger, 0, 0);
      
      this.crossfeedSplitter.connect(this.crossfeedDelayR!, 1);
      this.crossfeedDelayR!.connect(this.crossfeedGainCrossR!);
      this.crossfeedGainCrossR!.connect(this.crossfeedMerger, 0, 0);
      
      // Right channel: direct + delayed left
      this.crossfeedSplitter.connect(this.crossfeedGainR!, 1);
      this.crossfeedGainR!.connect(this.crossfeedMerger, 0, 1);
      
      this.crossfeedSplitter.connect(this.crossfeedDelayL!, 0);
      this.crossfeedDelayL!.connect(this.crossfeedGainCrossL!);
      this.crossfeedGainCrossL!.connect(this.crossfeedMerger, 0, 1);
      
      currentNode = this.crossfeedMerger;
    }

    // Compressor (normalization)
    if (this.settings.normalizationEnabled && this.compressor) {
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }

    // Analyser
    if (this.analyser) {
      currentNode.connect(this.analyser);
      currentNode = this.analyser;
    }

    // Master gain
    if (this.masterGain) {
      currentNode.connect(this.masterGain);
      currentNode = this.masterGain;
    }

    // Destination
    currentNode.connect(this.audioContext.destination);
  }

  private disconnectAll() {
    try {
      this.sourceNode?.disconnect();
      this.eqFilters.forEach(f => f.disconnect());
      this.crossfeedSplitter?.disconnect();
      this.crossfeedMerger?.disconnect();
      this.crossfeedDelayL?.disconnect();
      this.crossfeedDelayR?.disconnect();
      this.crossfeedGainL?.disconnect();
      this.crossfeedGainR?.disconnect();
      this.crossfeedGainCrossL?.disconnect();
      this.crossfeedGainCrossR?.disconnect();
      this.compressor?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
    } catch {}
  }

  updateCrossfeed(amount: number) {
    // Amount 0-100, 0 = full stereo, 100 = mono
    const crossGain = amount / 200; // 0 to 0.5
    const directGain = 1 - crossGain;
    
    this.crossfeedGainL?.gain.setValueAtTime(directGain, this.audioContext?.currentTime || 0);
    this.crossfeedGainR?.gain.setValueAtTime(directGain, this.audioContext?.currentTime || 0);
    this.crossfeedGainCrossL?.gain.setValueAtTime(crossGain, this.audioContext?.currentTime || 0);
    this.crossfeedGainCrossR?.gain.setValueAtTime(crossGain, this.audioContext?.currentTime || 0);
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    saveAudioSettings(settings);

    // Update EQ
    this.eqFilters.forEach((filter, i) => {
      const band = settings.eqBands[i];
      if (band) {
        filter.frequency.value = band.frequency;
        filter.gain.value = settings.eqEnabled && band.enabled ? band.gain : 0;
        filter.Q.value = band.q;
        filter.type = band.type;
      }
    });

    // Update crossfeed
    if (settings.crossfeedEnabled) {
      this.updateCrossfeed(settings.crossfeedAmount);
    }

    // Need to reconnect chain if crossfeed/normalization toggles changed
  }

  async resume(): Promise<boolean> {
    if (!this.audioContext) return true;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext.state === 'running';
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  isActive(): boolean {
    return this.isConnected;
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  // Get frequency response data for visualization
  getFrequencyResponse(frequencies: Float32Array): { magnitude: Float32Array; phase: Float32Array } {
    const magnitude = new Float32Array(frequencies.length);
    const phase = new Float32Array(frequencies.length);
    
    if (this.eqFilters.length > 0) {
      const tempMag = new Float32Array(frequencies.length);
      const tempPhase = new Float32Array(frequencies.length);
      
      magnitude.fill(1);
      phase.fill(0);
      
      this.eqFilters.forEach(filter => {
        filter.getFrequencyResponse(frequencies, tempMag, tempPhase);
        for (let i = 0; i < frequencies.length; i++) {
          magnitude[i] *= tempMag[i];
          phase[i] += tempPhase[i];
        }
      });
    }
    
    return { magnitude, phase };
  }
}

export const audioEngine = new AudioEngine();
