/*
  # Make voice-recordings bucket public and configure access policies

  1. Changes
    - Makes voice-recordings bucket public
    - Sets up appropriate public access policies
    - Ensures authenticated users have full access

  2. Security
    - Maintains controlled access
    - Enables public read access for playback
*/

-- Ensure the voice-recordings bucket is public to allow direct access
UPDATE storage.buckets 
SET public = true
WHERE id = 'voice-recordings';

-- Drop any existing conflicting policies to ensure clean slate
DROP POLICY IF EXISTS "Voice recordings public access" ON storage.objects;
DROP POLICY IF EXISTS "Voice recordings upload access" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all voice recordings" ON storage.objects;

-- Create policy for public read access to voice recordings
CREATE POLICY "Voice recordings public access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'voice-recordings');

-- Create policy for upload access
CREATE POLICY "Voice recordings upload access"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'voice-recordings');

-- Create policy for authenticated users to have full access
CREATE POLICY "Admins manage all voice recordings"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'voice-recordings')
  WITH CHECK (bucket_id = 'voice-recordings');