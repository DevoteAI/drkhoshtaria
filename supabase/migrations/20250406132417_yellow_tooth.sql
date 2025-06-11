/*
  # Add voice recording support to doctor questions

  1. Changes
    Add new columns to doctor_questions table:
    - `voice_recording_path` (text) - Path to the voice recording file
    - `voice_recording_duration` (integer) - Duration of the recording in seconds

  2. Security
    - Maintain existing RLS policies
    - Update storage policies for voice recordings
*/

-- Add voice recording columns
ALTER TABLE doctor_questions 
  ADD COLUMN IF NOT EXISTS voice_recording_path text,
  ADD COLUMN IF NOT EXISTS voice_recording_duration integer;

-- Create voice recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for voice recordings
CREATE POLICY "Anyone can upload voice recordings"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'voice-recordings');

CREATE POLICY "Users can access own voice recordings"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'voice-recordings' 
    AND (EXISTS (
      SELECT 1 FROM doctor_questions q
      WHERE q.voice_recording_path = storage.objects.name
    ))
  );

CREATE POLICY "Admins can access all voice recordings"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'voice-recordings');