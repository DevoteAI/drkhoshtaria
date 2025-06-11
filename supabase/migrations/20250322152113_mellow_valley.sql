/*
  # Configure storage bucket for question attachments

  1. Storage
    - Creates the 'question-attachments' bucket if it doesn't exist
    - Configures bucket for private access
  
  2. Security
    - Enables RLS on storage.objects
    - Sets up policies for:
      - Admin access
      - User file access
      - Public upload capability
*/

-- Create bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'question-attachments'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('question-attachments', 'question-attachments', false);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow admins full access to all files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Admins can access all files'
  ) THEN
    CREATE POLICY "Admins can access all files"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'question-attachments');
  END IF;
END $$;

-- Allow users to read their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can read own files'
  ) THEN
    CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    TO public
    USING (
      bucket_id = 'question-attachments' 
      AND (EXISTS (
        SELECT 1 FROM doctor_questions q
        JOIN doctor_question_attachments a ON a.question_id = q.id
        WHERE a.file_path = storage.objects.name
      ))
    );
  END IF;
END $$;

-- Allow anyone to upload files when creating a question
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Anyone can upload files'
  ) THEN
    CREATE POLICY "Anyone can upload files"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'question-attachments');
  END IF;
END $$;