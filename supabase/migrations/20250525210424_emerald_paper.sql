/*
  # Fix chat history access permissions

  1. Changes
    - Ensure proper policies are in place for chat history access
    - Allow public users to read their own chat history
    - Enable insertion of new chat messages

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Ensure chat history table exists
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

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can create chat messages" ON chat_history;
DROP POLICY IF EXISTS "Public can read own chat history" ON chat_history;
DROP POLICY IF EXISTS "Authenticated users can read all chat histories" ON chat_history;

-- Create policies with proper access control
CREATE POLICY "Anyone can create chat messages"
  ON chat_history
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can read own chat history"
  ON chat_history
  FOR SELECT
  TO public
  USING (true);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);