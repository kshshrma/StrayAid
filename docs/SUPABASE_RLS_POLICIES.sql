-- ==============================================================================
-- STRAYAID — SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Run these in Supabase SQL Editor to resolve 403 Forbidden errors in production
-- ==============================================================================

-- 1. Enable Row Level Security on core tables
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rescue_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. rescue_assignments policies
-- Allow authenticated & anon users to read rescue assignments
DROP POLICY IF EXISTS "Allow select on rescue_assignments" ON public.rescue_assignments;
CREATE POLICY "Allow select on rescue_assignments"
ON public.rescue_assignments
FOR SELECT
USING (true);

-- Allow authenticated users to insert/update rescue assignments
DROP POLICY IF EXISTS "Allow auth insert on rescue_assignments" ON public.rescue_assignments;
CREATE POLICY "Allow auth insert on rescue_assignments"
ON public.rescue_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow auth update on rescue_assignments" ON public.rescue_assignments;
CREATE POLICY "Allow auth update on rescue_assignments"
ON public.rescue_assignments
FOR UPDATE
TO authenticated
USING (true);

-- 3. reports policies
DROP POLICY IF EXISTS "Allow public select on reports" ON public.reports;
CREATE POLICY "Allow public select on reports"
ON public.reports
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert on reports" ON public.reports;
CREATE POLICY "Allow public insert on reports"
ON public.reports
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow auth update on reports" ON public.reports;
CREATE POLICY "Allow auth update on reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (true);

-- 4. guardians policies
DROP POLICY IF EXISTS "Allow public select on guardians" ON public.guardians;
CREATE POLICY "Allow public select on guardians"
ON public.guardians
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow auth update on guardians" ON public.guardians;
CREATE POLICY "Allow auth update on guardians"
ON public.guardians
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Storage policies for animal-images bucket
-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('animal-images', 'animal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to animal-images bucket
DROP POLICY IF EXISTS "Allow public upload to animal-images" ON storage.objects;
CREATE POLICY "Allow public upload to animal-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'animal-images');

-- Allow public viewing of animal images
DROP POLICY IF EXISTS "Allow public read from animal-images" ON storage.objects;
CREATE POLICY "Allow public read from animal-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'animal-images');
