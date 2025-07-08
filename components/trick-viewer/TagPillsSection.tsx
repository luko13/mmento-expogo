"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
}

interface TagPillsSectionProps {
  tagIds: string[]; // IDs de las tags del truco
  onRemoveTag?: (tagId: string) => void;
  editable?: boolean;
  userId?: string;
}

const TagPillsSection: React.FC<TagPillsSectionProps> = ({
  tagIds,
  onRemoveTag,
  editable = false,
  userId,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && tagIds && tagIds.length > 0) {
      fetchUserTags();
    } else {
      setTags([]);
    }
  }, [userId, tagIds.join(",")]);

  const fetchUserTags = async () => {
    if (!userId || !tagIds || tagIds.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("predefined_tags")
        .select("id, name, color, usage_count")
        .eq("user_id", userId)
        .in("id", tagIds);

      if (data && !error) {
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching user tags:", error);
    } finally {
      setLoading(false);
    }
  };

  // Color mappings para versiones más claras
  const COLOR_MAPPINGS: { [key: string]: string } = {
    // Verde
    "#4CAF50": "#C8E6C9",
    "#1B5E20": "#C8E6C9",

    // Azul
    "#2196F3": "#BBDEFB",
    "#0D47A1": "#BBDEFB",

    // Naranja
    "#FF9800": "#FFE0B2",
    "#E65100": "#FFE0B2",

    // Morado
    "#9C27B0": "#E1BEE7",
    "#4A148C": "#E1BEE7",

    // Rojo
    "#F44336": "#FFCDD2",
    "#B71C1C": "#FFCDD2",

    // Grises
    "#9E9E9E": "#F5F5F5",
    "#424242": "#F5F5F5",
  };

  // Debug: mostrar estado actual
  // No mostrar nada si no hay tags
  if (!tags || tags.length === 0) return null;

  return (
    <StyledView style={styles.container}>
      <StyledScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tags.map((tag) => {
          const tagColor = tag.color || "#5bb9a3";
          const lightColor = COLOR_MAPPINGS[tagColor] || tagColor;

          return (
            <StyledView key={tag.id} style={styles.tagContainer}>
              <BlurView
                intensity={25}
                tint="default"
                experimentalBlurMethod="dimezisBlurView"
                style={styles.blurContainer}
              >
                <StyledView
                  style={[
                    styles.tagContent,
                    {
                      backgroundColor: tagColor + "20", // Transparencia suave
                      borderColor: lightColor + "60",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <StyledText
                    style={[
                      styles.tagText,
                      {
                        color: lightColor,
                        fontFamily: fontNames.medium,
                      },
                    ]}
                  >
                    {tag.name}
                  </StyledText>
                  {editable && onRemoveTag && (
                    <StyledTouchableOpacity
                      style={styles.removeButton}
                      onPress={() => onRemoveTag(tag.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="x" size={14} color={lightColor} />
                    </StyledTouchableOpacity>
                  )}
                </StyledView>
              </BlurView>
            </StyledView>
          );
        })}
      </StyledScrollView>
    </StyledView>
  );
};

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
  removeButton: {
    marginLeft: 6,
  },
});

export default TagPillsSection;
