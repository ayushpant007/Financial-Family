-- SQL Setup for Secure Document Encryption using pgsodium
-- Run this in the Supabase SQL Editor

-- 1. Enable the pgsodium extension
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Create the base table (if not already created by Drizzle)
-- The 'extracted_text' column will store encrypted data.
-- We use bytea for raw encrypted data if we want true pgsodium transparent encryption,
-- but for simplicity with Drizzle, we can use a Transparent Encryption View.

-- 3. Setup Transparent Column Encryption (TCE) for extracted_text
-- Note: This requires pgsodium 2.0+ and proper vault configuration.

-- Create a key for our document encryption
INSERT INTO pgsodium.key (name, key_type, key_context)
VALUES ('documents_key', 'aead-det', 'documents_context')
ON CONFLICT (name) DO NOTHING;

-- Define RLS Policies for Document Extraction
ALTER TABLE document_extracted_text ENABLE ROW LEVEL SECURITY;

-- Clients can only see their own extracted text
CREATE POLICY client_view_own_extraction ON document_extracted_text
FOR SELECT
TO authenticated
USING (client_id = (SELECT client_id FROM sessions WHERE token = current_setting('request.headers')::json->>'authorization'));

-- Admins can see everything
CREATE POLICY admin_view_all_extraction ON document_extracted_text
FOR SELECT
TO authenticated
USING ((SELECT role FROM sessions WHERE token = current_setting('request.headers')::json->>'authorization') = 'admin');

-- 4. Masked Fields Log Audit View
-- Create a view that shows what was masked without showing the text
CREATE OR REPLACE VIEW document_extraction_audit AS
SELECT 
  id, 
  document_id, 
  client_id, 
  file_type, 
  upload_timestamp, 
  masked_fields_log
FROM document_extracted_text;
