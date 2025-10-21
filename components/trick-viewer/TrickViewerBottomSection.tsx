// components/trick-viewer/TrickViewerBottomSection.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { styled } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagPillsSection from "./TagPillsSection";
import StageInfoSection, { type StageType } from "./StageInfoSection";
import StatsPanel from "./StatsPanel";

const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const insets = useSafeAreaInsets();

  const toggleStats = () => {
    // Si la descripción está expandida, primero contraerla
    if (stageExpanded && onStageExpandedChange) {
      onStageExpandedChange(false);
    }
    // Luego toggle del stats panel
    setStatsVisible(!statsVisible);
  };

  // Calcular altura máxima: pantalla completa menos TopNavigationBar (60px) menos insets
  const maxHeight = SCREEN_HEIGHT - insets.top - 60 - 20; // 20px extra de margen

  return (
    <StyledView style={styles.container}>
      <StyledScrollView
        style={[styles.scrollContainer, stageExpanded && { maxHeight }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={stageExpanded}
      >
        {/* Contenedor horizontal para Tags */}
        <StyledView style={styles.tagsStatsRow}>
          {debugShowTags && (
            <StyledView style={styles.tagsContainer}>
              <TagPillsSection
                tagIds={tagIds}
                userId={userId}
                onRemoveTag={onRemoveTag}
                editable={!!onRemoveTag}
              />
            </StyledView>
          )}

          {/* Espacio reservado para el Stats button */}
          <StyledView style={styles.statsPlaceholder} />
        </StyledView>

        <StageInfoSection
          stage={stage}
          category={category}
          description={description}
          expanded={stageExpanded}
          onExpandedChange={onStageExpandedChange}
        />
      </StyledScrollView>

      {/* Stats Panel fuera del ScrollView, posicionado absolutamente */}
      {debugShowStats && (
        <StyledView style={styles.statsPanelContainer}>
          <StatsPanel
            visible={statsVisible}
            onToggle={toggleStats}
            angle={angle}
            resetTime={resetTime}
            duration={duration}
            difficulty={difficulty}
          />
        </StyledView>
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    paddingBottom: 28,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  tagsStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    minHeight: 70,
  },
  tagsContainer: {
    flex: 1,
    marginRight: 8,
  },
  statsPlaceholder: {
    width: 76,
  },
  statsPanelContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
  },
});

export default TrickViewerBottomSection;