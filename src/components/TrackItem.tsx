
import React, { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Volume, VolumeX, User, Clock, Play, Pause } from "lucide-react";
import WaveformVisualizer from './WaveformVisualizer';
import { audioEngine } from '@/services/AudioEngine';
import { formatDistanceToNow } from 'date-fns';

interface TrackItemProps {
  id: string;
  name: string;
  creator: string;
  timestamp: string;
  audioUrl?: string;
  onVolumeChange: (id: string, volume: number) => void;
  onToggleMute: (id: string, muted: boolean) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  id,
  name,
  creator,
  timestamp,
  audioUrl,
  onVolumeChange,
  onToggleMute
}) => {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (audioUrl && !isLoaded) {
      audioEngine.addTrack(id, audioUrl, volume);
      setIsLoaded(true);
    }
    
    return () => {
      if (isLoaded) {
        audioEngine.removeTrack(id);
      }
    };
  }, [id, audioUrl, isLoaded, volume]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    audioEngine.setTrackVolume(id, newVolume);
    onVolumeChange(id, newVolume);
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    audioEngine.muteTrack(id, newMuteState);
    onToggleMute(id, newMuteState);
  };
  
  const togglePlayback = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      audioEngine.pauseTrack(id);
      setIsPlaying(false);
    } else {
      audioEngine.playTrack(id);
      setIsPlaying(true);
      
      // Listen for end of track to update UI
      const track = audioEngine.audioStreams?.get(id);
      if (track) {
        const onEnded = () => setIsPlaying(false);
        track.audio.addEventListener('ended', onEnded, { once: true });
      }
    }
  };

  const formattedTimestamp = () => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-3 transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-white">{name}</h3>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{creator}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{formattedTimestamp()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {audioUrl && (
                <Toggle
                  pressed={isPlaying}
                  onPressedChange={togglePlayback}
                  className={isPlaying ? "bg-soundboard-primary" : "bg-muted"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </Toggle>
              )}
              
              <Toggle
                pressed={!isMuted}
                onPressedChange={toggleMute}
                className={isMuted ? "bg-muted" : "bg-soundboard-primary"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume size={16} />}
              </Toggle>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-48">
            <Slider 
              value={[volume]} 
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              disabled={isMuted}
              className={isMuted ? "opacity-50" : ""}
            />
          </div>
          
          <div className="w-12 text-right text-sm font-mono text-white/70">
            {volume}%
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <WaveformVisualizer isAnimated={isPlaying} height="h-10" />
      </div>
    </div>
  );
};

export default TrackItem;
