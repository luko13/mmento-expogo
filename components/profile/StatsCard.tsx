/**
 * StatsCard Component
 *
 * Displays a single statistic with a count and label
 * Used for showing tricks, categories, and tags counts
 */

import React from "react";
import { View, Text } from "react-native";
import { styled } from "nativewind";

const StyledView = styled(View);
const StyledText = styled(Text);

interface StatsCardProps {
  count: number;
  label: string;
  fontNames: {
    extraLight: string;
    light: string;
    bold: string;
    regular: string;
  };
}

export default function StatsCard({ count, label, fontNames }: StatsCardProps) {
  return (
    <StyledView className="items-center flex-1">
      {/* Count */}
      <StyledText
        className="text-white text-xl mb-1"
        style={{ fontFamily: fontNames.extraLight }}
      >
        {count}
      </StyledText>

      {/* Label */}
      <StyledText
        className="text-gray-400 text-m text-center"
        style={{ fontFamily: fontNames.extraLight }}
      >
        {label}
      </StyledText>
    </StyledView>
  );
}
