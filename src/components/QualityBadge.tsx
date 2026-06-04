import { AlertTriangle } from 'lucide-react';
import type { Track } from '@/types/jellyfin';
import { getAudioQuality, isLowQuality } from '@/types/jellyfin';

interface QualityBadgeProps {
  track: Track;
  size?: 'sm' | 'md';
  showWarning?: boolean;
}

export function QualityBadge({ track, size = 'sm', showWarning = false }: QualityBadgeProps) {
  const quality = getAudioQuality(track);
  const lowQuality = showWarning && isLowQuality(track);
  
  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : 'text-xs px-2 py-1';
  
  let bgColor = 'bg-neutral-700';
  let textColor = 'text-neutral-300';
  
  if (quality.isHiRes) {
    bgColor = 'bg-gradient-to-r from-amber-500 to-orange-500';
    textColor = 'text-black font-medium';
  } else if (quality.isLossless) {
    bgColor = 'bg-gradient-to-r from-player-accent to-purple-400';
    textColor = 'text-black font-medium';
  } else if (lowQuality) {
    bgColor = 'bg-yellow-600/30';
    textColor = 'text-yellow-400';
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className={`rounded ${bgColor} ${textColor} ${sizeClasses} whitespace-nowrap`}>
        {quality.qualityLabel}
      </span>
      {lowQuality && (
        <AlertTriangle className="w-3 h-3 text-yellow-500" title="Low quality audio" />
      )}
    </div>
  );
}

export function QualityInfo({ track }: { track: Track }) {
  const quality = getAudioQuality(track);
  
  return (
    <div className="text-xs text-neutral-400 space-y-1">
      <div className="flex justify-between">
        <span>Codec</span>
        <span className="text-white">{quality.codec}</span>
      </div>
      {quality.bitRate > 0 && (
        <div className="flex justify-between">
          <span>Bitrate</span>
          <span className="text-white">{Math.round(quality.bitRate / 1000)} kbps</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Sample Rate</span>
        <span className="text-white">{quality.sampleRate / 1000} kHz</span>
      </div>
      {quality.bitDepth > 0 && (
        <div className="flex justify-between">
          <span>Bit Depth</span>
          <span className="text-white">{quality.bitDepth}-bit</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Channels</span>
        <span className="text-white">{quality.channels === 2 ? 'Stereo' : quality.channels === 1 ? 'Mono' : `${quality.channels}ch`}</span>
      </div>
    </div>
  );
}
