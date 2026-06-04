import { useState, useRef } from 'react';
import { Share2, Download, Copy, X, Check } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { jellyfinApi } from '@/lib/jellyfin';

interface Props {
  onClose: () => void;
}

export function ShareNowPlaying({ onClose }: Props) {
  const { currentTrack } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  if (!currentTrack) return null;

  const generateCard = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 600;
    const height = 315;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Load album art
    const imageUrl = jellyfinApi.getImageUrl(currentTrack.AlbumId || currentTrack.Id, 'Primary', 400);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Draw album art with rounded corners
      const artSize = 200;
      const artX = 40;
      const artY = (height - artSize) / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 12);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artSize, artSize);
      ctx.restore();

      // Draw border
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 12);
      ctx.stroke();
    } catch {
      // Draw placeholder
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(40, 57, 200, 200, 12);
      ctx.fill();
    }

    // Text
    const textX = 270;
    
    // "Now Playing" label
    ctx.fillStyle = '#00FF94';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('NOW PLAYING', textX, 90);

    // Track name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    const trackName = currentTrack.Name || 'Unknown';
    const truncatedName = trackName.length > 25 ? trackName.slice(0, 22) + '...' : trackName;
    ctx.fillText(truncatedName, textX, 130);

    // Artist
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px system-ui, sans-serif';
    const artist = currentTrack.Artists?.join(', ') || 'Unknown Artist';
    const truncatedArtist = artist.length > 30 ? artist.slice(0, 27) + '...' : artist;
    ctx.fillText(truncatedArtist, textX, 160);

    // Album
    ctx.fillStyle = '#777777';
    ctx.font = '14px system-ui, sans-serif';
    const album = currentTrack.Album || 'Unknown Album';
    const truncatedAlbum = album.length > 35 ? album.slice(0, 32) + '...' : album;
    ctx.fillText(truncatedAlbum, textX, 190);

    // App branding
    ctx.fillStyle = '#444444';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Feishin Web', textX, 250);

    return canvas;
  };

  const handleDownload = async () => {
    const canvas = await generateCard();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `now-playing-${currentTrack.Name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    const canvas = await generateCard();
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 max-w-xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-player-accent" />
            Share Now Playing
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-neutral-950 rounded-lg p-4 mb-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={315}
            className="w-full rounded-lg"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-player-accent text-black font-medium rounded-lg hover:bg-player-accent/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
