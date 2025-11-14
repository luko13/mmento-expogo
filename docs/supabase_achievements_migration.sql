-- ============================================
-- ACHIEVEMENTS SYSTEM - MIGRATION SCRIPT
-- ============================================
-- This script updates existing tables and adds new features:
-- - Points system
-- - Badges
-- - Event tracking
-- - Login streaks
-- - Global leaderboard
-- ============================================
-- RUN THIS AFTER supabase_achievements_setup.sql
-- ============================================

-- ============================================
-- PART 1: UPDATE EXISTING TABLES
-- ============================================

-- 1. Add new columns to achievements table
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS key TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'count',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS requirement JSONB,
ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_key TEXT;

-- Create unique constraint on key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'achievements_key_unique'
    ) THEN
        ALTER TABLE public.achievements ADD CONSTRAINT achievements_key_unique UNIQUE (key);
    END IF;
END $$;

-- Create unique constraint on badge_key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'achievements_badge_key_unique'
    ) THEN
        ALTER TABLE public.achievements ADD CONSTRAINT achievements_badge_key_unique UNIQUE (badge_key);
    END IF;
END $$;

-- 2. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_achievements_key ON public.achievements(key);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_is_secret ON public.achievements(is_secret);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_key ON public.achievements(badge_key);

-- 3. Update existing achievements with keys and requirements
-- Items Registrados
UPDATE public.achievements SET
    key = CASE threshold
        WHEN 1 THEN 'items_registered_1'
        WHEN 5 THEN 'items_registered_5'
        WHEN 10 THEN 'items_registered_10'
        WHEN 25 THEN 'items_registered_25'
        WHEN 50 THEN 'items_registered_50'
        WHEN 75 THEN 'items_registered_75'
        WHEN 100 THEN 'items_registered_100'
    END,
    type = 'count',
    points = CASE threshold
        WHEN 1 THEN 10
        WHEN 5 THEN 15
        WHEN 10 THEN 20
        WHEN 25 THEN 30
        WHEN 50 THEN 50
        WHEN 75 THEN 75
        WHEN 100 THEN 100
    END,
    badge_key = CASE threshold
        WHEN 1 THEN 'novato_badge'
        WHEN 25 THEN 'explorador_badge'
        WHEN 50 THEN 'coleccionista_badge'
        WHEN 100 THEN 'visionario_badge'
        ELSE NULL
    END,
    requirement = jsonb_build_object(
        'type', 'tricks_created',
        'count', threshold
    )
WHERE category = 'items_registrados' AND key IS NULL;

-- Weekly Streak
UPDATE public.achievements SET
    key = CASE threshold
        WHEN 2 THEN 'weekly_streak_2'
        WHEN 4 THEN 'weekly_streak_4'
        WHEN 8 THEN 'weekly_streak_8'
        WHEN 12 THEN 'weekly_streak_12'
    END,
    type = 'streak',
    points = CASE threshold
        WHEN 2 THEN 10
        WHEN 4 THEN 20
        WHEN 8 THEN 40
        WHEN 12 THEN 60
    END,
    badge_key = CASE threshold
        WHEN 4 THEN 'dedicado_badge'
        WHEN 12 THEN 'imparable_badge'
        ELSE NULL
    END,
    requirement = jsonb_build_object(
        'type', 'weekly_streak',
        'count', threshold
    )
WHERE category = 'weekly_streak' AND key IS NULL;

-- Explorador (Categories)
UPDATE public.achievements SET
    key = CASE threshold
        WHEN 1 THEN 'categories_created_1'
        WHEN 3 THEN 'categories_created_3'
        WHEN 5 THEN 'categories_created_5'
        WHEN 10 THEN 'categories_created_10'
    END,
    type = 'count',
    points = CASE threshold
        WHEN 1 THEN 5
        WHEN 3 THEN 10
        WHEN 5 THEN 15
        WHEN 10 THEN 30
    END,
    badge_key = CASE threshold
        WHEN 10 THEN 'curador_badge'
        ELSE NULL
    END,
    requirement = jsonb_build_object(
        'type', 'categories_created',
        'count', threshold
    )
