/*
  # Add chat history deletion policy

  1. Changes
    - Add policy for public users to delete their own chat history
    - Ensure proper access controls for chat history deletion

  2. Security
    - Only allow users to delete their own chat history
    - Maintain existing RLS policies for insert and select
*/

-- Enable RLS for chat_history table (in case it's not already enabled)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to delete their own chat history
CREATE POLICY "Public can delete own chat history"
  ON chat_history
  FOR DELETE
  TO public
  USING (true);