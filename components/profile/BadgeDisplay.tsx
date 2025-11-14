/**
 * BadgeDisplay Component
 *
 * Reusable component for displaying a user's badge (equipped or unlocked)
 * Can be used inline next to username or standalone
 */

import React from "react";
import { Text } from "react-native";
import { styled } from "nativewind";
import type { BadgeWithTranslation } from "../../services/badgesService";

const StyledText = styled(Text);

interface BadgeDisplayProps {
  badge: BadgeWithTranslation;
  fontNames: {
    bold: string;
    semiBold: string;
    medium: string;
    regular: string;
    light: string;
  };
  className?: string;
  style?: any;
}

export default function BadgeDisplay({
  badge,
  fontNames,
  className = "",
  style = {},
}: BadgeDisplayProps) {
  // Map font_family string to actual font
  const getFontFamily = (fontFamily: string): string => {
    const fontMap: Record<string, string> = {
      bold: fontNames.bold,
      semibold: fontNames.semiBold,
      semiBold: fontNames.semiBold,
      medium: fontNames.medium,
      regular: fontNames.regular,
      light: fontNames.light,
    };

    return fontMap[fontFamily] || fontNames.regular;
  };

  return (
    <StyledText
      className={className}
      style={{
        fontFamily: getFontFamily(badge.font_family),
        fontSize: badge.font_size || 14,
        color: badge.color,
        ...style,
      }}
    >
      {badge.text}
    </StyledText>
  );
}
