import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { PlayerBar } from '@/components/PlayerBar';
import { QueuePanel } from '@/components/QueuePanel';
import { usePlayer } from '@/context/PlayerContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentTrack, isQueueOpen } = usePlayer();

  return (
    <div className="h-screen bg-neutral-950 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-y-auto relative">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-30 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-neutral-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-white">Feishin Web</span>
          </div>
          
          <Outlet />
        </main>
        
        {currentTrack && isQueueOpen && <QueuePanel />}
      </div>
      <PlayerBar />
    </div>
  );
}
