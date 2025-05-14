"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, AntDesign } from "@expo/vector-icons"
import { supabase } from "../../../lib/supabase"
import type { MagicTrick } from "../AddMagicWizard"
import { BlurView } from "expo-blur"
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../../utils/categoryService"

// Add a modal component for creating new categories
import Modal from "react-native-modal"

// Update the component interface to include the necessary state and functions
const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
}

export default function TitleCategoryStep({ trickData, updateTrickData }: StepProps) {
  const { t } = useTranslation()
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [newTag, setNewTag] = useState("")
  const [isCreateCategoryModalVisible, setCreateCategoryModalVisible] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const categories = [...userCategories, ...predefinedCategories]

  // Load user and predefined categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          // Fetch user categories
          const userCats = await getUserCategories(user.id)
          setUserCategories(userCats)

          // Fetch predefined categories
          const predefinedCats = await getPredefinedCategories()
          setPredefinedCategories(predefinedCats)
        }

        // Fetch tags (keeping existing tag functionality)
        const { data: tagData, error: tagError } = await supabase.from("predefined_tags").select("id, name")

        if (tagData && !tagError) {
          setTags(tagData)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Create a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert(t("error"), t("categoryNameRequired", "Category name is required"))
      return
    }

    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "User not found"))
        return
      }

      const newCategory = await createCategory(
        user.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined,
      )

      if (newCategory) {
        setUserCategories([...userCategories, newCategory])

        // Select the newly created category
        updateTrickData({
          selectedCategoryId: newCategory.id,
          // Keep the existing categories array for backward compatibility
          categories: [...trickData.categories],
        })

        // Reset form
        setNewCategoryName("")
        setNewCategoryDescription("")
        setCreateCategoryModalVisible(false)
      }
    } catch (error) {
      console.error("Error creating category:", error)
      Alert.alert(t("error"), t("errorCreatingCategory", "Error creating category"))
    } finally {
      setLoading(false)
    }
  }

  // Select a category
  const selectCategory = (categoryId: string) => {
    updateTrickData({
      selectedCategoryId: categoryId,
      // Keep the existing categories array for backward compatibility
      categories: trickData.categories,
    })
  }

  // Keep the existing tag functionality
  const toggleTag = (tagId: string) => {
    const updatedTags = trickData.tags.includes(tagId)
      ? trickData.tags.filter((id) => id !== tagId)
      : [...trickData.tags, tagId]

    updateTrickData({ tags: updatedTags })
  }

  // Add new tag (keeping existing functionality)
  const addNewTag = async () => {
    if (!newTag.trim()) return

    // Check if the tag already exists
    const existingTag = tags.find((tag) => tag.name.toLowerCase() === newTag.toLowerCase())

    if (existingTag) {
      // If it exists, select it
      if (!trickData.tags.includes(existingTag.id)) {
        toggleTag(existingTag.id)
      }
    } else {
      // If it doesn't exist, create it
      const { data, error } = await supabase
        .from("predefined_tags")
        .insert({ name: newTag.trim() })
        .select("id, name")
        .single()

      if (data && !error) {
        setTags([...tags, data])
        updateTrickData({ tags: [...trickData.tags, data.id] })
      }
    }

    setNewTag("")
  }

  const toggleCategory = (categoryId: string) => {
    const updatedCategories = trickData.categories.includes(categoryId)
      ? trickData.categories.filter((id) => id !== categoryId)
      : [...trickData.categories, categoryId]

    updateTrickData({ categories: updatedCategories })
  }

  // Update the return statement to include the new category UI
  return (
    <StyledView className="flex-1">
      {/* Title */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("title", "Title")}*</StyledText>
        <StyledView className="overflow-hidden rounded-lg">
          <BlurView intensity={20} tint="dark">
            <StyledTextInput
              className="text-white p-3"
              placeholder={t("enterTrickTitle", "Enter trick title")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.title}
              onChangeText={(text) => updateTrickData({ title: text })}
            />
          </BlurView>
        </StyledView>
      </StyledView>

      {/* Categories */}
      <StyledView className="mb-6">
        <StyledView className="flex-row justify-between items-center mb-2">
          <StyledText className="text-white text-lg">{t("category", "Category")}*</StyledText>
          <StyledTouchableOpacity
            onPress={() => setCreateCategoryModalVisible(true)}
            className="bg-emerald-700 px-3 py-1 rounded-full flex-row items-center"
          >
            <AntDesign name="plus" size={16} color="white" />
            <StyledText className="text-white ml-1">{t("newCategory", "New Category")}</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {loading ? (
          <StyledView className="bg-white/10 p-4 rounded-lg items-center">
            <StyledText className="text-white">{t("loading", "Loading...")}</StyledText>
          </StyledView>
        ) : (
          <StyledView>
            {/* User Categories Section */}
            {userCategories.length > 0 && (
              <StyledView className="mb-4">
                <StyledText className="text-white/70 mb-2">{t("yourCategories", "Your Categories")}</StyledText>
                <StyledView className="flex-row flex-wrap">
                  {userCategories.map((category) => (
                    <StyledTouchableOpacity
                      key={category.id}
                      onPress={() => selectCategory(category.id)}
                      className={`m-1 px-3 py-2 rounded-full ${
                        trickData.selectedCategoryId === category.id ? "bg-emerald-600" : "bg-white/20"
                      }`}
                    >
                      <StyledText className="text-white">{category.name}</StyledText>
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              </StyledView>
            )}

            {/* Predefined Categories Section */}
            {predefinedCategories.length > 0 && (
              <StyledView>
                <StyledText className="text-white/70 mb-2">
                  {t("suggestedCategories", "Suggested Categories")}
                </StyledText>
                <StyledView className="flex-row flex-wrap">
                  {predefinedCategories.map((category) => (
                    <StyledTouchableOpacity
                      key={category.id}
                      onPress={() => selectCategory(category.id)}
                      className={`m-1 px-3 py-2 rounded-full ${
                        trickData.selectedCategoryId === category.id ? "bg-emerald-600" : "bg-white/20"
                      }`}
                    >
                      <StyledText className="text-white">{category.name}</StyledText>
                    </StyledTouchableOpacity>
                  ))}
                </StyledView>
              </StyledView>
            )}

            {/* No Categories Message */}
            {userCategories.length === 0 && predefinedCategories.length === 0 && (
              <StyledView className="bg-white/10 p-4 rounded-lg items-center">
                <StyledText className="text-white text-center mb-2">
                  {t("noCategories", "No categories found")}
                </StyledText>
                <StyledTouchableOpacity
                  onPress={() => setCreateCategoryModalVisible(true)}
                  className="bg-emerald-700 px-3 py-1 rounded-full"
                >
                  <StyledText className="text-white">{t("createFirst", "Create your first category")}</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            )}
          </StyledView>
        )}
      </StyledView>

      {/* Tags Section (keeping existing functionality) */}
      <StyledView className="mb-6">
        <StyledText className="text-white text-lg mb-2">{t("tags", "Tags")}</StyledText>

        {/* Add new tag */}
        <StyledView className="flex-row mb-3">
          <StyledView className="flex-1 overflow-hidden rounded-lg mr-2">
            <BlurView intensity={20} tint="dark">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("addNewTag", "Add new tag")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addNewTag}
              />
            </BlurView>
          </StyledView>
          <StyledTouchableOpacity onPress={addNewTag} className="bg-emerald-700 p-3 rounded-lg">
            <AntDesign name="plus" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Selected tags */}
        <StyledView className="flex-row flex-wrap">
          {trickData.tags.length > 0 && (
            <StyledText className="text-white mb-2 w-full">{t("selectedTags", "Selected Tags")}:</StyledText>
          )}

          {trickData.tags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId)
            return tag ? (
              <StyledView key={tag.id} className="flex-row items-center bg-emerald-600 m-1 px-3 py-2 rounded-full">
                <StyledText className="text-white mr-2">{tag.name}</StyledText>
                <StyledTouchableOpacity onPress={() => toggleTag(tag.id)}>
                  <Feather name="x" size={16} color="white" />
                </StyledTouchableOpacity>
              </StyledView>
            ) : null
          })}
        </StyledView>

        {/* Suggested tags */}
        {tags.length > 0 && (
          <>
            <StyledText className="text-white mt-4 mb-2">{t("suggestedTags", "Suggested Tags")}:</StyledText>
            <StyledView className="flex-row flex-wrap">
              {tags
                .filter((tag) => !trickData.tags.includes(tag.id))
                .slice(0, 10)
                .map((tag) => (
                  <StyledTouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    className="bg-white/20 m-1 px-3 py-2 rounded-full"
                  >
                    <StyledText className="text-white">{tag.name}</StyledText>
                  </StyledTouchableOpacity>
                ))}
            </StyledView>
          </>
        )}
      </StyledView>

      {/* Create Category Modal */}
      <Modal
        isVisible={isCreateCategoryModalVisible}
        onBackdropPress={() => setCreateCategoryModalVisible(false)}
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <StyledView className="bg-gray-800 p-6 rounded-xl">
          <StyledText className="text-white text-xl font-bold mb-4">
            {t("createCategory", "Create Category")}
          </StyledText>

          <StyledView className="mb-4">
            <StyledText className="text-white mb-2">{t("categoryName", "Category Name")}*</StyledText>
            <StyledView className="bg-gray-700 rounded-lg">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("enterCategoryName", "Enter category name")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
            </StyledView>
          </StyledView>

          <StyledView className="mb-6">
            <StyledText className="text-white mb-2">{t("description", "Description (optional)")}</StyledText>
            <StyledView className="bg-gray-700 rounded-lg">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("enterDescription", "Enter description")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryDescription}
                onChangeText={setNewCategoryDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>

          <StyledView className="flex-row justify-end">
            <StyledTouchableOpacity
              className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
              onPress={() => {
                setNewCategoryName("")
                setNewCategoryDescription("")
                setCreateCategoryModalVisible(false)
              }}
            >
              <StyledText className="text-white">{t("cancel", "Cancel")}</StyledText>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              className="bg-emerald-700 px-4 py-2 rounded-lg"
              onPress={handleCreateCategory}
              disabled={loading || !newCategoryName.trim()}
            >
              <StyledText className="text-white">{t("create", "Create")}</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </Modal>
    </StyledView>
  )
}
