import { useState, useEffect } from 'react';
import { X, Headphones, Volume2, Disc, Zap } from 'lucide-react';
import { audioEngine, loadAudioSettings, saveAudioSettings, type AudioSettings as AudioSettingsType } from '@/lib/audioEngine';

export function AudioSettings({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AudioSettingsType>(loadAudioSettings);

  useEffect(() => {
    saveAudioSettings(settings);
    audioEngine.applySettings(settings);
  }, [settings]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-md border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-white font-semibold">Audio Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Crossfeed Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-300">
              <Headphones className="w-4 h-4" />
              <span className="font-medium">Crossfeed (Headphones)</span>
            </div>
            <p className="text-xs text-neutral-500">
              Reduces stereo separation for a more natural sound on headphones.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Enable Crossfeed</span>
              <button
                onClick={() => setSettings({ ...settings, crossfeedEnabled: !settings.crossfeedEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.crossfeedEnabled ? 'bg-player-accent' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.crossfeedEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {settings.crossfeedEnabled && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Amount: {settings.crossfeedAmount}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.crossfeedAmount}
                  onChange={(e) => setSettings({ ...settings, crossfeedAmount: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Stereo</span>
                  <span>Mono</span>
                </div>
              </div>
            )}
          </div>

          {/* Volume Normalization */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-300">
              <Volume2 className="w-4 h-4" />
              <span className="font-medium">Volume Normalization</span>
            </div>
            <p className="text-xs text-neutral-500">
              Automatically adjusts volume to consistent level (-14 LUFS like Spotify).
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Enable Normalization</span>
              <button
                onClick={() => setSettings({ ...settings, normalizationEnabled: !settings.normalizationEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.normalizationEnabled ? 'bg-player-accent' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.normalizationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {settings.normalizationEnabled && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Target: {settings.normalizationTarget} LUFS
                </label>
                <input
                  type="range"
                  min="-23"
                  max="-5"
                  value={settings.normalizationTarget}
                  onChange={(e) => setSettings({ ...settings, normalizationTarget: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Quieter</span>
                  <span>Louder</span>
                </div>
              </div>
            )}
          </div>

          {/* Gapless Playback */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-300">
              <Disc className="w-4 h-4" />
              <span className="font-medium">Playback</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-neutral-400">Gapless Playback</span>
                <p className="text-xs text-neutral-500">Seamless transitions between tracks</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, gaplessEnabled: !settings.gaplessEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.gaplessEnabled ? 'bg-player-accent' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.gaplessEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Smart Queue */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-300">
              <Zap className="w-4 h-4" />
              <span className="font-medium">Smart Queue</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-neutral-400">Don't Repeat Artists</span>
                <p className="text-xs text-neutral-500">Avoid playing same artist back-to-back</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, noRepeatArtist: !settings.noRepeatArtist })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.noRepeatArtist ? 'bg-player-accent' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.noRepeatArtist ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
