/*
  # Add response column to doctor_questions table
  
  1. Changes:
    - Add response column to store doctor's response
    - Add response_sent column to track email status
    - Add response_sent_at timestamp
*/

-- Add new columns for response tracking
ALTER TABLE doctor_questions 
ADD COLUMN IF NOT EXISTS response text,
ADD COLUMN IF NOT EXISTS response_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS response_sent_at timestamptz;