import { useState, useEffect } from 'react';
import { Radio, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface ScrobblingConfig {
  lastfmEnabled: boolean;
  lastfmSessionKey: string;
  listenbrainzEnabled: boolean;
  listenbrainzToken: string;
}

const SCROBBLING_KEY = 'scrobbling_config';

function loadScrobblingConfig(): ScrobblingConfig {
  try {
    const stored = localStorage.getItem(SCROBBLING_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    lastfmEnabled: false,
    lastfmSessionKey: '',
    listenbrainzEnabled: false,
    listenbrainzToken: '',
  };
}

function saveScrobblingConfig(config: ScrobblingConfig) {
  localStorage.setItem(SCROBBLING_KEY, JSON.stringify(config));
}

export function useScrobbling() {
  const [config, setConfig] = useState<ScrobblingConfig>(loadScrobblingConfig);

  useEffect(() => {
    saveScrobblingConfig(config);
  }, [config]);

  const scrobble = async (track: { name: string; artist: string; album: string; duration: number }) => {
    const timestamp = Math.floor(Date.now() / 1000);

    // ListenBrainz
    if (config.listenbrainzEnabled && config.listenbrainzToken) {
      try {
        await fetch('https://api.listenbrainz.org/1/submit-listens', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${config.listenbrainzToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            listen_type: 'single',
            payload: [{
              listened_at: timestamp,
              track_metadata: {
                artist_name: track.artist,
                track_name: track.name,
                release_name: track.album,
              },
            }],
          }),
        });
      } catch (err) {
        console.error('ListenBrainz scrobble failed:', err);
      }
    }

    // Last.fm would require API key and signature - simplified version
    if (config.lastfmEnabled && config.lastfmSessionKey) {
      console.log('Last.fm scrobble would be sent here');
    }
  };

  return { config, setConfig, scrobble };
}

interface Props {
  config: ScrobblingConfig;
  onChange: (config: ScrobblingConfig) => void;
}

export function ScrobblingSettings({ config, onChange }: Props) {
  const [listenbrainzToken, setListenbrainzToken] = useState(config.listenbrainzToken);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSaveListenBrainz = () => {
    onChange({
      ...config,
      listenbrainzEnabled: !!listenbrainzToken,
      listenbrainzToken,
    });
  };

  const testListenBrainz = async () => {
    if (!listenbrainzToken) return;
    
    setTestStatus('testing');
    try {
      const res = await fetch('https://api.listenbrainz.org/1/validate-token', {
        headers: {
          'Authorization': `Token ${listenbrainzToken}`,
        },
      });
      const data = await res.json();
      setTestStatus(data.valid ? 'success' : 'error');
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-player-accent" />
        <h3 className="text-lg font-semibold text-white">Scrobbling</h3>
      </div>

      {/* ListenBrainz */}
      <div className="bg-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">ListenBrainz</span>
            <a
              href="https://listenbrainz.org/settings/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {config.listenbrainzEnabled && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" /> Connected
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">User Token</label>
            <input
              type="password"
              value={listenbrainzToken}
              onChange={(e) => setListenbrainzToken(e.target.value)}
              placeholder="Enter your ListenBrainz token"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-player-accent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveListenBrainz}
              className="px-4 py-2 bg-player-accent text-black font-medium rounded-lg hover:bg-player-accent/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={testListenBrainz}
              disabled={!listenbrainzToken}
              className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {testStatus === 'success' && (
            <p className="text-sm text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Token is valid
            </p>
          )}
          {testStatus === 'error' && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Invalid token
            </p>
          )}
        </div>
      </div>

      {/* Last.fm - placeholder */}
      <div className="bg-neutral-800 rounded-lg p-4 opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Last.fm</span>
          <span className="text-xs text-neutral-400">Coming soon</span>
        </div>
        <p className="text-sm text-neutral-500 mt-2">
          Last.fm integration requires API key configuration.
        </p>
      </div>

      <p className="text-sm text-neutral-500">
        Tracks are scrobbled after playing for 50% of duration or 4 minutes, whichever comes first.
      </p>
    </div>
  );
}
