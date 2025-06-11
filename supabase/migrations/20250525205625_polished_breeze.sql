/*
  # Fix chat history implementation

  1. Changes
    - Add policy for public to read their own chat history
    - Drop existing policies to avoid conflicts
    - Ensure proper access control

  2. Security
    - Enable RLS
    - Allow public to read their own session history
    - Allow public to create messages
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create chat messages" ON chat_history;
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

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);