import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Save, Plus, Trash2 } from 'lucide-react';
import { 
  audioEngine, 
  EQ_PRESETS, 
  loadAudioSettings, 
  saveAudioSettings,
  loadCustomPresets,
  saveCustomPresets,
  type EQBand, 
  type FilterType,
  type AudioSettings 
} from '@/lib/audioEngine';

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'lowshelf', label: 'Low Shelf' },
  { value: 'peaking', label: 'Peak' },
  { value: 'highshelf', label: 'High Shelf' },
  { value: 'lowpass', label: 'Low Pass' },
  { value: 'highpass', label: 'High Pass' },
];

function FrequencyResponseCanvas({ bands, enabled }: { bands: EQBand[]; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Frequency lines (log scale)
    const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqs.forEach(freq => {
      const x = Math.log10(freq / 20) / Math.log10(20000 / 20) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    
    // dB lines
    [-12, -6, 0, 6, 12].forEach(db => {
      const y = height / 2 - (db / 12) * (height / 2 - 10);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });
    
    // Zero line
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    if (!enabled) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('EQ Disabled', width / 2, height / 2);
      return;
    }
    
    // Calculate frequency response
    const numPoints = width;
    const frequencies = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      frequencies[i] = 20 * Math.pow(20000 / 20, i / (numPoints - 1));
    }
    
    // Simple response calculation (approximation)
    const response = new Float32Array(numPoints).fill(0);
    
    bands.forEach(band => {
      if (!band.enabled) return;
      
      for (let i = 0; i < numPoints; i++) {
        const freq = frequencies[i];
        const ratio = freq / band.frequency;
        
        let gain = 0;
        switch (band.type) {
          case 'peaking': {
            const bandwidth = 1 / band.q;
            const factor = 1 / (1 + Math.pow((Math.log2(ratio) / bandwidth), 2));
            gain = band.gain * factor;
            break;
          }
          case 'lowshelf': {
            const transition = 1 / (1 + Math.pow(ratio, 2 * band.q));
            gain = band.gain * transition;
            break;
          }
          case 'highshelf': {
            const transition = 1 / (1 + Math.pow(1 / ratio, 2 * band.q));
            gain = band.gain * transition;
            break;
          }
          case 'lowpass': {
            if (freq > band.frequency) gain = -12 * Math.log2(ratio);
            break;
          }
          case 'highpass': {
            if (freq < band.frequency) gain = -12 * Math.log2(1 / ratio);
            break;
          }
        }
        response[i] += gain;
      }
    });
    
    // Draw response curve
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < numPoints; i++) {
      const x = i;
      const db = Math.max(-12, Math.min(12, response[i]));
      const y = height / 2 - (db / 12) * (height / 2 - 10);
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw band markers
    bands.forEach((band, idx) => {
      if (!band.enabled) return;
      const x = Math.log10(band.frequency / 20) / Math.log10(20000 / 20) * width;
      const db = Math.max(-12, Math.min(12, band.gain));
      const y = height / 2 - (db / 12) * (height / 2 - 10);
      
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText((idx + 1).toString(), x, y + 3);
    });
    
  }, [bands, enabled]);

  return (
    <canvas 
      ref={canvasRef} 
      width={500} 
      height={150} 
      className="w-full h-[150px] rounded-lg"
    />
  );
}

