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
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../utils/categoryService";
import CategoryModal from "../ui/CategoryModal";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  allowCreate?: boolean;
  allowMultiple?: boolean;
  placeholder?: string;
  iconComponent?: React.ReactNode;
  userId?: string;
}

export default function CategorySelector({
  selectedCategories,
  onCategoriesChange,
  allowCreate = true,
  allowMultiple = false,
  placeholder = "Add category...",
  iconComponent,
  userId,
}: CategorySelectorProps) {
  const { t } = useTranslation();
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>(
    []
  );
  const [sortedCategories, setSortedCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoryToCreate, setCategoryToCreate] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  useEffect(() => {
    sortCategoriesBySelection();
  }, [newCategory, userCategories, predefinedCategories, selectedCategories]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      if (userId) {
        const userCats = await getUserCategories(userId);
        setUserCategories(userCats);
      }

      const predefinedCats = await getPredefinedCategories();
      setPredefinedCategories(predefinedCats);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortCategoriesBySelection = () => {
    const allCategories = [...userCategories, ...predefinedCategories];

    // Filtrar por búsqueda si hay texto
    let filtered = allCategories;
    if (newCategory.trim() !== "") {
      filtered = allCategories.filter((cat) =>
        cat.name.toLowerCase().includes(newCategory.toLowerCase())
      );
    }

    // Ordenar: seleccionadas primero
    const sorted = filtered.sort((a, b) => {
      const aSelected = selectedCategories.includes(a.id);
      const bSelected = selectedCategories.includes(b.id);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Si ambas están seleccionadas, mantener el orden de selección
      if (aSelected && bSelected) {
        return (
          selectedCategories.indexOf(a.id) - selectedCategories.indexOf(b.id)
        );
      }

      return 0;
    });

    setSortedCategories(sorted);
  };

  const toggleCategory = (categoryId: string) => {
    if (allowMultiple) {
      const updatedCategories = selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId];
      onCategoriesChange(updatedCategories);
    } else {
      // Single selection mode - si ya está seleccionada, la deselecciona
      const updatedCategories = selectedCategories.includes(categoryId)
        ? []
        : [categoryId];
      onCategoriesChange(updatedCategories);
    }

    // Scroll al inicio cuando se selecciona una categoría
    if (!selectedCategories.includes(categoryId)) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim() || !allowCreate) return;

    const allCategories = [...userCategories, ...predefinedCategories];
    const existingCategory = allCategories.find(
      (cat) => cat.name.toLowerCase() === newCategory.toLowerCase()
    );

    if (existingCategory) {
      if (!selectedCategories.includes(existingCategory.id)) {
        toggleCategory(existingCategory.id);
      }
      setNewCategory("");
    } else {
      setCategoryToCreate(newCategory.trim());
      setShowCreateModal(true);
    }
  };

  const createNewCategory = async (name: string, description?: string) => {
    if (!userId) return;

    try {
      const newCat = await createCategory(userId, name, description);
      if (newCat) {
        setUserCategories((prev) => [...prev, newCat]);
        toggleCategory(newCat.id);
        setNewCategory("");
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert(t("common.error"), t("errors.errorCreatingCategory"));
    }
  };

  return (
    <>
      <StyledView className="mb-6">
        <StyledView className="flex-row items-center">
          {iconComponent}
          <StyledView className="flex-1 flex-row items-center text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]">
            <StyledTextInput
              className="flex-1 text-white text-base bg-transparent"
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                includeFontPadding: false,
              }}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newCategory}
              onChangeText={setNewCategory}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddCategory}
            />
            {allowCreate && (
              <StyledTouchableOpacity
                onPress={handleAddCategory}
                className="ml-2"
                disabled={!newCategory.trim()}
              >
                <Feather
                  name="plus"
                  size={20}
                  color={
                    newCategory.trim() ? "white" : "rgba(255, 255, 255, 0.3)"
                  }
                />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </StyledView>

        {/* Categories Carousel - Todas juntas, seleccionadas primero */}
        {sortedCategories.length > 0 && (
          <StyledView className="mt-4" style={{ height: 44 }}>
            <ScrollView
              ref={scrollRef}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                alignItems: "center",
                height: 44,
              }}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {sortedCategories.map((category, index) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => toggleCategory(category.id)}
                    style={{
                      backgroundColor: isSelected
                        ? "rgba(255, 255, 255, 0.30)"
                        : "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: isSelected
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(255, 255, 255, 0.2)",
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      marginRight:
                        index === sortedCategories.length - 1 ? 16 : 12,
                      height: 36,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? "white"
                          : "rgba(255, 255, 255, 0.7)",
                        fontSize: 14,
                        fontFamily: fontNames.light,
                        includeFontPadding: false,
                        textAlign: "center",
                      }}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </StyledView>
        )}
      </StyledView>

      {/* Create Category Modal */}
      <CategoryModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewCategory("");
        }}
        onConfirm={createNewCategory}
        initialName={categoryToCreate}
        mode="create"
      />
    </>
  );
}