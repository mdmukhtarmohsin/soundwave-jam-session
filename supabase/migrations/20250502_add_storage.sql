
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio', 'audio', true);

-- Set up policy to allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio' AND owner = auth.uid());

-- Set up policy to allow public read access to all audio files
CREATE POLICY "Audio files are publicly accessible" 
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');
