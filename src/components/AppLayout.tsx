import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, ListMusic, Home, Disc3, Library, Music } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { PlayerBar } from '@/components/PlayerBar';
import { QueuePanel } from '@/components/QueuePanel';
import { MobileNav } from '@/components/MobileNav';
import { usePlayer } from '@/context/PlayerContext';
import { useIsMobile, useBreakpoint } from '@/hooks/use-window-size';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const { currentTrack, isQueueOpen, toggleQueue } = usePlayer();
  const isMobile = useIsMobile();
  const breakpoint = useBreakpoint();

  const handleToggleQueue = () => {
    if (isMobile) {
      setMobileQueueOpen(!mobileQueueOpen);
    } else {
      toggleQueue();
    }
  };

  return (
    <div className="h-screen bg-neutral-950 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 animate-slide-in">
              <Sidebar isOpen={true} onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          {/* Mobile header */}
          {isMobile && (
            <div className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 px-3 py-2.5 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 text-neutral-400 hover:text-white touch-target"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-semibold text-white text-base">Feishin</span>
              
              {/* Mobile queue button */}
              {currentTrack && (
                <button
                  onClick={handleToggleQueue}
                  className={`ml-auto p-2 text-neutral-400 touch-target ${
                    mobileQueueOpen ? 'text-primary-500' : ''
                  }`}
                >
                  <ListMusic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 pb-safe">
            <Outlet />
          </div>

          {/* Mobile queue panel */}
          {(isMobile || breakpoint === 'tablet') && currentTrack && mobileQueueOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileQueueOpen(false)}
              />
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 rounded-t-2xl max-h-[70vh] overflow-hidden animate-slide-up">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Now Playing</h3>
                    <button
                      onClick={() => setMobileQueueOpen(false)}
                      className="p-2 text-neutral-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <QueuePanel />
                </div>
              </div>
            </>
          )}
        </main>

        {/* Desktop queue panel */}
        {!isMobile && currentTrack && isQueueOpen && <QueuePanel />}
      </div>

      {/* Mobile player bar at bottom */}
      {isMobile ? (
        <div className="pb-14">
          <PlayerBar />
        </div>
      ) : (
        <PlayerBar />
      )}

      {/* Mobile navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}