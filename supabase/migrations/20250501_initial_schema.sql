
-- Create tables for SoundBoard app

-- Table for jam rooms
CREATE TABLE public.jam_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bpm INTEGER NOT NULL DEFAULT 120,
  key TEXT,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracks within jam rooms
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_room_id UUID NOT NULL REFERENCES public.jam_rooms(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for user profiles with additional info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for jam_rooms
-- Everyone can view public jam rooms
CREATE POLICY "Public jam rooms are viewable by everyone" 
  ON public.jam_rooms FOR SELECT 
  USING (is_private = false);

-- Host can view their own jam rooms
CREATE POLICY "Users can view their own jam rooms" 
  ON public.jam_rooms FOR SELECT 
  USING (auth.uid() = host_id);

-- Host can insert their own jam rooms
CREATE POLICY "Users can insert their own jam rooms" 
  ON public.jam_rooms FOR INSERT 
  WITH CHECK (auth.uid() = host_id);

-- Host can update their own jam rooms
CREATE POLICY "Users can update their own jam rooms" 
  ON public.jam_rooms FOR UPDATE 
  USING (auth.uid() = host_id);

-- Host can delete their own jam rooms
CREATE POLICY "Users can delete their own jam rooms" 
  ON public.jam_rooms FOR DELETE 
  USING (auth.uid() = host_id);

-- Create policies for tracks
-- Anyone can view tracks in public jam rooms
CREATE POLICY "Tracks in public jam rooms are viewable by everyone" 
  ON public.tracks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.jam_rooms 
      WHERE jam_rooms.id = tracks.jam_room_id AND jam_rooms.is_private = false
    )
  );

-- Users can view tracks in their own jam rooms
CREATE POLICY "Users can view tracks in their own jam rooms" 
  ON public.tracks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.jam_rooms 
      WHERE jam_rooms.id = tracks.jam_room_id AND jam_rooms.host_id = auth.uid()
    )
  );

-- Users can insert tracks in any jam room they can access
CREATE POLICY "Users can insert tracks in jam rooms they can access" 
  ON public.tracks FOR INSERT 
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM public.jam_rooms 
      WHERE jam_rooms.id = tracks.jam_room_id AND 
      (jam_rooms.is_private = false OR jam_rooms.host_id = auth.uid())
    )
  );

-- Users can update their own tracks
CREATE POLICY "Users can update their own tracks" 
  ON public.tracks FOR UPDATE 
  USING (auth.uid() = creator_id);

-- Users can delete their own tracks
CREATE POLICY "Users can delete their own tracks" 
  ON public.tracks FOR DELETE 
  USING (auth.uid() = creator_id);

-- Create policies for profiles
-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile when new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
