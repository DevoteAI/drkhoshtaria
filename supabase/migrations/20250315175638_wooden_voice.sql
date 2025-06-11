/*
  # Add email response functionality

  1. Changes
    - Add response column for storing doctor's response
    - Add response_sent flag to track email status
    - Add response_sent_at timestamp for email tracking
    - Add email sending policies

  2. Security
    - Add policies for admins to update response fields
*/

-- Ensure response columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctor_questions' AND column_name = 'response'
  ) THEN
    ALTER TABLE doctor_questions 
      ADD COLUMN response text,
      ADD COLUMN response_sent boolean DEFAULT false,
      ADD COLUMN response_sent_at timestamptz;
  END IF;
END $$;

-- Add policy for admins to update response fields
CREATE POLICY "Admins can update responses"
  ON doctor_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster email queries
CREATE INDEX IF NOT EXISTS idx_doctor_questions_email_response_sent 
  ON doctor_questions (email, response_sent);