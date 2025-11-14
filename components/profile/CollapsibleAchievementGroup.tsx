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
    light: string;
    extraLight: string;
  };
}

export default function CollapsibleAchievementGroup({
  category,
  fontNames,
}: CollapsibleAchievementGroupProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStackedCards, setShowStackedCards] = useState(true);
  const animatedHeight = useRef(new RNAnimated.Value(0)).current;

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    const toValue = !isExpanded ? 1 : 0;

    // If expanding, hide stacked cards immediately
    if (!isExpanded) {
      setShowStackedCards(false);
    }

    RNAnimated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // If collapsing, show stacked cards after animation completes
      if (isExpanded) {
        setShowStackedCards(true);
      }
    });

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

  // Get remaining achievements (excluding the one shown)
  const remainingAchievements = category.achievements.filter(
    (achievement) => achievement.id !== category.nextToUnlock?.id
  );
  const hasMoreCards = remainingAchievements.length > 0;

  // Get colors based on next achievement unlock state
  const isUnlocked = category.nextToUnlock?.is_unlocked || false;
  const cardBgColor = "#32534C"

  return (
    <StyledView className="mb-6">
      {/* Stacked Cards Container */}
      <StyledTouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <StyledView>
          {/* Main Card (Next Achievement to Unlock) */}
          {category.nextToUnlock && (
            <AchievementCard
              achievement={category.nextToUnlock}
              fontNames={fontNames}
              removeMarginBottom={!isExpanded && showStackedCards && hasMoreCards}
            />
          )}

          {/* Background stacked cards - visible at bottom when collapsed */}
          {!isExpanded && showStackedCards && hasMoreCards && (
            <>
              {remainingAchievements.slice(0, 2).map((_, index) => {
                // Crear colores progresivamente más oscuros
                const stackedCardColors = ["#2A4740", "#223B35"];
                return (
                  <StyledView
                    key={`stack-${index}`}
                    style={{
                      height: 8,
                      backgroundColor: stackedCardColors[index],
                      borderBottomLeftRadius: 16,
                      borderBottomRightRadius: 16,
                      marginLeft: (index + 1) * 15,
                      marginRight: (index + 1) * 15,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.45,
                      shadowRadius: 6,
                      elevation: 8,
                    }}
                  />
                );
              })}
            </>
          )}
        </StyledView>
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
          {remainingAchievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              fontNames={fontNames}
              removeMarginBottom={index === remainingAchievements.length - 1}
            />
          ))}
        </StyledView>
      </RNAnimated.View>
    </StyledView>
  );
}
