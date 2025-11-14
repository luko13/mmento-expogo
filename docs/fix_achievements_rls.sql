-- ============================================
-- FIX: Achievements RLS Policies
-- ============================================
-- This script adds RLS policies to allow reading achievements data
-- Execute this in Supabase SQL Editor

-- 1. Enable RLS on achievements tables (if not already enabled)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_translations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "achievements_select_policy" ON public.achievements;
DROP POLICY IF EXISTS "achievement_translations_select_policy" ON public.achievement_translations;

-- 3. Create policies to allow everyone to READ achievements
-- (Achievements are public data, everyone can read them)
CREATE POLICY "achievements_select_policy"
ON public.achievements
FOR SELECT
TO public
USING (true);

CREATE POLICY "achievement_translations_select_policy"
ON public.achievement_translations
FOR SELECT
TO public
USING (true);

-- 4. Verify policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('achievements', 'achievement_translations')
ORDER BY tablename, policyname;
