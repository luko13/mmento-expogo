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
import { View as StyledView, Text as StyledText } from "react-native";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import type { AchievementWithProgress } from "../../services/achievementsService";

const View = styled(StyledView);
const Text = styled(StyledText);

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  fontNames: {
    semiBold: string;
    regular: string;
  };
}

// Map icon names to Ionicons
const getIconName = (iconName: string | null): keyof typeof Ionicons.glyphMap => {
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
}: AchievementCardProps) {
  const { title, description, progress, threshold, is_unlocked, icon_name } = achievement;
  const progressPercentage = Math.min((progress / threshold) * 100, 100);

  // Colors based on locked/unlocked state
  const cardBgColor = is_unlocked
    ? "rgba(91, 185, 163, 0.15)"
    : "rgba(255, 255, 255, 0.05)";
  const borderColor = is_unlocked
    ? "rgba(91, 185, 163, 0.5)"
    : "rgba(255, 255, 255, 0.2)";
  const iconColor = is_unlocked ? "#5BB9A3" : "#6B7280";
  const titleColor = is_unlocked ? "#FFFFFF" : "#9CA3AF";
  const descriptionColor = is_unlocked
    ? "rgba(255, 255, 255, 0.7)"
    : "rgba(255, 255, 255, 0.4)";
  const progressBarColor = is_unlocked ? "#5BB9A3" : "#4B5563";

  return (
    <StyledView
      className="flex-row items-center p-4 rounded-2xl mb-3"
      style={{
        backgroundColor: cardBgColor,
        borderWidth: 1,
        borderColor: borderColor,
      }}
    >
      {/* Achievement Icon */}
      <StyledView
        className="w-16 h-16 rounded-full items-center justify-center mr-4"
        style={{
          backgroundColor: is_unlocked
            ? "rgba(91, 185, 163, 0.2)"
            : "rgba(107, 114, 128, 0.2)",
        }}
      >
        <Ionicons
          name={getIconName(icon_name)}
          size={32}
          color={iconColor}
        />
      </StyledView>

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
