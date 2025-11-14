/**
 * CollapsibleAchievementGroup Component
 *
 * Displays a collapsible group of achievements from the same category.
 * - Header shows the next achievement to unlock (collapsed state)
 * - Expands to show all achievements in the category
 * - Smooth animation (no chevron icon)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated as RNAnimated,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import AchievementCard from "./AchievementCard";
import type {
  AchievementCategory,
  AchievementWithProgress,
} from "../../services/achievementsService";
import { achievementsService } from "../../services/achievementsService";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface CollapsibleAchievementGroupProps {
  category: AchievementCategory;
  fontNames: {
    bold: string;
    semiBold: string;
    regular: string;
  };
}

export default function CollapsibleAchievementGroup({
  category,
  fontNames,
}: CollapsibleAchievementGroupProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new RNAnimated.Value(0)).current;

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    const toValue = !isExpanded ? 1 : 0;

    RNAnimated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsExpanded(!isExpanded);
  }, [isExpanded, animatedHeight]);

  // Animate on mount if expanded
  useEffect(() => {
    if (isExpanded) {
      RNAnimated.timing(animatedHeight, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  // Calculate max height based on number of achievements
  const maxHeight = category.achievements.length * 120; // Approximate height per achievement

  // Height interpolation
  const heightInterpolation = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  return (
    <StyledView className="mb-4">
      {/* Category Header with Next to Unlock */}
      <StyledTouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.7}
        className="mb-2"
      >
        {/* Category Title */}
        <StyledText
          className="text-white text-base mb-3 ml-1"
          style={{ fontFamily: fontNames.semiBold }}
        >
          {achievementsService.getCategoryDisplayName(category.category)}
        </StyledText>

        {/* Next Achievement to Unlock (always visible) */}
        {category.nextToUnlock && (
          <AchievementCard
            achievement={category.nextToUnlock}
            fontNames={fontNames}
          />
        )}
      </StyledTouchableOpacity>

      {/* Expanded List of All Achievements */}
      <RNAnimated.View
        style={{
          maxHeight: heightInterpolation,
          opacity: animatedHeight,
          overflow: "hidden",
        }}
      >
        <StyledView className="pl-2">
          {category.achievements
            .filter((achievement) => achievement.id !== category.nextToUnlock?.id)
            .map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                fontNames={fontNames}
              />
            ))}
        </StyledView>
      </RNAnimated.View>

      {/* Expand/Collapse Hint (optional) */}
      {category.achievements.length > 1 && (
        <StyledTouchableOpacity
          onPress={toggleExpanded}
          className="items-center py-2"
          activeOpacity={0.7}
        >
          <StyledText
            className="text-gray-400 text-xs"
            style={{ fontFamily: fontNames.regular }}
          >
            {isExpanded
              ? t("profile.showLess")
              : `${t("profile.viewAll")} (${category.achievements.length})`}
          </StyledText>
        </StyledTouchableOpacity>
      )}
    </StyledView>
  );
}
