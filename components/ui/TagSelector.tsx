import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { BlurView } from "expo-blur";
import TagModal from "../ui/TagModal";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
}

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
  iconComponent?: React.ReactNode;
  userId?: string;
}

export default function TagSelector({
  selectedTags,
  onTagsChange,
  allowCreate = true,
  placeholder = "Add tag...",
  iconComponent,
  userId,
}: TagSelectorProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tagToCreate, setTagToCreate] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const selectedScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (userId) {
      fetchTags();
    }
  }, [userId]);

  useEffect(() => {
    filterTags();
  }, [newTag, tags, selectedTags]);

  const fetchTags = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("predefined_tags")
        .select("id, name, color, usage_count")
        .eq("user_id", userId)
        .order("usage_count", { ascending: false });

      if (data && !error) {
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = () => {
    if (newTag.trim() === "") {
      setFilteredTags(
        tags
          .filter((tag) => !selectedTags.includes(tag.id))
          .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      );
    } else {
      const filtered = tags
        .filter(
          (tag) =>
            !selectedTags.includes(tag.id) &&
            tag.name.toLowerCase().includes(newTag.toLowerCase())
        )
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

      setFilteredTags(filtered);
    }
  };

  const toggleTag = (tagId: string) => {
    const updatedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    onTagsChange(updatedTags);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !allowCreate) return;

    const existingTag = tags.find(
      (tag) => tag.name.toLowerCase() === newTag.toLowerCase()
    );

    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        toggleTag(existingTag.id);
      }
      setNewTag("");
    } else {
      setTagToCreate(newTag.trim());
      setShowCreateModal(true);
    }
  };

  const createTag = async (name: string, color: string) => {
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
        .select("id, name, color, usage_count")
        .single();

      if (data && !error) {
        setTags((prev) => [...prev, data]);
        onTagsChange([...selectedTags, data.id]);
        setNewTag("");
        setShowCreateModal(false);
      } else {
        Alert.alert(t("common.error"), t("errors.errorCreatingTag"));
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      Alert.alert(t("common.error"), t("errors.errorCreatingTag"));
    }
  };

  const getSelectedTagsData = () => {
    return selectedTags
      .map((tagId) => tags.find((tag) => tag.id === tagId))
      .filter((tag) => tag !== undefined) as Tag[];
  };

  const COLOR_MAPPINGS: { [key: string]: string } = {
    // Verde
    "#4CAF50": "#C8E6C9", // medio -> claro
    "#1B5E20": "#C8E6C9", // oscuro -> claro

    // Azul
    "#2196F3": "#BBDEFB", // medio -> claro
    "#0D47A1": "#BBDEFB", // oscuro -> claro

    // Naranja
    "#FF9800": "#FFE0B2", // medio -> claro
    "#E65100": "#FFE0B2", // oscuro -> claro

    // Morado
    "#9C27B0": "#E1BEE7", // medio -> claro
    "#4A148C": "#E1BEE7", // oscuro -> claro

    // Rojo
    "#F44336": "#FFCDD2", // medio -> claro
    "#B71C1C": "#FFCDD2", // oscuro -> claro
    
    // Grises
    "#9E9E9E": "#F5F5F5", // gris medio -> gris claro
    "#424242": "#F5F5F5", // gris oscuro -> gris claro
  };

  const TagCarousel = ({
    tagsArray,
    isSelected = false,
  }: {
    tagsArray: Tag[];
    isSelected?: boolean;
  }) => {
    if (tagsArray.length === 0) return null;

    return (
      <ScrollView
        ref={isSelected ? selectedScrollRef : scrollRef}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          alignItems: "center",
          height: 44,
        }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {tagsArray.map((tag, index) => {
          const tagColor = tag.color || "#5bb9a3";
          const lightColor = COLOR_MAPPINGS[tagColor] || tagColor;

          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={{
                backgroundColor: isSelected
                  ? tagColor + "30" // 30 for selected (more opaque)
                  : tagColor + "15", // 15 for unselected (more transparent)
                borderWidth: 1,
                borderColor: isSelected ? lightColor : tagColor + "60",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: index === tagsArray.length - 1 ? 16 : 12,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: isSelected ? lightColor : tagColor + "DD", // DD for slightly transparent text when not selected
                  fontSize: 14,
                  textAlign: "center",
                  fontWeight: isSelected ? "500" : "400",
                }}
              >
                {tag.name}
              </Text>
              {isSelected && (
                <Feather
                  name="x"
                  size={14}
                  color={tagColor}
                  style={{ marginLeft: 4 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <>
      <StyledView className="mb-6">
        <StyledView className="flex-row items-center">
          {iconComponent}
          <StyledView className="flex-1 flex-row items-center text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40">
            <StyledTextInput
              className="flex-1 text-white text-base bg-transparent"
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newTag}
              onChangeText={setNewTag}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
            />
            {allowCreate && (
              <StyledTouchableOpacity
                onPress={handleAddTag}
                className="ml-2"
                disabled={!newTag.trim()}
              >
                <Feather
                  name="plus"
                  size={20}
                  color={newTag.trim() ? "white" : "rgba(255, 255, 255, 0.3)"}
                />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </StyledView>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <StyledView className="ml-11 mt-3" style={{ height: 44 }}>
            <TagCarousel tagsArray={getSelectedTagsData()} isSelected={true} />
          </StyledView>
        )}

        {/* Available Tags */}
        {filteredTags.length > 0 && (
          <StyledView className="mt-4">
            <StyledView style={{ height: 44 }}>
              <TagCarousel tagsArray={filteredTags} />
            </StyledView>
          </StyledView>
        )}
      </StyledView>

      {/* Create Tag Modal */}
      <TagModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewTag("");
        }}
        onConfirm={createTag}
        initialName={tagToCreate}
        mode="create"
      />
    </>
  );
}