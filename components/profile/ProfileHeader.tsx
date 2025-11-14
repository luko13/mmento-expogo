/**
 * ProfileHeader Component
 *
 * Displays user profile picture with subscription-based frame,
 * username with equipped badge, email, member since date, and subscription badge
 */

import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { badgesService, BadgeWithTranslation } from "../../services/badgesService";
import BadgeDisplay from "./BadgeDisplay";

const StyledView = styled(View);
const StyledText = styled(Text);

interface ProfileHeaderProps {
  userId: string;
  avatarUrl: string | null;
  username: string;
  email: string;
  memberSince: string; // ISO date string
  subscriptionType: "free" | "member" | string;
  fontNames: {
    bold: string;
    semiBold: string;
    medium: string;
    regular: string;
    light: string;
    extraLight: string;
  };
}

export default function ProfileHeader({
  userId,
  avatarUrl,
  username,
  email,
  memberSince,
  subscriptionType,
  fontNames,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const isPremium = subscriptionType === "member";
  const [equippedBadge, setEquippedBadge] = useState<BadgeWithTranslation | null>(null);

  // Fetch equipped badge
  useEffect(() => {
    const fetchBadge = async () => {
      const badge = await badgesService.getEquippedBadge(userId);
      setEquippedBadge(badge);
    };

    fetchBadge();
  }, [userId]);

  // Format member since date
  const formatMemberSince = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  return (
    <StyledView className="items-center py-4">
      {/* Profile Picture with Subscription Frame */}
      <StyledView
        className="w-32 h-32 rounded-full overflow-hidden justify-center items-center mb-4"
        style={{
          borderWidth: 4,
          borderColor: isPremium ? "#5BB9A3" : "#FFFFFF",
          backgroundColor: "#15322C",
          ...(isPremium && {
            shadowColor: "#5BB9A3",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 12,
            elevation: 12,
          }),
        }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <FontAwesome name="user" size={64} color="white" />
        )}
      </StyledView>

      {/* Username with Badge */}
      <StyledView className="flex-row items-baseline mb-2">
        <StyledText
          className="text-white text-xl"
          style={{ fontFamily: fontNames.light }}
        >
          {username}
        </StyledText>
        {equippedBadge && (
          <BadgeDisplay badge={equippedBadge} fontNames={fontNames} className="ml-2" />
        )}
      </StyledView>

      {/* Email */}
      <StyledText
        className="text-gray-400 text-s mb-2"
        style={{ fontFamily: fontNames.extraLight }}
      >
        {email}
      </StyledText>

      {/* Member Since */}
      <StyledText
        className="text-gray-400 text-s mb-3"
        style={{ fontFamily: fontNames.extraLight }}
      >
        {t("profile.memberSince")}: {formatMemberSince(memberSince)}
      </StyledText>

      {/* Subscription Badge */}
      <StyledView
        className="px-4 py-1 rounded-full"
        style={{
          backgroundColor: isPremium ? "rgba(91, 185, 163, 0.2)" : "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          borderColor: isPremium ? "#5BB9A3" : "rgba(255, 255, 255, 0.3)",
        }}
      >
        <StyledText
          className="text-s"
          style={{
            fontFamily: fontNames.regular,
            color: isPremium ? "#5BB9A3" : "#FFFFFF",
          }}
        >
          {isPremium ? "MEMBER" : "FREE"}
        </StyledText>
      </StyledView>
    </StyledView>
  );
}
