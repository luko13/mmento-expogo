/**
 * Achievements Service - Complete Version
 *
 * Handles achievement retrieval, progress tracking, unlocking logic,
 * event tracking, and badges with multilingual support
 */

import { supabase } from "../lib/supabase";
import i18n from "i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Achievement {
  id: string;
  key: string;
  category: string;
  type: "count" | "streak" | "milestone" | "secret";
  threshold: number;
  points: number;
  icon_name: string | null;
  display_order: number;
  is_secret: boolean;
  badge_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AchievementTranslation {
  id: string;
  achievement_id: string;
  language_code: string;
  title: string;
  description: string;
  secret_hint: string | null;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  key: string;
  icon: string | null;
  color: string;
  font_family: string;
  font_size: number;
}

export interface BadgeTranslation {
  id: string;
  badge_id: string;
  language_code: string;
  text: string;
}

export interface AchievementWithProgress extends Achievement {
  title: string; // Translated title
  description: string; // Translated description
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  user_achievement_id?: string;
  notified: boolean;
  badge?: {
    id: string;
    key: string;
    text: string;
    color: string;
    font_family: string;
    font_size: number;
  };
}

export interface AchievementCategory {
  category: string;
  achievements: AchievementWithProgress[];
  nextToUnlock: AchievementWithProgress | null;
}

const CACHE_KEY = "@achievements_cache";

/**
 * Get all available achievements from the database with translations
 * @param languageCode - Language code (e.g., 'es', 'en'). Defaults to current i18n language
 */
export async function getAchievements(
  languageCode?: string
): Promise<AchievementWithProgress[]> {
  try {
    const lang = languageCode || i18n.language || "es";
    console.log("🌍 Fetching achievements for language:", lang);

    // Fetch achievements with translations (badges query removed until migration is run)
    const { data, error } = await supabase
      .from("achievements")
      .select(`
        id,
        category,
        threshold,
        icon_name,
        display_order,
        created_at,
        updated_at,
        achievement_translations!inner (
          title,
          description,
          language_code
        )
      `)
      .eq("achievement_translations.language_code", lang)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      console.error("❌ Error fetching achievements:", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      return [];
    }

    console.log("✅ Raw achievements data:", data?.length || 0, "achievements");
    if (data && data.length > 0) {
      console.log("📋 First achievement sample:", JSON.stringify(data[0], null, 2));
    }

    // Transform the data to flatten the translation
    // Note: Fields like key, type, points, is_secret, badge_key will be available after running migration
    const achievements: AchievementWithProgress[] = (data || []).map((item: any) => ({
      id: item.id,
      key: item.key || `achievement_${item.id}`, // Fallback if migration not run
      category: item.category,
      type: item.type || "count", // Fallback
      threshold: item.threshold,
      points: item.points || 10, // Fallback
      icon_name: item.icon_name,
      display_order: item.display_order,
      is_secret: item.is_secret || false, // Fallback
      badge_key: item.badge_key || null, // Fallback
      created_at: item.created_at,
      updated_at: item.updated_at,
      title: item.achievement_translations[0]?.title || "Unknown",
      description: item.achievement_translations[0]?.description || "",
      progress: 0,
      is_unlocked: false,
      unlocked_at: null,
      notified: false,
      badge: undefined, // Badges will work after migration
    }));

    return achievements;
  } catch (error) {
    console.error("Exception in getAchievements:", error);
    return [];
  }
}

/**
 * Get user's achievement progress for all achievements with cache
 * @param userId - User ID
 * @param languageCode - Language code (optional)
 * @param useCache - Whether to use cache (default: true)
 */