export function ParametricEQ({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [customPresets, setCustomPresets] = useState(loadCustomPresets);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [selectedBand, setSelectedBand] = useState(0);

  useEffect(() => {
    saveAudioSettings(settings);
    audioEngine.applySettings(settings);
  }, [settings]);

  const allPresets = { ...EQ_PRESETS, ...customPresets };

  const handleBandChange = (index: number, field: keyof EQBand, value: number | boolean | FilterType) => {
    const newBands = [...settings.eqBands];
    newBands[index] = { ...newBands[index], [field]: value };
    setSettings({ ...settings, eqBands: newBands, eqPreset: 'Custom' });
  };

  const handlePresetChange = (presetName: string) => {
    const bands = allPresets[presetName];
    if (bands) {
      setSettings({ ...settings, eqBands: [...bands], eqPreset: presetName });
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPresets = { ...customPresets, [newPresetName]: [...settings.eqBands] };
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    setSettings({ ...settings, eqPreset: newPresetName });
    setNewPresetName('');
    setShowSavePreset(false);
  };

  const handleDeletePreset = (name: string) => {
    const newPresets = { ...customPresets };
    delete newPresets[name];
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
  };

  const handleReset = () => {
    setSettings({
      ...settings,
      eqBands: EQ_PRESETS.Flat.map(b => ({ ...b })),
      eqPreset: 'Flat',
    });
  };

  const addBand = () => {
    if (settings.eqBands.length >= 10) return;
    const newBands = [...settings.eqBands, {
      frequency: 1000,
      gain: 0,
      q: 1.0,
      type: 'peaking' as FilterType,
      enabled: true,
    }];
    setSettings({ ...settings, eqBands: newBands, eqPreset: 'Custom' });
  };

  const removeBand = (index: number) => {
    if (settings.eqBands.length <= 1) return;
    const newBands = settings.eqBands.filter((_, i) => i !== index);
    setSettings({ ...settings, eqBands: newBands, eqPreset: 'Custom' });
    if (selectedBand >= newBands.length) setSelectedBand(newBands.length - 1);
  };

  const currentBand = settings.eqBands[selectedBand];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-3xl border border-neutral-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <h2 className="text-white font-semibold">Parametric Equalizer</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavePreset(true)}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Save preset"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Reset"
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
              onClick={() => setSettings({ ...settings, eqEnabled: !settings.eqEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.eqEnabled ? 'bg-player-accent' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.eqEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Frequency Response Graph */}
          <FrequencyResponseCanvas bands={settings.eqBands} enabled={settings.eqEnabled} />

          {/* Presets */}
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Presets</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(allPresets).map((name) => (
                <div key={name} className="relative group">
                  <button
                    onClick={() => handlePresetChange(name)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      settings.eqPreset === name
                        ? 'bg-player-accent text-black font-medium'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {name}
                  </button>
                  {customPresets[name] && (
                    <button
                      onClick={() => handleDeletePreset(name)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 hidden group-hover:flex"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Band Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-neutral-400">Bands</label>
              {settings.eqBands.length < 10 && (
                <button
                  onClick={addBand}
                  className="text-xs text-player-accent hover:text-player-accent/80 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Band
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {settings.eqBands.map((band, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedBand(i)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedBand === i
                      ? 'bg-player-accent text-black font-medium'
                      : band.enabled
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-neutral-800/50 text-neutral-500'
                  }`}
                >
                  {i + 1}: {band.frequency >= 1000 ? `${(band.frequency/1000).toFixed(1)}k` : band.frequency}Hz
                </button>
              ))}
            </div>
          </div>

          {/* Band Controls */}
          {currentBand && (
            <div className="bg-neutral-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Band {selectedBand + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBandChange(selectedBand, 'enabled', !currentBand.enabled)}
                    className={`px-3 py-1 rounded text-xs ${
                      currentBand.enabled ? 'bg-player-accent text-black' : 'bg-neutral-700 text-neutral-400'
                    }`}
                  >
                    {currentBand.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  {settings.eqBands.length > 1 && (
                    <button
                      onClick={() => removeBand(selectedBand)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Frequency */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Frequency: {currentBand.frequency >= 1000 ? `${(currentBand.frequency/1000).toFixed(1)}kHz` : `${currentBand.frequency}Hz`}
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="20000"
                    value={currentBand.frequency}
                    onChange={(e) => handleBandChange(selectedBand, 'frequency', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!settings.eqEnabled}
                  />
                </div>

                {/* Gain */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Gain: {currentBand.gain > 0 ? '+' : ''}{currentBand.gain.toFixed(1)}dB
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.1"
                    value={currentBand.gain}
                    onChange={(e) => handleBandChange(selectedBand, 'gain', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!settings.eqEnabled}
                  />
                </div>

                {/* Q Factor */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Q Factor: {currentBand.q.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={currentBand.q}
                    onChange={(e) => handleBandChange(selectedBand, 'q', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!settings.eqEnabled}
                  />
                </div>

                {/* Filter Type */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Type</label>
                  <select
                    value={currentBand.type}
                    onChange={(e) => handleBandChange(selectedBand, 'type', e.target.value as FilterType)}
                    className="w-full bg-neutral-700 text-white rounded px-2 py-1 text-sm"
                    disabled={!settings.eqEnabled}
                  >
                    {FILTER_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Preset Modal */}
        {showSavePreset && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-lg p-4 w-full max-w-xs">
              <h3 className="text-white font-medium mb-3">Save Custom Preset</h3>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name"
                className="w-full bg-neutral-700 text-white rounded px-3 py-2 mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSavePreset(false)}
                  className="flex-1 px-3 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  className="flex-1 px-3 py-2 bg-player-accent text-black rounded font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
