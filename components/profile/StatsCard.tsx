/**
 * StatsCard Component
 *
 * Displays a single statistic with a count and label
 * Used for showing tricks, categories, and tags counts
 */

import React from "react";
import { View as StyledView, Text as StyledText } from "react-native";
import { styled } from "nativewind";

const View = styled(StyledView);
const Text = styled(StyledText);

interface StatsCardProps {
  count: number;
  label: string;
  fontNames: {
    bold: string;
    regular: string;
  };
}

export default function StatsCard({ count, label, fontNames }: StatsCardProps) {
  return (
    <StyledView className="items-center flex-1">
      {/* Count */}
      <StyledText
        className="text-white text-3xl mb-1"
        style={{ fontFamily: fontNames.bold }}
      >
        {count}
      </StyledText>

      {/* Label */}
      <StyledText
        className="text-gray-400 text-xs text-center"
        style={{ fontFamily: fontNames.regular }}
      >
        {label}
      </StyledText>
    </StyledView>
  );
}
