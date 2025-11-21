-- Create storage buckets for document templates and generated documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('document-templates', 'document-templates', false, 52428800, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.ms-excel']::text[]),
  ('generated-documents', 'generated-documents', false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for document templates
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view their templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete their templates"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for generated documents
CREATE POLICY "Authenticated users can upload generated docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view their generated docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete their generated docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);