WHERE category = 'explorador' AND key IS NULL;

-- Favoritos
UPDATE public.achievements SET
    key = CASE threshold
        WHEN 5 THEN 'favorites_5'
        WHEN 10 THEN 'favorites_10'
        WHEN 25 THEN 'favorites_25'
        WHEN 50 THEN 'favorites_50'
    END,
    type = 'count',
    points = CASE threshold
        WHEN 5 THEN 10
        WHEN 10 THEN 15
        WHEN 25 THEN 30
        WHEN 50 THEN 50
    END,
    badge_key = CASE threshold
        WHEN 25 THEN 'apasionado_badge'
        ELSE NULL
    END,
    requirement = jsonb_build_object(
        'type', 'favorites_created',
        'count', threshold
    )
WHERE category = 'favoritos' AND key IS NULL;

-- 4. Add secret_hint column to achievement_translations
ALTER TABLE public.achievement_translations
ADD COLUMN IF NOT EXISTS secret_hint TEXT;

-- ============================================
-- PART 2: CREATE NEW TABLES
-- ============================================

-- 5. Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    icon TEXT,
    color TEXT DEFAULT '#5BB9A3',
    font_family TEXT DEFAULT 'medium',
    font_size INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can view badges"
    ON public.badges
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Create badge_translations table
CREATE TABLE IF NOT EXISTS public.badge_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(badge_id, language_code)
);

