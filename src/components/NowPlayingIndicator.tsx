import { usePlayer } from '@/context/PlayerContext';

interface Props {
  size?: 'sm' | 'md';
}

export function NowPlayingIndicator({ size = 'md' }: Props) {
  const { isPlaying } = usePlayer();

  const barHeight = size === 'sm' ? 'h-3' : 'h-4';
  const barWidth = size === 'sm' ? 'w-0.5' : 'w-1';
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';

  return (
    <div className={`flex items-end ${gap} ${barHeight}`}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`${barWidth} bg-player-accent rounded-full ${
            isPlaying ? 'animate-equalizer' : 'h-1'
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isPlaying ? undefined : '4px',
          }}
        />
      ))}
    </div>
  );
}

// Add to global CSS:
// @keyframes equalizer {
//   0%, 100% { height: 4px; }
//   50% { height: 100%; }
// }
// .animate-equalizer {
//   animation: equalizer 0.5s ease-in-out infinite;
// }
