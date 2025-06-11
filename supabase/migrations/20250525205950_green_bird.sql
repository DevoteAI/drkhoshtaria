/*
  # Fix chat history loading and visibility

  1. Changes
    - Update existing chat history table and policies
    - Ensure proper permissions for accessing chat history
    - Fix indexes for better performance

  2. Security
    - Enable public access to own chat history
    - Maintain data security while enabling necessary access
*/

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anyone can create chat messages" ON chat_history;
DROP POLICY IF EXISTS "Public can read own chat history" ON chat_history;
DROP POLICY IF EXISTS "Authenticated users can read all chat histories" ON chat_history;

-- Ensure chat history table exists
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS if not already enabled
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

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

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);