-- Enable RLS
ALTER TABLE public.badge_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can view badge translations"
    ON public.badge_translations
    FOR SELECT
    TO authenticated
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_badge_translations_badge_id ON public.badge_translations(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_translations_language ON public.badge_translations(language_code);

-- 7. Add equipped_badge_id to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'equipped_badge_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN equipped_badge_id UUID REFERENCES public.badges(id);
        CREATE INDEX idx_profiles_equipped_badge ON public.profiles(equipped_badge_id);
    END IF;
END $$;

-- 8. Create user_achievement_events table
CREATE TABLE IF NOT EXISTS public.user_achievement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_achievement_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own events"
    ON public.user_achievement_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
    ON public.user_achievement_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user_type ON public.user_achievement_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON public.user_achievement_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user_created ON public.user_achievement_events(user_id, created_at DESC);

-- 9. Create user_login_streaks table
CREATE TABLE IF NOT EXISTS public.user_login_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_login_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view their own streak"
    ON public.user_login_streaks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
    ON public.user_login_streaks
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 10. Create global_leaderboard table
CREATE TABLE IF NOT EXISTS public.global_leaderboard (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    rank INTEGER,
    percentile NUMERIC(5,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policy (everyone can see leaderboard)
CREATE POLICY "Anyone can view leaderboard"
    ON public.global_leaderboard
    FOR SELECT
    TO authenticated
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.global_leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON public.global_leaderboard(total_points DESC);

-- ============================================
-- PART 3: INSERT INITIAL BADGES
-- ============================================

-- Insert badges
INSERT INTO public.badges (key, icon, color, font_family, font_size) VALUES
    ('novato_badge', 'star', '#10B981', 'medium', 12),
    ('explorador_badge', 'compass', '#F59E0B', 'medium', 12),
    ('coleccionista_badge', 'book', '#8B5CF6', 'semibold', 13),
    ('visionario_badge', 'eye', '#EF4444', 'bold', 14),
    ('dedicado_badge', 'zap', '#3B82F6', 'medium', 12),
    ('imparable_badge', 'flash', '#EC4899', 'bold', 14),
    ('curador_badge', 'folder', '#14B8A6', 'medium', 12),
    ('apasionado_badge', 'heart', '#F43F5E', 'semibold', 13)
ON CONFLICT (key) DO NOTHING;

-- Insert Spanish badge translations
INSERT INTO public.badge_translations (badge_id, language_code, text)
SELECT b.id, 'es',
    CASE b.key
        WHEN 'novato_badge' THEN 'El Novato'
        WHEN 'explorador_badge' THEN 'El Explorador'
        WHEN 'coleccionista_badge' THEN 'El Coleccionista'
        WHEN 'visionario_badge' THEN 'El Visionario'
        WHEN 'dedicado_badge' THEN 'El Dedicado'
        WHEN 'imparable_badge' THEN 'El Imparable'
        WHEN 'curador_badge' THEN 'El Curador'
        WHEN 'apasionado_badge' THEN 'El Apasionado'
    END
FROM public.badges b
WHERE NOT EXISTS (
    SELECT 1 FROM public.badge_translations bt
    WHERE bt.badge_id = b.id AND bt.language_code = 'es'
);

-- Insert English badge translations
INSERT INTO public.badge_translations (badge_id, language_code, text)
SELECT b.id, 'en',
    CASE b.key
        WHEN 'novato_badge' THEN 'The Rookie'
        WHEN 'explorador_badge' THEN 'The Explorer'
        WHEN 'coleccionista_badge' THEN 'The Collector'
        WHEN 'visionario_badge' THEN 'The Visionary'
        WHEN 'dedicado_badge' THEN 'The Dedicated'
        WHEN 'imparable_badge' THEN 'The Unstoppable'
        WHEN 'curador_badge' THEN 'The Curator'
        WHEN 'apasionado_badge' THEN 'The Passionate'
    END
FROM public.badges b
WHERE NOT EXISTS (
    SELECT 1 FROM public.badge_translations bt
    WHERE bt.badge_id = b.id AND bt.language_code = 'en'
);

-- ============================================
-- PART 4: CREATE DATABASE FUNCTIONS
-- ============================================

-- Function to update login streak
CREATE OR REPLACE FUNCTION update_login_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_login DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT last_login_date, current_streak, longest_streak
    INTO v_last_login, v_current_streak, v_longest_streak
    FROM user_login_streaks
    WHERE user_id = p_user_id;

    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, last_login_date)
        VALUES (p_user_id, 1, 1, v_today);

        -- Register event
        INSERT INTO user_achievement_events (user_id, event_type, event_data)
        VALUES (p_user_id, 'daily_login', jsonb_build_object('login_date', v_today, 'streak', 1));

        RETURN;
    END IF;

    -- If already logged in today, do nothing
    IF v_last_login = v_today THEN
        RETURN;
    END IF;

    -- If logged in yesterday, increment streak
    IF v_last_login = v_today - INTERVAL '1 day' THEN
        v_current_streak := v_current_streak + 1;
        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;
    ELSE
        -- If more than one day passed, reset streak
        v_current_streak := 1;
    END IF;

    -- Update
    UPDATE user_login_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_login_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Register event
    INSERT INTO user_achievement_events (user_id, event_type, event_data)
    VALUES (p_user_id, 'daily_login', jsonb_build_object(
        'login_date', v_today,
        'current_streak', v_current_streak
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process achievement events
CREATE OR REPLACE FUNCTION process_achievement_event()
RETURNS TRIGGER AS $$
DECLARE
    v_achievement RECORD;
    v_current_progress INTEGER;
    v_required INTEGER;
    v_user_achievement_id UUID;
BEGIN
    -- For each achievement matching the event type
    FOR v_achievement IN
        SELECT a.id, a.requirement, a.key, a.type
        FROM achievements a
        WHERE a.requirement->>'type' = NEW.event_type
    LOOP
        -- Get current progress
        SELECT id, progress
        INTO v_user_achievement_id, v_current_progress
        FROM user_achievements
        WHERE user_id = NEW.user_id
          AND achievement_id = v_achievement.id;

        -- If no record exists, create one
        IF NOT FOUND THEN
            INSERT INTO user_achievements (user_id, achievement_id, progress)
            VALUES (NEW.user_id, v_achievement.id, 1)
            RETURNING id, progress INTO v_user_achievement_id, v_current_progress;
        ELSE
            -- Increment progress
            v_current_progress := v_current_progress + 1;

            UPDATE user_achievements
            SET progress = v_current_progress,
                updated_at = NOW()
            WHERE id = v_user_achievement_id;
        END IF;

        -- Check if unlocked
        v_required := (v_achievement.requirement->>'count')::INTEGER;

        IF v_current_progress >= v_required THEN
            UPDATE user_achievements
            SET unlocked_at = NOW(),
                notified = false
            WHERE id = v_user_achievement_id
              AND unlocked_at IS NULL;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for event processing
DROP TRIGGER IF EXISTS trigger_process_achievement_event ON user_achievement_events;
CREATE TRIGGER trigger_process_achievement_event
AFTER INSERT ON user_achievement_events
FOR EACH ROW
EXECUTE FUNCTION process_achievement_event();

-- Function to update global leaderboard
CREATE OR REPLACE FUNCTION update_global_leaderboard()
RETURNS void AS $$
BEGIN
    TRUNCATE global_leaderboard;

    INSERT INTO global_leaderboard (user_id, username, total_points, achievements_unlocked, rank, percentile)
    SELECT
        p.id,
        p.username,
        COALESCE(SUM(a.points), 0) as total_points,
        COUNT(ua.id) FILTER (WHERE ua.unlocked_at IS NOT NULL) as achievements_unlocked,
        RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) as rank,
        PERCENT_RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) * 100 as percentile
    FROM profiles p
    LEFT JOIN user_achievements ua ON ua.user_id = p.id AND ua.unlocked_at IS NOT NULL
    LEFT JOIN achievements a ON a.id = ua.achievement_id
    GROUP BY p.id, p.username
    HAVING COALESCE(SUM(a.points), 0) > 0;

    UPDATE global_leaderboard SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify all achievements for a user (batch check)
CREATE OR REPLACE FUNCTION verify_user_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_achievement RECORD;
    v_count INTEGER;
BEGIN
    FOR v_achievement IN SELECT * FROM achievements WHERE type = 'count'
    LOOP
        -- Calculate progress based on requirement type
        CASE v_achievement.requirement->>'type'
            WHEN 'tricks_created' THEN
                SELECT COUNT(*) INTO v_count
                FROM magic_tricks
                WHERE user_id = p_user_id;

            WHEN 'categories_created' THEN
                SELECT COUNT(*) INTO v_count
                FROM user_categories
                WHERE user_id = p_user_id;

            WHEN 'favorites_created' THEN
                SELECT COUNT(*) INTO v_count
                FROM user_favorites
                WHERE user_id = p_user_id;

            ELSE
                CONTINUE;
        END CASE;

        -- Insert or update progress
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
        VALUES (
            p_user_id,
            v_achievement.id,
            v_count,
            CASE WHEN v_count >= (v_achievement.requirement->>'count')::INTEGER
                 THEN NOW()
                 ELSE NULL
            END
        )
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
            progress = v_count,
            unlocked_at = CASE
                WHEN v_count >= (v_achievement.requirement->>'count')::INTEGER
                     AND user_achievements.unlocked_at IS NULL
                THEN NOW()
                ELSE user_achievements.unlocked_at
            END,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: UPDATE TRIGGER FOR updated_at
-- ============================================

-- Add triggers for new tables
CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON public.badges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badge_translations_updated_at
    BEFORE UPDATE ON public.badge_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_login_streaks_updated_at
    BEFORE UPDATE ON public.user_login_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_leaderboard_updated_at
    BEFORE UPDATE ON public.global_leaderboard
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Tables updated:
-- - achievements (added: key, type, points, requirement, is_secret, badge_key)
-- - achievement_translations (added: secret_hint)
-- - profiles (added: equipped_badge_id)
--
-- Tables created:
-- - badges
-- - badge_translations
-- - user_achievement_events
-- - user_login_streaks
-- - global_leaderboard
--
-- Functions created:
-- - update_login_streak()
-- - process_achievement_event()
-- - update_global_leaderboard()
-- - verify_user_achievements()
--
-- Triggers created:
-- - trigger_process_achievement_event
--
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all tables and functions created
-- 3. Test the updated achievementsService.ts
-- ============================================
