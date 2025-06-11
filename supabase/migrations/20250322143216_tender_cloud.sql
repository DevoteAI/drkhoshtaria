/*
  # Add AI response columns to doctor_questions table

  1. Changes
    Add new columns to doctor_questions table:
    - `ai_response` (text) - The initial AI response
    - `ai_response_at` (timestamptz) - When the AI response was generated

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns for AI response
ALTER TABLE doctor_questions 
  ADD COLUMN IF NOT EXISTS ai_response text,
  ADD COLUMN IF NOT EXISTS ai_response_at timestamptz;