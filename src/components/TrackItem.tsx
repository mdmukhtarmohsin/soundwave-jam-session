import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Volume,
  VolumeX,
  User,
  Clock,
  Play,
  Pause,
  Repeat,
  Trash2,
} from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";
import { audioEngine } from "@/services/AudioEngine";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";

// Helper to format seconds into MM:SS
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds === Infinity) {
    return "--:--";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface TrackItemProps {
  id: string;
  name: string;
  creator: string;
  creatorId: string;
  storagePath?: string | null;
  timestamp: string;
  audioUrl?: string;
  onVolumeChange: (id: string, volume: number) => void;
  onToggleMute: (id: string, muted: boolean) => void;
  onDelete: (trackId: string, storagePath?: string | null) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  id,
  name,
  creator,
  creatorId,
  storagePath,
  timestamp,
  audioUrl,
  onVolumeChange,
  onToggleMute,
  onDelete,
}) => {
  const { user } = useAuth();
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trackDuration, setTrackDuration] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const isOwner = user?.id === creatorId;

  useEffect(() => {
    if (audioUrl && !isLoaded) {
      audioEngine.addTrack(id, audioUrl, volume);
      setIsLoaded(true);
    }

    // Subscribe to AudioEngine events
    const handlePlay = (trackId: string) => {
      if (trackId === id) setIsPlaying(true);
    };
    const handlePause = (trackId: string) => {
      if (trackId === id) setIsPlaying(false);
    };
    const handleMetadata = (data: { id: string; duration: number }) => {
      console.log(`[TrackItem ${id}] Received metadata event:`, data);
      if (data.id === id) {
        console.log(
          `[TrackItem ${id}] Updating duration state to: ${data.duration}`
        );
        setTrackDuration(data.duration);
      }
    };

    audioEngine.on("play", handlePlay);
    audioEngine.on("pause", handlePause);
    audioEngine.on("metadata", handleMetadata);

    return () => {
      // Unsubscribe on cleanup
      audioEngine.off("play", handlePlay);
      audioEngine.off("pause", handlePause);
      audioEngine.off("metadata", handleMetadata);

      if (isLoaded) {
        audioEngine.removeTrack(id);
      }
    };
  }, [id, audioUrl, isLoaded]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    audioEngine.setTrackVolume(id, newVolume);
    onVolumeChange(id, newVolume);
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (newMuteState) {
      audioEngine.setTrackVolume(id, 0);
    } else {
      audioEngine.setTrackVolume(id, volume);
    }
    onToggleMute(id, newMuteState);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioEngine.pauseTrack(id);
    } else {
      audioEngine.playTrack(id);
    }
  };

  const toggleLoop = () => {
    const newLoopState = !isLooping;
    setIsLooping(newLoopState);
    audioEngine.setTrackLooping(id, newLoopState);
  };

  const handleDelete = () => {
    onDelete(id, storagePath);
  };

  const formattedTimestamp = () => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-3 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate" title={name}>
            {name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/60 mt-1 flex-wrap">
            <div
              className="flex items-center gap-1"
              title={`Created by ${creator} (${creatorId})`}
            >
              <User size={12} />
              <span className="truncate max-w-[100px]">{creator}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formattedTimestamp()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-sm text-white/70 font-mono">
            {formatTime(trackDuration ?? 0)}
          </div>
          {isOwner && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete track"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 h-7 w-7 p-1"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="my-1">
        <WaveformVisualizer isAnimated={isPlaying} height="h-10" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          {audioUrl && (
            <Toggle
              size="sm"
              pressed={isPlaying}
              onPressedChange={togglePlayback}
              className={`transition-colors ${
                isPlaying
                  ? "bg-soundboard-primary text-white hover:bg-soundboard-primary/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/90"
              }`}
              aria-label={isPlaying ? "Pause track" : "Play track"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Toggle>
          )}
          <Toggle
            size="sm"
            pressed={isLooping}
            onPressedChange={toggleLoop}
            className={`transition-colors ${
              isLooping
                ? "bg-soundboard-primary text-white hover:bg-soundboard-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted/90"
            }`}
            aria-label={isLooping ? "Disable loop" : "Enable loop"}
          >
            <Repeat size={16} />
          </Toggle>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Toggle
            size="sm"
            pressed={!isMuted}
            onPressedChange={toggleMute}
            className={`transition-colors ${
              isMuted
                ? "bg-muted text-muted-foreground hover:bg-muted/90"
                : "bg-soundboard-primary text-white hover:bg-soundboard-primary/90"
            }`}
            aria-label={isMuted ? "Unmute track" : "Mute track"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume size={16} />}
          </Toggle>
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            disabled={isMuted}
            className={`${isMuted ? "opacity-50" : ""} flex-grow`}
            aria-label="Volume slider"
          />
          <div className="w-10 text-right text-sm font-mono text-white/70">
            {volume}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackItem;
