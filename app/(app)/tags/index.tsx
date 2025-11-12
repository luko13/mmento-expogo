"use client";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { styled } from "nativewind";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";
import { supabase } from "../../../lib/supabase";
import TagModal from "../../../components/ui/TagModal";
import TagActionsModal from "../../../components/ui/TagActionsModal";
import DeleteTagConfirmationModal from "../../../components/ui/DeleteTagConfirmationModal";
import SortModal from "../../../components/ui/SortModal";
import { getContrastTextColor } from "../../../utils/colorUtils";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledFlatList = styled(FlatList<Tag>);

interface Tag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
}

type SortBy = "name" | "usage" | "date";
type SortOrder = "asc" | "desc";

interface TrickReference {
  id: string;
  title: string;
}

export default function TagsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showSortModal, setShowSortModal] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected tag state
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [affectedTricks, setAffectedTricks] = useState<TrickReference[]>([]);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTags();
    }
  }, [userId]);

  const initializeUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error("Error getting user:", error);
    }
  };

  const fetchTags = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("predefined_tags")
        .select("id, name, color, usage_count, created_at")
        .eq("user_id", userId);

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedTags = () => {
    const sorted = [...tags];

    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "usage":
        sorted.sort((a, b) => {
          const comparison = a.usage_count - b.usage_count;
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
      case "date":
        sorted.sort((a, b) => {
          const comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
    }

    return sorted;
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same sort type
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New sort type, default to ascending
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
    setShowSortModal(false);
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("predefined_tags")
        .insert({
          user_id: userId,
          name: name,
          color: color,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  const handleEditTag = async (name: string, color: string) => {
    if (!selectedTag || !userId) return;

    try {
      const { error } = await supabase
        .from("predefined_tags")
        .update({
          name: name,
          color: color,
        })
        .eq("id", selectedTag.id)
        .eq("user_id", userId);

      if (error) throw error;

      setTags(
        tags.map((tag) =>
          tag.id === selectedTag.id ? { ...tag, name, color } : tag
        )
      );

      setShowEditModal(false);
      setTimeout(() => {
        setSelectedTag(null);
      }, 300);
    } catch (error) {
      console.error("Error updating tag:", error);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setTimeout(() => {
      setSelectedTag(null);
    }, 300);
  };

  const handleTagPress = (tag: Tag) => {
    // Don't open actions modal if another modal is already open
    if (showEditModal || showDeleteModal || showSortModal) {
      return;
    }
    setSelectedTag(tag);
    setShowActionsModal(true);
  };

  const handleEditPress = () => {
    setShowActionsModal(false);
    setTimeout(() => {
      setShowEditModal(true);
    }, 300);
  };

  const handleDeletePress = async () => {
    if (!selectedTag || !userId) return;

    setShowActionsModal(false);

    try {
      const { data, error } = await supabase
        .from("magic_tricks")
        .select("id, title")
        .eq("user_id", userId)
        .contains("tags", [selectedTag.id]);

      if (error) throw error;

      setAffectedTricks(data || []);

      setTimeout(() => {
        setShowDeleteModal(true);
      }, 300);
    } catch (error) {
      console.error("Error fetching affected tricks:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTag || !userId) return;

    try {
      // Delete tag (trick_tags relationships will be deleted by CASCADE)
      const { error: deleteTagError } = await supabase
        .from("predefined_tags")
        .delete()
        .eq("id", selectedTag.id)
        .eq("user_id", userId);

      if (deleteTagError) throw deleteTagError;

      // Remove tag from all affected tricks' tags array
      for (const trick of affectedTricks) {
        const { data: trickData, error: fetchError } = await supabase
          .from("magic_tricks")
          .select("tags")
          .eq("id", trick.id)
          .single();

        if (fetchError) {
          console.error("Error fetching trick tags:", fetchError);
          continue;
        }

        const updatedTags = (trickData.tags || []).filter(
          (tagId: string) => tagId !== selectedTag.id
        );

        const { error: updateError } = await supabase
          .from("magic_tricks")
          .update({ tags: updatedTags })
          .eq("id", trick.id);

        if (updateError) {
          console.error("Error updating trick tags:", updateError);
        }
      }

      setTags(tags.filter((tag) => tag.id !== selectedTag.id));

      // Close modal and clean up state
      setShowDeleteModal(false);
      setTimeout(() => {
        setSelectedTag(null);
        setAffectedTricks([]);
      }, 300);
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setTimeout(() => {
      setSelectedTag(null);
      setAffectedTricks([]);
    }, 300);
  };

  const renderTag = ({ item }: { item: Tag }) => {
    return (
      <StyledTouchableOpacity
        className="flex-row items-center justify-between mb-3 px-4 py-2.5"
        onPress={() => handleTagPress(item)}
        style={{
          borderWidth: 1,
          borderColor: item.color,
          borderRadius: 24,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <StyledView className="flex-row items-center flex-1">
          <StyledText
            style={{
              color: "#FFFFFF",
              fontFamily: fontNames.medium,
              fontSize: 15,
              includeFontPadding: false,
              marginRight: 8,
            }}
          >
            {item.name}
          </StyledText>
          <StyledText
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: fontNames.regular,
              fontSize: 13,
              includeFontPadding: false,
            }}
          >
            {t("tags.usageCount", "{{count}} uses", {
              count: item.usage_count,
            })}
          </StyledText>
        </StyledView>
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color="rgba(255, 255, 255, 0.6)"
        />
      </StyledTouchableOpacity>
    );
  };

  if (loading) {
    return (
      <StyledView className="flex-1" style={{ backgroundColor: "#15322C" }}>
        <StatusBar barStyle="light-content" backgroundColor="#15322C" />
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5BB9A3" />
        </StyledView>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-center px-5 py-4">
          <StyledTouchableOpacity
            onPress={() => router.back()}
            className="absolute left-5"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledText
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontFamily: fontNames.semiBold,
              includeFontPadding: false,
            }}
          >
            {t("profileOptions.tags")}
          </StyledText>
          <StyledTouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="absolute right-5"
          >
            <Ionicons name="add" size={28} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Content */}
        {tags.length === 0 ? (
          <StyledView className="flex-1 justify-center items-center px-5">
            <Ionicons
              name="pricetag-outline"
              size={80}
              color="rgba(255, 255, 255, 0.3)"
            />
            <StyledText
              className="mt-4 text-center"
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: 18,
                fontFamily: fontNames.medium,
                includeFontPadding: false,
              }}
            >
              {t("tags.emptyState.title", "No tags yet")}
            </StyledText>
            <StyledText
              className="mt-2 text-center"
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 14,
                fontFamily: fontNames.regular,
                includeFontPadding: false,
              }}
            >
              {t(
                "tags.emptyState.description",
                "Create tags to organize your tricks"
              )}
            </StyledText>
          </StyledView>
        ) : (
          <>
            {/* Sort Button */}
            <StyledView className="px-5 mb-3">
              <StyledTouchableOpacity
                className="flex-row items-center justify-center py-2 px-4 self-start"
                onPress={() => setShowSortModal(true)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Ionicons
                  name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                  size={16}
                  color="#5BB9A3"
                  style={{ marginRight: 6 }}
                />
                <StyledText
                  style={{
                    color: "#FFFFFF",
                    fontFamily: fontNames.regular,
                    fontSize: 14,
                    includeFontPadding: false,
                  }}
                >
                  {sortBy === "name"
                    ? t("sort.alphabetically", "Alphabetically")
                    : sortBy === "usage"
                    ? t("sort.byUsage", "By usage")
                    : t("sort.byDate", "By date")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>

            {/* Tags List */}
            <StyledFlatList
              data={getSortedTags()}
              renderItem={renderTag}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
            />
          </>
        )}
      </SafeAreaView>

      {/* Create Tag Modal */}
      <TagModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateTag}
        mode="create"
      />

      {/* Edit Tag Modal */}
      {selectedTag && (
        <TagModal
          visible={showEditModal}
          onClose={handleCloseEditModal}
          onConfirm={handleEditTag}
          initialName={selectedTag.name}
          initialColor={selectedTag.color}
          mode="edit"
        />
      )}

      {/* Actions Modal */}
      <TagActionsModal
        visible={showActionsModal}
        onClose={() => {
          setShowActionsModal(false);
          setSelectedTag(null);
        }}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        tagName={selectedTag?.name}
      />

      {/* Delete Confirmation Modal */}
      {selectedTag && (
        <DeleteTagConfirmationModal
          visible={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          tagName={selectedTag.name}
          tagColor={selectedTag.color}
          affectedTricks={affectedTricks}
        />
      )}

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSortBy={sortBy}
        currentSortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </StyledView>
  );
}
