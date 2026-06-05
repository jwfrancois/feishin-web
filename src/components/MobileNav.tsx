import { useState } from 'react';
import {
  Home,
  Disc3,
  Users,
  Music,
  ListMusic,
  Library,
  Settings,
  LogOut,
  BarChart3,
  Sparkles,
  FolderOpen,
  Map,
  Mic2,
  Headphones,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useIsMobile } from '@/hooks/use-window-size';
import { jellyfinApi } from '@/lib/jellyfin';
import { SmartPlaylistModal } from './SmartPlaylistModal';
import { ListeningRooms } from './ListeningRooms';

interface MobileNavProps {
  onNavigate?: () => void;
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const { logout, config } = useAuth();
  const { currentTrack, isPlaying, toggle } = usePlayer();
  const isMobile = useIsMobile();
  const [showMore, setShowMore] = useState(false);
  const [showSmartPlaylist, setShowSmartPlaylist] = useState(false);
  const [showRooms, setShowRooms] = useState(false);

  // Only show on mobile screens
  if (!isMobile) {
    return null;
  }

  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/albums', icon: Disc3, label: 'Albums' },
    { to: '/artists', icon: Users, label: 'Artists' },
    { to: '/songs', icon: Music, label: 'Songs' },
    { to: '/playlists', icon: ListMusic, label: 'Playlists' },
  ];

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
    setShowMore(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900 border-t border-neutral-800 safe-area-pb">
        {/* Minimal now playing preview */}
        {currentTrack && (
          <div className="absolute bottom-16 left-0 right-0 px-3 py-1.5 bg-gradient-to-r from-primary-500/20 to-transparent flex items-center gap-2">
            <img
              src={jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 40)}
              alt=""
              className="w-8 h-8 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white truncate">{currentTrack.Name}</div>
              <div className="text-[10px] text-neutral-400 truncate">{currentTrack.Artists?.join(', ')}</div>
            </div>
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center bg-primary-500 rounded-full touch-target"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-black" />
              ) : (
                <Play className="w-4 h-4 text-black ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Main navigation */}
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors touch-target ${
                  isActive
                    ? 'text-primary-500'
                    : 'text-neutral-400 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors touch-target ${
              showMore ? 'text-primary-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {showMore ? (
              <X className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Expanded more menu */}
      {showMore && (
        <div className="fixed inset-0 z-50" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl animate-slide-up">
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">More Options</h3>
                <button onClick={() => setShowMore(false)} className="p-2 text-neutral-400 touch-target">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick nav grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <NavLink
                  to="/genres"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Library className="w-6 h-6" />
                  <span className="text-xs">Genres</span>
                </NavLink>
                <NavLink
                  to="/folders"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <FolderOpen className="w-6 h-6" />
                  <span className="text-xs">Folders</span>
                </NavLink>
                <NavLink
                  to="/stats"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-xs">Stats</span>
                </NavLink>
                <NavLink
                  to="/map"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Map className="w-6 h-6" />
                  <span className="text-xs">Map</span>
                </NavLink>
                <NavLink
                  to="/podcasts"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Mic2 className="w-6 h-6" />
                  <span className="text-xs">Podcasts</span>
                </NavLink>
                <NavLink
                  to="/audiobooks"
                  onClick={handleNavClick}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Headphones className="w-6 h-6" />
                  <span className="text-xs">Books</span>
                </NavLink>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowMore(false);
                    setShowSmartPlaylist(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Smart Playlists</span>
                </button>
                <button
                  onClick={() => {
                    setShowMore(false);
                    setShowRooms(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Users className="w-5 h-5" />
                  <span>Listening Rooms</span>
                </button>
                <NavLink
                  to="/settings"
                  onClick={handleNavClick}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </NavLink>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white touch-target"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Server info */}
              {config && (
                <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-500">
                  {config.username}@{new URL(config.url).hostname}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showSmartPlaylist && (
        <SmartPlaylistModal onClose={() => setShowSmartPlaylist(false)} />
      )}
      {showRooms && <ListeningRooms onClose={() => setShowRooms(false)} />}
    </>
  );
}