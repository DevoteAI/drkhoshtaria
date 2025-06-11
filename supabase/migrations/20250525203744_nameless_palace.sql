/*
  # Add chat history support

  1. New Tables
    - `chat_history`
      - `id` (uuid, primary key)
      - `session_id` (text) - Unique session identifier
      - `user_message` (text) - Message from user
      - `ai_response` (text) - Response from AI
      - `created_at` (timestamptz) - When the message was sent
      - `metadata` (jsonb) - Additional message metadata (attachments, etc)

  2. Security
    - Enable RLS
    - Add policies for access control
*/

CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create index for faster session lookups
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- Allow public to insert chat messages
CREATE POLICY "Anyone can create chat messages"
  ON chat_history
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to read all chat histories
CREATE POLICY "Authenticated users can read all chat histories"
  ON chat_history
  FOR SELECT
  TO authenticated
  USING (true);