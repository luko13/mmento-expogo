/**
 * Badges Service
 *
 * Handles badge retrieval, equipping/unequipping, and user badge management
 * with multilingual support
 */

import { supabase } from "../lib/supabase";
import i18n from "i18next";

export interface Badge {
  id: string;
  key: string;
  icon: string | null;
  color: string;
  font_family: string;
  font_size: number;
  created_at: string;
}

export interface BadgeTranslation {
  id: string;
  badge_id: string;
  language_code: string;
  text: string;
  created_at: string;
}

export interface BadgeWithTranslation extends Badge {
  text: string; // Translated badge text
}

export interface UserBadge extends BadgeWithTranslation {
  is_equipped: boolean;
  unlocked_via_achievement_id: string | null;
}

/**
 * Get all available badges with translations
 * @param languageCode - Language code (e.g., 'es', 'en'). Defaults to current i18n language
 */
export async function getAllBadges(
  languageCode?: string
): Promise<BadgeWithTranslation[]> {
  try {
    const lang = languageCode || i18n.language || "es";

    const { data, error } = await supabase
      .from("badges")
      .select(`
        id,
        key,
        icon,
        color,
        font_family,
        font_size,
        created_at,
        badge_translations!inner (
          text,
          language_code
        )
      `)
      .eq("badge_translations.language_code", lang)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching badges:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      key: item.key,
      icon: item.icon,
      color: item.color,
      font_family: item.font_family,
      font_size: item.font_size,
      created_at: item.created_at,
      text: item.badge_translations[0]?.text || "",
    }));
  } catch (error) {
    console.error("Exception in getAllBadges:", error);
    return [];
  }
}

/**
 * Get badges unlocked by a user
 * @param userId - User ID
 * @param languageCode - Language code (optional)
 */
export async function getUserUnlockedBadges(
  userId: string,
  languageCode?: string
): Promise<UserBadge[]> {
  try {
    const lang = languageCode || i18n.language || "es";

    // Get user's equipped badge
    const { data: profileData } = await supabase
      .from("profiles")
      .select("equipped_badge_id")
      .eq("id", userId)
      .single();

    const equippedBadgeId = profileData?.equipped_badge_id;

    // Get badges from unlocked achievements
    const { data, error } = await supabase
      .from("user_achievements")
      .select(`
        id,
        achievement_id,
        achievement:achievements!inner (
          badge_key,
          badge:badges!inner (
            id,
            key,
            icon,
            color,
            font_family,
            font_size,
            created_at,
            badge_translations!inner (
              text,
              language_code
            )
          )
        )
      `)
      .eq("user_id", userId)
      .eq("is_unlocked", true)
      .not("achievement.badge_key", "is", null)
      .eq("achievement.badge.badge_translations.language_code", lang);

    if (error) {
      console.error("Error fetching user badges:", error);
      return [];
    }

    // Transform data and remove duplicates (multiple achievements can unlock same badge)
    const badgesMap = new Map<string, UserBadge>();
    (data || []).forEach((item: any) => {
      const badge = item.achievement?.badge;
      if (badge && !badgesMap.has(badge.id)) {
        badgesMap.set(badge.id, {
          id: badge.id,
          key: badge.key,
          icon: badge.icon,
          color: badge.color,
          font_family: badge.font_family,
          font_size: badge.font_size,
          created_at: badge.created_at,
          text: badge.badge_translations[0]?.text || "",
          is_equipped: badge.id === equippedBadgeId,
          unlocked_via_achievement_id: item.achievement_id,
        });
      }
    });

    return Array.from(badgesMap.values());
  } catch (error) {
    console.error("Exception in getUserUnlockedBadges:", error);
    return [];
  }
}

/**
 * Get user's currently equipped badge
 * @param userId - User ID
 * @param languageCode - Language code (optional)
 */
export async function getEquippedBadge(
  userId: string,
  languageCode?: string
): Promise<BadgeWithTranslation | null> {
  try {
    const lang = languageCode || i18n.language || "es";

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        equipped_badge_id,
        badge:badges (
          id,
          key,
          icon,
          color,
          font_family,
          font_size,
          created_at,
          badge_translations!inner (
            text,
            language_code
          )
        )
      `)
      .eq("id", userId)
      .eq("badge.badge_translations.language_code", lang)
      .single();

    if (error || !data?.badge) {
      return null;
    }

    return {
      id: data.badge.id,
      key: data.badge.key,
      icon: data.badge.icon,
      color: data.badge.color,
      font_family: data.badge.font_family,
      font_size: data.badge.font_size,
      created_at: data.badge.created_at,
      text: data.badge.badge_translations[0]?.text || "",
    };
  } catch (error) {
    console.error("Exception in getEquippedBadge:", error);
    return null;
  }
}

/**
 * Equip a badge for the user
 * @param userId - User ID
 * @param badgeId - Badge ID to equip
 */
export async function equipBadge(
  userId: string,
  badgeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user has unlocked this badge
    const unlockedBadges = await getUserUnlockedBadges(userId);
    const hasUnlocked = unlockedBadges.some((b) => b.id === badgeId);

    if (!hasUnlocked) {
      return {
        success: false,
        error: "Badge not unlocked",
      };
    }

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({ equipped_badge_id: badgeId })
      .eq("id", userId);

    if (error) {
      console.error("Error equipping badge:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception in equipBadge:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Unequip the currently equipped badge
 * @param userId - User ID
 */
export async function unequipBadge(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ equipped_badge_id: null })
      .eq("id", userId);

    if (error) {
      console.error("Error unequipping badge:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception in unequipBadge:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get badge by key
 * @param badgeKey - Badge key
 * @param languageCode - Language code (optional)
 */
export async function getBadgeByKey(
  badgeKey: string,
  languageCode?: string
): Promise<BadgeWithTranslation | null> {
  try {
    const lang = languageCode || i18n.language || "es";

    const { data, error } = await supabase
      .from("badges")
      .select(`
        id,
        key,
        icon,
        color,
        font_family,
        font_size,
        created_at,
        badge_translations!inner (
          text,
          language_code
        )
      `)
      .eq("key", badgeKey)
      .eq("badge_translations.language_code", lang)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      key: data.key,
      icon: data.icon,
      color: data.color,
      font_family: data.font_family,
      font_size: data.font_size,
      created_at: data.created_at,
      text: data.badge_translations[0]?.text || "",
    };
  } catch (error) {
    console.error("Exception in getBadgeByKey:", error);
    return null;
  }
}

export const badgesService = {
  getAllBadges,
  getUserUnlockedBadges,
  getEquippedBadge,
  equipBadge,
  unequipBadge,
  getBadgeByKey,
};
