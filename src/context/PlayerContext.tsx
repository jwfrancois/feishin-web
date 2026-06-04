import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import type { Track } from '@/types/jellyfin';
import { jellyfinApi } from '@/lib/jellyfin';
import { audioEngine } from '@/lib/audioEngine';
import { recordPlay } from '@/lib/listeningStats';

// Crossfade storage
const CROSSFADE_KEY = 'crossfade_duration';
function getCrossfadeDuration(): number {
  const stored = localStorage.getItem(CROSSFADE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// Scrobbling config
const SCROBBLING_KEY = 'scrobbling_config';
interface ScrobblingConfig {
  lastfmEnabled: boolean;
  lastfmSessionKey: string;
  listenbrainzEnabled: boolean;
  listenbrainzToken: string;
}

function getScrobblingConfig(): ScrobblingConfig {
  try {
    const stored = localStorage.getItem(SCROBBLING_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    lastfmEnabled: false,
    lastfmSessionKey: '',
    listenbrainzEnabled: false,
    listenbrainzToken: '',
  };
}

async function scrobbleToListenBrainz(track: Track, token: string) {
  try {
    await fetch('https://api.listenbrainz.org/1/submit-listens', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listen_type: 'single',
        payload: [{
          listened_at: Math.floor(Date.now() / 1000),
          track_metadata: {
            artist_name: track.Artists?.join(', ') || 'Unknown Artist',
            track_name: track.Name || 'Unknown',
            release_name: track.Album || 'Unknown Album',
          },
        }],
      }),
    });
    console.log('[Scrobble] Sent to ListenBrainz:', track.Name);
  } catch (err) {
    console.error('[Scrobble] ListenBrainz failed:', err);
  }
}

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: Track[];
  queueIndex: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  autoDJ: boolean;
}

interface PlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  isQueueOpen: boolean;
  autoDJ: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  // A-B Loop state
  loopPointA: number | null;
  loopPointB: number | null;
  setLoopPointA: (time: number | null) => void;
  setLoopPointB: (time: number | null) => void;
  clearLoop: () => void;
  // Actions
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleAutoDJ: () => void;
  playTrack: (track: Track) => void;
  playTracks: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleQueue: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const STORAGE_KEY = 'player_state';

