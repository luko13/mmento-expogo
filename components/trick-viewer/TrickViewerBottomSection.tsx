// components/trick-viewer/TrickViewerBottomSection.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { styled } from "nativewind";
import TagPillsSection from "./TagPillsSection";
import StageInfoSection, { type StageType } from "./StageInfoSection";
import StatsPanel from "./StatsPanel";

const StyledView = styled(View);

interface TrickViewerBottomSectionProps {
  tagIds: string[];
  stage: StageType;
  category: string;
  description?: string;
  angle?: number;
  resetTime?: number;
  duration?: number;
  difficulty?: number | null;
  userId?: string;
  onRemoveTag?: (tagId: string) => void;
  stageExpanded?: boolean;
  onStageExpandedChange?: (expanded: boolean) => void;
  debugShowTags?: boolean;
  debugShowStats?: boolean;
}

const TrickViewerBottomSection: React.FC<TrickViewerBottomSectionProps> = ({
  tagIds,
  stage,
  category,
  description,
  angle,
  resetTime,
  duration,
  difficulty,
  userId,
  onRemoveTag,
  stageExpanded,
  onStageExpandedChange,
  debugShowTags = true,
  debugShowStats = true,
}) => {
  const [statsVisible, setStatsVisible] = useState(false);

  const toggleStats = () => {
    setStatsVisible(!statsVisible);
  };

  return (
    <StyledView style={styles.container}>
      {debugShowTags && (
        <TagPillsSection
          tagIds={tagIds}
          userId={userId}
          onRemoveTag={onRemoveTag}
          editable={!!onRemoveTag}
        />
      )}

      <StageInfoSection
        stage={stage}
        category={category}
        description={description}
        expanded={stageExpanded}
        onExpandedChange={onStageExpandedChange}
      />

      {debugShowStats && (
        <StatsPanel
          visible={statsVisible}
          onToggle={toggleStats}
          angle={angle}
          resetTime={resetTime}
          duration={duration}
          difficulty={difficulty}
        />
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    paddingBottom: 28,
  },
});

export default TrickViewerBottomSection;