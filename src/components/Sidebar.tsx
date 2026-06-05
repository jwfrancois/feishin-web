import { NavLink } from 'react-router-dom';
import {
  Home,
  Disc3,
  Users,
  Music,
  ListMusic,
  Library,
  Settings,
  LogOut,
  X,
  BarChart3,
  Mic2,
  Headphones,
  BookOpen,
  Radio,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';
import { NowPlayingIndicator } from './NowPlayingIndicator';
import { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badgeColor?: string;
}

function SidebarClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const update = () => setTime(new Date());
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="px-3 py-2 flex items-center justify-between text-neutral-500">
      <span className="text-xs font-mono tabular-nums">{timeStr}</span>
      <span className="text-[10px]">{dateStr}</span>
    </div>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = false, children, badgeColor }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-neutral-300 hover:text-white transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {badgeColor && <span className={`ml-auto w-2 h-2 rounded-full ${badgeColor}`} />}
      </button>
      {isOpen && <div className="ml-4 space-y-0.5">{children}</div>}
    </div>
  );
}

function NavItem({ to, icon: Icon, label, onClick }: { to: string; icon: typeof Home; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-500/10 text-primary-500'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}

export function Sidebar({ isOpen, onClose }: Props) {
  const { logout, config } = useAuth();
  const { currentTrack, isPlaying } = usePlayer();

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-neutral-900 border-r border-neutral-800 flex flex-col transform transition-transform duration-200 ease-out lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc3 className="w-6 h-6 text-primary-500" />
            Feishin Web
          </h1>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Home */}
          <NavItem to="/home" icon={Home} label="Home" onClick={handleNavClick} />

          {/* Libraries/Folders */}
          <CollapsibleSection
            title="Libraries"
            icon={<FolderOpen className="w-4 h-4 text-blue-400" />}
            defaultOpen={false}
            badgeColor="bg-blue-400"
          >
            <NavItem to="/folders" icon={Library} label="All Libraries" onClick={handleNavClick} />
          </CollapsibleSection>

          {/* Music Section */}
          <CollapsibleSection
            title="Music"
            icon={<Music className="w-4 h-4 text-emerald-400" />}
            defaultOpen={true}
            badgeColor="bg-emerald-400"
          >
            <NavItem to="/albums" icon={Disc3} label="Albums" onClick={handleNavClick} />
            <NavItem to="/artists" icon={Users} label="Artists" onClick={handleNavClick} />
            <NavItem to="/songs" icon={Music} label="Songs" onClick={handleNavClick} />
            <NavItem to="/genres" icon={Library} label="Genres" onClick={handleNavClick} />
          </CollapsibleSection>

          {/* Podcasts Section */}
          <CollapsibleSection
            title="Podcasts"
            icon={<Mic2 className="w-4 h-4 text-purple-400" />}
            badgeColor="bg-purple-400"
          >
            <NavItem to="/podcasts" icon={Radio} label="Shows" onClick={handleNavClick} />
          </CollapsibleSection>

          {/* Audiobooks Section */}
          <CollapsibleSection
            title="Audiobooks"
            icon={<BookOpen className="w-4 h-4 text-amber-400" />}
            badgeColor="bg-amber-400"
          >
            <NavItem to="/audiobooks" icon={Headphones} label="Books" onClick={handleNavClick} />
          </CollapsibleSection>

          {/* Playlists & Stats */}
          <div className="pt-2 border-t border-neutral-800 mt-2">
            <NavItem to="/playlists" icon={ListMusic} label="Playlists" onClick={handleNavClick} />
            <NavItem to="/stats" icon={BarChart3} label="Stats" onClick={handleNavClick} />
          </div>
        </nav>

        {/* Now Playing Album Art with Ken Burns effect */}
        {currentTrack && (
          <div className="p-3 border-t border-neutral-800">
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 300)}
                alt={currentTrack.Album || ''}
                className="w-full aspect-square object-cover rounded-lg shadow-lg transition-transform duration-[10000ms] ease-in-out hover:scale-110"
                style={{
                  animation: isPlaying ? 'kenburns 20s ease-in-out infinite' : 'none',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>';
                }}
              />
            </div>
          </div>
        )}

        {/* Now Playing Activity */}
        {currentTrack && (
          <div className="px-3 py-2 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <NowPlayingIndicator size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{currentTrack.Name}</div>
                <div className="text-xs text-neutral-500 truncate">{currentTrack.Artists?.join(', ')}</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-neutral-800 space-y-1">
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>

          {config && (
            <div className="px-3 py-2 text-xs text-neutral-500 truncate">
              {config.username}@{new URL(config.url).hostname}
            </div>
          )}
          <SidebarClock />
        </div>
      </aside>

    </>
  );
}
