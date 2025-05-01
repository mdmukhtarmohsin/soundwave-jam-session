
import React from 'react';

interface WaveformVisualizerProps {
  isAnimated?: boolean;
  height?: string;
  className?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  isAnimated = true, 
  height = "h-16", 
  className = "" 
}) => {
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <div className={`waveform-container flex items-center ${height}`}>
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className={isAnimated ? "waveform-bar" : "bg-soundboard-primary h-8 w-1 mx-0.5 rounded-full opacity-70"}
            style={isAnimated ? {} : { 
              height: `${Math.random() * 70 + 30}%` 
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default WaveformVisualizer;
