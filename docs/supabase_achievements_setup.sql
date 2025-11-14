-- ============================================
-- ACHIEVEMENTS SYSTEM - DATABASE SETUP WITH TRANSLATIONS
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Create achievements table (master list of all achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'items_registrados', 'weekly_streak', 'explorador', etc.
    threshold INTEGER NOT NULL, -- Required count to unlock (1, 5, 10, 25, 50, 75, 100)
    icon_name TEXT, -- Icon identifier (e.g., 'trophy', 'star', 'magic-wand')
    display_order INTEGER DEFAULT 0, -- Order within category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create achievement_translations table (multilingual support)
CREATE TABLE IF NOT EXISTS public.achievement_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- 'es', 'en', 'pt', 'fr', etc.
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(achievement_id, language_code) -- One translation per language per achievement
);

-- 3. Create user_achievements table (user progress tracking)
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0, -- Current count (e.g., 6 tricks created)
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id) -- One record per user per achievement
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievement_translations_achievement_id ON public.achievement_translations(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_translations_language ON public.achievement_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(user_id, is_unlocked);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for achievements table (read-only for all authenticated users)
CREATE POLICY "Anyone can view achievements"
    ON public.achievements
    FOR SELECT
    TO authenticated
    USING (true);

-- 7. RLS Policies for achievement_translations table (read-only for all authenticated users)
CREATE POLICY "Anyone can view achievement translations"
    ON public.achievement_translations
    FOR SELECT
    TO authenticated
    USING (true);

-- 8. RLS Policies for user_achievements table (users can only see their own progress)
CREATE POLICY "Users can view their own achievement progress"
    ON public.user_achievements
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievement progress"
    ON public.user_achievements
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress"
    ON public.user_achievements
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. Insert initial achievements (without translations)
-- Items Registrados
INSERT INTO public.achievements (category, threshold, icon_name, display_order) VALUES
    ('items_registrados', 1, 'star', 1),
    ('items_registrados', 5, 'star', 2),
    ('items_registrados', 10, 'star', 3),
    ('items_registrados', 25, 'compass', 4),
    ('items_registrados', 50, 'book', 5),
    ('items_registrados', 75, 'award', 6),
    ('items_registrados', 100, 'eye', 7);

-- Weekly Streak
INSERT INTO public.achievements (category, threshold, icon_name, display_order) VALUES
    ('weekly_streak', 2, 'zap', 1),
    ('weekly_streak', 4, 'zap', 2),
    ('weekly_streak', 8, 'zap', 3),
    ('weekly_streak', 12, 'zap', 4);

-- Explorador (Categories)
INSERT INTO public.achievements (category, threshold, icon_name, display_order) VALUES
    ('explorador', 1, 'folder', 1),
    ('explorador', 3, 'folder', 2),
    ('explorador', 5, 'folder', 3),
    ('explorador', 10, 'folder', 4);

-- Favoritos
INSERT INTO public.achievements (category, threshold, icon_name, display_order) VALUES
    ('favoritos', 5, 'heart', 1),
    ('favoritos', 10, 'heart', 2),
    ('favoritos', 25, 'heart', 3),
    ('favoritos', 50, 'heart', 4);

-- 10. Insert Spanish translations (es)
-- Items Registrados (Spanish)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'es',
    CASE threshold
        WHEN 1 THEN 'Novato'
        WHEN 5 THEN 'Principiante'
        WHEN 10 THEN 'Aprendiz'
        WHEN 25 THEN 'Explorador'
        WHEN 50 THEN 'Coleccionista'
        WHEN 75 THEN 'Maestro'
        WHEN 100 THEN 'Visionario'
    END,
    CASE threshold
        WHEN 1 THEN 'Registra tu primer item mágico'
        WHEN 5 THEN 'Registra 5 items mágicos'
        WHEN 10 THEN 'Registra 10 items mágicos'
        WHEN 25 THEN 'Registra 25 items mágicos'
        WHEN 50 THEN 'Registra 50 items mágicos'
        WHEN 75 THEN 'Registra 75 items mágicos'
        WHEN 100 THEN 'Registra 100 items mágicos'
    END
FROM public.achievements WHERE category = 'items_registrados';

-- Weekly Streak (Spanish)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'es',
    CASE threshold
        WHEN 2 THEN 'Constante'
        WHEN 4 THEN 'Dedicado'
        WHEN 8 THEN 'Comprometido'
        WHEN 12 THEN 'Imparable'
    END,
    CASE threshold
        WHEN 2 THEN 'Registra items 2 semanas consecutivas'
        WHEN 4 THEN 'Registra items 4 semanas consecutivas'
        WHEN 8 THEN 'Registra items 8 semanas consecutivas'
        WHEN 12 THEN 'Registra items 12 semanas consecutivas'
    END
FROM public.achievements WHERE category = 'weekly_streak';

-- Explorador (Spanish)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'es',
    CASE threshold
        WHEN 1 THEN 'Organizador'
        WHEN 3 THEN 'Clasificador'
        WHEN 5 THEN 'Archivista'
        WHEN 10 THEN 'Curador'
    END,
    CASE threshold
        WHEN 1 THEN 'Crea tu primera categoría'
        WHEN 3 THEN 'Crea 3 categorías'
        WHEN 5 THEN 'Crea 5 categorías'
        WHEN 10 THEN 'Crea 10 categorías'
    END
FROM public.achievements WHERE category = 'explorador';

-- Favoritos (Spanish)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'es',
    CASE threshold
        WHEN 5 THEN 'Fan'
        WHEN 10 THEN 'Entusiasta'
        WHEN 25 THEN 'Apasionado'
        WHEN 50 THEN 'Devoto'
    END,
    CASE threshold
        WHEN 5 THEN 'Marca 5 items como favoritos'
        WHEN 10 THEN 'Marca 10 items como favoritos'
        WHEN 25 THEN 'Marca 25 items como favoritos'
        WHEN 50 THEN 'Marca 50 items como favoritos'
    END
FROM public.achievements WHERE category = 'favoritos';

-- 11. Insert English translations (en)
-- Items Registrados (English)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'en',
    CASE threshold
        WHEN 1 THEN 'Rookie'
        WHEN 5 THEN 'Beginner'
        WHEN 10 THEN 'Apprentice'
        WHEN 25 THEN 'Explorer'
        WHEN 50 THEN 'Collector'
        WHEN 75 THEN 'Master'
        WHEN 100 THEN 'Visionary'
    END,
    CASE threshold
        WHEN 1 THEN 'Register your first magic item'
        WHEN 5 THEN 'Register 5 magic items'
        WHEN 10 THEN 'Register 10 magic items'
        WHEN 25 THEN 'Register 25 magic items'
        WHEN 50 THEN 'Register 50 magic items'
        WHEN 75 THEN 'Register 75 magic items'
        WHEN 100 THEN 'Register 100 magic items'
    END
FROM public.achievements WHERE category = 'items_registrados';

-- Weekly Streak (English)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'en',
    CASE threshold
        WHEN 2 THEN 'Consistent'
        WHEN 4 THEN 'Dedicated'
        WHEN 8 THEN 'Committed'
        WHEN 12 THEN 'Unstoppable'
    END,
    CASE threshold
        WHEN 2 THEN 'Register items for 2 consecutive weeks'
        WHEN 4 THEN 'Register items for 4 consecutive weeks'
        WHEN 8 THEN 'Register items for 8 consecutive weeks'
        WHEN 12 THEN 'Register items for 12 consecutive weeks'
    END
FROM public.achievements WHERE category = 'weekly_streak';

-- Explorador (English)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'en',
    CASE threshold
        WHEN 1 THEN 'Organizer'
        WHEN 3 THEN 'Classifier'
        WHEN 5 THEN 'Archivist'
        WHEN 10 THEN 'Curator'
    END,
    CASE threshold
        WHEN 1 THEN 'Create your first category'
        WHEN 3 THEN 'Create 3 categories'
        WHEN 5 THEN 'Create 5 categories'
        WHEN 10 THEN 'Create 10 categories'
    END
FROM public.achievements WHERE category = 'explorador';

-- Favoritos (English)
INSERT INTO public.achievement_translations (achievement_id, language_code, title, description)
SELECT id, 'en',
    CASE threshold
        WHEN 5 THEN 'Fan'
        WHEN 10 THEN 'Enthusiast'
        WHEN 25 THEN 'Passionate'
        WHEN 50 THEN 'Devotee'
    END,
    CASE threshold
        WHEN 5 THEN 'Mark 5 items as favorites'
        WHEN 10 THEN 'Mark 10 items as favorites'
        WHEN 25 THEN 'Mark 25 items as favorites'
        WHEN 50 THEN 'Mark 50 items as favorites'
    END
FROM public.achievements WHERE category = 'favoritos';

-- 12. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers for updated_at
CREATE TRIGGER update_achievements_updated_at
    BEFORE UPDATE ON public.achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_translations_updated_at
    BEFORE UPDATE ON public.achievement_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at
    BEFORE UPDATE ON public.user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Tables created:
-- - achievements (19 achievements)
-- - achievement_translations (38 translations: 19 x 2 languages)
-- - user_achievements (user progress tracking)
--
-- Languages supported:
-- - Spanish (es)
-- - English (en)
--
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables created successfully
-- 3. Check RLS policies are enabled
-- 4. Verify achievement data and translations inserted
-- ============================================
