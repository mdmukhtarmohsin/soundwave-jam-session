import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import {
  User,
  Clock,
  Play,
  Pause,
  Repeat,
  Trash2,
  Volume,
  VolumeX,
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

    const handlePlay = (trackId: string) => {
      if (trackId === id) setIsPlaying(true);
    };
    const handlePause = (trackId: string) => {
      if (trackId === id) setIsPlaying(false);
    };
    const handleMetadata = (data: { id: string; duration: number }) => {
      if (data.id === id) setTrackDuration(data.duration);
    };

    audioEngine.on("play", handlePlay);
    audioEngine.on("pause", handlePause);
    audioEngine.on("metadata", handleMetadata);

    return () => {
      audioEngine.off("play", handlePlay);
      audioEngine.off("pause", handlePause);
      audioEngine.off("metadata", handleMetadata);
      if (isLoaded) audioEngine.removeTrack(id);
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
    audioEngine.setTrackVolume(id, newMuteState ? 0 : volume);
    onToggleMute(id, newMuteState);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) audioEngine.pauseTrack(id);
    else audioEngine.playTrack(id);
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

  const toggleBaseClasses =
    "transition-colors h-8 w-8 data-[state=on]:text-white flex-shrink-0";
  const toggleInactiveClasses =
    "bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-gray-200";
  const toggleActiveClasses =
    "bg-soundboard-primary hover:bg-soundboard-primary/80";
  const loopToggleActiveClasses = "bg-purple-600 hover:bg-purple-700";
  const muteToggleActiveClasses = "bg-red-600 hover:bg-red-700";

  return (
    <div className="bg-gray-800/60 border border-gray-700/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 shadow-sm hover:border-gray-600/90 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:gap-4 flex-1 min-w-0">
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 md:order-1">
          {audioUrl && (
            <Toggle
              size="sm"
              pressed={isPlaying}
              onPressedChange={togglePlayback}
              className={`${toggleBaseClasses} ${
                isPlaying ? toggleActiveClasses : toggleInactiveClasses
              }`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Toggle>
          )}
          <Toggle
            size="sm"
            pressed={isLooping}
            onPressedChange={toggleLoop}
            className={`${toggleBaseClasses} ${
              isLooping ? loopToggleActiveClasses : toggleInactiveClasses
            }`}
            aria-label="Loop"
          >
            <Repeat size={16} />
          </Toggle>
        </div>

        <div className="flex-1 min-w-0 md:order-2">
          <h3
            className="font-medium text-white truncate text-sm leading-tight"
            title={name}
          >
            {name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 flex-wrap">
            <span
              title={creator}
              className="flex items-center gap-0.5 truncate"
            >
              <User size={12} />
              {creator}
            </span>
            <span className="text-gray-600">·</span>
            <span
              title={timestamp}
              className="flex items-center gap-0.5 flex-shrink-0"
            >
              <Clock size={12} />
              {formattedTimestamp()}
            </span>
          </div>
        </div>
      </div>

      {audioUrl && (
        <div className="h-10 w-full md:flex-1 md:min-w-[100px] md:max-w-[300px] md:mx-2 md:order-3">
          <WaveformVisualizer isAnimated={isPlaying} height="h-full" />
        </div>
      )}
      {!audioUrl && (
        <div className="h-10 w-full md:flex-1 md:min-w-[100px] md:max-w-[300px] md:mx-2 md:order-3"></div>
      )}

      <div className="flex items-center justify-between md:justify-start gap-3 md:order-4 flex-shrink-0">
        <div className="flex md:hidden items-center gap-2 flex-shrink-0">
          {audioUrl && (
            <Toggle
              size="sm"
              pressed={isPlaying}
              onPressedChange={togglePlayback}
              className={`${toggleBaseClasses} ${
                isPlaying ? toggleActiveClasses : toggleInactiveClasses
              }`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Toggle>
          )}
          <Toggle
            size="sm"
            pressed={isLooping}
            onPressedChange={toggleLoop}
            className={`${toggleBaseClasses} ${
              isLooping ? loopToggleActiveClasses : toggleInactiveClasses
            }`}
            aria-label="Loop"
          >
            <Repeat size={16} />
          </Toggle>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Toggle
            size="sm"
            pressed={isMuted}
            onPressedChange={toggleMute}
            className={`${toggleBaseClasses} ${
              isMuted ? muteToggleActiveClasses : toggleInactiveClasses
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume size={16} />}
          </Toggle>
          <Slider
            value={isMuted ? [0] : [volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            disabled={isMuted}
            className={`${
              isMuted ? "opacity-50 cursor-not-allowed" : ""
            } w-16 sm:w-20 md:w-24 flex-shrink [&>span:first-child]:h-1.5 [&>span>span]:bg-gradient-to-r [&>span>span]:from-blue-500 [&>span>span]:to-purple-600`}
            aria-label="Volume"
          />
          <span className="font-mono text-sm text-gray-300 w-10 text-right flex-shrink-0">
            {formatTime(trackDuration ?? 0)}
          </span>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete"
              className="h-7 w-7 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-full p-1 flex-shrink-0"
            >
              <Trash2 size={14} />
            </Button>
          )}
          {!isOwner && <div className="h-7 w-7 flex-shrink-0"></div>}
        </div>
      </div>
    </div>
  );
};

export default TrackItem;
