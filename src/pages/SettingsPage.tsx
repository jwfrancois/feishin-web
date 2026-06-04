import { useState } from 'react';
import { Server, User, LogOut, Check, AlertCircle, Keyboard, Waves, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { CrossfadeSlider, useCrossfade } from '@/components/CrossfadeSettings';
import { ScrobblingSettings, useScrobbling } from '@/components/ScrobblingSettings';
import { SmartPlaylistModal } from '@/components/SmartPlaylistModal';

export function SettingsPage() {
  const { config, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSmartPlaylist, setShowSmartPlaylist] = useState(false);

  const { duration: crossfadeDuration, setDuration: setCrossfadeDuration } = useCrossfade();
  const { config: scrobblingConfig, setConfig: setScrobblingConfig } = useScrobbling();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      {/* Server Connection */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-primary-500" />
          Server Connection
        </h2>

        {config ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-player-accent">
              <Check className="w-4 h-4" />
              <span className="text-sm">Connected</span>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Server URL</label>
                <div className="px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white">
                  {config.url}
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">Username</label>
                <div className="px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-400" />
                  {config.username}
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">Server ID</label>
                <div className="px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 font-mono text-sm">
                  {config.serverId}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>Not connected</span>
          </div>
        )}
      </section>

      {/* Playback Settings */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Waves className="w-5 h-5 text-primary-500" />
          Playback
        </h2>

        <div className="space-y-6">
          <CrossfadeSlider 
            value={crossfadeDuration} 
            onChange={setCrossfadeDuration} 
          />

          <div className="border-t border-neutral-800 pt-4">
            <p className="text-sm text-neutral-400">
              Crossfade smoothly transitions between tracks by fading out the current track 
              while fading in the next one.
            </p>
          </div>
        </div>
      </section>

      {/* Scrobbling */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <ScrobblingSettings 
          config={scrobblingConfig} 
          onChange={setScrobblingConfig} 
        />
      </section>

      {/* Smart Playlists */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary-500" />
          Smart Playlists
        </h2>

        <p className="text-neutral-400 text-sm mb-4">
          Generate playlists based on listening history and track metadata.
        </p>

        <button
          onClick={() => setShowSmartPlaylist(true)}
          className="px-4 py-2 bg-player-accent text-black font-medium rounded-lg hover:bg-player-accent/90 transition-colors"
        >
          Create Smart Playlist
        </button>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-primary-500" />
          Keyboard Shortcuts
        </h2>

        <p className="text-neutral-400 text-sm mb-4">
          Use keyboard shortcuts to control playback without leaving your current task.
        </p>

        <button
          onClick={() => setShowShortcuts(true)}
          className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
        >
          View All Shortcuts
        </button>
      </section>

      {/* Account Actions */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary-500" />
          Account
        </h2>

        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect from Server
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-neutral-300">
              Are you sure you want to disconnect? You will need to log in again.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Disconnect
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* About */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-4">About</h2>
        <div className="text-neutral-400 space-y-1">
          <p>Feishin Web - A music player for Jellyfin</p>
          <p className="text-sm">Version 1.0.0</p>
          <p className="text-sm text-neutral-500 mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-xs font-mono">?</kbd> to view keyboard shortcuts
          </p>
        </div>
      </section>

      {/* Modals */}
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
      {showSmartPlaylist && (
        <SmartPlaylistModal onClose={() => setShowSmartPlaylist(false)} />
      )}
    </div>
  );
}
