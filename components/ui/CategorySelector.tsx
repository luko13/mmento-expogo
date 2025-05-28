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

interface CreateCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  categoryName: string;
}

const screenWidth = Dimensions.get("window").width;
const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  categoryName,
}) => {
  const { t } = useTranslation();
  const [editableCategoryName, setEditableCategoryName] = useState(categoryName);
  const [isEditingName, setIsEditingName] = useState(false);

  React.useEffect(() => {
    setEditableCategoryName(categoryName);
  }, [categoryName]);

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
            <StyledView className="pt-6 pb-1 px-6 ">
              {/* Header with editable category pill */}
              <StyledView className="flex-row items-center justify-center mb-4">
                <StyledText className="text-white text-2xl font-light mr-3">
                  {t("forms.create", "Create")}
                </StyledText>
                
                {/* Editable Category Pill */}
                <StyledTouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: "rgba(104, 104, 104, 0.027)",
                    borderColor: "rgba(255, 255, 255, 0.568)",
                    borderWidth: 1,
                  }}
                >
                  {isEditingName ? (
                    <StyledTextInput
                      value={editableCategoryName}
                      onChangeText={setEditableCategoryName}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      style={{ 
                        color: "#ffffff",
                        fontWeight: "500",
                        minWidth: 80,
                        textAlign: "center"
                      }}
                      className="text-base"
                    />
                  ) : (
                    <StyledText
                      style={{ color: "#ffffff" }}
                      className="font-medium"
                    >
                      {editableCategoryName}
                    </StyledText>
                  )}
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>

            {/* Actions */}
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
                <StyledText className="text-white/60 text-base font-light">
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
                onPress={() => onConfirm(editableCategoryName)}
              >
                <StyledText className="text-white text-base font-medium">
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

  const createNewCategory = async (name: string) => {
    if (!userId) return;

    try {
      const newCat = await createCategory(userId, name);
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
      <CreateCategoryModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewCategory("");
        }}
        onConfirm={createNewCategory}
        categoryName={categoryToCreate}
      />
    </>
  );
}