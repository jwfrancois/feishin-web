import { createContext, useContext, useState, useCallback } from 'react';
import type { MediaType } from '@/types/jellyfin';

interface MediaTypeContextType {
  mediaType: MediaType;
  setMediaType: (type: MediaType) => void;
  skipInterval: number;
  setSkipInterval: (interval: number) => void;
}

const MediaTypeContext = createContext<MediaTypeContextType | null>(null);

export function MediaTypeProvider({ children }: { children: React.ReactNode }) {
  const [mediaType, setMediaTypeState] = useState<MediaType>('all');
  const [skipInterval, setSkipInterval] = useState(() => {
    const stored = localStorage.getItem('skip_interval');
    return stored ? parseInt(stored, 10) : 15;
  });

  const setMediaType = useCallback((type: MediaType) => {
    setMediaTypeState(type);
  }, []);

  const handleSetSkipInterval = useCallback((interval: number) => {
    setSkipInterval(interval);
    localStorage.setItem('skip_interval', String(interval));
  }, []);

  return (
    <MediaTypeContext.Provider value={{ mediaType, setMediaType, skipInterval, setSkipInterval: handleSetSkipInterval }}>
      {children}
    </MediaTypeContext.Provider>
  );
}

export function useMediaType() {
  const context = useContext(MediaTypeContext);
  if (!context) throw new Error('useMediaType must be used within MediaTypeProvider');
  return context;
}
