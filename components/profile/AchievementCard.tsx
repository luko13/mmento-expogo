/**
 * AchievementCard Component
 *
 * Displays an individual achievement with:
 * - Icon/image
 * - Title and description
 * - Progress bar
 * - Locked/unlocked state visual indicator
 */

import React from "react";
import { View, Text } from "react-native";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import type { AchievementWithProgress } from "../../services/achievementsService";

const StyledView = styled(View);
const StyledText = styled(Text);

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  fontNames: {
    bold: string;
    semiBold: string;
    medium?: string;
    regular: string;
    light: string;
    extraLight: string;
  };
  removeMarginBottom?: boolean;
}

// Map icon names to Ionicons
const getIconName = (
  iconName: string | null
): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    star: "star",
    trophy: "trophy",
    compass: "compass",
    book: "book",
    award: "ribbon",
    eye: "eye",
    zap: "flash",
    folder: "folder",
    heart: "heart",
  };

  return iconMap[iconName || "star"] || "star";
};

export default function AchievementCard({
  achievement,
  fontNames,
  removeMarginBottom = false,
}: AchievementCardProps) {
  const { title, description, progress, threshold, is_unlocked, icon_name } =
    achievement;
  const progressPercentage = Math.min((progress / threshold) * 100, 100);

  // Colors based on locked/unlocked state
  const cardBgColor = "#32534C";
  const iconColor = is_unlocked ? "#5BB9A3" : "rgba(255, 255, 255, 0.7)";
  const titleColor = is_unlocked ? "#FFFFFF" : "#5BB9A3";
  const descriptionColor = "rgba(255, 255, 255, 0.7)";
  const progressBarColor = is_unlocked ? "#5BB9A3" : "#4B5563";

  return (
    <StyledView
      className="flex-row items-center p-4 rounded-2xl"
      style={{
        backgroundColor: cardBgColor,
        marginBottom: removeMarginBottom ? 0 : 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      {/* Achievement Icon */}
      <StyledView className="w-16 h-16 rounded-full items-center justify-center mr-4">
        <Ionicons name={getIconName(icon_name)} size={32} color={iconColor} />
      </StyledView>

      {/* Vertical Divider */}
      <StyledView
        className="mr-4"
        style={{
          width: 0.5,
          height: "80%",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        }}
      />

      {/* Achievement Details */}
      <StyledView className="flex-1">
        {/* Title */}
        <StyledText
          className="text-base mb-1"
          style={{ fontFamily: fontNames.semiBold, color: titleColor }}
        >
          {title}
        </StyledText>

        {/* Description */}
        <StyledText
          className="text-xs mb-2"
          style={{
            fontFamily: fontNames.regular,
            color: descriptionColor,
          }}
        >
          {description}
        </StyledText>

        {/* Progress Bar and Text */}
        <StyledView>
          {/* Progress Text */}
          <StyledText
            className="text-xs mb-1"
            style={{
              fontFamily: fontNames.regular,
              color: descriptionColor,
            }}
          >
            {progress}/{threshold} {is_unlocked ? "✓" : ""}
          </StyledText>

          {/* Progress Bar Background */}
          <StyledView
            className="h-2 rounded-full overflow-hidden"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Progress Bar Fill */}
            <StyledView
              className="h-full rounded-full"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: progressBarColor,
              }}
            />
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}
