import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ZoomIn, ZoomOut, Filter, RotateCcw } from 'lucide-react';
import { jellyfinApi } from '@/lib/jellyfin';
import { usePlayer } from '@/context/PlayerContext';
import type { Album, Artist } from '@/types/jellyfin';

interface Star {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  type: 'artist' | 'album';
  artistId?: string;
  genre?: string;
  playCount: number;
  connections: string[];
}

const GENRE_COLORS: Record<string, string> = {
  'Rock': '#ff6b6b',
  'Pop': '#ff9ff3',
  'Electronic': '#54a0ff',
  'Hip-Hop': '#feca57',
  'Jazz': '#5f27cd',
  'Classical': '#c8d6e5',
  'Metal': '#222f3e',
  'R&B': '#ff6348',
  'Country': '#ff9f43',
  'Folk': '#10ac84',
  'Blues': '#2e86de',
  'Reggae': '#1dd1a1',
  'Soul': '#ee5a24',
  'Punk': '#eb4d4b',
  'Alternative': '#6c5ce7',
  'Indie': '#a29bfe',
  'default': '#ffffff',
};

function getGenreColor(genres: string[] | undefined): string {
  if (!genres?.length) return GENRE_COLORS.default;
  for (const genre of genres) {
    for (const [key, color] of Object.entries(GENRE_COLORS)) {
      if (genre.toLowerCase().includes(key.toLowerCase())) return color;
    }
  }
  return GENRE_COLORS.default;
}

