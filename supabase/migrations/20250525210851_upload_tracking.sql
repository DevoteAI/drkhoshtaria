/*
  # Add upload tracking and PDF extraction fields to doctor_question_attachments

  1. Changes
    - Add `upload_status` (text) to track upload success/failure
    - Add `error_message` (text) to store upload error details  
    - Add `extracted_text` (text) to store PDF extracted content
    - Add `pdf_page_count` (integer) to store number of pages in PDFs
    - Add `extraction_method` (text) to track how text was extracted (OCR, standard, etc.)
    
  2. Indexes
    - Add index on upload_status for filtering
*/

-- Add new columns for upload tracking and PDF extraction
ALTER TABLE doctor_question_attachments 
ADD COLUMN IF NOT EXISTS upload_status text DEFAULT 'success',
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS extracted_text text,
ADD COLUMN IF NOT EXISTS pdf_page_count integer,
ADD COLUMN IF NOT EXISTS extraction_method text;

-- Create index for filtering by upload status
CREATE INDEX IF NOT EXISTS idx_attachments_upload_status 
  ON doctor_question_attachments(upload_status);

-- Create index for searching extracted text
CREATE INDEX IF NOT EXISTS idx_attachments_extracted_text
  ON doctor_question_attachments USING gin(to_tsvector('english', extracted_text)); 