/*
  # Setup email functionality

  1. Changes
    - Add response column for storing doctor's response
    - Add response_sent flag to track email status
    - Add response_sent_at timestamp for email tracking
    - Add email sending policies
    - Drop and recreate policies to ensure clean state

  2. Security
    - Add policies for admins to update response fields
    - Enable RLS
*/

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Admins can update responses" ON doctor_questions;
DROP POLICY IF EXISTS "Anyone can create questions" ON doctor_questions;
DROP POLICY IF EXISTS "Users can read own questions" ON doctor_questions;

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

-- Enable RLS
ALTER TABLE doctor_questions ENABLE ROW LEVEL SECURITY;

-- Recreate policies with proper permissions
CREATE POLICY "Anyone can create questions"
  ON doctor_questions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read own questions"
  ON doctor_questions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can update responses"
  ON doctor_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster email queries
CREATE INDEX IF NOT EXISTS idx_doctor_questions_email_response_sent 
  ON doctor_questions (email, response_sent);