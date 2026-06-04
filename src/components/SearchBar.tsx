import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Disc3, Users, Music } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import type { SearchHint } from '@/types/jellyfin';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await jellyfinApi.search(q);
      setResults(res.SearchHints);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (hint: SearchHint) => {
    setIsOpen(false);
    setQuery('');
    if (hint.Type === 'MusicAlbum') {
      navigate(`/album/${hint.ItemId}`);
    } else if (hint.Type === 'MusicArtist') {
      navigate(`/artist/${hint.ItemId}`);
    } else if (hint.Type === 'Audio') {
      navigate(`/album/${hint.ItemId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MusicAlbum':
        return <Disc3 className="w-4 h-4" />;
      case 'MusicArtist':
        return <Users className="w-4 h-4" />;
      default:
        return <Music className="w-4 h-4" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search albums, artists, songs..."
          className="w-full pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-neutral-400 text-center text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-neutral-400 text-center text-sm">No results found</div>
          ) : (
            results.map((hint) => (
              <button
                key={hint.ItemId}
                onClick={() => handleSelect(hint)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-800 text-left"
              >
                <span className="text-neutral-400">{getIcon(hint.Type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{hint.Name}</div>
                  <div className="text-xs text-neutral-400 truncate">
                    {hint.Type === 'Audio' && hint.Album
                      ? `${hint.AlbumArtist} - ${hint.Album}`
                      : hint.Type === 'MusicAlbum'
                      ? hint.AlbumArtist
                      : hint.Type}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
