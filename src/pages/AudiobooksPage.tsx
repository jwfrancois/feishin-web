import { useEffect, useState } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import type { Audiobook, AudiobookChapter, Track } from '@/types/jellyfin';
import { Play, Pause, BookOpen, ChevronRight, Clock, Check, RotateCcw, Headphones } from 'lucide-react';

function formatDuration(ticks?: number): string {
  if (!ticks) return '';
  const seconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatProgress(positionTicks?: number, totalTicks?: number): string {
  if (!positionTicks || !totalTicks) return '';
  const remaining = Math.floor((totalTicks - positionTicks) / 10000000 / 60);
  if (remaining > 60) {
    const hours = Math.floor(remaining / 60);
    return `${hours}h ${remaining % 60}m left`;
  }
  return `${remaining}m left`;
}

interface ChapterRowProps {
  chapter: AudiobookChapter;
  index: number;
  onPlay: () => void;
  isPlaying: boolean;
  isCurrent: boolean;
}

function ChapterRow({ chapter, index, onPlay, isPlaying, isCurrent }: ChapterRowProps) {
  const progress = chapter.UserData?.PlayedPercentage || 0;
  const isCompleted = chapter.UserData?.Played;

  return (
    <div
      className={`group flex items-center gap-4 p-3 rounded-lg transition-all cursor-pointer ${
        isCurrent
          ? 'bg-amber-500/10 border border-amber-500/30'
          : 'hover:bg-neutral-800/50'
      }`}
      onClick={onPlay}
    >
      {/* Chapter Number */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isCompleted ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-700 text-neutral-400'
      }`}>
        {isCompleted ? <Check className="w-4 h-4" /> : chapter.IndexNumber || index + 1}
      </div>

      {/* Chapter Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate ${isCompleted ? 'text-neutral-500' : 'text-white'}`}>
          {chapter.Name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{formatDuration(chapter.RunTimeTicks)}</span>
          {progress > 0 && progress < 100 && (
            <span className="text-amber-400">{Math.round(progress)}%</span>
          )}
        </div>
      </div>

      {/* Play Button */}
      <button className="p-2 rounded-full bg-neutral-700 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-amber-500 hover:text-black transition-all">
        {isCurrent && isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>
    </div>
  );
}

interface AudiobookCardProps {
  audiobook: Audiobook;
  onClick: () => void;
}

function AudiobookCard({ audiobook, onClick }: AudiobookCardProps) {
  const progress = audiobook.UserData?.PlayedPercentage || 0;

  return (
    <div
      className="group p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-800 hover:border-amber-500/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-700 mb-3 shadow-lg">
        <img
          src={jellyfinApi.getImageUrl(audiobook.Id, 'Primary', 300)}
          alt={audiobook.Name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="%23333" width="100" height="150"/><text x="50" y="80" text-anchor="middle" fill="%23666" font-size="40">📚</text></svg>';
          }}
        />
        {/* Audiobook Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500/90 text-black text-xs font-medium rounded-full flex items-center gap-1">
          <Headphones className="w-3 h-3" />
          Book
        </div>
        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
            <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-white truncate">{audiobook.Name}</h3>
      <p className="text-sm text-neutral-400 truncate mt-1">
        {audiobook.AlbumArtist || 'Unknown Author'}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
        <Clock className="w-3 h-3" />
        {formatDuration(audiobook.RunTimeTicks)}
      </div>
    </div>
  );
}

export function AudiobooksPage() {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [selectedBook, setSelectedBook] = useState<Audiobook | null>(null);
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTracks, currentTrack, isPlaying, toggle } = usePlayer();

  useEffect(() => {
    async function load() {
      try {
        const res = await jellyfinApi.getAudiobooks(50, 0);
        setAudiobooks(res.Items);
      } catch (err) {
        console.error('Failed to load audiobooks:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSelectBook = async (book: Audiobook) => {
    setSelectedBook(book);
    try {
      const res = await jellyfinApi.getAudiobookChapters(book.Id);
      setChapters(res.Items);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const handlePlayChapter = (chapter: AudiobookChapter, index: number) => {
    if (currentTrack?.Id === chapter.Id) {
      toggle();
    } else {
      playTracks(chapters as Track[], index);
    }
  };

  // Find first unfinished chapter
  const resumeChapterIndex = chapters.findIndex(
    ch => !ch.UserData?.Played || (ch.UserData?.PlayedPercentage && ch.UserData.PlayedPercentage < 100)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Audiobooks</h1>
          <p className="text-neutral-400">{audiobooks.length} books</p>
        </div>
      </div>

      {selectedBook ? (
        /* Chapter List View */
        <div>
          <button
            onClick={() => setSelectedBook(null)}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to library
          </button>

          <div className="flex gap-6 mb-6">
            <img
              src={jellyfinApi.getImageUrl(selectedBook.Id, 'Primary', 200)}
              alt={selectedBook.Name}
              className="w-32 h-48 rounded-lg object-cover shadow-xl"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{selectedBook.Name}</h2>
              <p className="text-neutral-400 mt-1">{selectedBook.AlbumArtist || 'Unknown Author'}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-neutral-500">
                <Clock className="w-4 h-4" />
                {formatDuration(selectedBook.RunTimeTicks)}
                <span className="text-neutral-600">•</span>
                <span>{chapters.length} chapters</span>
              </div>
              {selectedBook.Overview && (
                <p className="text-neutral-500 text-sm mt-3 line-clamp-3">{selectedBook.Overview}</p>
              )}
              
              {/* Resume Button */}
              {resumeChapterIndex >= 0 && (
                <button
                  onClick={() => handlePlayChapter(chapters[resumeChapterIndex], resumeChapterIndex)}
                  className="mt-4 px-4 py-2 bg-amber-500 text-black font-medium rounded-full hover:bg-amber-400 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                  {resumeChapterIndex === 0 ? 'Start Listening' : 'Continue Listening'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {chapters.map((chapter, idx) => (
              <ChapterRow
                key={chapter.Id}
                chapter={chapter}
                index={idx}
                onPlay={() => handlePlayChapter(chapter, idx)}
                isPlaying={isPlaying}
                isCurrent={currentTrack?.Id === chapter.Id}
              />
            ))}
          </div>

          {chapters.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              No chapters found for this audiobook
            </div>
          )}
        </div>
      ) : (
        /* Audiobook Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {audiobooks.map((book) => (
            <AudiobookCard
              key={book.Id}
              audiobook={book}
              onClick={() => handleSelectBook(book)}
            />
          ))}
        </div>
      )}

      {audiobooks.length === 0 && !selectedBook && (
        <div className="text-center py-12 text-neutral-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No audiobooks found in your library</p>
          <p className="text-sm mt-1">Add media with the "Audiobook" genre tag to see them here</p>
        </div>
      )}
    </div>
  );
}
