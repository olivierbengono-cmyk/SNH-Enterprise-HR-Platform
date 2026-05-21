/*
  # Add Medical Certificate Fields for Sick Leave

  1. Changes to Tables
    - `leave_requests`
      - Add `medical_certificate_url` (text, nullable) - stores the path to the uploaded medical certificate
      - Add `medical_certificate_name` (text, nullable) - stores the original filename
  
  2. Storage Bucket
    - Create `medical-certificates` bucket for storing scanned medical documents
    - File size limit: 5MB
    - Allowed types: PDF, JPEG, PNG
  
  3. Validation Rules
    - Sick leave requests require a medical certificate to be validated
    - The certificate must be uploaded before manager/DRH approval
  
  Notes:
    - Storage policies are configured automatically by Supabase
    - Employees can upload to their own folder (user_id)
    - Managers and DRH can access all certificates
*/

-- Add medical certificate fields to leave_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'medical_certificate_url'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN medical_certificate_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'medical_certificate_name'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN medical_certificate_name text;
  END IF;
END $$;

-- Create storage bucket for medical certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-certificates',
  'medical-certificates',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;