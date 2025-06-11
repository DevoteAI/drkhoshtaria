/*
  # Create storage bucket for question attachments

  1. Changes
    - Create a new storage bucket for storing question attachments
    - Set up public access policies for the bucket

  2. Security
    - Enable public access for authenticated users
    - Allow public to download files
    - Restrict uploads to authenticated users
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-attachments', 'question-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Give users access to own folder"
  ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'question-attachments')
  WITH CHECK (bucket_id = 'question-attachments');

-- Allow public to download files
CREATE POLICY "Allow public to download files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'question-attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'question-attachments');