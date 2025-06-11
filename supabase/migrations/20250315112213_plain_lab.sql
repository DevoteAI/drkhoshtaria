/*
  # Create doctor questions table

  1. New Tables
    - `doctor_questions`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, not null)
      - `phone` (text)
      - `question` (text, not null)
      - `created_at` (timestamptz)
      - `answered` (boolean)
      - `answered_at` (timestamptz)

  2. Security
    - Enable RLS on `doctor_questions` table
    - Add policy for authenticated users to read their own questions
    - Add policy for anyone to create questions
*/

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

ALTER TABLE doctor_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create questions
CREATE POLICY "Anyone can create questions"
  ON doctor_questions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can read their own questions based on email
CREATE POLICY "Users can read own questions"
  ON doctor_questions
  FOR SELECT
  TO public
  USING (email = current_user);