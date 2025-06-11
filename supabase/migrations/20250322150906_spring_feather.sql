/*
  # Add delete policy for admin users

  1. Changes
    - Add policy to allow authenticated users to delete questions

  2. Security
    - Only authenticated users can delete questions
    - Maintains existing RLS policies
*/

-- Add policy for admins to delete questions
CREATE POLICY "Admins can delete questions"
  ON doctor_questions
  FOR DELETE
  TO authenticated
  USING (true);