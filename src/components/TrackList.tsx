
import React from 'react';
import TrackItem from './TrackItem';

interface Track {
  id: string;
  name: string;
  creator: string;
  timestamp: string;
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
      {tracks.map((track) => (
        <TrackItem
          key={track.id}
          id={track.id}
          name={track.name}
          creator={track.creator}
          timestamp={track.timestamp}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />
      ))}
    </div>
  );
};

export default TrackList;
