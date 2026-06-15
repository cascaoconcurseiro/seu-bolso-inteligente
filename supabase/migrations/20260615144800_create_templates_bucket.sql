-- Migration to create 'templates' bucket in Supabase Storage

-- 1. Insert the bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policy to allow authenticated users to read objects from the templates bucket
CREATE POLICY "Allow authenticated users to read templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'templates');
