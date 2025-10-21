//components/trick-viewer/TagPillsSection.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { fontNames } from "../../app/_layout";
import { getContrastTextColor } from "../../utils/colorUtils";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
}

interface TagPillsSectionProps {
  tagIds: string[]; // IDs de las tags del truco
  userId?: string;
  onRemoveTag?: (tagId: string) => void;
  editable?: boolean;
}

const TagPillsSection: React.FC<TagPillsSectionProps> = ({
  tagIds,
  userId,
  onRemoveTag,
  editable = false,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Clave estable: ordenamos + stringify para evitar deps por identidad/orden
  const tagsKey = useMemo(() => {
    const sorted = Array.isArray(tagIds) ? [...tagIds].sort() : [];
    return JSON.stringify(sorted);
  }, [tagIds]);

  useEffect(() => {
    const fetchUserTags = async () => {
      if (!userId) {
        return;
      }

      const ids = JSON.parse(tagsKey) as string[];
      if (!ids.length) {
        setTags((prev) => (prev.length ? [] : prev));
        return;
      }
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("predefined_tags")
          .select("id, name, color, usage_count")
          .eq("user_id", userId)
          .in("id", ids);

        if (error) {
          console.error("TagPillsSection: Error fetching tags:", error);
        } else if (data) {
          setTags((prev) => {
            const same =
              prev.length === data.length &&
              prev.every(
                (p, i) =>
                  p.id === data[i].id &&
                  p.name === data[i].name &&
                  p.color === data[i].color
              );
            return same ? prev : data;
          });
        } else {
        }
      } catch (error) {
        console.error("TagPillsSection: Error fetching user tags:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserTags();
    } else {
      setTags((prev) => (prev.length ? [] : prev));
    }
  }, [userId, tagsKey]);

  const handleRemoveTag = (tagId: string) => {
    if (editable && onRemoveTag) {
      onRemoveTag(tagId);
    }
  };

  // Siempre renderizamos contenedor para mantener el espacio
  return (
    <StyledView style={styles.container}>
      {tags && tags.length > 0 ? (
        <StyledScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tags.map((tag) => {
            const tagColor = tag.color || "#4CAF50";
            const textColor = getContrastTextColor(tagColor);

            return (
              <StyledView key={tag.id} style={styles.tagContainer}>
                <BlurView
                  intensity={25}
                  tint="default"
                  experimentalBlurMethod="dimezisBlurView"
                  style={styles.blurContainer}
                >
                  <StyledTouchableOpacity
                    style={[
                      styles.tagContent,
                      {
                        backgroundColor: tagColor + "20",
                        borderColor: textColor + "60",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => editable && handleRemoveTag(tag.id)}
                    activeOpacity={editable ? 0.7 : 1}
                    disabled={!editable}
                  >
                    <StyledText
                      style={[
                        styles.tagText,
                        {
                          color: textColor,
                          fontFamily: fontNames.medium,
                        },
                      ]}
                    >
                      {tag.name}
                    </StyledText>
                    {editable && (
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={textColor}
                        style={styles.removeIcon}
                      />
                    )}
                  </StyledTouchableOpacity>
                </BlurView>
              </StyledView>
            );
          })}
        </StyledScrollView>
      ) : loading ? (
        <StyledView style={styles.loadingContainer}>
          <StyledText style={styles.loadingText}>Loading tags...</StyledText>
        </StyledView>
      ) : (
        <StyledView style={styles.emptySpace} />
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    minHeight: 48,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  tagContainer: {
    marginRight: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  blurContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  tagContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    includeFontPadding: false,
  },
  removeIcon: {
    marginLeft: 6,
  },
  emptySpace: {
    height: 48,
  },
  loadingContainer: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontFamily: fontNames.light,
  },
});

export default TagPillsSection;
