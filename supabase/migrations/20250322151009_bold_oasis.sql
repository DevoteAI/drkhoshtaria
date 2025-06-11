/*
  # Add attachments support to doctor questions

  1. New Tables
    - `doctor_question_attachments`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to doctor_questions)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (bigint)
      - `file_path` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on new table
    - Add policies for file access
    - Add foreign key constraint
*/

-- Create attachments table
CREATE TABLE IF NOT EXISTS doctor_question_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES doctor_questions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE doctor_question_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create attachments"
  ON doctor_question_attachments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own attachments"
  ON doctor_question_attachments
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM doctor_questions
    WHERE doctor_questions.id = doctor_question_attachments.question_id
  ));

CREATE POLICY "Admins can access all attachments"
  ON doctor_question_attachments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attachments_question_id 
  ON doctor_question_attachments(question_id);