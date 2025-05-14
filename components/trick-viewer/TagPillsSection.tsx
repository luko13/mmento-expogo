"use client"

import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { styled } from "nativewind"
import { BlurView } from "expo-blur"
import { Feather } from "@expo/vector-icons"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

export interface Tag {
  id: string
  name: string
}

interface TagPillsSectionProps {
  tags: Tag[]
  onRemoveTag?: (tagId: string) => void
  editable?: boolean
}

const TagPillsSection: React.FC<TagPillsSectionProps> = ({ tags, onRemoveTag, editable = false }) => {
  if (!tags || tags.length === 0) return null

  return (
    <StyledView style={styles.container}>
      <StyledScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tags.map((tag) => (
          <StyledView key={tag.id} style={styles.tagContainer}>
            <BlurView intensity={25} tint="default" style={styles.blurContainer}>
              <StyledView style={styles.tagContent}>
                <StyledText style={styles.tagText}>{tag.name}</StyledText>
                {editable && onRemoveTag && (
                  <StyledTouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveTag(tag.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={14} color="white" />
                  </StyledTouchableOpacity>
                )}
              </StyledView>
            </BlurView>
          </StyledView>
        ))}
      </StyledScrollView>
    </StyledView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  tagContainer: {
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  blurContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  tagContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  removeButton: {
    marginLeft: 6,
  },
})

export default TagPillsSection
