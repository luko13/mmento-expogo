/**
 * User Statistics Service
 *
 * Provides functions to fetch user statistics including:
 * - Total tricks created
 * - Total categories created
 * - Total unique tags used
 * - Total favorites
 */

import { supabase } from "../lib/supabase";

export interface UserStats {
  tricksCount: number;
  categoriesCount: number;
  tagsCount: number;
  favoritesCount: number;
}

/**
 * Get the total number of tricks created by a user
 */
export async function getUserTrickCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("magic_tricks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user trick count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Exception in getUserTrickCount:", error);
    return 0;
  }
}

/**
 * Get the total number of categories created by a user
 */
export async function getUserCategoryCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("user_categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user category count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Exception in getUserCategoryCount:", error);
    return 0;
  }
}

/**
 * Get the total number of unique tags used by a user
 * (counts distinct tag_ids from tricks owned by user)
 */
export async function getUserTagCount(userId: string): Promise<number> {
  try {
    // First, get all trick IDs for this user
    const { data: tricks, error: tricksError } = await supabase
      .from("magic_tricks")
      .select("id")
      .eq("user_id", userId);

    if (tricksError) {
      console.error("Error fetching user tricks for tag count:", tricksError);
      return 0;
    }

    if (!tricks || tricks.length === 0) {
      return 0;
    }

    const trickIds = tricks.map((t) => t.id);

    // Get unique tags from these tricks (trick_tags only has tag_id, not tag_name)
    const { data: tags, error: tagsError } = await supabase
      .from("trick_tags")
      .select("tag_id")
      .in("trick_id", trickIds);

    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
      return 0;
    }

    if (!tags || tags.length === 0) {
      return 0;
    }

    // Count unique tag_ids
    const uniqueTags = new Set(tags.map((t) => t.tag_id));
    return uniqueTags.size;
  } catch (error) {
    console.error("Exception in getUserTagCount:", error);
    return 0;
  }
}

/**
 * Get the total number of favorites for a user
 */
export async function getUserFavoritesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user favorites count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Exception in getUserFavoritesCount:", error);
    return 0;
  }
}

/**
 * Get all user statistics at once
 * More efficient than calling individual functions separately
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // Execute all queries in parallel for better performance
    const [tricksCount, categoriesCount, tagsCount, favoritesCount] = await Promise.all([
      getUserTrickCount(userId),
      getUserCategoryCount(userId),
      getUserTagCount(userId),
      getUserFavoritesCount(userId),
    ]);

    return {
      tricksCount,
      categoriesCount,
      tagsCount,
      favoritesCount,
    };
  } catch (error) {
    console.error("Exception in getUserStats:", error);
    return {
      tricksCount: 0,
      categoriesCount: 0,
      tagsCount: 0,
      favoritesCount: 0,
    };
  }
}

export const userStatsService = {
  getUserTrickCount,
  getUserCategoryCount,
  getUserTagCount,
  getUserFavoritesCount,
  getUserStats,
};
