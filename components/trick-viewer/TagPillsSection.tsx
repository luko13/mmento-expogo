import type React from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { styled } from "nativewind"
import { X } from "lucide-react-native"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledScrollView = styled(ScrollView)
const StyledTouchableOpacity = styled(TouchableOpacity)

export interface Tag {
  id: string
  name: string
}

interface TagPillsSectionProps {
  tags: Tag[]
  onRemoveTag?: (tagId: string) => void
}

const TagPillsSection: React.FC<TagPillsSectionProps> = ({ tags, onRemoveTag }) => {
  if (tags.length === 0) {
    return null
  }

  return (
    <StyledView style={styles.container}>
      <StyledScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tags.map((tag) => (
          <StyledTouchableOpacity key={tag.id} style={styles.pill}>
            <StyledView style={styles.horizontalLine} />
            <StyledText style={styles.tagText}>{tag.name}</StyledText>
            {onRemoveTag && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveTag(tag.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            )}
          </StyledTouchableOpacity>
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
    paddingVertical: 8,
    gap: 8,
  },
  blurContainer: {
    borderRadius: 9999, // Bordes completamente redondeados
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.85,
  },
  pill: {
    height: 32,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalLine: {
    width: 12,
    height: 1,
    backgroundColor: "white",
    marginRight: 8,
  },
  tagText: {
    color: "white",
    fontSize: 14,
  },
  removeButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
})

export default TagPillsSection