export async function getUserAchievementProgress(
  userId: string,
  languageCode?: string,
  useCache: boolean = true
): Promise<AchievementWithProgress[]> {
  try {
    // Try cache first
    if (useCache) {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        // Refresh in background
        getUserAchievementProgress(userId, languageCode, false);
        return cachedData;
      }
    }

    // Get all achievements with translations
    const achievements = await getAchievements(languageCode);

    if (achievements.length === 0) {
      return [];
    }

    // Get user's progress for these achievements
    const { data: userAchievements, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user achievement progress:", error);
      return achievements;
    }

    // Create a map of achievement_id to user progress
    const progressMap = new Map<string, UserAchievement>();
    (userAchievements || []).forEach((ua) => {
      progressMap.set(ua.achievement_id, ua);
    });

    // Combine achievements with user progress
    const achievementsWithProgress: AchievementWithProgress[] = achievements.map(
      (achievement) => {
        const userProgress = progressMap.get(achievement.id);
        return {
          ...achievement,
          progress: userProgress?.progress || 0,
          is_unlocked: userProgress?.is_unlocked || false,
          unlocked_at: userProgress?.unlocked_at || null,
          notified: userProgress?.notified || false,
          user_achievement_id: userProgress?.id,
        };
      }
    );

    // Save to cache
    await AsyncStorage.setItem(
      `${CACHE_KEY}_${userId}`,
      JSON.stringify(achievementsWithProgress)
    );

    return achievementsWithProgress;
  } catch (error) {
    console.error("Exception in getUserAchievementProgress:", error);
    return [];
  }
}

/**
 * Group achievements by category and find the next to unlock for each
 * @param userId - User ID
 * @param languageCode - Language code (optional)
 */
export async function getAchievementsByCategory(
  userId: string,
  languageCode?: string
): Promise<AchievementCategory[]> {
  try {
    const achievementsWithProgress = await getUserAchievementProgress(
      userId,
      languageCode
    );

    console.log("🎯 Total achievements with progress:", achievementsWithProgress.length);

    if (achievementsWithProgress.length === 0) {
      console.log("⚠️ No achievements found in database");
      return [];
    }

    // Group by category
    const categoryMap = new Map<string, AchievementWithProgress[]>();
    achievementsWithProgress.forEach((achievement) => {
      const existing = categoryMap.get(achievement.category) || [];
      existing.push(achievement);
      categoryMap.set(achievement.category, existing);
    });

    // For each category, find the next achievement to unlock
    const categories: AchievementCategory[] = [];
    categoryMap.forEach((achievements, category) => {
      // Sort by threshold
      const sorted = achievements.sort((a, b) => a.threshold - b.threshold);

      // Find the first unlocked achievement or the first one
      const nextToUnlock =
        sorted.find((a) => !a.is_unlocked) || sorted[sorted.length - 1];

      categories.push({
        category,
        achievements: sorted,
        nextToUnlock,
      });
    });

    return categories;
  } catch (error) {
    console.error("Exception in getAchievementsByCategory:", error);
    return [];
  }
}

/**
 * Track an event for achievement progress
 * @param userId - User ID
 * @param eventType - Type of event (e.g., "trick_created", "photo_added")
 * @param eventData - Additional data for the event
 */
export async function trackEvent(
  userId: string,
  eventType: string,
  eventData?: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_achievement_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData || {},
      });

    if (error) {
      console.error("Error tracking event:", error);
    }

    // Clear cache to force refresh
    await clearCache(userId);
  } catch (error) {
    console.error("Exception in trackEvent:", error);
  }
}

/**
 * Get unnotified achievements (newly unlocked)
 * @param userId - User ID
 * @param languageCode - Language code (optional)
 */
