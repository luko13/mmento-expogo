import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { styled } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import TagModal from "../ui/TagModal";
import { fontNames } from "../../app/_layout";
import { getContrastTextColor } from "../../utils/colorUtils";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

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
  const [sortedTags, setSortedTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tagToCreate, setTagToCreate] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (userId) {
      fetchTags();
    }
  }, [userId]);

  useEffect(() => {
    sortTagsBySelectionAndUsage();
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

  const sortTagsBySelectionAndUsage = () => {
    let filtered = [...tags];

    // Filtro por búsqueda
    if (newTag.trim() !== "") {
      filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(newTag.toLowerCase())
      );
    }

    // Seleccionadas primero (manteniendo orden de selección), luego por uso desc
    const sorted = filtered.sort((a, b) => {
      const aSelected = selectedTags.includes(a.id);
      const bSelected = selectedTags.includes(b.id);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      if (aSelected && bSelected) {
        return selectedTags.indexOf(a.id) - selectedTags.indexOf(b.id);
      }

      return (b.usage_count || 0) - (a.usage_count || 0);
    });

    setSortedTags(sorted);
  };

  const toggleTag = async (tagId: string) => {
    const updated = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    onTagsChange(updated);

    // Scroll al inicio cuando se selecciona
    if (!selectedTags.includes(tagId)) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
    }
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
          name,
          color,
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

  return (
    <>
      <StyledView className="mb-6">
        <StyledView className="flex-row items-center">
          {iconComponent}

          {/* Contenedor del input: altura fija, padding aplicado aquí */}
          <StyledView className="flex-1 flex-row items-center bg-[#D4D4D4]/10 rounded-lg border border-[#eafffb]/40 h-12 pl-3 pr-2">
            {/* Glyph-safe inset: evita que la primera letra se “muerda” con el borde */}
            <StyledView style={{ width: 2 }} />

            {/* TextInput estable (iOS + Android) sin padding horizontal propio */}
            <StyledTextInput
              className="flex-1 text-white bg-transparent"
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                height: 48, // altura fija
                lineHeight: 22, // no corta descendentes
                paddingVertical: 0, // sin padding vertical
                includeFontPadding: false,
                ...(Platform.OS === "android"
                  ? { textAlignVertical: "center" as any }
                  : { paddingTop: 1 }), // iOS baseline fino
              }}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newTag}
              onChangeText={setNewTag}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
              allowFontScaling={false}
              multiline={false}
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

        {/* Single Carousel - Selected tags first, then by usage */}
        {sortedTags.length > 0 && (
          <StyledView className="mt-4" style={{ height: 44 }}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                alignItems: "center",
                height: 44,
              }}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {sortedTags.map((tag, index) => {
                const isSelected = selectedTags.includes(tag.id);
                const tagColor = tag.color || "#4CAF50";
                const textColor = getContrastTextColor(tagColor);

                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    style={{
                      backgroundColor: isSelected
                        ? tagColor + "30" // más opaco si está seleccionado
                        : tagColor + "15", // más transparente si no
                      borderWidth: 1,
                      borderColor: isSelected
                        ? textColor + "80"
                        : tagColor + "60",
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      marginRight: index === sortedTags.length - 1 ? 16 : 12,
                      height: 36,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: isSelected ? textColor : tagColor + "DD",
                        fontSize: 14,
                        textAlign: "center",
                        fontWeight: isSelected ? "500" : "400",
                        fontFamily: isSelected
                          ? fontNames.medium
                          : fontNames.light,
                        includeFontPadding: false,
                      }}
                    >
                      {tag.name}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="x"
                        size={14}
                        color={textColor}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </StyledView>
        )}
      </StyledView>

      {/* Create Tag Modal */}
      <TagModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewTag("");
          setTagToCreate("");
        }}
        onConfirm={createTag}
        initialName={tagToCreate}
        placeholderText={tagToCreate}
        mode="create"
      />
    </>
  );
}
