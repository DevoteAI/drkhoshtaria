/*
  # Create doctor questions table and policies

  1. New Tables
    - `doctor_questions`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `email` (text, required)
      - `phone` (text, optional)
      - `question` (text, required)
      - `created_at` (timestamp with time zone)
      - `answered` (boolean)
      - `answered_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `doctor_questions` table
    - Add policy for public to create questions
    - Add policy for users to read their own questions based on email
*/

-- Create the doctor_questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS doctor_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  question text NOT NULL,
  created_at timestamptz DEFAULT now(),
  answered boolean DEFAULT false,
  answered_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE doctor_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can create questions" ON doctor_questions;
  DROP POLICY IF EXISTS "Users can read own questions" ON doctor_questions;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Anyone can create questions"
  ON doctor_questions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read own questions"
  ON doctor_questions
  FOR SELECT
  TO public
  USING (email = CURRENT_USER);

-- Create index for email lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS doctor_questions_email_idx ON doctor_questions (email);