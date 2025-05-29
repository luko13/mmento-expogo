"use client";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../../../lib/supabase";
import { BlurView } from "expo-blur";
import {
  FontAwesome,
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "../../../utils/auth";
import { SafeAreaView } from "react-native-safe-area-context";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledBlurView = styled(BlurView); // Añadimos un componente estilizado para BlurView

interface UserProfile {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_type: string;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  tricks_created: number;
  tricks_viewed: number;
  tricks_favorited: number;
}

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, username, email, is_active, is_verified, subscription_type, created_at, updated_at"
          )
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch stats (you might need to create this table or view)
        // For now, we'll use placeholder data
        setStats({
          tricks_created: 0,
          tricks_viewed: 0,
          tricks_favorited: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <StyledView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0f0" />
      </StyledView>
    );
  }

  return (
    <SafeAreaView  style={{ flex: 1 }}>
      <StyledScrollView className="flex-1">
        <StyledView className="p-4">
          {/* Profile Header */}
          <StyledView className="items-center mb-6">
            <StyledView className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-emerald-600 justify-center items-center">
              <FontAwesome name="user" size={40} color="white" />
            </StyledView>
            <StyledText className="text-white text-2xl font-bold">
              {profile?.username}
            </StyledText>
            <StyledText className="text-gray-400">{profile?.email}</StyledText>
            <StyledText className="text-gray-400">
              {t("memberSince")}:{" "}
              {new Date(profile?.created_at || "").toLocaleDateString()}
            </StyledText>
            <StyledText className="text-gray-400">
              {t("subscriptionType")}: {profile?.subscription_type}
            </StyledText>
          </StyledView>

          {/* Stats */}
          <StyledView className="rounded-xl mb-6 overflow-hidden">
            <StyledBlurView intensity={20} tint="dark" className="rounded-xl">
              <StyledView className="flex-row justify-around p-4">
                <StyledView className="items-center">
                  <StyledText className="text-white text-lg font-bold">
                    {stats?.tricks_created || 0}
                  </StyledText>
                  <StyledText className="text-gray-400">
                    {t("tricksCreated")}
                  </StyledText>
                </StyledView>
                <StyledView className="items-center">
                  <StyledText className="text-white text-lg font-bold">
                    {stats?.tricks_viewed || 0}
                  </StyledText>
                  <StyledText className="text-gray-400">
                    {t("tricksViewed")}
                  </StyledText>
                </StyledView>
                <StyledView className="items-center">
                  <StyledText className="text-white text-lg font-bold">
                    {stats?.tricks_favorited || 0}
                  </StyledText>
                  <StyledText className="text-gray-400">
                    {t("tricksFavorited")}
                  </StyledText>
                </StyledView>
              </StyledView>
            </StyledBlurView>
          </StyledView>

          {/* Actions */}
          <StyledView className="space-y-4">
            <StyledTouchableOpacity className="flex-row items-center bg-emerald-700 p-4 rounded-xl">
              <MaterialIcons name="edit" size={24} color="white" />
              <StyledText className="text-white ml-4">
                {t("editProfile")}
              </StyledText>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity className="flex-row items-center bg-emerald-700 p-4 rounded-xl">
              <MaterialCommunityIcons
                name="trophy-award"
                size={24}
                color="white"
              />
              <StyledText className="text-white ml-4">
                {t("achievements")}
              </StyledText>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity className="flex-row items-center bg-emerald-700 p-4 rounded-xl">
              <Ionicons name="time" size={24} color="white" />
              <StyledText className="text-white ml-4">
                {t("activityHistory")}
              </StyledText>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center bg-red-700 p-4 rounded-xl"
            >
              <MaterialIcons name="logout" size={24} color="white" />
              <StyledText className="text-white ml-4">{t("logout")}</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </SafeAreaView>
  );
}
