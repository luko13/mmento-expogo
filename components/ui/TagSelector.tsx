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
import ColorWheelPicker from "./ColorWheelPicker";

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

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string) => void;
  tagName: string;
}

const DEFAULT_COLORS = [
  "#5bb9a3",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#06b6d4",
  "#14b8a6",
  "#84cc16",
  "#a855f7",
];

const screenWidth = Dimensions.get("window").width;
const CreateTagModal: React.FC<CreateTagModalProps> = ({
  visible,
  onClose,
  onConfirm,
  tagName,
}) => {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState("#5bb9a3");

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={5}
        tint="dark"
        className="flex-1 justify-center items-center"
      >
        <StyledView className="flex-1 justify-center items-center px-6">
          {/* Modal with blur effect border */}
          <StyledBlurView
            className=" overflow-hidden"
            intensity={60}
            tint="default"
            style={{
              width: screenWidth * 0.9, // % del ancho de pantalla
              maxWidth: 400, // tope en píxeles
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(200, 200, 200, 0.4)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Content */}
            <StyledView className="p-6">
              <StyledText className="text-white text-lg font-medium text-center mb-6">
                {t("forms.create", "Create")} "{tagName}"?
              </StyledText>

              {/* Color Picker Section */}
              <StyledView className="mb-6">
                <StyledText className="text-white/60 text-sm mb-4 text-center">
                  {t("forms.selectColor", "Select color")}
                </StyledText>

                {/* Color Wheel Picker - Properly centered */}
                <StyledView className="items-center justify-center">
                  <ColorWheelPicker
                    size={180}
                    onColorChange={setSelectedColor}
                    initialColor={selectedColor}
                  />
                </StyledView>

                {/* Preview */}
                <StyledView className="items-center mt-4">
                  <StyledView
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: selectedColor + "20",
                      borderColor: selectedColor,
                      borderWidth: 1,
                    }}
                  >
                    <StyledText
                      style={{ color: selectedColor }}
                      className="font-medium"
                    >
                      {tagName}
                    </StyledText>
                  </StyledView>
                </StyledView>
              </StyledView>
            </StyledView>

            {/* Actions - No gap between buttons */}
            <StyledBlurView
              className="flex-row overflow-hidden"
              style={{ height: 56 }}
              intensity={60}
              tint="default"
            >
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderLeftWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }}
                onPress={onClose}
              >
                <StyledText className="text-white/60 text-base font-medium">
                  {t("common.cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderLeftWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }}
                onPress={() => onConfirm(tagName, selectedColor)}
              >
                <StyledText className="text-white/60 text-base font-medium">
                  {t("common.create", "Create")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

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

          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={{
                backgroundColor: isSelected
                  ? tagColor + "30" // 30 for selected (more opaque)
                  : tagColor + "15", // 15 for unselected (more transparent)
                borderWidth: 1,
                borderColor: isSelected ? tagColor : tagColor + "60", // 60 for a more subtle border when not selected
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
                  color: isSelected ? tagColor : tagColor + "DD", // DD for slightly transparent text when not selected
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
      <CreateTagModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewTag("");
        }}
        onConfirm={createTag}
        tagName={tagToCreate}
      />
    </>
  );
}
