
export interface JamRoom {
  id: string;
  title: string;
  host_id: string;
  bpm: number;
  key: string;
  is_private: boolean;
  created_at: string;
}

export interface Track {
  id: string;
  jam_room_id: string;
  creator_id: string;
  name: string;
  storage_path: string;
  created_at: string;
  url?: string;
  creator?: {
    name: string;
  };
}

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
}
