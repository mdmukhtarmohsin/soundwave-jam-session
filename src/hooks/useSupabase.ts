import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/sonner";
import { JamRoom, Track, Profile } from "@/types/database";

export function useSupabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Jam rooms
  const createJamRoom = async (data: Partial<JamRoom>) => {
    try {
      setLoading(true);

      const { data: jamRoom, error } = await supabase
        .from("jam_rooms")
        .insert({
          title: data.title,
          host_id: user?.id,
          bpm: data.bpm || 120,
          key: data.key || "C Maj",
          is_private: data.is_private !== undefined ? data.is_private : true,
        })
        .select()
        .single();

      if (error) throw error;

      return jamRoom;
    } catch (error: any) {
      toast.error("Failed to create jam room: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getJamRooms = async () => {
    try {
      setLoading(true);

      // Get public jam rooms and user's own jam rooms
      const { data, error } = await supabase
        .from("jam_rooms")
        .select(
          `
          *,
          host:profiles!jam_rooms_host_id_fkey(name),
          tracks(id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      toast.error("Failed to load jam rooms: " + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getJamRoomById = async (id: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("jam_rooms")
        .select(
          `
          *,
          host:profiles!jam_rooms_host_id_fkey(name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      toast.error("Failed to load jam room: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateJamRoom = async (id: string, data: Partial<JamRoom>) => {
    try {
      setLoading(true);

      const { data: jamRoom, error } = await supabase
        .from("jam_rooms")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return jamRoom;
    } catch (error: any) {
      toast.error("Failed to update jam room: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteJamRoom = async (roomId: string) => {
    console.log(`[useSupabase] Attempting to delete room: ${roomId}`);
    setLoading(true);
    try {
      // 1. Fetch all tracks in the room to get storage paths
      console.log(`[useSupabase] Fetching tracks for room ${roomId}...`);
      const { data: tracksToDelete, error: fetchError } = await supabase
        .from("tracks")
        .select("id, storage_path")
        .eq("jam_room_id", roomId);

      if (fetchError) {
        console.error(
          `[useSupabase] Error fetching tracks for room ${roomId}:`,
          fetchError
        );
        throw new Error("Could not fetch room tracks to delete.");
      }
      console.log(
        `[useSupabase] Found ${
          tracksToDelete?.length || 0
        } tracks for room ${roomId}.`
      );

      // 2. Delete associated audio files from storage
      const storagePathsToDelete = tracksToDelete
        ?.map((t) => t.storage_path)
        .filter((p): p is string => !!p); // Filter out null/undefined paths

      if (storagePathsToDelete && storagePathsToDelete.length > 0) {
        console.log(
          `[useSupabase] Deleting ${storagePathsToDelete.length} audio files from storage...`,
          storagePathsToDelete
        );
        const { error: storageError } = await supabase.storage
          .from("audio")
          .remove(storagePathsToDelete);

        if (storageError) {
          // Log storage error but proceed with DB deletion
          console.warn(
            `[useSupabase] Failed to delete some/all audio files from storage for room ${roomId}:`,
            storageError
          );
          toast.warning(
            "Room deleted, but failed to clear some storage files."
          );
        } else {
          console.log(
            `[useSupabase] Successfully deleted audio files from storage.`
          );
        }
      } else {
        console.log(
          `[useSupabase] No storage files to delete for room ${roomId}.`
        );
      }

      // 3. Delete track records from the database
      // This assumes RLS allows the host to delete tracks in their room
      if (tracksToDelete && tracksToDelete.length > 0) {
        console.log(
          `[useSupabase] Deleting ${tracksToDelete.length} track records from database...`
        );
        const { error: trackDeleteError } = await supabase
          .from("tracks")
          .delete()
          .eq("jam_room_id", roomId);

        if (trackDeleteError) {
          console.error(
            `[useSupabase] Error deleting track records for room ${roomId}:`,
            trackDeleteError
          );
          throw new Error("Could not delete associated track records.");
        } else {
          console.log(`[useSupabase] Successfully deleted track records.`);
        }
      }

      // 4. Delete the jam room record itself
      // This assumes RLS allows the host to delete their own room
      console.log(`[useSupabase] Deleting jam_rooms record for ${roomId}...`);
      const { error: roomDeleteError } = await supabase
        .from("jam_rooms")
        .delete()
        .eq("id", roomId);

      if (roomDeleteError) {
        console.error(
          `[useSupabase] Error deleting jam_rooms record ${roomId}:`,
          roomDeleteError
        );
        throw roomDeleteError;
      }
      console.log(
        `[useSupabase] Successfully deleted jam_rooms record ${roomId}.`
      );

      toast.success("Jam Room deleted successfully");
      return true;
    } catch (error: any) {
      console.error(
        `[useSupabase] Failed to delete jam room ${roomId}:`,
        error
      );
      toast.error(
        `Failed to delete jam room: ${error.message || "Unknown error"}`
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Tracks
  const uploadTrack = async (
    jamRoomId: string,
    audioBlob: Blob,
    fileName: string
  ) => {
    try {
      setLoading(true);

      // 1. Upload the audio file to storage
      const filePath = `${
        user?.id
      }/${jamRoomId}/${Date.now()}_${fileName.replace(/\s+/g, "_")}.webm`;

      const { data: fileData, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(filePath, audioBlob, {
          contentType: "audio/webm",
        });

      if (uploadError) throw uploadError;

      // 2. Create the track record in the database
      const { data: track, error: trackError } = await supabase
        .from("tracks")
        .insert({
          jam_room_id: jamRoomId,
          creator_id: user?.id,
          name: fileName,
          storage_path: fileData.path,
        })
        .select()
        .single();

      if (trackError) throw trackError;

      return track;
    } catch (error: any) {
      toast.error("Failed to upload track: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTracksByJamRoomId = async (jamRoomId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tracks")
        .select(
          `
          *,
          creator:profiles!tracks_creator_id_fkey(name)
        `
        )
        .eq("jam_room_id", jamRoomId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get public URLs for the audio files
      const tracksWithUrls = await Promise.all(
        (data || []).map(async (track) => {
          if (track.storage_path) {
            const { data: url } = supabase.storage
              .from("audio")
              .getPublicUrl(track.storage_path);

            return { ...track, url: url.publicUrl };
          }
          return track;
        })
      );

      return tracksWithUrls;
    } catch (error: any) {
      toast.error("Failed to load tracks: " + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // --- Add deleteTrack function ---
  const deleteTrack = async (trackId: string, storagePath?: string | null) => {
    try {
      setLoading(true);

      // 1. Delete the track record from the database
      const { error: dbError } = await supabase
        .from("tracks")
        .delete()
        .eq("id", trackId);

      if (dbError) throw dbError;

      // 2. If database deletion successful and storage path exists, delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("audio")
          .remove([storagePath]);

        if (storageError) {
          // Log storage error but don't necessarily fail the whole operation
          // if the DB record is gone.
          console.warn(
            `Failed to delete track from storage (${storagePath}):`,
            storageError.message
          );
          toast.warning(
            "Track deleted from list, but failed to remove storage file."
          );
        }
      }

      toast.success("Track deleted successfully");
      return true;
    } catch (error: any) {
      console.error("Failed to delete track:", error);
      toast.error("Failed to delete track: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  // --- End deleteTrack function ---

  // User profile
  const getUserProfile = async (userId?: string) => {
    const profileId = userId || user?.id;
    if (!profileId) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<Profile>) => {
    if (!user) return null;

    try {
      setLoading(true);

      const { data: profile, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      return profile;
    } catch (error: any) {
      toast.error("Failed to update profile: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    // Jam rooms
    createJamRoom,
    getJamRooms,
    getJamRoomById,
    updateJamRoom,
    deleteJamRoom,
    // Tracks
    uploadTrack,
    getTracksByJamRoomId,
    deleteTrack,
    // Profile
    getUserProfile,
    updateUserProfile,
  };
}
