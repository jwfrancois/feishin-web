import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Grid3X3, List, ChevronDown, Play, Plus, Clock, Music, Disc3, Users, Filter,
  Check, Square, CheckSquare, ListPlus, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import type { BaseItem, Track } from '@/types/jellyfin';

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name A-Z', order: 'Ascending' },
  { value: 'SortName', label: 'Name Z-A', order: 'Descending' },
  { value: 'DateCreated', label: 'Recently Added', order: 'Descending' },
  { value: 'DatePlayed', label: 'Recently Played', order: 'Descending' },
  { value: 'PlayCount', label: 'Most Played', order: 'Descending' },
];

const FILTER_OPTIONS = [
  { value: 'Audio,MusicAlbum,AudioBook,Folder', label: 'All' },
  { value: 'MusicAlbum', label: 'Albums' },
  { value: 'Audio', label: 'Tracks' },
  { value: 'AudioBook', label: 'Audiobooks' },
];

function formatDuration(ticks?: number) {
  if (!ticks) return '--:--';
  const seconds = Math.floor(ticks / 10000000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTotalDuration(ticks: number) {
  const seconds = Math.floor(ticks / 10000000);
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  }
  return `${mins}m`;
}

export function FolderContentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack, addToQueue } = usePlayer();

  const [folder, setFolder] = useState<BaseItem | null>(null);
  const [items, setItems] = useState<BaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [filterIndex, setFilterIndex] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 100;

  const loadItems = useCallback(async (reset = false) => {
    if (!id) return;
    const startIndex = reset ? 0 : items.length;
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      console.log('[FolderContentsPage] Loading items for folder:', id);
      const sort = SORT_OPTIONS[sortIndex];
      const filter = FILTER_OPTIONS[filterIndex];
      const res = await jellyfinApi.getFolderItems(
        id,
        PAGE_SIZE,
        startIndex,
        sort.value,
        sort.order,
        { itemTypes: filter.value, searchTerm: searchTerm || undefined }
      );
      
      if (!res || !res.Items) {
        console.error('[FolderContentsPage] Invalid response structure:', res);
        setError('Invalid response from server');
        return;
      }
      
      console.log('[FolderContentsPage] Loaded', res.Items.length, 'items');
      
      if (reset) {
        setItems(res.Items);
      } else {
        setItems(prev => [...prev, ...res.Items]);
      }
      setTotalCount(res.TotalRecordCount || 0);
    } catch (e) {
      console.error('[FolderContentsPage] Failed to load items:', e);
      setError(e instanceof Error ? e.message : 'Failed to load folder contents');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, sortIndex, filterIndex, searchTerm, items.length]);

  useEffect(() => {
    if (!id) return;
    console.log('[FolderContentsPage] Loading folder details for:', id);
    jellyfinApi.getItem(id)
      .then(folder => {
        console.log('[FolderContentsPage] Folder details loaded:', folder);
        setFolder(folder);
      })
      .catch(err => {
        console.error('[FolderContentsPage] Failed to load folder:', err);
      });
  }, [id]);

  useEffect(() => {
    loadItems(true);
    setSelectedIds(new Set());
  }, [id, sortIndex, filterIndex, searchTerm]);

  const hasMore = items.length < totalCount;

  const toggleSelect = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.Id)));
    }
  };

  const selectedItems = items.filter(i => selectedIds.has(i.Id));
  const selectedTracks = selectedItems.filter(i => i.Type === 'Audio') as Track[];
  const totalSelectedDuration = selectedItems.reduce((sum, i) => sum + ((i as any).RunTimeTicks || 0), 0);

  const handlePlay = (item: BaseItem) => {
    if (item.Type === 'Audio') {
      playTrack(item as Track);
    } else if (item.Type === 'MusicAlbum') {
      navigate(`/album/${item.Id}`);
    } else if (item.Type === 'AudioBook') {
      navigate(`/audiobooks`);
    }
  };

  const handleAddSelectedToQueue = () => {
    addToQueue(selectedTracks);
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Loading folder contents...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/folders')} className="p-2 hover:bg-neutral-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-400 text-center">{error}</p>
          <button
            onClick={() => loadItems(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/folders')} className="p-2 hover:bg-neutral-800 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{folder?.Name || 'Library'}</h1>
          <p className="text-sm text-neutral-500">{totalCount} items</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search in folder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white hover:bg-neutral-700"
          >
            <Filter className="w-4 h-4" />
            {FILTER_OPTIONS[filterIndex].label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showFilterMenu && (
            <div className="absolute z-10 mt-1 w-40 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg py-1">
              {FILTER_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterIndex(i); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-700 ${i === filterIndex ? 'text-primary-500' : 'text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white hover:bg-neutral-700"
          >
            {SORT_OPTIONS[sortIndex].label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showSortMenu && (
            <div className="absolute z-10 mt-1 w-44 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg py-1">
              {SORT_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => { setSortIndex(i); setShowSortMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-700 ${i === sortIndex ? 'text-primary-500' : 'text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex border border-neutral-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-primary-500/20 text-primary-500' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary-500/20 text-primary-500' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <button onClick={selectAll} className="text-primary-500 hover:text-primary-400">
            {selectedIds.size === items.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          <span className="text-sm text-white">{selectedIds.size} selected</span>
          {totalSelectedDuration > 0 && (
            <span className="text-sm text-neutral-400">• {formatTotalDuration(totalSelectedDuration)}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={handleAddSelectedToQueue}
            disabled={selectedTracks.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add to Queue
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-neutral-400 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Items */}
      {viewMode === 'list' ? (
        <div className="space-y-1">
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-500 uppercase border-b border-neutral-800">
            <button onClick={selectAll} className="w-5 h-5 flex items-center justify-center">
              {selectedIds.size === items.length && items.length > 0 ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4" />}
            </button>
            <div className="w-10" />
            <div className="flex-1">Title</div>
            <div className="w-32 hidden sm:block">Artist / Author</div>
            <div className="w-24 hidden md:block">Type</div>
            <div className="w-16 text-right">Duration</div>
          </div>

          {items.map((item) => (
            <div
              key={item.Id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-800/50 group ${selectedIds.has(item.Id) ? 'bg-primary-500/10' : ''}`}
            >
              <button onClick={() => toggleSelect(item.Id)} className="w-5 h-5 flex items-center justify-center">
                {selectedIds.has(item.Id) ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />}
              </button>

              <div className="relative w-10 h-10 rounded overflow-hidden bg-neutral-800 flex-shrink-0">
                <img
                  src={jellyfinApi.getImageUrl(item.Id, 'Primary', 80)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  onClick={() => handlePlay(item)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Play className="w-4 h-4 text-white" fill="white" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.Name}</p>
                {(item as any).Album && <p className="text-xs text-neutral-500 truncate">{(item as any).Album}</p>}
              </div>

              <div className="w-32 hidden sm:block text-sm text-neutral-400 truncate">
                {(item as any).Artists?.join(', ') || (item as any).AlbumArtist || '-'}
              </div>

              <div className="w-24 hidden md:block">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  item.Type === 'Audio' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.Type === 'MusicAlbum' ? 'bg-blue-500/20 text-blue-400' :
                  item.Type === 'AudioBook' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-neutral-500/20 text-neutral-400'
                }`}>
                  {item.Type === 'MusicAlbum' ? 'Album' : item.Type === 'AudioBook' ? 'Audiobook' : item.Type}
                </span>
              </div>

              <div className="w-16 text-right text-sm text-neutral-500">
                {formatDuration((item as any).RunTimeTicks)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <div
              key={item.Id}
              className={`group relative bg-neutral-900 rounded-lg overflow-hidden border ${selectedIds.has(item.Id) ? 'border-primary-500' : 'border-transparent hover:border-neutral-700'}`}
            >
              <button
                onClick={() => toggleSelect(item.Id)}
                className="absolute top-2 left-2 z-10"
              >
                {selectedIds.has(item.Id) ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-white/50 opacity-0 group-hover:opacity-100" />}
              </button>

              <div className="relative aspect-square bg-neutral-800">
                <img
                  src={jellyfinApi.getImageUrl(item.Id, 'Primary', 300)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  onClick={() => handlePlay(item)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Play className="w-10 h-10 text-white" fill="white" />
                </button>
              </div>

              <div className="p-3">
                <p className="text-sm text-white truncate font-medium">{item.Name}</p>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {(item as any).Artists?.join(', ') || (item as any).AlbumArtist || item.Type}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => loadItems(false)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Load More ({items.length} / {totalCount})
          </button>
        </div>
      )}

      {items.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No items found</p>
        </div>
      )}
    </div>
  );
}
