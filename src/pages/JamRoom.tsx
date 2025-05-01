import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Lock,
  Globe,
  Copy,
  Share,
  Play,
  Pause,
  Mic,
  Download,
} from "lucide-react";
import Header from "@/components/Header";
import Recorder from "@/components/Recorder";
import TrackList from "@/components/TrackList";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { audioEngine } from "@/services/AudioEngine";
import { JamRoom as JamRoomType, Track } from "@/types/database";
import WaveformVisualizer from "@/components/WaveformVisualizer";

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
  const handleDeleteTrack = useCallback(
    async (trackId: string, storagePath?: string | null) => {
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
    },
    [deleteTrack]
  );
  // --- End Handler ---

  // Volume change handler
  const handleVolumeChange = useCallback(() => {
    // Already handled in TrackItem via audioEngine
  }, []);

  // Mute toggle handler
  const handleToggleMute = useCallback(() => {
    // Already handled in TrackItem via audioEngine
  }, []);

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

  // --- Add back export handlers ---
  const exportMixdown = async () => {
    setIsProcessingExport(true);
    setExportReady(false); // Reset ready state
    setExportUrl(null);
    try {
      const mixdownBlob = await audioEngine.createMixdown();
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

  const downloadMixdown = () => {
    if (!exportUrl) return;
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `${roomTitle.replace(/\s+/g, "_")}_mixdown.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Optionally reset state after download
    // setExportReady(false);
    // setExportUrl(null);
  };
  // --- End export handlers ---

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-soundboard-dark text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <p className="mt-4 text-white/70">Loading jam room...</p>
        </div>
      </div>
    );
  }

  // Simpler card style from image
  const cardClasses =
    "bg-gray-800/60 border border-gray-700/80 rounded-lg p-4 sm:p-6 shadow-md";

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header isAuthenticated={true} />

      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* --- Left Column --- */}
        <div className="md:col-span-1 space-y-6">
          {/* Room Info Card - Reimagined Layout */}
          <div className={`${cardClasses} flex flex-col`}>
            {/* Top Row: Title & Privacy */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
              <h1
                className="text-xl font-semibold truncate pr-2"
                title={roomTitle}
              >
                {roomTitle}
              </h1>
              {/* Clickable Privacy Badge */}
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
                } rounded-md px-2.5 py-1 shadow-sm`}
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
                    <Lock size={12} className="inline mr-1.5" />
                    Private
                  </>
                ) : (
                  <>
                    <Globe size={12} className="inline mr-1.5" />
                    Public
                  </>
                )}
              </Badge>
            </div>

            {/* Middle Row: Metadata (BPM/Key) & Actions */}
            <div className="flex justify-between items-center gap-4">
              {/* Left: BPM/Key */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-gray-700/60 text-gray-300 border-gray-600/80 text-xs font-normal px-2 py-0.5 rounded"
                >
                  {jamRoom?.bpm} BPM
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-gray-700/60 text-gray-300 border-gray-600/80 text-xs font-normal px-2 py-0.5 rounded"
                >
                  {jamRoom?.key}
                </Badge>
              </div>
              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-gray-700/50 hover:bg-gray-600/80 text-gray-300 hover:text-white h-8 w-8 rounded-md p-1.5 border border-gray-600/80"
                  onClick={copyRoomCode}
                  aria-label="Copy room code"
                  title="Copy Room Code"
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-gray-700/50 hover:bg-gray-600/80 text-gray-300 hover:text-white h-8 w-8 rounded-md p-1.5 border border-gray-600/80"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast("Link copied");
                  }}
                  aria-label="Copy room link"
                  title="Copy Share Link"
                >
                  <Share size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Collaborators Card */}
          <div className={cardClasses}>
            <h2 className="text-lg font-semibold mb-4">Collaborators</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {collaborators.map((collabUser) => (
                <div
                  key={collabUser.id}
                  className="flex items-center gap-2 group"
                >
                  <div
                    className={`relative ${
                      collabUser.isRecording ? "animate-pulse" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 border-2 border-soundboard-primary">
                      <AvatarFallback className="bg-soundboard-secondary text-white">
                        {collabUser.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {collabUser.isHost && (
                      <div
                        className="absolute -top-1 -right-1 bg-soundboard-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-800"
                        title="Host"
                      >
                        H
                      </div>
                    )}
                    {collabUser.isRecording && (
                      <div
                        className="absolute bottom-0 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center border border-gray-800"
                        title="Recording"
                      >
                        <Mic size={8} />
                      </div>
                    )}
                  </div>
                  <span
                    className="text-sm text-white/80 truncate group-hover:text-white transition-colors"
                    title={collabUser.name}
                  >
                    {collabUser.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recorder Card */}
          <div className={cardClasses}>
            <Recorder onSaveLoop={handleSaveLoop} />
          </div>
        </div>

        {/* --- Right Column --- */}
        <div className="md:col-span-2 space-y-6">
          {/* --- Global Controls Card (Play All / Export) --- */}
          {tracks.length > 0 && (
            <div
              className={`${cardClasses} flex flex-col sm:flex-row gap-4 justify-between items-center`}
            >
              {/* Play All Button */}
              <Button
                onClick={togglePlayback}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                aria-label={isPlaying ? "Pause all tracks" : "Play all tracks"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>
                  {isPlaying ? "Pause All Tracks" : "Play All Tracks"}
                </span>
              </Button>

              {/* Export Button Area - Combined Logic */}
              {exportReady ? (
                // Show Download button when ready
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                  onClick={downloadMixdown}
                >
                  <Download size={16} />
                  <span>Download Mix</span>
                </Button>
              ) : (
                // Show Export button otherwise
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-gray-700/50 border-gray-600 hover:bg-gray-600/80 text-white/80 hover:text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={exportMixdown}
                  disabled={isProcessingExport}
                >
                  {isProcessingExport ? (
                    <>
                      <WaveformVisualizer
                        height="h-4"
                        className="w-10 mr-1"
                        isAnimated={true}
                      />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Export Mix</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          {/* --- End Global Controls Card --- */}

          {/* Track List Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Tracks ({tracks.length})
            </h2>
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
