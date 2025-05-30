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
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoryToCreate, setCategoryToCreate] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const selectedScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  useEffect(() => {
    filterCategories();
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

  const filterCategories = () => {
    const allCategories = [...userCategories, ...predefinedCategories];

    if (newCategory.trim() === "") {
      setFilteredCategories(
        allCategories.filter((cat) => !selectedCategories.includes(cat.id))
      );
    } else {
      const filtered = allCategories.filter(
        (cat) =>
          !selectedCategories.includes(cat.id) &&
          cat.name.toLowerCase().includes(newCategory.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (allowMultiple) {
      const updatedCategories = selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId];
      onCategoriesChange(updatedCategories);
    } else {
      // Single selection mode
      onCategoriesChange([categoryId]);
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

  const getSelectedCategoriesData = () => {
    const allCategories = [...userCategories, ...predefinedCategories];
    return selectedCategories
      .map((catId) => allCategories.find((cat) => cat.id === catId))
      .filter((cat) => cat !== undefined) as Category[];
  };

  const CategoryCarousel = ({
    categoriesArray,
    isSelected = false,
  }: {
    categoriesArray: Category[];
    isSelected?: boolean;
  }) => {
    if (categoriesArray.length === 0) return null;

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
        {categoriesArray.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => toggleCategory(category.id)}
            style={{
              backgroundColor: isSelected
                ? "rgba(16, 185, 129, 0.8)"
                : "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              borderColor: isSelected
                ? "rgba(16, 185, 129, 0.9)"
                : "rgba(255, 255, 255, 0.2)",
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: index === categoriesArray.length - 1 ? 16 : 12,
              height: 36,
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: isSelected ? "white" : "rgba(255, 255, 255, 0.7)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {category.name}
            </Text>
            {isSelected && (
              <Feather
                name="x"
                size={14}
                color="white"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      <StyledView className="mb-6">
        <StyledView className="flex-row items-center">
          {iconComponent}
          <StyledView className="flex-1 flex-row items-center text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]">
            <StyledTextInput
              className="flex-1 text-white text-base bg-transparent"
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

        {/* Selected Categories */}
        {selectedCategories.length > 0 && (
          <StyledView className="ml-11 mt-3" style={{ height: 44 }}>
            <CategoryCarousel
              categoriesArray={getSelectedCategoriesData()}
              isSelected={true}
            />
          </StyledView>
        )}

        {/* Available Categories */}
        {filteredCategories.length > 0 && (
          <StyledView className="mt-4">
            <StyledView style={{ height: 44 }}>
              <CategoryCarousel categoriesArray={filteredCategories} />
            </StyledView>
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