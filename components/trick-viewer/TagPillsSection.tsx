"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
}

interface TagPillsSectionProps {
  tagIds: string[]; // IDs de las tags del truco
  userId?: string;
}

const TagPillsSection: React.FC<TagPillsSectionProps> = ({
  tagIds,
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

  // IMPORTANTE: Siempre renderizar el contenedor para mantener el espacio
  return (
    <StyledView style={styles.container}>
      {tags && tags.length > 0 ? (
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
                  </StyledView>
                </BlurView>
              </StyledView>
            );
          })}
        </StyledScrollView>
      ) : (
        // Espacio vacío del mismo tamaño cuando no hay tags
        <StyledView style={styles.emptySpace} />
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 48, // Altura mínima para mantener el espacio
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
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    includeFontPadding: false,
  },
  emptySpace: {
    height: 48, // Mismo alto que tendrían los tags
  },
});

export default TagPillsSection;
