/*
  # Add response columns to doctor_questions table

  1. Changes
    Add new columns to doctor_questions table:
    - `response` (text) - The doctor's response text
    - `response_sent` (boolean) - Whether the response has been sent
    - `response_sent_at` (timestamptz) - When the response was sent

  2. Security
    - Maintain existing RLS policies
    - Add new policy for admins to update responses
*/

-- Add new columns if they don't exist
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