export async function getUnnotifiedAchievements(
  userId: string,
  languageCode?: string
): Promise<AchievementWithProgress[]> {
  try {
    const lang = languageCode || i18n.language || "es";

    const { data, error } = await supabase
      .from("user_achievements")
      .select(`
        *,
        achievement:achievements (
          *,
          achievement_translations!inner (
            title,
            description,
            language_code
          ),
          badges (
            *,
            badge_translations!inner (
              text,
              language_code
            )
          )
        )
      `)
      .eq("user_id", userId)
      .eq("notified", false)
      .not("unlocked_at", "is", null)
      .eq("achievement.achievement_translations.language_code", lang);

    if (error) {
      console.error("Error fetching unnotified achievements:", error);
      return [];
    }

    return (data || []).map((ua: any) => ({
      ...ua.achievement,
      title: ua.achievement.achievement_translations[0]?.title,
      description: ua.achievement.achievement_translations[0]?.description,
      progress: ua.progress,
      is_unlocked: ua.is_unlocked,
      unlocked_at: ua.unlocked_at,
      notified: ua.notified,
      user_achievement_id: ua.id,
      badge: ua.achievement.badges && ua.achievement.badges.badge_translations?.length > 0 ? {
        id: ua.achievement.badges.id,
        key: ua.achievement.badges.key,
        text: ua.achievement.badges.badge_translations.find((bt: any) => bt.language_code === lang)?.text,
        color: ua.achievement.badges.color,
        font_family: ua.achievement.badges.font_family,
        font_size: ua.achievement.badges.font_size,
      } : undefined,
    }));
  } catch (error) {
    console.error("Exception in getUnnotifiedAchievements:", error);
    return [];
  }
}

/**
 * Mark achievements as notified
 * @param achievementIds - Array of user_achievement IDs
 * @param userId - User ID
 */
export async function markAsNotified(
  achievementIds: string[],
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_achievements")
      .update({ notified: true })
      .in("id", achievementIds)
      .eq("user_id", userId);

    if (error) {
      console.error("Error marking as notified:", error);
    }
  } catch (error) {
    console.error("Exception in markAsNotified:", error);
  }
}

/**
 * Update login streak for user
 * @param userId - User ID
 */
export async function updateLoginStreak(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("update_login_streak", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error updating login streak:", error);
    }
  } catch (error) {
    console.error("Exception in updateLoginStreak:", error);
  }
}

/**
 * Verify all achievements for a user (batch check)
 * @param userId - User ID
 */
export async function verifyAllAchievements(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("verify_user_achievements", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error verifying achievements:", error);
    }

    // Clear cache
    await clearCache(userId);
  } catch (error) {
    console.error("Exception in verifyAllAchievements:", error);
  }
}

/**
 * Clear cache for user achievements
 * @param userId - User ID
 */
export async function clearCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Get display name for achievement category (translated)
 * @param category - Category key
 * @param languageCode - Language code (optional, defaults to current i18n language)
 */
export function getCategoryDisplayName(
  category: string,
  languageCode?: string
): string {
  const lang = languageCode || i18n.language || "es";

  const displayNames: Record<string, Record<string, string>> = {
    items_registrados: {
      es: "Items Registrados",
      en: "Registered Items",
    },
    weekly_streak: {
      es: "Weekly Streak",
      en: "Weekly Streak",
    },
    explorador: {
      es: "Explorador",
      en: "Explorer",
    },
    favoritos: {
      es: "Favoritos",
      en: "Favorites",
    },
  };

  return displayNames[category]?.[lang] || category;
}

/**
 * Get user statistics (points, unlocked count)
 * @param userId - User ID
 */
export async function getUserStats(userId: string): Promise<{
  totalPoints: number;
  unlockedCount: number;
}> {
  try {
    const achievements = await getUserAchievementProgress(userId);
    const unlockedAchievements = achievements.filter((a) => a.is_unlocked);

    return {
      totalPoints: unlockedAchievements.reduce((sum, a) => sum + a.points, 0),
      unlockedCount: unlockedAchievements.length,
    };
  } catch (error) {
    console.error("Exception in getUserStats:", error);
    return { totalPoints: 0, unlockedCount: 0 };
  }
}

export const achievementsService = {
  getAchievements,
  getUserAchievementProgress,
  getAchievementsByCategory,
  trackEvent,
  getUnnotifiedAchievements,
  markAsNotified,
  updateLoginStreak,
  verifyAllAchievements,
  clearCache,
  getCategoryDisplayName,
  getUserStats,
};
