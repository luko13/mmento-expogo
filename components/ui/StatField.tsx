// components/ui/StatField.tsx
import React from "react";
import { View } from "react-native";
import { styled } from "nativewind";
import CustomTooltip from "./Tooltip";

const StyledView = styled(View);

interface StatFieldProps {
  icon: React.ReactNode;
  tooltip: string;
  children: React.ReactNode;
  iconHeight?: number;
  tooltipBgColor?: string;
  inputRef?: React.RefObject<View | null>;
}

export const StatField: React.FC<StatFieldProps> = ({
  icon,
  tooltip,
  children,
  iconHeight = 48,
  tooltipBgColor = "rgba(91, 185, 163, 0.95)",
  inputRef,
}) => {
  return (
    <StyledView className="flex-row mb-6" ref={inputRef}>
      <CustomTooltip
        text={tooltip}
        backgroundColor={tooltipBgColor}
        textColor="white"
      >
        <StyledView
          className="bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3"
          style={{ width: 48, height: iconHeight }}
        >
          {icon}
        </StyledView>
      </CustomTooltip>
      <StyledView className="flex-1">{children}</StyledView>
    </StyledView>
  );
};
