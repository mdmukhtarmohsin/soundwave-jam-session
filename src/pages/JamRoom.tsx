import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  PlayCircle,
  RefreshCcw,
  Trash2,
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
    deleteJamRoom,
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
  const [isExporting, setIsExporting] = useState(false);
  const [mixedAudioUrl, setMixedAudioUrl] = useState<string | null>(null);
  const [isPlayingMix, setIsPlayingMix] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const mixAudioRef = useRef<HTMLAudioElement | null>(null);

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
        // --- Add cleanup step FIRST ---
        console.log(
          `[handleDeleteTrack] Attempting AudioEngine cleanup for track: ${trackId}`
        );
        audioEngine.removeTrack(trackId);
        console.log(
          `[handleDeleteTrack] AudioEngine cleanup called for track: ${trackId}`
        );
        // -----------------------------

        const success = await deleteTrack(trackId, storagePath);
        console.log(
          `[handleDeleteTrack] Supabase delete result for ${trackId}: ${success}`
        );

        if (success) {
          console.log(
            `[handleDeleteTrack] Updating state to remove track: ${trackId}`
          );
          setTracks((prevTracks) => {
            const updatedTracks = prevTracks.filter((t) => t.id !== trackId);
            console.log(
              `[handleDeleteTrack] State update complete. New track count: ${updatedTracks.length}`
            );
            return updatedTracks;
          });
        } else {
          console.warn(
            `[handleDeleteTrack] Supabase delete failed for track: ${trackId}. State not updated.`
          );
          // Optionally add a user-facing message here if needed,
          // although the hook likely showed a toast already.
        }
      } catch (error) {
        // Log any unexpected errors during the process (e.g., if audioEngine.removeTrack fails)
        console.error(
          `[handleDeleteTrack] Unexpected error during deletion process for ${trackId}:`,
          error
        );
        toast.error("An unexpected error occurred while deleting the track.");
      }
    },
    [deleteTrack] // Assuming audioEngine is stable and doesn't need to be in dependency array
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

  // Effect for AudioEngine event listeners - runs once on mount/unmount
  useEffect(() => {
    console.log("[JamRoom Effect] Setting up AudioEngine listeners.");

    const handleExportStart = () => {
      console.log("[JamRoom] handleExportStart triggered.");
      setIsExporting(true);
      // Clear previous state and stop playback
      setMixedAudioUrl(null);
      setIsPlayingMix(false);
      if (mixAudioRef.current) {
        console.log(
          "[JamRoom handleExportStart] Pausing and clearing existing mix audio."
        );
        mixAudioRef.current.pause();
        mixAudioRef.current.removeAttribute("src"); // More reliable than src = ""
        mixAudioRef.current.load(); // Reset element state
      }
      // Revoke previous URL if it exists
      const previousUrl = mixedAudioUrl; // Capture current value before state update
      if (previousUrl) {
        console.log(
          `[JamRoom handleExportStart] Revoking previous Object URL: ${previousUrl}`
        );
        URL.revokeObjectURL(previousUrl);
      }
    };

    const handleExportComplete = (data: { blob: Blob; url: string } | null) => {
      console.log("[JamRoom] handleExportComplete triggered.");
      setIsExporting(false);
      if (data?.url) {
        setMixedAudioUrl(data.url); // Set state for UI updates
        toast.success("Mix ready!");
        console.log(
          `[JamRoom handleExportComplete] Mix ready. URL: ${data.url}`
        );

        // Ensure audio element exists and listeners are attached
        if (!mixAudioRef.current) {
          console.log(
            "[JamRoom handleExportComplete] Creating new Audio element."
          );
          mixAudioRef.current = new Audio();
          // Attach listeners only once when element is created
          mixAudioRef.current.addEventListener("ended", handleMixEnded);
          mixAudioRef.current.addEventListener("pause", handleMixPaused);
          mixAudioRef.current.addEventListener("play", handleMixPlayed);
          mixAudioRef.current.addEventListener("playing", handleMixPlaying);
          mixAudioRef.current.addEventListener("error", handleMixError);
          mixAudioRef.current.addEventListener("canplay", handleMixCanPlay);
          mixAudioRef.current.addEventListener("loadstart", handleMixLoadStart);
          mixAudioRef.current.addEventListener(
            "loadeddata",
            handleMixLoadedData
          );
        }

        console.log(
          `[JamRoom handleExportComplete] Setting mix audio src: ${data.url}`
        );
        mixAudioRef.current.src = data.url;
        console.log(`[JamRoom handleExportComplete] Calling mix audio load()`);
        mixAudioRef.current.load(); // Load the new source
      } else {
        toast.error("Mix generation failed.");
        setMixedAudioUrl(null);
        console.log(
          "[JamRoom handleExportComplete] Mix generation reported failed by AudioEngine."
        );
      }
    };

    const handleExportError = (error: any) => {
      console.log("[JamRoom] handleExportError triggered.");
      setIsExporting(false);
      setMixedAudioUrl(null);
      setIsPlayingMix(false);
      if (mixAudioRef.current) {
        mixAudioRef.current.pause();
        mixAudioRef.current.removeAttribute("src");
        mixAudioRef.current.load();
      }
      console.error("Export failed:", error);

      // Display the specific error message from the engine
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during export.";
      toast.error(`Export failed: ${errorMessage}`);
    };

    // Define event handlers separately for clarity and easier removal
    const handleMixEnded = () => {
      console.log("[JamRoom MixAudio] Event: ended");
      setIsPlayingMix(false);
    };
    const handleMixPaused = () => {
      console.log("[JamRoom MixAudio] Event: pause");
      setIsPlayingMix(false);
    };
    const handleMixPlayed = () => {
      console.log("[JamRoom MixAudio] Event: play");
      setIsPlayingMix(true);
    };
    const handleMixPlaying = () => {
      console.log("[JamRoom MixAudio] Event: playing");
      setIsPlayingMix(true);
    };
    const handleMixError = (e: Event) => {
      console.error(
        "[JamRoom MixAudio] Event: error",
        e,
        mixAudioRef.current?.error
      );
      setIsPlayingMix(false);
      toast.error("Error playing mix.");
    };
    const handleMixCanPlay = () => {
      console.log("[JamRoom MixAudio] Event: canplay");
    };
    const handleMixLoadStart = () => {
      console.log("[JamRoom MixAudio] Event: loadstart");
    };
    const handleMixLoadedData = () => {
      console.log("[JamRoom MixAudio] Event: loadeddata");
    };

    // Register AudioEngine listeners
    audioEngine.on("export_start", handleExportStart);
    audioEngine.on("export_complete", handleExportComplete);
    audioEngine.on("export_error", handleExportError);

    // Cleanup function for component unmount
    return () => {
      console.log(
        "[JamRoom Effect Cleanup] Unregistering AudioEngine listeners and cleaning up mix audio."
      );
      // Unregister AudioEngine listeners
      audioEngine.off("export_start", handleExportStart);
      audioEngine.off("export_complete", handleExportComplete);
      audioEngine.off("export_error", handleExportError);

      // Cleanup mix audio element and listeners
      if (mixAudioRef.current) {
        console.log(
          "[JamRoom Effect Cleanup] Pausing, removing listeners, and nullifying mix audio ref."
        );
        mixAudioRef.current.pause();
        mixAudioRef.current.removeEventListener("ended", handleMixEnded);
        mixAudioRef.current.removeEventListener("pause", handleMixPaused);
        mixAudioRef.current.removeEventListener("play", handleMixPlayed);
        mixAudioRef.current.removeEventListener("playing", handleMixPlaying);
        mixAudioRef.current.removeEventListener("error", handleMixError);
        mixAudioRef.current.removeEventListener("canplay", handleMixCanPlay);
        mixAudioRef.current.removeEventListener(
          "loadstart",
          handleMixLoadStart
        );
        mixAudioRef.current.removeEventListener(
          "loadeddata",
          handleMixLoadedData
        );
        mixAudioRef.current.removeAttribute("src");
        mixAudioRef.current.load(); // Reset
        mixAudioRef.current = null;
      }

      // Revoke object URL using the state variable at the time of cleanup
      const finalUrl = mixedAudioUrl;
      if (finalUrl) {
        console.log(
          `[JamRoom Effect Cleanup] Revoking Object URL: ${finalUrl}`
        );
        URL.revokeObjectURL(finalUrl);
      }
    };
  }, []); // <-- EMPHASIS: Empty dependency array

  // --- Updated Export Handling ---

  const handleExport = async () => {
    if (isExporting) return;
    try {
      await audioEngine.mixAndExportTracks();
    } catch (error) {
      console.error("Error initiating export:", error);
      toast.error("Could not start export.");
      setIsExporting(false);
      setMixedAudioUrl(null);
    }
  };

  const togglePlayMix = () => {
    console.log("[JamRoom] togglePlayMix called.");
    if (!mixAudioRef.current) {
      console.warn(
        "[JamRoom] togglePlayMix: mixAudioRef is null! Cannot play/pause."
      );
      return;
    }
    // Log current state before action
    console.log(
      `[JamRoom] togglePlayMix: isPlayingMix=${isPlayingMix}, audio.src=${mixAudioRef.current.src}, audio.readyState=${mixAudioRef.current.readyState}, audio.paused=${mixAudioRef.current.paused}`
    );

    if (isPlayingMix || !mixAudioRef.current.paused) {
      console.log("[JamRoom] togglePlayMix: Attempting to pause...");
      mixAudioRef.current.pause();
    } else {
      console.log("[JamRoom] togglePlayMix: Attempting to play...");
      mixAudioRef.current
        .play()
        .then(() =>
          console.log("[JamRoom] togglePlayMix: play() promise resolved.")
        )
        .catch((err) => {
          console.error(
            "[JamRoom] togglePlayMix: play() promise rejected:",
            err
          );
          toast.error(`Could not play mix: ${err.message}`);
          setIsPlayingMix(false);
        });
    }
    // State updates (setIsPlayingMix) are handled by the event listeners attached in useEffect
  };

  const downloadMix = () => {
    if (!mixedAudioUrl || !jamRoom) return;
    const fileName = `${jamRoom.title.replace(/\s+/g, "_")}_mix.wav`;
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = mixedAudioUrl;
    a.download = fileName;
    a.click();
    document.body.removeChild(a);
  };

  const handleMixAgain = () => {
    if (mixedAudioUrl) {
      URL.revokeObjectURL(mixedAudioUrl);
    }
    setMixedAudioUrl(null);
    setIsPlayingMix(false);
    if (mixAudioRef.current) {
      mixAudioRef.current.pause();
      mixAudioRef.current.src = "";
    }
    handleExport();
  };

  // --- End Updated Export Handling ---

  // --- Add Handler for Deleting Room ---
  const handleDeleteRoom = async () => {
    if (!isHost || !id || isDeleting) return; // Only host can delete, prevent double clicks

    if (
      window.confirm(
        "Are you sure you want to permanently delete this Jam Room and all its tracks? This cannot be undone."
      )
    ) {
      setIsDeleting(true);
      try {
        const success = await deleteJamRoom(id);
        if (success) {
          toast.success("Jam Room deleted.");
          navigate("/dashboard"); // Redirect to dashboard after successful deletion
        } else {
          // Error toast is likely shown by the hook already
          console.warn(
            `[JamRoom] Delete failed for room ${id} (hook returned false).`
          );
          setIsDeleting(false); // Re-enable button if delete failed
        }
      } catch (error) {
        console.error(
          `[JamRoom] Unexpected error during room deletion ${id}:`,
          error
        );
        toast.error("An unexpected error occurred while deleting the room.");
        setIsDeleting(false); // Re-enable button on unexpected error
      }
      // No finally block needed for setIsDeleting here, only reset on failure
    }
  };
  // --- End Handler ---

  // --- Add Effect for listening to all_tracks_ended ---
  useEffect(() => {
    console.log("[JamRoom Effect] Setting up listener for all_tracks_ended.");

    const handleAllTracksEnded = () => {
      console.log(
        "[JamRoom] Received all_tracks_ended event. Setting isPlaying to false."
      );
      setIsPlaying(false); // Reset the main playback button state
    };

    audioEngine.on("all_tracks_ended", handleAllTracksEnded);

    return () => {
      console.log(
        "[JamRoom Effect Cleanup] Unregistering all_tracks_ended listener."
      );
      audioEngine.off("all_tracks_ended", handleAllTracksEnded);
    };
  }, []); // Empty dependency array: run once on mount/unmount
  // --- End Effect ---

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
                {isHost && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="bg-red-800/70 hover:bg-red-700/90 border border-red-600/80 text-red-100 hover:text-white h-8 w-8 rounded-md p-1.5"
                    onClick={handleDeleteRoom}
                    disabled={isDeleting}
                    aria-label="Delete room"
                    title="Delete Room Permanently"
                  >
                    {isDeleting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </Button>
                )}
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
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                {isExporting ? (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-gray-700/50 border-gray-600 text-white/80 flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md disabled:opacity-100 cursor-default"
                    disabled
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mixing...</span>
                  </Button>
                ) : mixedAudioUrl ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto bg-green-700/80 border-green-600 hover:bg-green-600/90 text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                      onClick={togglePlayMix}
                    >
                      {isPlayingMix ? (
                        <Pause size={16} />
                      ) : (
                        <PlayCircle size={16} />
                      )}
                      <span>{isPlayingMix ? "Pause Mix" : "Play Mix"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto bg-blue-700/80 border-blue-600 hover:bg-blue-600/90 text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                      onClick={downloadMix}
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto bg-gray-700/50 border-gray-600 hover:bg-gray-600/80 text-white/80 hover:text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                      onClick={handleMixAgain}
                    >
                      <RefreshCcw size={16} />
                      <span>Mix Again</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-gray-700/50 border-gray-600 hover:bg-gray-600/80 text-white/80 hover:text-white flex items-center justify-center gap-2 shadow-md py-2.5 px-5 rounded-md"
                    onClick={handleExport}
                    disabled={tracks.length === 0}
                  >
                    <Download size={16} />
                    <span>Export Mix</span>
                  </Button>
                )}
              </div>
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
