import { cn } from "@/lib/utils";
import { useAudioWaveform } from "@/hooks/useAudioWaveform";

interface AudioWaveformProps {
  enabled: boolean;
  className?: string;
  barCount?: number;
  isSpeaking?: boolean;
}

export function AudioWaveform({
  enabled,
  className,
  barCount = 32,
  isSpeaking = false,
}: AudioWaveformProps) {
  const { levels, volume } = useAudioWaveform({ enabled });

  // Use only the bars we need
  const displayLevels = levels.slice(0, barCount);

  return (
    <div className={cn("flex items-center justify-center gap-[2px]", className)}>
      {displayLevels.map((level, index) => {
        // Add some visual variance based on position
        const positionMultiplier = 1 - Math.abs(index - barCount / 2) / (barCount / 2) * 0.3;
        const adjustedLevel = level * positionMultiplier;
        
        // When Cloud is speaking, show output visualization
        const displayLevel = isSpeaking 
          ? Math.sin(Date.now() / 100 + index * 0.3) * 0.3 + 0.4 
          : adjustedLevel;

        // Minimum height for idle state
        const minHeight = 4;
        const maxHeight = 48;
        const height = Math.max(minHeight, displayLevel * maxHeight);

        return (
          <div
            key={index}
            className={cn(
              "w-1 rounded-full transition-all duration-75",
              isSpeaking ? "bg-accent" : "bg-primary"
            )}
            style={{
              height: `${height}px`,
              opacity: 0.6 + displayLevel * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// Circular waveform for the main visualization
export function CircularWaveform({
  enabled,
  isSpeaking,
  className,
}: {
  enabled: boolean;
  isSpeaking: boolean;
  className?: string;
}) {
  const { levels, volume } = useAudioWaveform({ enabled: enabled && !isSpeaking });

  // Create circular bars
  const barCount = 48;
  const displayLevels = levels.slice(0, barCount);

  return (
    <div className={cn("relative", className)}>
      {/* Outer glow based on volume */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-150",
          isSpeaking ? "bg-accent/20" : "bg-primary/20"
        )}
        style={{
          transform: `scale(${1 + (isSpeaking ? 0.15 : volume * 0.3)})`,
          filter: `blur(${8 + (isSpeaking ? 5 : volume * 20)}px)`,
        }}
      />

      {/* Inner glow */}
      <div
        className={cn(
          "absolute inset-4 rounded-full transition-all duration-150",
          isSpeaking ? "bg-accent/30" : "bg-primary/30"
        )}
        style={{
          transform: `scale(${1 + (isSpeaking ? 0.1 : volume * 0.2)})`,
          filter: `blur(4px)`,
        }}
      />

      {/* Circular bars container */}
      <div className="relative w-full h-full">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {displayLevels.map((level, index) => {
            const angle = (index / barCount) * 360;
            const radians = (angle * Math.PI) / 180;
            
            // Calculate bar properties
            const baseRadius = 60;
            const displayLevel = isSpeaking 
              ? Math.sin(Date.now() / 80 + index * 0.2) * 0.3 + 0.5
              : level;
            const barLength = 15 + displayLevel * 25;
            
            const x1 = 100 + Math.cos(radians) * baseRadius;
            const y1 = 100 + Math.sin(radians) * baseRadius;
            const x2 = 100 + Math.cos(radians) * (baseRadius + barLength);
            const y2 = 100 + Math.sin(radians) * (baseRadius + barLength);

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={cn(
                  "transition-all duration-75",
                  isSpeaking ? "stroke-accent" : "stroke-primary"
                )}
                strokeWidth={3}
                strokeLinecap="round"
                style={{
                  opacity: 0.5 + displayLevel * 0.5,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Center circle */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150",
          isSpeaking ? "bg-accent" : "bg-primary"
        )}
        style={{
          width: `${80 + (isSpeaking ? 5 : volume * 20)}px`,
          height: `${80 + (isSpeaking ? 5 : volume * 20)}px`,
        }}
      />
    </div>
  );
}
