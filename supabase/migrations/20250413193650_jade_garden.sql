/*
  # Add chat attachments support

  1. New Tables
    - `chat_attachments`
      - `id` (uuid, primary key)
      - `file_name` (text)
      - `file_type` (text) 
      - `file_size` (bigint)
      - `file_path` (text)
      - `extracted_text` (text)
      - `created_at` (timestamptz)

  2. Storage
    - Creates 'chat-attachments' bucket for storing files

  3. Security
    - Enable RLS
    - Add policies for file access
*/

-- Create chat attachments table
CREATE TABLE IF NOT EXISTS chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  extracted_text text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public chat attachments access"
  ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'chat-attachments');

-- Table policies
CREATE POLICY "Public chat attachments read"
  ON chat_attachments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public chat attachments insert"
  ON chat_attachments
  FOR INSERT
  TO public
  WITH CHECK (true);