/**
 * Streaks Service
 *
 * Handles login streak tracking, retrieval, and management
 */

import { supabase } from "../lib/supabase";

export interface LoginStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_login_date: string; // ISO date string (YYYY-MM-DD)
  updated_at: string;
}

/**
 * Get user's login streak information
 * @param userId - User ID
 */
export async function getUserStreak(
  userId: string
): Promise<LoginStreak | null> {
  try {
    const { data, error } = await supabase
      .from("user_login_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no streak record exists, return default values
      if (error.code === "PGRST116") {
        return {
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_login_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        };
      }
      console.error("Error fetching user streak:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in getUserStreak:", error);
    return null;
  }
}

/**
 * Update user's login streak (should be called on app startup)
 * @param userId - User ID
 */
export async function updateStreak(userId: string): Promise<{
  success: boolean;
  streak?: LoginStreak;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("update_login_streak", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error updating login streak:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Fetch updated streak
    const streak = await getUserStreak(userId);

    return {
      success: true,
      streak: streak || undefined,
    };
  } catch (error) {
    console.error("Exception in updateStreak:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Check if user needs a streak update (hasn't logged in today)
 * @param userId - User ID
 */
export async function needsStreakUpdate(userId: string): Promise<boolean> {
  try {
    const streak = await getUserStreak(userId);

    if (!streak) {
      return true; // No streak record, needs initialization
    }

    const today = new Date().toISOString().split("T")[0];
    const lastLoginDate = streak.last_login_date;

    return lastLoginDate !== today;
  } catch (error) {
    console.error("Exception in needsStreakUpdate:", error);
    return false;
  }
}

/**
 * Get streak statistics for display
 * @param userId - User ID
 */
export async function getStreakStats(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  streakWeeks: number;
  longestStreakWeeks: number;
  lastLoginDaysAgo: number;
}> {
  try {
    const streak = await getUserStreak(userId);

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakWeeks: 0,
        longestStreakWeeks: 0,
        lastLoginDaysAgo: 0,
      };
    }

    const today = new Date();
    const lastLogin = new Date(streak.last_login_date);
    const daysDiff = Math.floor(
      (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      streakWeeks: Math.floor(streak.current_streak / 7),
      longestStreakWeeks: Math.floor(streak.longest_streak / 7),
      lastLoginDaysAgo: daysDiff,
    };
  } catch (error) {
    console.error("Exception in getStreakStats:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakWeeks: 0,
      longestStreakWeeks: 0,
      lastLoginDaysAgo: 0,
    };
  }
}

/**
 * Get leaderboard for streaks (top users by current streak)
 * @param limit - Number of top users to return (default: 10)
 */
export async function getStreakLeaderboard(
  limit: number = 10
): Promise<
  Array<{
    user_id: string;
    username: string | null;
    current_streak: number;
    longest_streak: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("user_login_streaks")
      .select(
        `
        user_id,
        current_streak,
        longest_streak,
        profile:profiles!user_login_streaks_user_id_fkey (
          username
        )
      `
      )
      .order("current_streak", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching streak leaderboard:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      user_id: item.user_id,
      username: item.profile?.username || null,
      current_streak: item.current_streak,
      longest_streak: item.longest_streak,
    }));
  } catch (error) {
    console.error("Exception in getStreakLeaderboard:", error);
    return [];
  }
}

/**
 * Get user's streak rank
 * @param userId - User ID
 */
export async function getUserStreakRank(userId: string): Promise<{
  rank: number | null;
  totalUsers: number;
  percentile: number;
}> {
  try {
    // Get all streaks sorted by current_streak
    const { data, error } = await supabase
      .from("user_login_streaks")
      .select("user_id, current_streak")
      .order("current_streak", { ascending: false });

    if (error || !data) {
      console.error("Error fetching streak ranks:", error);
      return { rank: null, totalUsers: 0, percentile: 0 };
    }

    const totalUsers = data.length;
    const userIndex = data.findIndex((item) => item.user_id === userId);

    if (userIndex === -1) {
      return { rank: null, totalUsers, percentile: 0 };
    }

    const rank = userIndex + 1;
    const percentile = ((totalUsers - rank) / totalUsers) * 100;

    return {
      rank,
      totalUsers,
      percentile: Math.round(percentile * 100) / 100,
    };
  } catch (error) {
    console.error("Exception in getUserStreakRank:", error);
    return { rank: null, totalUsers: 0, percentile: 0 };
  }
}

export const streaksService = {
  getUserStreak,
  updateStreak,
  needsStreakUpdate,
  getStreakStats,
  getStreakLeaderboard,
  getUserStreakRank,
};
