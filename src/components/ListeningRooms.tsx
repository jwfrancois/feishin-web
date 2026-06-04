import { useState, useEffect, useRef } from 'react';
import { X, Users, Play, Pause, Send, Crown, Copy, Check, Plus, LogOut, Music } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
}

interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  participants: RoomParticipant[];
  currentTrackId: string | null;
  currentTrackName: string | null;
  isPlaying: boolean;
  playbackPosition: number;
  chat: ChatMessage[];
  createdAt: number;
}

const ROOMS_STORAGE_KEY = 'listening_rooms';
const CURRENT_USER_KEY = 'listening_room_user';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getOrCreateUser(): RoomParticipant {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (stored) return JSON.parse(stored);
  
  const user: RoomParticipant = {
    id: generateId(),
    name: `User${Math.floor(Math.random() * 10000)}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    isHost: false,
    joinedAt: Date.now(),
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

function loadRooms(): Room[] {
  try {
    const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms: Room[]) {
  localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
}

interface Props {
  onClose: () => void;
}

export function ListeningRooms({ onClose }: Props) {
  const { currentTrack, isPlaying, currentTime } = usePlayer();
  const [rooms, setRooms] = useState<Room[]>(loadRooms);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [user] = useState<RoomParticipant>(getOrCreateUser);
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'list' | 'room'>('list');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync room state
  useEffect(() => {
    if (currentRoom && user.id === currentRoom.hostId) {
      const updatedRoom: Room = {
        ...currentRoom,
        currentTrackId: currentTrack?.Id || null,
        currentTrackName: currentTrack?.Name || null,
        isPlaying,
        playbackPosition: currentTime,
      };
      setRooms(prev => {
        const updated = prev.map(r => r.id === updatedRoom.id ? updatedRoom : r);
        saveRooms(updated);
        return updated;
      });
      setCurrentRoom(updatedRoom);
    }
  }, [currentTrack?.Id, isPlaying, currentTime]);

  // Simulate other participants joining
  useEffect(() => {
    if (!currentRoom) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.95 && currentRoom.participants.length < 8) {
        const fakeUser: RoomParticipant = {
          id: generateId(),
          name: ['MusicLover', 'DJ_Cool', 'SoundWave', 'BeatMaster', 'Listener42'][Math.floor(Math.random() * 5)] + Math.floor(Math.random() * 100),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
          isHost: false,
          joinedAt: Date.now(),
        };
        
        setCurrentRoom(prev => {
          if (!prev) return null;
          const updated = { ...prev, participants: [...prev.participants, fakeUser] };
          setRooms(rs => {
            const newRooms = rs.map(r => r.id === updated.id ? updated : r);
            saveRooms(newRooms);
            return newRooms;
          });
          return updated;
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentRoom?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.chat.length]);

  const createRoom = () => {
    if (!newRoomName.trim()) return;
    
    const room: Room = {
      id: generateId(),
      code: generateCode(),
      name: newRoomName.trim(),
      hostId: user.id,
      participants: [{ ...user, isHost: true }],
      currentTrackId: currentTrack?.Id || null,
      currentTrackName: currentTrack?.Name || null,
      isPlaying,
      playbackPosition: currentTime,
      chat: [],
      createdAt: Date.now(),
    };
    
    const updated = [...rooms, room];
    setRooms(updated);
    saveRooms(updated);
    setCurrentRoom(room);
    setNewRoomName('');
    setView('room');
  };

  const joinRoom = () => {
    const room = rooms.find(r => r.code === joinCode.toUpperCase());
    if (room) {
      const updatedRoom = {
        ...room,
        participants: [...room.participants.filter(p => p.id !== user.id), { ...user, isHost: false }],
      };
      setRooms(prev => {
        const updated = prev.map(r => r.id === room.id ? updatedRoom : r);
        saveRooms(updated);
        return updated;
      });
      setCurrentRoom(updatedRoom);
      setJoinCode('');
      setView('room');
    }
  };

  const leaveRoom = () => {
    if (!currentRoom) return;
    
    const updatedRoom = {
      ...currentRoom,
      participants: currentRoom.participants.filter(p => p.id !== user.id),
    };
    
    if (updatedRoom.participants.length === 0) {
      setRooms(prev => {
        const updated = prev.filter(r => r.id !== currentRoom.id);
        saveRooms(updated);
        return updated;
      });
    } else {
      setRooms(prev => {
        const updated = prev.map(r => r.id === currentRoom.id ? updatedRoom : r);
        saveRooms(updated);
        return updated;
      });
    }
    
    setCurrentRoom(null);
    setView('list');
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !currentRoom) return;
    
    const message: ChatMessage = {
      id: generateId(),
      participantId: user.id,
      participantName: user.name,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    
    const updatedRoom = {
      ...currentRoom,
      chat: [...currentRoom.chat, message],
    };
    
    setRooms(prev => {
      const updated = prev.map(r => r.id === currentRoom.id ? updatedRoom : r);
      saveRooms(updated);
      return updated;
    });
    setCurrentRoom(updatedRoom);
    setChatInput('');
  };

  const copyCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl w-full max-w-2xl border border-neutral-800 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            <h2 className="text-white font-semibold">Listening Rooms</h2>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {view === 'list' ? (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Create Room */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-300">Create a Room</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={createRoom}
                  disabled={!newRoomName.trim()}
                  className="px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-400 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-300">Join a Room</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500 uppercase tracking-widest"
                  maxLength={6}
                />
                <button
                  onClick={joinRoom}
                  disabled={joinCode.length !== 6}
                  className="px-4 py-2 bg-neutral-700 text-white font-medium rounded-lg hover:bg-neutral-600 disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Active Rooms */}
            {rooms.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-300">Active Rooms</label>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-neutral-800/50 rounded-lg p-4 hover:bg-neutral-800 transition-colors cursor-pointer"
                      onClick={() => { setCurrentRoom(room); setView('room'); }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{room.name}</p>
                          <p className="text-xs text-neutral-400">
                            {room.participants.length} listener{room.participants.length !== 1 ? 's' : ''} • Code: {room.code}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {room.isPlaying && <Play className="w-4 h-4 text-primary-500" />}
                          <div className="flex -space-x-2">
                            {room.participants.slice(0, 3).map((p) => (
                              <img key={p.id} src={p.avatar} alt="" className="w-6 h-6 rounded-full border-2 border-neutral-800" />
                            ))}
                          </div>
                        </div>
                      </div>
                      {room.currentTrackName && (
                        <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          {room.currentTrackName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : currentRoom && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Room Header */}
            <div className="p-4 border-b border-neutral-800 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{currentRoom.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-400 font-mono">{currentRoom.code}</span>
                    <button onClick={copyCode} className="text-neutral-400 hover:text-white">
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={leaveRoom}
                  className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Leave
                </button>
              </div>
            </div>

            {/* Now Playing */}
            <div className="p-4 bg-neutral-800/30 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentRoom.isPlaying ? 'bg-primary-500' : 'bg-neutral-700'}`}>
                  {currentRoom.isPlaying ? <Play className="w-4 h-4 text-black" /> : <Pause className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {currentRoom.currentTrackName || 'Nothing playing'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {currentRoom.isPlaying ? 'Now Playing' : 'Paused'}
                    {user.id === currentRoom.hostId && ' • You control playback'}
                  </p>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="p-4 border-b border-neutral-800 shrink-0">
              <p className="text-xs text-neutral-400 mb-2">
                {currentRoom.participants.length} listening
              </p>
              <div className="flex flex-wrap gap-2">
                {currentRoom.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-neutral-800 rounded-full px-2 py-1">
                    <img src={p.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs text-white">{p.name}</span>
                    {p.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {currentRoom.chat.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">No messages yet. Start the conversation!</p>
              ) : (
                currentRoom.chat.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.participantId === user.id ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      msg.participantId === user.id ? 'bg-primary-500 text-black' : 'bg-neutral-800 text-white'
                    }`}>
                      {msg.participantId !== user.id && (
                        <p className="text-xs opacity-70 mb-0.5">{msg.participantName}</p>
                      )}
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-neutral-800 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Send a message..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
