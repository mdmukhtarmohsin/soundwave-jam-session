
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { JamRoom, Track, Profile } from '@/types/database';

export function useSupabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Jam rooms
  const createJamRoom = async (data: Partial<JamRoom>) => {
    try {
      setLoading(true);
      
      const { data: jamRoom, error } = await supabase
        .from('jam_rooms')
        .insert({
          title: data.title,
          host_id: user?.id,
          bpm: data.bpm || 120,
          key: data.key || 'C Maj',
          is_private: data.is_private !== undefined ? data.is_private : true
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return jamRoom;
    } catch (error: any) {
      toast.error('Failed to create jam room: ' + error.message);
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
        .from('jam_rooms')
        .select(`
          *,
          host:profiles!jam_rooms_host_id_fkey(name),
          tracks(id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error: any) {
      toast.error('Failed to load jam rooms: ' + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getJamRoomById = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('jam_rooms')
        .select(`
          *,
          host:profiles!jam_rooms_host_id_fkey(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast.error('Failed to load jam room: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateJamRoom = async (id: string, data: Partial<JamRoom>) => {
    try {
      setLoading(true);
      
      const { data: jamRoom, error } = await supabase
        .from('jam_rooms')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return jamRoom;
    } catch (error: any) {
      toast.error('Failed to update jam room: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteJamRoom = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('jam_rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      toast.error('Failed to delete jam room: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Tracks
  const uploadTrack = async (jamRoomId: string, audioBlob: Blob, fileName: string) => {
    try {
      setLoading(true);
      
      // 1. Upload the audio file to storage
      const filePath = `${user?.id}/${jamRoomId}/${Date.now()}_${fileName.replace(/\s+/g, '_')}.webm`;
      
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm'
        });
      
      if (uploadError) throw uploadError;
      
      // 2. Create the track record in the database
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert({
          jam_room_id: jamRoomId,
          creator_id: user?.id,
          name: fileName,
          storage_path: fileData.path
        })
        .select()
        .single();
      
      if (trackError) throw trackError;
      
      return track;
    } catch (error: any) {
      toast.error('Failed to upload track: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTracksByJamRoomId = async (jamRoomId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          creator:profiles!tracks_creator_id_fkey(name)
        `)
        .eq('jam_room_id', jamRoomId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get public URLs for the audio files
      const tracksWithUrls = await Promise.all(
        (data || []).map(async (track) => {
          if (track.storage_path) {
            const { data: url } = supabase.storage
              .from('audio')
              .getPublicUrl(track.storage_path);
            
            return { ...track, url: url.publicUrl };
          }
          return track;
        })
      );
      
      return tracksWithUrls;
    } catch (error: any) {
      toast.error('Failed to load tracks: ' + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // User profile
  const getUserProfile = async (userId?: string) => {
    const profileId = userId || user?.id;
    if (!profileId) return null;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Failed to load profile:', error);
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
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return profile;
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
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
    // Profile
    getUserProfile,
    updateUserProfile
  };
}
