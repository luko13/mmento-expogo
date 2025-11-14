"use client";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";
import { supabase } from "../../../lib/supabase";
import { signOut } from "../../../utils/auth";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  subscription_type: "free" | "member";
}

export default function ProfileOptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, email, avatar_url, subscription_type")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
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

  const openExternalLink = (url: string) => {
    // TODO: Implementar apertura de links externos cuando estén disponibles
    console.log("Opening:", url);
  };

  if (loading) {
    return (
      <StyledView className="flex-1" style={{ backgroundColor: "#15322C" }}>
        <StatusBar barStyle="light-content" backgroundColor="#15322C" />
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5BB9A3" />
        </StyledView>
      </StyledView>
    );
  }

  const isPremium = profile?.subscription_type === "member";

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
            MMENTO
          </StyledText>
        </StyledView>

        <StyledView className="flex-1 px-5">
          {/* User Profile Section */}
          <StyledView
            className="rounded-2xl mb-3 overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <StyledTouchableOpacity
              onPress={() => router.push("/(app)/profile")}
              className="flex-row items-center p-3"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Avatar with border based on subscription */}
              <StyledView
                className="w-14 h-14 rounded-full overflow-hidden mr-3 justify-center items-center"
                style={{
                  borderWidth: 3,
                  borderColor: isPremium ? "#5BB9A3" : "#FFFFFF",
                  ...(isPremium && {
                    shadowColor: "#5BB9A3",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    elevation: 8,
                  }),
                }}
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 56, height: 56 }}
                    resizeMode="cover"
                  />
                ) : (
                  <FontAwesome name="user" size={28} color="white" />
                )}
              </StyledView>

              <StyledView className="flex-1">
                <StyledText
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontFamily: fontNames.regular,
                    includeFontPadding: false,
                  }}
                >
                  {profile?.username}
                </StyledText>
                <StyledText
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: 14,
                    fontFamily: fontNames.light,
                    includeFontPadding: false,
                  }}
                >
                  {profile?.email}
                </StyledText>
              </StyledView>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>

            {/* Plan Section */}
            <StyledTouchableOpacity
              onPress={() => router.push("/(app)/plans")}
              className="flex-row items-center justify-between p-3"
            >
              <StyledView className="flex-row items-center">
                <StyledText
                  style={{
                    color: isPremium ? "#5BB9A3" : "#FFFFFF",
                    fontSize: 16,
                    fontFamily: fontNames.medium,
                    includeFontPadding: false,
                  }}
                >
                  {isPremium ? "MEMBER" : "FREE"}
                </StyledText>
                <StyledText
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontFamily: fontNames.light,
                    includeFontPadding: false,
                    marginLeft: 4,
                  }}
                >
                  plan
                </StyledText>
              </StyledView>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Settings & Reminders Section */}
          <StyledView
            className="rounded-2xl mb-3 overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <StyledTouchableOpacity
              onPress={() => router.push("/(app)/settings")}
              className="flex-row items-center p-3"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.settings")}
              </StyledText>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={() => router.push("/(app)/reminders")}
              className="flex-row items-center p-3"
            >
              <Ionicons name="time-outline" size={24} color="#FFFFFF" />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.reminders")}
              </StyledText>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Tags Section */}
          <StyledView
            className="rounded-2xl mb-3 overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <StyledTouchableOpacity
              onPress={() => router.push("/(app)/tags")}
              className="flex-row items-center p-3"
            >
              <Ionicons name="pricetag-outline" size={24} color="#FFFFFF" />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.tags")}
              </StyledText>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>
          </StyledView>

          {/* News Section (Empty for now) */}
          <StyledView
            className="rounded-2xl mb-3 overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
              minHeight: 250,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="newspaper-outline"
              size={32}
              color="rgba(255, 255, 255, 0.2)"
            />
            <StyledText
              style={{
                color: "rgba(255, 255, 255, 0.3)",
                fontSize: 12,
                fontFamily: fontNames.light,
                includeFontPadding: false,
                marginTop: 4,
              }}
            >
              {t("profileOptions.noRecentNews")}
            </StyledText>
          </StyledView>

          {/* Links Section */}
          <StyledView
            className="rounded-2xl mb-4 overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <StyledTouchableOpacity
              onPress={() => openExternalLink("guide")}
              className="flex-row items-center p-2"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Ionicons name="document-text-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 16,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.guide")}
              </StyledText>
              <Ionicons
                name="open-outline"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={() => openExternalLink("roadmap")}
              className="flex-row items-center p-2"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <MaterialCommunityIcons
                name="map-outline"
                size={24}
                color="rgba(255, 255, 255, 0.5)"
              />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 16,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.roadmap")}
              </StyledText>
              <Ionicons
                name="open-outline"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              onPress={() => openExternalLink("help")}
              className="flex-row items-center p-2"
            >
              <Ionicons
                name="help-circle-outline"
                size={24}
                color="rgba(255, 255, 255, 0.5)"
              />
              <StyledText
                className="flex-1 ml-3"
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 16,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("profileOptions.helpCenter")}
              </StyledText>
              <Ionicons
                name="open-outline"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Logout Button */}
          <StyledTouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center p-3 px-5"
          >
            <Ionicons name="exit-outline" size={20} color="#FF4444" />
            <StyledText
              className="ml-2"
              style={{
                color: "#FF4444",
                fontSize: 16,
                fontFamily: fontNames.light,
                includeFontPadding: false,
              }}
            >
              {t("profileOptions.logout")}
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </SafeAreaView>
    </StyledView>
  );
}
