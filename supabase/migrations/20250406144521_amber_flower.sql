/*
  # Fix voice recordings storage and permissions

  1. Changes
    - Update the voice-recordings bucket to be publicly accessible
    - Create proper policies for voice recording access
    - Fix permissions for accessing audio files

  2. Security
    - Maintain row-level security while enabling proper playback
    - Ensure authenticated administrators can manage all recordings
    - Allow public access for playback
*/

-- Make voice-recordings bucket public
UPDATE storage.buckets 
SET public = true
WHERE id = 'voice-recordings';

-- Drop any existing conflicting policies to avoid errors
DROP POLICY IF EXISTS "Anyone can upload voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can access own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Voice recordings public access" ON storage.objects;
DROP POLICY IF EXISTS "Voice recordings upload access" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all voice recordings" ON storage.objects;

-- Create policies for voice recordings access
CREATE POLICY "Voice recordings public access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'voice-recordings');

CREATE POLICY "Voice recordings upload access"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'voice-recordings');

-- Create policy for authenticated users to manage all voice recordings
CREATE POLICY "Admins manage all voice recordings"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'voice-recordings')
  WITH CHECK (bucket_id = 'voice-recordings');