export function MusicMapPage() {
  const navigate = useNavigate();
  const { playTracks } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [showConnections, setShowConnections] = useState(true);
  
  const animationRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Fetch data
  useEffect(() => {
    async function load() {
      try {
        const [artistsRes, albumsRes] = await Promise.all([
          jellyfinApi.getArtists(100, 0),
          jellyfinApi.getAlbums(200, 0),
        ]);
        setArtists(artistsRes.Items);
        setAlbums(albumsRes.Items);
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Generate star positions
  const generatedStars = useMemo(() => {
    if (!artists.length && !albums.length) return [];
    
    const width = 2000;
    const height = 2000;
    const centerX = width / 2;
    const centerY = height / 2;
    const result: Star[] = [];
    
    // Place artists as main stars in a spiral pattern
    artists.forEach((artist, i) => {
      const angle = i * 0.5;
      const radius = 100 + i * 30;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const playCount = Math.floor(Math.random() * 1000);
      
      result.push({
        id: artist.Id,
        name: artist.Name,
        x,
        y,
        size: Math.max(8, Math.min(20, 8 + playCount / 100)),
        color: getGenreColor(artist.Genres),
        type: 'artist',
        genre: artist.Genres?.[0],
        playCount,
        connections: [],
      });
    });
    
    // Place albums as smaller stars near their artists
    albums.forEach((album, i) => {
      const parentArtist = result.find(s => s.type === 'artist' && s.name === album.AlbumArtist);
      const baseX = parentArtist?.x || (Math.random() * width);
      const baseY = parentArtist?.y || (Math.random() * height);
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetRadius = 30 + Math.random() * 50;
      
      const star: Star = {
        id: album.Id,
        name: album.Name,
        x: baseX + offsetRadius * Math.cos(offsetAngle),
        y: baseY + offsetRadius * Math.sin(offsetAngle),
        size: 4 + Math.random() * 4,
        color: getGenreColor(album.Genres),
        type: 'album',
        artistId: parentArtist?.id,
        genre: album.Genres?.[0],
        playCount: Math.floor(Math.random() * 500),
        connections: parentArtist ? [parentArtist.id] : [],
      };
      
      if (parentArtist) {
        parentArtist.connections.push(star.id);
      }
      
      result.push(star);
    });
    
    return result;
  }, [artists, albums]);

  useEffect(() => {
    setStars(generatedStars);
  }, [generatedStars]);

  // Filter stars
  const filteredStars = useMemo(() => {
    if (!filterGenre) return stars;
    return stars.filter(s => s.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
  }, [stars, filterGenre]);

  // Animation loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw background stars (twinkling)
    for (let i = 0; i < 200; i++) {
      const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height;
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 1000 + i));
      ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.save();
    ctx.translate(pan.x + width / 2, pan.y + height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-1000, -1000);
    
    // Draw connections
    if (showConnections) {
      ctx.strokeStyle = 'rgba(100,100,150,0.2)';
      ctx.lineWidth = 0.5;
      filteredStars.forEach(star => {
        star.connections.forEach(connId => {
          const conn = filteredStars.find(s => s.id === connId);
          if (conn) {
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(conn.x, conn.y);
            ctx.stroke();
          }
        });
      });
    }
    
    // Draw stars
    filteredStars.forEach(star => {
      const isHovered = hoveredStar?.id === star.id;
      const isSelected = selectedStar?.id === star.id;
      const pulse = 1 + 0.1 * Math.sin(Date.now() / 500 + star.x);
      const size = star.size * pulse * (isHovered || isSelected ? 1.5 : 1);
      
      // Glow
      const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 3);
      gradient.addColorStop(0, star.color + '80');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Label for hovered/selected
      if (isHovered || isSelected) {
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(star.name, star.x, star.y - size - 10);
      }
    });
    
    ctx.restore();
    animationRef.current = requestAnimationFrame(draw);
  }, [filteredStars, zoom, pan, hoveredStar, selectedStar, showConnections]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else {
      // Check hover
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - pan.x - rect.width / 2) / zoom + 1000;
      const my = (e.clientY - rect.top - pan.y - rect.height / 2) / zoom + 1000;
      
      const hovered = filteredStars.find(star => {
        const dx = star.x - mx;
        const dy = star.y - my;
        return Math.sqrt(dx * dx + dy * dy) < star.size * 2;
      });
      setHoveredStar(hovered || null);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleClick = async (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || isDragging.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - pan.x - rect.width / 2) / zoom + 1000;
    const my = (e.clientY - rect.top - pan.y - rect.height / 2) / zoom + 1000;
    
    const clicked = filteredStars.find(star => {
      const dx = star.x - mx;
      const dy = star.y - my;
      return Math.sqrt(dx * dx + dy * dy) < star.size * 2;
    });
    
    if (clicked) {
      setSelectedStar(clicked);
      if (clicked.type === 'album') {
        // Play album
        try {
          const tracks = await jellyfinApi.getAlbumTracks(clicked.id);
          if (tracks.Items.length > 0) {
            playTracks(tracks.Items, 0);
          }
        } catch (err) {
          console.error('Failed to play album:', err);
        }
      }
    } else {
      setSelectedStar(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(5, z * delta)));
  };

  const genres = useMemo(() => {
    const set = new Set<string>();
    stars.forEach(s => s.genre && set.add(s.genre));
    return Array.from(set).sort();
  }, [stars]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedStar(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-950">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen bg-neutral-950 relative overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-neutral-800/80 backdrop-blur rounded-lg text-white hover:bg-neutral-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg ml-2">Music Galaxy</h1>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
          className="bg-neutral-800/80 backdrop-blur text-white text-sm rounded-lg px-3 py-2 border-none"
        >
          <option value="">All Genres</option>
          {genres.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button
          onClick={() => setShowConnections(!showConnections)}
          className={`p-2 rounded-lg ${showConnections ? 'bg-primary-500 text-black' : 'bg-neutral-800/80 text-white'}`}
          title="Toggle Connections"
        >
          <Filter className="w-5 h-5" />
        </button>
        <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="p-2 bg-neutral-800/80 backdrop-blur rounded-lg text-white hover:bg-neutral-700">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="p-2 bg-neutral-800/80 backdrop-blur rounded-lg text-white hover:bg-neutral-700">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={resetView} className="p-2 bg-neutral-800/80 backdrop-blur rounded-lg text-white hover:bg-neutral-700">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-neutral-800/80 backdrop-blur rounded-lg p-3">
        <p className="text-xs text-neutral-400 mb-2">Genre Colors</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(GENRE_COLORS).slice(0, 9).map(([genre, color]) => (
            <div key={genre} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-neutral-300">{genre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Star Info */}
      {selectedStar && (
        <div className="absolute bottom-4 right-4 z-10 bg-neutral-800/90 backdrop-blur rounded-lg p-4 max-w-xs">
          <h3 className="text-white font-medium">{selectedStar.name}</h3>
          <p className="text-xs text-neutral-400 mt-1">
            {selectedStar.type === 'artist' ? 'Artist' : 'Album'} • {selectedStar.genre || 'Unknown genre'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">{selectedStar.playCount} plays</p>
          {selectedStar.type === 'album' && (
            <button
              onClick={async () => {
                const tracks = await jellyfinApi.getAlbumTracks(selectedStar.id);
                if (tracks.Items.length > 0) playTracks(tracks.Items, 0);
              }}
              className="mt-3 w-full py-2 bg-primary-500 text-black rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Play Album
            </button>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  );
}
