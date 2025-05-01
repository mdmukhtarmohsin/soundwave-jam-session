
import React from 'react';
import TrackItem from './TrackItem';
import { Track } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface ProcessedTrack {
  id: string;
  name: string;
  creator: string;
  timestamp: string;
  audioUrl?: string;
}

interface TrackListProps {
  tracks: Track[];
  onVolumeChange: (id: string, volume: number) => void;
  onToggleMute: (id: string, muted: boolean) => void;
}

const TrackList: React.FC<TrackListProps> = ({ 
  tracks,
  onVolumeChange,
  onToggleMute
}) => {
  // Process tracks for display
  const processedTracks: ProcessedTrack[] = tracks.map(track => ({
    id: track.id,
    name: track.name,
    creator: track.creator?.name || 'Unknown user',
    timestamp: track.created_at,
    audioUrl: track.url
  }));

  if (tracks.length === 0) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-8 flex flex-col items-center justify-center text-center">
        <p className="text-white/60 mb-2">No loops recorded yet</p>
        <p className="text-sm text-white/40">Record your first loop to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {processedTracks.map((track) => (
        <TrackItem
          key={track.id}
          id={track.id}
          name={track.name}
          creator={track.creator}
          timestamp={track.timestamp}
          audioUrl={track.audioUrl}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />
      ))}
    </div>
  );
};

export default TrackList;
