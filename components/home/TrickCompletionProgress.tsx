// components/home/InlineProgressBar.tsx
import React from "react";
import { View } from "react-native";
import { styled } from "nativewind";

const StyledView = styled(View);

interface InlineProgressBarProps {
  item: {
    title?: string;
    category_id?: string;
    effect_video_url?: string;
    effect?: string;
    secret_video_url?: string;
    secret?: string;
    angles?: string[] | any;
    duration?: number | null;
    reset?: number | null;
    difficulty?: number | null;
  };
}

const InlineProgressBar: React.FC<InlineProgressBarProps> = ({ item }) => {
  const requiredFields = [
    item.title,
    item.category_id,
    item.effect_video_url,
    item.effect,
    item.secret_video_url,
    item.secret,
    item.angles &&
      (Array.isArray(item.angles) ? item.angles.length > 0 : item.angles),
    item.duration !== null && item.duration !== undefined && item.duration > 0,
    item.reset !== null && item.reset !== undefined && item.reset >= 0,
    item.difficulty !== null &&
      item.difficulty !== undefined &&
      item.difficulty > 0,
  ];

  const completedFields = requiredFields.filter((field) => field).length;
  const totalFields = requiredFields.length;
  const completionPercentage = (completedFields / totalFields) * 100;

  if (completionPercentage === 100) return null;

  return (
    <StyledView style={{ width: 50, marginRight: 12 }}>
      <StyledView
        className="bg-[#2C6B5C]/100 rounded-full overflow-hidden"
        style={{ height: 3 }}
      >
        <StyledView
          className="bg-[#EAFFFB]/40 h-full rounded-full"
          style={{ width: `${completionPercentage}%` }}
        />
      </StyledView>
    </StyledView>
  );
};

export default InlineProgressBar;
