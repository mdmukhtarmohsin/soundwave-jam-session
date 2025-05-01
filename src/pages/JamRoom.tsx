import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Globe, Share, Download, Play, Pause, Copy } from "lucide-react";
import Header from "@/components/Header";
import Recorder from "@/components/Recorder";
import TrackList from "@/components/TrackList";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { audioEngine } from "@/services/AudioEngine";
import { JamRoom as JamRoomType, Track } from "@/types/database";

type Collaborator = {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isRecording: boolean;
};

const JamRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getJamRoomById,
    updateJamRoom,
    getTracksByJamRoomId,
    uploadTrack,
    deleteTrack,
  } = useSupabase();

  const [jamRoom, setJamRoom] = useState<JamRoomType | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [roomTitle, setRoomTitle] = useState("Loading...");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load jam room data
  useEffect(() => {
    if (!id) {
      toast.error("Invalid room ID");
      navigate("/dashboard");
      return;
    }

    loadJamRoom();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      loadTracks();
    }, 10000);

    return () => {
      clearInterval(interval);
      audioEngine.cleanUp();
    };
  }, [id]);

  const loadJamRoom = async () => {
    setIsLoadingRoom(true);

    try {
      const room = await getJamRoomById(id!);
      if (!room) {
        toast.error("Jam room not found");
        navigate("/dashboard");
        return;
      }

      setJamRoom(room);
      setRoomTitle(room.title);
      setIsPrivate(room.is_private);
      setIsHost(room.host_id === user?.id);

      // Add host as a collaborator
      setCollaborators([
        {
          id: room.host_id,
          name: room.host?.name || "Unknown host",
          avatar: "",
          isHost: true,
          isRecording: false,
        },
      ]);

      await loadTracks();
    } catch (error) {
      console.error("Failed to load jam room:", error);
      toast.error("Failed to load jam room");
    } finally {
      setIsLoadingRoom(false);
    }
  };

  const loadTracks = async () => {
    if (!id) return;

    try {
      const fetchedTracks = await getTracksByJamRoomId(id);
      setTracks(fetchedTracks);

      // Update collaborators based on tracks
      const uniqueCreators = new Map<
        string,
        { name: string; isHost: boolean }
      >();

      // Add host first
      if (jamRoom) {
        uniqueCreators.set(jamRoom.host_id, {
          name: jamRoom.host?.name || "Unknown host",
          isHost: true,
        });
      }

      // Add other creators
      fetchedTracks.forEach((track) => {
        if (track.creator_id && !uniqueCreators.has(track.creator_id)) {
          uniqueCreators.set(track.creator_id, {
            name: track.creator?.name || "Unknown user",
            isHost: jamRoom ? track.creator_id === jamRoom.host_id : false,
          });
        }
      });

      const updatedCollaborators = Array.from(uniqueCreators.entries()).map(
        ([id, info]) => ({
          id,
          name: info.name,
          avatar: "",
          isHost: info.isHost,
          isRecording: false,
        })
      );

      setCollaborators(updatedCollaborators);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    }
  };

  // Handle title change
  const handleTitleChange = async () => {
    if (!jamRoom || roomTitle === jamRoom.title) return;

    try {
      await updateJamRoom(jamRoom.id, { title: roomTitle });
      toast.success("Room title updated");
    } catch (error) {
      console.error("Failed to update room title:", error);
      toast.error("Failed to update room title");
    }
  };

  // Handle room privacy toggle
  const togglePrivacy = async () => {
    if (!jamRoom || !isHost) return;

    const newPrivacyState = !isPrivate;
    setIsPrivate(newPrivacyState);

    try {
      await updateJamRoom(jamRoom.id, { is_private: newPrivacyState });
      toast(newPrivacyState ? "Room is now private" : "Room is now public");
    } catch (error) {
      console.error("Failed to update room privacy:", error);
      toast.error("Failed to update room privacy");
      setIsPrivate(!newPrivacyState); // Revert UI state
    }
  };

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(id || "");
    toast("Room code copied to clipboard");
  };

  // Handle saving a new loop
  const handleSaveLoop = async (name: string, audioBlob: Blob) => {
    if (!id || !user) return;

    try {
      const track = await uploadTrack(id, audioBlob, name);
      if (track) {
        toast.success("Loop uploaded successfully");
        await loadTracks(); // Reload tracks to include the new one
      }
    } catch (error) {
      console.error("Failed to save loop:", error);
      toast.error("Failed to save loop");
    }
  };

  // --- Add Handler for Deleting Track ---
  const handleDeleteTrack = async (
    trackId: string,
    storagePath?: string | null
  ) => {
    // Optional: Add confirmation dialog here
    // if (!window.confirm('Are you sure you want to delete this track?')) return;

    try {
      const success = await deleteTrack(trackId, storagePath);
      if (success) {
        // Remove track from local state for immediate UI update
        setTracks((prevTracks) => prevTracks.filter((t) => t.id !== trackId));
        // Optional: Could also call loadTracks() again, but filtering is faster
      }
    } catch (error) {
      // Error already handled by toast in useSupabase hook
      console.error("Error during track deletion process:", error);
    }
  };
  // --- End Handler ---

  // Volume change handler
  const handleVolumeChange = (id: string, volume: number) => {
    // Already handled in TrackItem via audioEngine
  };

  // Mute toggle handler
  const handleToggleMute = (id: string, muted: boolean) => {
    // Already handled in TrackItem via audioEngine
  };

  // Play all tracks
  const togglePlayback = () => {
    if (isPlaying) {
      audioEngine.pauseAllTracks();
      setIsPlaying(false);
    } else {
      audioEngine.playAllTracks();
      setIsPlaying(true);
    }
  };

  // Handle export mixdown
  const exportMixdown = async () => {
    setIsProcessingExport(true);

    try {
      const mixdownBlob = await audioEngine.createMixdown();

      // Create object URL for download
      const url = URL.createObjectURL(mixdownBlob);
      setExportUrl(url);
      setExportReady(true);
      toast.success("Mixdown ready for download");
    } catch (error) {
      console.error("Failed to create mixdown:", error);
      toast.error("Failed to create mixdown");
    } finally {
      setIsProcessingExport(false);
    }
  };

  // Download mixdown
  const downloadMixdown = () => {
    if (!exportUrl) return;

    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `${roomTitle.replace(/\s+/g, "_")}_mixdown.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-soundboard-dark text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <WaveformVisualizer
            isAnimated={true}
            height="h-12"
            className="w-48"
          />
          <p className="mt-4 text-white/70">Loading jam room...</p>
        </div>
      </div>
    );
  }

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
                onBlur={handleTitleChange}
                disabled={!isHost}
                className={`text-2xl font-bold bg-transparent border-transparent hover:border-white/10 focus:border-white/20 focus:bg-white/5 p-1 ${
                  !isHost ? "cursor-default" : ""
                }`}
              />
              {isHost && (
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/10 hover:bg-white/5"
                  onClick={togglePrivacy}
                >
                  {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {jamRoom && (
                <>
                  <Badge
                    variant="outline"
                    className="bg-black/50 text-white/90 border-white/10"
                  >
                    {jamRoom.bpm} BPM
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-black/50 text-white/90 border-white/10"
                  >
                    {jamRoom.key}
                  </Badge>
                </>
              )}
              <Badge
                variant={isPrivate ? "destructive" : "secondary"}
                className={`text-white text-xs font-medium border ${
                  isPrivate
                    ? "bg-red-600/80 border-red-500/50"
                    : "bg-green-600/80 border-green-500/50"
                } ${
                  isHost
                    ? "cursor-pointer hover:opacity-80 transition-opacity"
                    : "cursor-default"
                }`}
                onClick={isHost ? togglePrivacy : undefined}
                title={
                  isHost
                    ? isPrivate
                      ? "Click to make public"
                      : "Click to make private"
                    : isPrivate
                    ? "Private Room"
                    : "Public Room"
                }
              >
                {isPrivate ? (
                  <>
                    <Lock size={10} className="inline mr-1" />
                    Private
                  </>
                ) : (
                  <>
                    <Globe size={10} className="inline mr-1" />
                    Public
                  </>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="glass-morphism px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="text-xs text-white/60">Room Code:</span>
              <code className="font-mono text-white">{id}</code>
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
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast("Room link copied to clipboard");
              }}
            >
              <Share size={16} />
            </Button>
          </div>
        </div>

        {/* Collaborators Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Collaborators</h3>
          <div className="flex flex-wrap gap-3">
            {collaborators.map((user) => (
              <div key={user.id} className="flex flex-col items-center gap-1">
                <div
                  className={`relative ${
                    user.isRecording ? "pulse-recording" : ""
                  }`}
                >
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
                  <Badge className="bg-red-500 h-5 text-[10px] font-normal">
                    Recording
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recorder */}
          <div className="lg:col-span-1">
            <Recorder onSaveLoop={handleSaveLoop} />

            {/* Playback Controls */}
            {tracks.length > 0 && (
              <div className="glass-morphism rounded-xl p-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Playback</h3>
                <div className="flex flex-col items-center">
                  <Button
                    onClick={togglePlayback}
                    className="bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-2 mb-4"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span>
                      {isPlaying ? "Pause All Tracks" : "Play All Tracks"}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Export Section */}
            {tracks.length > 0 && (
              <div className="glass-morphism rounded-xl p-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Export Mixdown</h3>

                {exportReady ? (
                  <div className="flex flex-col items-center">
                    <p className="text-white/60 mb-3 text-sm text-center">
                      Your mixdown is ready to download!
                    </p>
                    <Button
                      className="bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-2"
                      onClick={downloadMixdown}
                    >
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
            )}
          </div>

          {/* Right Column - Track List */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-medium mb-4">Tracks</h3>
            <TrackList
              tracks={tracks}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onDeleteTrack={handleDeleteTrack}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JamRoom;
