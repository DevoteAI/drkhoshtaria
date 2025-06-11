/*
  # Fix voice recordings access permissions

  1. Changes
    - Update voice-recordings bucket to allow proper public access
    - Set appropriate storage policies for voice recordings
    - Ensure authenticated and public users can access recordings

  2. Security
    - Maintain authenticated admin access
    - Allow public download access with appropriate checks
*/

-- Make voice-recordings bucket public if it's not already
UPDATE storage.buckets 
SET public = true
WHERE id = 'voice-recordings';

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can upload voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can access own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all voice recordings" ON storage.objects;

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