function loadState(): Partial<PlayerState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveState(state: PlayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlayRef = useRef(false);
  const autoDJLoadingRef = useRef(false);
  const playStartTimeRef = useRef<number>(0);
  const lastTrackIdRef = useRef<string | null>(null);
  const scrobbledRef = useRef(false);
  
  const initial = loadState();
  const [queue, setQueue] = useState<Track[]>(initial.queue || []);
  const [queueIndex, setQueueIndex] = useState(initial.queueIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(initial.volume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(initial.shuffle || false);
  const [repeat, setRepeat] = useState<RepeatMode>(initial.repeat || 'off');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [autoDJ, setAutoDJ] = useState(initial.autoDJ || false);
  
  // A-B Loop state
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);

  const currentTrack = queue[queueIndex] || null;

  const clearLoop = useCallback(() => {
    setLoopPointA(null);
    setLoopPointB(null);
  }, []);

  // Reset loop when track changes
  useEffect(() => {
    clearLoop();
    scrobbledRef.current = false;
  }, [currentTrack?.Id, clearLoop]);

  // Persist state
  useEffect(() => {
    saveState({ queue, queueIndex, volume, shuffle, repeat, autoDJ });
  }, [queue, queueIndex, volume, shuffle, repeat, autoDJ]);

  // Record listening stats when track changes or playback ends
  const recordCurrentPlay = useCallback(() => {
    if (lastTrackIdRef.current && playStartTimeRef.current > 0) {
      const playDuration = (Date.now() - playStartTimeRef.current) / 1000;
      // Only record if played for at least 30 seconds
      if (playDuration >= 30) {
        const track = queue.find(t => t.Id === lastTrackIdRef.current);
        if (track) {
          recordPlay(
            track.Id,
            track.Name,
            track.Artists?.join(', ') || 'Unknown Artist',
            track.Album || 'Unknown Album',
            Math.min(playDuration, (track.RunTimeTicks || 0) / 10000000)
          );
        }
      }
    }
    playStartTimeRef.current = 0;
  }, [queue]);

  // Scrobbling: trigger at 50% or 4 minutes
  const checkScrobble = useCallback(() => {
    if (scrobbledRef.current || !currentTrack) return;
    
    const config = getScrobblingConfig();
    if (!config.listenbrainzEnabled || !config.listenbrainzToken) return;
    
    const trackDuration = (currentTrack.RunTimeTicks || 0) / 10000000;
    const halfDuration = trackDuration / 2;
    const fourMinutes = 240;
    const threshold = Math.min(halfDuration, fourMinutes);
    
    if (currentTime >= threshold && threshold > 0) {
      scrobbledRef.current = true;
      scrobbleToListenBrainz(currentTrack, config.listenbrainzToken);
    }
  }, [currentTrack, currentTime]);

  // Auto DJ: fetch similar tracks when queue is about to end
  const fetchAutoDJTracks = useCallback(async () => {
    if (!autoDJ || autoDJLoadingRef.current || !currentTrack) return;
    
    if (queueIndex < queue.length - 2) return;
    
    autoDJLoadingRef.current = true;
    try {
      const mixRes = await jellyfinApi.getInstantMix(currentTrack.Id, 10);
      if (mixRes.Items.length > 0) {
        const queueIds = new Set(queue.map(t => t.Id));
        let newTracks = mixRes.Items.filter(t => !queueIds.has(t.Id));
        
        // Smart queue: avoid same artist if enabled
        const settings = audioEngine.getSettings();
        if (settings.noRepeatArtist && currentTrack.Artists?.[0]) {
          const currentArtist = currentTrack.Artists[0];
          newTracks = newTracks.filter(t => !t.Artists?.includes(currentArtist));
        }
        
        if (newTracks.length > 0) {
          setQueue(q => [...q, ...newTracks]);
        }
      }
    } catch (err) {
      console.error('Auto DJ failed:', err);
    } finally {
      autoDJLoadingRef.current = false;
    }
  }, [autoDJ, currentTrack, queueIndex, queue]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume = volume;
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Check scrobble
      checkScrobble();
      
      // Crossfade logic
      const crossfadeDuration = getCrossfadeDuration();
      if (crossfadeDuration > 0 && audio.duration > 0) {
        const timeRemaining = audio.duration - time;
        if (timeRemaining <= crossfadeDuration && timeRemaining > 0) {
          const fadeProgress = 1 - (timeRemaining / crossfadeDuration);
          audio.volume = Math.max(0, (1 - fadeProgress) * volume);
        }
      }
    };
    
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handlePlay = () => {
      setIsPlaying(true);
      if (playStartTimeRef.current === 0) {
        playStartTimeRef.current = Date.now();
      }
    };
    const handlePause = () => setIsPlaying(false);
    
    const handleEnded = () => {
      recordCurrentPlay();
      
      if (repeat === 'one') {
        audio.currentTime = 0;
        playStartTimeRef.current = Date.now();
        scrobbledRef.current = false;
        audio.play().catch(console.error);
      } else {
        setQueueIndex((idx) => {
          if (idx < queue.length - 1) {
            shouldPlayRef.current = true;
            if (autoDJ && idx >= queue.length - 2) {
              fetchAutoDJTracks();
            }
            return idx + 1;
          } else if (repeat === 'all' && queue.length > 0) {
            shouldPlayRef.current = true;
            return 0;
          } else if (autoDJ) {
            fetchAutoDJTracks();
          }
          setIsPlaying(false);
          return idx;
        });
      }
    };

    const handleCanPlay = () => {
      if (shouldPlayRef.current) {
        audio.play().catch(console.error);
        shouldPlayRef.current = false;
      }
    };

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      console.error('[Audio] Error:', audioEl.error?.code, audioEl.error?.message);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [repeat, queue.length, autoDJ, fetchAutoDJTracks, recordCurrentPlay, checkScrobble, volume]);

  // A-B Loop logic
  useEffect(() => {
    if (loopPointA !== null && loopPointB !== null && currentTime >= loopPointB) {
      audioRef.current?.currentTime && (audioRef.current.currentTime = loopPointA);
    }
  }, [currentTime, loopPointA, loopPointB]);

  // Handle track changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    
    // Record previous track play
    if (lastTrackIdRef.current && lastTrackIdRef.current !== currentTrack.Id) {
      recordCurrentPlay();
    }
    lastTrackIdRef.current = currentTrack.Id;
    
    const audio = audioRef.current;
    const url = jellyfinApi.getStreamUrl(currentTrack.Id);
    
    console.log('[Audio] Loading:', currentTrack.Name);
    
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.load();
    
    // Connect audio engine
    if (!audioEngine.isActive()) {
      audioEngine.connect(audio);
    }
    
    setIsQueueOpen(true);
  }, [currentTrack?.Id, recordCurrentPlay]);

  const play = useCallback(async () => {
    if (audioRef.current && currentTrack) {
      await audioEngine.resume();
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error('[Audio] Play failed:', err);
      }
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    recordCurrentPlay();
    shouldPlayRef.current = true;
    
    if (shuffle) {
      const settings = audioEngine.getSettings();
      if (settings.noRepeatArtist && currentTrack?.Artists?.[0]) {
        const currentArtist = currentTrack.Artists[0];
        const eligibleIndices = queue
          .map((t, i) => ({ t, i }))
          .filter(({ t, i }) => i !== queueIndex && !t.Artists?.includes(currentArtist))
          .map(({ i }) => i);
        
        if (eligibleIndices.length > 0) {
          setQueueIndex(eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]);
          return;
        }
      }
      setQueueIndex(Math.floor(Math.random() * queue.length));
    } else if (queueIndex < queue.length - 1) {
      setQueueIndex((i) => i + 1);
    } else if (repeat === 'all') {
      setQueueIndex(0);
    }
  }, [shuffle, queueIndex, queue, repeat, currentTrack, recordCurrentPlay]);

  const previous = useCallback(() => {
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (queueIndex > 0) {
      recordCurrentPlay();
      shouldPlayRef.current = true;
      setQueueIndex((i) => i - 1);
    }
  }, [currentTime, queueIndex, recordCurrentPlay]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    if (vol > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);
  const toggleAutoDJ = useCallback(() => setAutoDJ((a) => !a), []);

  const playTrack = useCallback((track: Track) => {
    recordCurrentPlay();
    shouldPlayRef.current = true;
    setQueue([track]);
    setQueueIndex(0);
  }, [recordCurrentPlay]);

  const playTracks = useCallback((tracks: Track[], startIndex = 0) => {
    recordCurrentPlay();
    shouldPlayRef.current = true;
    setQueue(tracks);
    setQueueIndex(startIndex);
  }, [recordCurrentPlay]);

  const addToQueue = useCallback((tracks: Track[]) => {
    setQueue((q) => [...q, ...tracks]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    setQueueIndex((current) => {
      if (index < current) return current - 1;
      if (index === current && index === queue.length - 1) return Math.max(0, current - 1);
      return current;
    });
  }, [queue.length]);

  const moveInQueue = useCallback((from: number, to: number) => {
    setQueue((q) => {
      const newQueue = [...q];
      const [item] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, item);
      return newQueue;
    });
    setQueueIndex((current) => {
      if (from === current) return to;
      if (from < current && to >= current) return current - 1;
      if (from > current && to <= current) return current + 1;
      return current;
    });
  }, []);

  const clearQueue = useCallback(() => {
    recordCurrentPlay();
    setQueue([]);
    setQueueIndex(0);
    setIsPlaying(false);
    shouldPlayRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [recordCurrentPlay]);

  const toggleQueue = useCallback(() => setIsQueueOpen((o) => !o), []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack, queue, queueIndex, isPlaying, currentTime, duration,
        volume, isMuted, shuffle, repeat, isQueueOpen, autoDJ, audioRef,
        loopPointA, loopPointB, setLoopPointA, setLoopPointB, clearLoop,
        play, pause, toggle, next, previous, seek, setVolume, toggleMute,
        toggleShuffle, cycleRepeat, toggleAutoDJ, playTrack, playTracks, addToQueue,
        removeFromQueue, moveInQueue, clearQueue, toggleQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}
