
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Lock, Globe, Share, Download, Clipboard, Copy } from 'lucide-react';
import Header from '@/components/Header';
import Recorder from '@/components/Recorder';
import TrackList from '@/components/TrackList';
import WaveformVisualizer from '@/components/WaveformVisualizer';

type Track = {
  id: string;
  name: string;
  creator: string;
  timestamp: string;
};

// Mocked collaborators
const mockCollaborators = [
  { id: '1', name: 'You', avatar: '', isHost: true, isRecording: false },
  { id: '2', name: 'JazzCat', avatar: '', isRecording: true },
  { id: '3', name: 'BeatsProducer', avatar: '', isRecording: false },
];

const JamRoom = () => {
  const { id } = useParams<{ id: string }>();
  const [roomTitle, setRoomTitle] = useState('Funk Session #3');
  const [isPrivate, setIsPrivate] = useState(true);
  const [bpm] = useState(110);
  const [key] = useState('C Min');
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 't1',
      name: 'Bass Groove',
      creator: 'You',
      timestamp: '5 min ago',
    },
    {
      id: 't2',
      name: 'Drum Loop',
      creator: 'JazzCat',
      timestamp: '3 min ago',
    },
    {
      id: 't3',
      name: 'Piano Chords',
      creator: 'BeatsProducer',
      timestamp: '2 min ago',
    },
  ]);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportReady, setExportReady] = useState(false);

  // Save loop from recorder
  const handleSaveLoop = (name: string, audioBlob: Blob) => {
    // In a real app, we would process the audioBlob here
    const newTrack: Track = {
      id: `t${Date.now()}`,
      name,
      creator: 'You',
      timestamp: 'Just now',
    };
    
    setTracks([newTrack, ...tracks]);
  };

  // Volume change handler
  const handleVolumeChange = (id: string, volume: number) => {
    console.log(`Changed volume for ${id} to ${volume}%`);
    // This would adjust the actual audio volume in a real app
  };

  // Mute toggle handler
  const handleToggleMute = (id: string, muted: boolean) => {
    console.log(`Track ${id} ${muted ? 'muted' : 'unmuted'}`);
    // This would mute/unmute the track in a real app
  };

  // Handle room privacy toggle
  const togglePrivacy = () => {
    setIsPrivate(!isPrivate);
    toast(isPrivate ? 'Room is now public' : 'Room is now private');
  };

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(id || '123456');
    toast('Room code copied to clipboard');
  };

  // Handle export mixdown
  const exportMixdown = () => {
    setIsProcessingExport(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessingExport(false);
      setExportReady(true);
      toast.success('Mixdown ready for download');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header isAuthenticated={true} />
      
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-transparent hover:border-white/10 focus:border-white/20 focus:bg-white/5 p-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="border-white/10 hover:bg-white/5"
                onClick={togglePrivacy}
              >
                {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-black/50 text-white/90 border-white/10">
                {bpm} BPM
              </Badge>
              <Badge variant="outline" className="bg-black/50 text-white/90 border-white/10">
                {key}
              </Badge>
              <Badge variant={isPrivate ? 'default' : 'secondary'} className={isPrivate ? 'bg-soundboard-primary' : ''}>
                {isPrivate ? 'Private' : 'Public'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="glass-morphism px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="text-xs text-white/60">Room Code:</span>
              <code className="font-mono text-white">{id || '123456'}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                onClick={copyRoomCode}
              >
                <Copy size={14} />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 hover:bg-white/5"
            >
              <Share size={16} />
            </Button>
          </div>
        </div>
        
        {/* Collaborators Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Collaborators</h3>
          <div className="flex flex-wrap gap-3">
            {mockCollaborators.map((user) => (
              <div key={user.id} className="flex flex-col items-center gap-1">
                <div className={`relative ${user.isRecording ? 'pulse-recording' : ''}`}>
                  <Avatar className="h-12 w-12 border-2 border-soundboard-primary">
                    <AvatarFallback className="bg-soundboard-secondary text-white">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {user.isHost && (
                    <div className="absolute -top-1 -right-1 bg-soundboard-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      H
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/80">{user.name}</span>
                {user.isRecording && (
                  <Badge className="bg-red-500 h-5 text-[10px] font-normal">Recording</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recorder */}
          <div className="lg:col-span-1">
            <Recorder onSaveLoop={handleSaveLoop} />
            
            {/* Export Section */}
            <div className="glass-morphism rounded-xl p-6 mt-6">
              <h3 className="text-lg font-medium mb-4">Export Mixdown</h3>
              
              {exportReady ? (
                <div className="flex flex-col items-center">
                  <p className="text-white/60 mb-3 text-sm text-center">Your mixdown is ready to download!</p>
                  <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-2">
                    <Download size={16} />
                    <span>Download Mix</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-white/60 mb-3 text-sm text-center">
                    Mixes all active tracks into one audio file
                  </p>
                  <Button 
                    onClick={exportMixdown} 
                    disabled={isProcessingExport}
                    className="bg-soundboard-primary hover:bg-soundboard-primary/80"
                  >
                    {isProcessingExport ? (
                      <span className="flex items-center gap-2">
                        <WaveformVisualizer height="h-4" className="w-16" />
                        <span>Processing...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Download size={16} />
                        <span>Export Mixdown</span>
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Track List */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-medium mb-4">Tracks</h3>
            <TrackList 
              tracks={tracks} 
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JamRoom;
