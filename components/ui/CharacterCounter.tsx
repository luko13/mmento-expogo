// components/ui/CharacterCounter.tsx
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { styled } from "nativewind";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);

interface CharacterCounterProps {
  currentLength: number;
  maxLength: number;
  warningThreshold?: number; // Percentage threshold to show warning (default: 0.8 = 80%)
  position?: "absolute" | "relative";
  style?: any;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({
  currentLength,
  maxLength,
  warningThreshold = 0.8,
  position = "absolute",
  style,
}) => {
  const percentage = currentLength / maxLength;
  const remaining = maxLength - currentLength;

  // Determine color based on usage
  const textColor = useMemo(() => {
    if (percentage >= 1) {
      return "#ef4444"; // red-500 - over limit
    } else if (percentage >= warningThreshold) {
      return "#f59e0b"; // amber-500 - warning
    } else {
      return "rgba(255, 255, 255, 0.4)"; // subtle white
    }
  }, [percentage, warningThreshold]);

  const displayText = percentage >= 1 ? `-${Math.abs(remaining)}` : `${remaining}`;

  return (
    <StyledView
      style={[
        position === "absolute"
          ? {
              position: "absolute",
              bottom: 8,
              right: 8,
            }
          : {},
        style,
      ]}
    >
      <StyledText
        style={{
          fontFamily: fontNames.regular,
          fontSize: 12,
          color: textColor,
          includeFontPadding: false,
        }}
      >
        {displayText}
      </StyledText>
    </StyledView>
  );
};

export default React.memo(CharacterCounter);
