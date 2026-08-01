-- ==============================================================================
-- HEAVEN HOME: BLOGS SCHEMA & DIRECT DATABASE INSERTION SCRIPT
-- Copy and run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Create the blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  author TEXT DEFAULT 'Heaven Home Team',
  category TEXT DEFAULT 'Interior Design',
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns if missing in case table already existed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='title') THEN
    ALTER TABLE public.blogs ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='slug') THEN
    ALTER TABLE public.blogs ADD COLUMN slug TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='content') THEN
    ALTER TABLE public.blogs ADD COLUMN content TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='excerpt') THEN
    ALTER TABLE public.blogs ADD COLUMN excerpt TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='image_url') THEN
    ALTER TABLE public.blogs ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='author') THEN
    ALTER TABLE public.blogs ADD COLUMN author TEXT DEFAULT 'Heaven Home Team';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='category') THEN
    ALTER TABLE public.blogs ADD COLUMN category TEXT DEFAULT 'Interior Design';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='published_at') THEN
    ALTER TABLE public.blogs ADD COLUMN published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow anyone (public & authenticated) to read blogs
DROP POLICY IF EXISTS "Public can view blogs" ON public.blogs;
CREATE POLICY "Public can view blogs" 
ON public.blogs FOR SELECT 
USING (true);

-- Allow full access for insert/update/delete operations
DROP POLICY IF EXISTS "Allow all blog operations" ON public.blogs;
CREATE POLICY "Allow all blog operations" 
ON public.blogs FOR ALL 
USING (true)
WITH CHECK (true);
