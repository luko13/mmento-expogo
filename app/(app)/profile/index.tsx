"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { styled } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "../../../lib/supabase";
import { fontNames } from "../../../app/_layout";
import { userStatsService } from "../../../services/userStatsService";
import { achievementsService } from "../../../services/achievementsService";
import type { AchievementCategory } from "../../../services/achievementsService";
import ProfileHeader from "../../../components/profile/ProfileHeader";
import StatsCard from "../../../components/profile/StatsCard";
import CollapsibleAchievementGroup from "../../../components/profile/CollapsibleAchievementGroup";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledLinearGradient = styled(LinearGradient);

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  subscription_type: "free" | "member" | string;
  created_at: string;
}

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    tricksCount: 0,
    categoriesCount: 0,
    tagsCount: 0,
  });
  const [achievementCategories, setAchievementCategories] = useState<AchievementCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, avatar_url, subscription_type, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user stats
      const userStats = await userStatsService.getUserStats(user.id);
      setStats({
        tricksCount: userStats.tricksCount,
        categoriesCount: userStats.categoriesCount,
        tagsCount: userStats.tagsCount,
      });

      // Fetch achievements (they auto-update via event tracking system)
      const achievements = await achievementsService.getAchievementsByCategory(user.id);
      console.log("📊 Achievements fetched:", achievements.length, "categories");
      console.log("📊 Achievement details:", JSON.stringify(achievements, null, 2));
      setAchievementCategories(achievements);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StyledLinearGradient
        colors={["#15322C", "#15322C"]}
        className="flex-1 justify-center items-center"
      >
        <StatusBar barStyle="light-content" backgroundColor="#15322C" />
        <ActivityIndicator size="large" color="#5BB9A3" />
      </StyledLinearGradient>
    );
  }

  if (!profile) {
    return (
      <StyledLinearGradient
        colors={["#15322C", "#15322C"]}
        className="flex-1 justify-center items-center"
      >
        <StatusBar barStyle="light-content" backgroundColor="#15322C" />
        <StyledText className="text-white" style={{ fontFamily: fontNames.regular }}>
          {t("profile.errorLoadingProfile")}
        </StyledText>
      </StyledLinearGradient>
    );
  }

  return (
    <StyledView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-center px-5 py-3">
          <StyledTouchableOpacity
            onPress={() => router.back()}
            className="absolute left-5"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledText
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("profile.title")}
          </StyledText>
        </StyledView>

        {/* Scrollable Content */}
        <StyledScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
        {/* User Data Card */}
        <StyledView
          className="rounded-2xl mb-6 overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.3)",
            backgroundColor: "#32534C",
          }}
        >
          {/* Edit Button */}
          <StyledTouchableOpacity
            onPress={() => router.push("/(app)/profile/edit")}
            className="absolute top-3 right-3 z-10 p-2"
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </StyledTouchableOpacity>

          {/* Profile Header */}
          <ProfileHeader
            userId={profile.id}
            avatarUrl={profile.avatar_url}
            username={profile.username}
            email={profile.email}
            memberSince={profile.created_at}
            subscriptionType={profile.subscription_type}
            fontNames={fontNames}
          />

          {/* Divider */}
          <StyledView
            className="mx-6 mb-4"
            style={{
              height: 0.5,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          />

          {/* Stats Row */}
          <StyledView className="flex-row justify-around pb-4">
            <StatsCard
              count={stats.tricksCount}
              label={t("profile.itemsMagicos")}
              fontNames={fontNames}
            />
            <StatsCard
              count={stats.categoriesCount}
              label={t("profile.categorias")}
              fontNames={fontNames}
            />
            <StatsCard
              count={stats.tagsCount}
              label={t("profile.tags")}
              fontNames={fontNames}
            />
          </StyledView>
        </StyledView>

        {/* Achievements Section */}
        <StyledView className="mb-6">
          {/* Section Title */}
          <StyledView className="flex-row items-center mb-4">
            <Feather name="award" size={24} color="#5BB9A3" />
            <StyledText
              className="text-white text-xl ml-2"
              style={{ fontFamily: fontNames.bold }}
            >
              {t("profile.logros")}
            </StyledText>
          </StyledView>

          {/* Achievement Groups */}
          {achievementCategories.length > 0 ? (
            achievementCategories.map((category) => (
              <CollapsibleAchievementGroup
                key={category.category}
                category={category}
                fontNames={fontNames}
              />
            ))
          ) : (
            <StyledView
              className="p-6 rounded-2xl items-center"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <StyledText
                className="text-gray-400 text-center"
                style={{ fontFamily: fontNames.regular }}
              >
                {t("profile.noAchievementsYet")}
                {"\n"}{t("profile.startCreating")}
              </StyledText>
            </StyledView>
          )}
        </StyledView>
      </StyledScrollView>
      </SafeAreaView>
    </StyledView>
  );
}
