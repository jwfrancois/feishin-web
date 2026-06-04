import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Music, Mic2, BookOpen, Film, Tv, Image, ChevronRight, AlertCircle } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { useAuth } from '@/context/AuthContext';
import type { BaseItem } from '@/types/jellyfin';

function getLibraryIcon(collectionType?: string) {
  switch (collectionType) {
    case 'music': return <Music className="w-8 h-8" />;
    case 'podcasts': return <Mic2 className="w-8 h-8" />;
    case 'audiobooks': return <BookOpen className="w-8 h-8" />;
    case 'movies': return <Film className="w-8 h-8" />;
    case 'tvshows': return <Tv className="w-8 h-8" />;
    case 'photos': return <Image className="w-8 h-8" />;
    default: return <Folder className="w-8 h-8" />;
  }
}

function getLibraryColor(collectionType?: string) {
  switch (collectionType) {
    case 'music': return 'bg-emerald-500/20 text-emerald-400';
    case 'podcasts': return 'bg-purple-500/20 text-purple-400';
    case 'audiobooks': return 'bg-amber-500/20 text-amber-400';
    case 'movies': return 'bg-blue-500/20 text-blue-400';
    case 'tvshows': return 'bg-pink-500/20 text-pink-400';
    default: return 'bg-neutral-500/20 text-neutral-400';
  }
}

export function FoldersPage() {
  const navigate = useNavigate();
  const { config } = useAuth();
  const [libraries, setLibraries] = useState<BaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[FoldersPage] Component mounted');
    console.log('[FoldersPage] Auth config:', config);
    
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is authenticated
        if (!config?.userId) {
          console.error('[FoldersPage] No userId in config, user not authenticated');
          setError('User not authenticated. Please log in again.');
          return;
        }
        
        console.log('[FoldersPage] Fetching library views for userId:', config.userId);
        const res = await jellyfinApi.getLibraryViews();
        
        console.log('[FoldersPage] Received response:', res);
        
        if (!res || !res.Items) {
          console.error('[FoldersPage] Invalid response structure:', res);
          setError('Invalid response from server');
          return;
        }
        
        console.log('[FoldersPage] Found', res.Items.length, 'libraries');
        
        // Filter to audio-related libraries
        const audioLibraries = res.Items.filter(lib => 
          ['music', 'podcasts', 'audiobooks', 'playlists'].includes(lib.CollectionType || '') ||
          !lib.CollectionType // Include generic folders
        );
        
        console.log('[FoldersPage] Filtered to', audioLibraries.length, 'audio libraries');
        
        setLibraries(audioLibraries.length > 0 ? audioLibraries : res.Items);
      } catch (e) {
        console.error('[FoldersPage] Failed to load libraries:', e);
        setError(e instanceof Error ? e.message : 'Failed to load libraries');
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [config]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Loading libraries...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Libraries</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {libraries.map((lib) => (
          <button
            key={lib.Id}
            onClick={() => navigate(`/folders/${lib.Id}`)}
            className="group flex items-center gap-4 p-4 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all text-left"
          >
            <div className={`p-3 rounded-lg ${getLibraryColor(lib.CollectionType)}`}>
              {getLibraryIcon(lib.CollectionType)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{lib.Name}</h3>
              <p className="text-sm text-neutral-500 capitalize">{lib.CollectionType || 'Library'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>

      {libraries.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No libraries found</p>
        </div>
      )}
    </div>
  );
}
