import { IterationCcw } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export function ABLoop() {
  const { currentTime, loopPointA, loopPointB, setLoopPointA, setLoopPointB, clearLoop } = usePlayer();

  const handleClick = () => {
    if (loopPointA === null) {
      setLoopPointA(currentTime);
    } else if (loopPointB === null) {
      if (currentTime > loopPointA) {
        setLoopPointB(currentTime);
      } else {
        // Reset if B would be before A
        setLoopPointA(currentTime);
      }
    } else {
      // Clear loop
      clearLoop();
    }
  };

  const isActive = loopPointA !== null;
  const isComplete = loopPointA !== null && loopPointB !== null;

  const formatPoint = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 transition-colors relative ${
        isComplete
          ? 'text-player-accent'
          : isActive
          ? 'text-yellow-500'
          : 'text-neutral-400 hover:text-white'
      }`}
      title={
        isComplete
          ? `Loop: ${formatPoint(loopPointA!)} - ${formatPoint(loopPointB!)} (click to clear)`
          : isActive
          ? `Point A: ${formatPoint(loopPointA!)} (click to set B)`
          : 'Set A-B Loop'
      }
    >
      <IterationCcw className="w-4 h-4" />
      {isActive && !isComplete && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
      )}
    </button>
  );
}

// Component to render markers on progress bar - uses context
export function ABLoopMarkers({ duration }: { duration: number }) {
  const { loopPointA, loopPointB } = usePlayer();

  if (loopPointA === null || duration <= 0) return null;

  const isComplete = loopPointB !== null;

  return (
    <>
      {/* Point A marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
        style={{
          left: `${(loopPointA / duration) * 100}%`,
          backgroundColor: isComplete ? '#00FF94' : '#EAB308',
        }}
      />
      {isComplete && (
        <>
          {/* Point B marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-player-accent z-10 pointer-events-none"
            style={{ left: `${(loopPointB / duration) * 100}%` }}
          />
          {/* Loop region highlight */}
          <div
            className="absolute top-0 bottom-0 bg-player-accent/20 z-5 pointer-events-none"
            style={{
              left: `${(loopPointA / duration) * 100}%`,
              width: `${((loopPointB - loopPointA) / duration) * 100}%`,
            }}
          />
        </>
      )}
    </>
  );
}
