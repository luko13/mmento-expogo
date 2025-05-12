"use client"

import type React from "react"
import { useState } from "react"
import { View, StyleSheet } from "react-native"
import { styled } from "nativewind"
import TagPillsSection, { type Tag } from "../trick-viewer/TagPillsSection"
import StageInfoSection, { type StageType } from "./StageInfoSection"
import StatsPanel from "./StatsPanel"

const StyledView = styled(View)

interface TrickViewerBottomSectionProps {
  tags: Tag[]
  stage: StageType
  category: string
  description?: string
  angle?: number
  resetTime?: number
  duration?: number
  difficulty?: number
  onRemoveTag?: (tagId: string) => void
}

const TrickViewerBottomSection: React.FC<TrickViewerBottomSectionProps> = ({
  tags,
  stage,
  category,
  description,
  angle,
  resetTime,
  duration,
  difficulty,
  onRemoveTag,
}) => {
  const [statsVisible, setStatsVisible] = useState(false)

  const toggleStats = () => {
    setStatsVisible(!statsVisible)
  }

  return (
    <StyledView style={styles.container}>
      {/* Sección de etiquetas */}
      <TagPillsSection tags={tags} onRemoveTag={onRemoveTag} />

      {/* Información de etapa y categoría */}
      <StageInfoSection stage={stage} category={category} description={description} />

      {/* Panel de estadísticas */}
      <StatsPanel
        visible={statsVisible}
        onToggle={toggleStats}
        angle={angle}
        resetTime={resetTime}
        duration={duration}
        difficulty={difficulty}
      />
    </StyledView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    paddingBottom: 16,
  },
})

export default TrickViewerBottomSection
