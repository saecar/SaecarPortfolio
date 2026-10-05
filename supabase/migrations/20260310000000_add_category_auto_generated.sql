-- Phase 2: portfolio automation — category + provenance + RLS hardening
-- Run in Supabase SQL Editor or via CLI: supabase db push

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('iot','game','web','web-frontend','web-backend','web-fullstack')) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS auto_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_repo text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now();

-- Backfill existing rows
UPDATE public.projects SET category = 'web' WHERE category IS NULL;
UPDATE public.projects SET auto_generated = false WHERE auto_generated IS NULL;

-- RLS: 2-lapis — anon/read public only is_show=true, write service_role only
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read shown projects" ON public.projects;
CREATE POLICY "public read shown projects"
  ON public.projects FOR SELECT
  USING (is_show = true);

-- No insert/update/delete policy for anon — only service_role (bypass RLS) can write
-- Verify: anon write must get 401/empty. Test:
--   anon key: INSERT INTO projects ... -> should fail RLS
--   service_role key: INSERT -> ok
