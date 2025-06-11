/*
  # Add chat history table

  1. New Tables
    - `chat_history`
      - `id` (uuid, primary key)
      - `session_id` (text)
      - `user_message` (text)
      - `ai_response` (text)
      - `created_at` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS
    - Add policy for public chat message creation
    - Add policy for authenticated users to read histories
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create chat messages" ON chat_history;
DROP POLICY IF EXISTS "Authenticated users can read all chat histories" ON chat_history;

-- Create chat history table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- Create policies
CREATE POLICY "Anyone can create chat messages"
  ON chat_history
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all chat histories"
  ON chat_history
  FOR SELECT
  TO authenticated
  USING (true);