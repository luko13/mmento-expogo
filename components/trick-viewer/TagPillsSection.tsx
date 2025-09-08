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

/* -------------------- DEBUG FLAGS -------------------- */
const DEBUG_GUARD = false;
const DEBUG_WDYR = false;
/* ----------------------------------------------------- */

/* -------------------- DEBUG HOOKS -------------------- */
function useInfiniteLoopGuard(name: string, limit = 60) {
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current++;
    if (countRef.current > limit) {
      throw new Error(`Render loop detected in <${name}>`);
    }
    const id = setTimeout(() => {
      countRef.current = 0;
    }, 0);
    return () => clearTimeout(id);
  });
}

function useWhyDidYouUpdate<T extends Record<string, any>>(
  name: string,
  props: T
) {
  const prev = useRef<T | null>(null);
  useEffect(() => {
    if (prev.current) {
      const keys = Object.keys({ ...prev.current, ...props });
      const changes: Record<string, { from: any; to: any }> = {};
      keys.forEach((k) => {
        if (prev.current![k] !== props[k]) {
          changes[k] = { from: prev.current![k], to: props[k] };
        }
      });
      if (Object.keys(changes).length > 0) {
        console.log(`[WDYR] TagPillsSection`, changes);
      }
    }
    prev.current = props;
  });
}
/* ----------------------------------------------------- */

const TagPillsSection: React.FC<TagPillsSectionProps> = ({
  tagIds,
  userId,
  onRemoveTag,
  editable = false,
}) => {
  if (DEBUG_GUARD) useInfiniteLoopGuard("TagPillsSection");
  if (DEBUG_WDYR)
    useWhyDidYouUpdate("TagPillsSection", {
      userId,
      tagCount: tagIds?.length ?? 0,
    });

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Clave estable: ordenamos + stringify para evitar deps por identidad/orden
  const tagsKey = useMemo(() => {
    const sorted = Array.isArray(tagIds) ? [...tagIds].sort() : [];
    return JSON.stringify(sorted);
  }, [tagIds]);

  useEffect(() => {
    const fetchUserTags = async () => {
      if (!userId) return;
      const ids = JSON.parse(tagsKey) as string[];
      if (!ids.length) {
        setTags((prev) => (prev.length ? [] : prev)); // evita set redundante
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("predefined_tags")
          .select("id, name, color, usage_count")
          .eq("user_id", userId)
          .in("id", ids);

        if (data && !error) {
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
        }
      } catch (error) {
        console.error("Error fetching user tags:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserTags();
    } else {
      setTags((prev) => (prev.length ? [] : prev)); // ⚠️ solo si cambia
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
      ) : (
        <StyledView style={styles.emptySpace} />
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 48, // mantener espacio
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
  removeIcon: {
    marginLeft: 6,
  },
  emptySpace: {
    height: 48,
  },
});

export default TagPillsSection;
