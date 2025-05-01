import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { User, Clock, Play, Pause, Repeat, Trash2 } from "lucide-react";
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
  onDelete,
}) => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trackDuration, setTrackDuration] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const isOwner = user?.id === creatorId;

  useEffect(() => {
    if (audioUrl && !isLoaded) {
      audioEngine.addTrack(id, audioUrl);
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
    "transition-colors h-8 w-8 data-[state=on]:text-white";
  const toggleInactiveClasses =
    "bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-gray-200";
  const toggleActiveClasses =
    "bg-soundboard-primary hover:bg-soundboard-primary/80";
  const loopToggleActiveClasses = "bg-purple-600 hover:bg-purple-700";

  return (
    <div className="bg-gray-800/60 border border-gray-700/80 rounded-lg p-4 flex items-center justify-between gap-4 shadow-sm hover:border-gray-600/90 transition-colors">
      <div className="flex items-center gap-2 flex-shrink-0">
        {audioUrl && (
          <Toggle
            size="sm"
            pressed={isPlaying}
            onPressedChange={togglePlayback}
            className={`${toggleBaseClasses} ${
              isPlaying ? toggleActiveClasses : toggleInactiveClasses
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
          className={`${toggleBaseClasses} ${
            isLooping ? loopToggleActiveClasses : toggleInactiveClasses
          }`}
          aria-label={isLooping ? "Disable loop" : "Enable loop"}
        >
          <Repeat size={16} />
        </Toggle>
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className="font-medium text-white truncate text-sm leading-tight"
          title={name}
        >
          {name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
          <span title={creator} className="flex items-center gap-0.5">
            <User size={12} />
            {creator}
          </span>
          <span>·</span>
          <span title={timestamp} className="flex items-center gap-0.5">
            <Clock size={12} />
            {formattedTimestamp()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono text-sm text-gray-300">
          {formatTime(trackDuration ?? 0)}
        </span>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete track"
            className="h-7 w-7 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-full p-1"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TrackItem;
