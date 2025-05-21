"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { supabase } from "../../../lib/supabase"
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../../utils/categoryService"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)
const StyledModal = styled(Modal)
const StyledActivityIndicator = styled(ActivityIndicator)

interface CategoryModalProps {
  visible: boolean
  onClose: () => void
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string, categoryName: string) => void
  trickTitle?: string
}

export default function CategoryModal({
  visible,
  onClose,
  selectedCategoryId,
  onSelectCategory,
  trickTitle = ""
}: CategoryModalProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState("")
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateCategoryVisible, setIsCreateCategoryVisible] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [creating, setCreating] = useState(false)

  // Filter categories based on search query
  const filteredUserCategories = userCategories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const filteredPredefinedCategories = predefinedCategories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Initialize when modal opens or categories change
  useEffect(() => {
    if (visible) {
      fetchCategories()
      setSearchQuery("")
    }
  }, [visible])

  // Fetch categories
  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const userCats = await getUserCategories(user.id)
        setUserCategories(userCats)

        const predefinedCats = await getPredefinedCategories()
        setPredefinedCategories(predefinedCats)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      return
    }

    try {
      setCreating(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const newCategory = await createCategory(
        user.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined,
      )

      if (newCategory) {
        setUserCategories(prev => [...prev, newCategory])
        setNewCategoryName("")
        setNewCategoryDescription("")
        setIsCreateCategoryVisible(false)
        
        // Auto-select the new category
        onSelectCategory(newCategory.id, newCategory.name)
      }
    } catch (error) {
      console.error("Error creating category:", error)
    } finally {
      setCreating(false)
    }
  }

  // Select a category and close the modal
  const selectCategory = (categoryId: string) => {
  // Buscar el objeto de categoría seleccionada para obtener su nombre
  const category = [...userCategories, ...predefinedCategories].find(
    cat => cat.id === categoryId
  );
  
  const categoryName = category ? category.name : t('forms.unknownCategory', 'Unknown category');
  
  // Pasar tanto el ID como el nombre
  onSelectCategory(categoryId, categoryName);
  onClose();
}

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#064e3b', '#065f46']} 
          style={{ 
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        {isCreateCategoryVisible ? (
          // Create New Category View
          <StyledView className="flex-1 px-4">
            <StyledView className="flex-row items-center justify-between py-3">
              <StyledTouchableOpacity 
                onPress={() => setIsCreateCategoryVisible(false)}
                className="p-2"
              >
                <Feather name="chevron-left" size={24} color="white" />
              </StyledTouchableOpacity>
              
              <StyledView className="flex-1 items-center mx-4">
                <StyledText className="text-white text-lg font-semibold">
                  {t('modals.createCategory', 'Create Category')}
                </StyledText>
              </StyledView>
              
              <StyledView className="w-10" />
            </StyledView>

            <StyledView className="mt-4">
              <StyledText className="text-white mb-2 font-medium">
                {t('forms.categoryName', 'Category Name')}
                <StyledText className="text-red-400"> *</StyledText>
              </StyledText>
              <StyledView className="bg-white/10 rounded-lg border border-white/20 mb-4">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder={t('forms.categoryNamePlaceholder', 'Enter category name')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </StyledView>

              <StyledText className="text-white mb-2 font-medium">
                {t('forms.description', 'Description')} ({t('forms.optional', 'Optional')})
              </StyledText>
              <StyledView className="bg-white/10 rounded-lg border border-white/20 mb-8">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder={t('forms.descriptionPlaceholder', 'Enter description (optional)')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </StyledView>

              <StyledTouchableOpacity
                className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
                  creating || !newCategoryName.trim() ? 'bg-gray-600' : 'bg-emerald-600'
                }`}
                onPress={handleCreateCategory}
                disabled={creating || !newCategoryName.trim()}
              >
                {creating ? (
                  <>
                    <StyledText className="text-white font-semibold text-base mr-2">
                      {t('actions.creating', 'Creating...')}
                    </StyledText>
                    <ActivityIndicator size="small" color="white" />
                  </>
                ) : (
                  <StyledText className="text-white font-semibold text-base">
                    {t('actions.create', 'Create')}
                  </StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        ) : (
          // Category Selection View
          <>
            {/* Header */}
            <StyledView className="flex-row items-center justify-between px-4 py-3">
              <StyledTouchableOpacity 
                onPress={onClose}
                className="p-2"
              >
                <Feather name="chevron-left" size={24} color="white" />
              </StyledTouchableOpacity>
              
              <StyledView className="flex-1 items-center mx-4">
                <StyledText className="text-white text-lg font-semibold">
                  {t('modals.selectCategory', 'Select Category')}
                </StyledText>
                <StyledText className="text-emerald-200 text-sm opacity-70">
                  {trickTitle ? `[${trickTitle}]` : ''}
                </StyledText>
              </StyledView>
              
              <StyledView className="w-10" />
            </StyledView>

            {/* Search Bar */}
            <StyledView className="px-4 mb-2">
              <StyledView className="flex-row items-center bg-white/10 rounded-lg px-3 py-2">
                <Feather name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
                <StyledTextInput
                  className="flex-1 text-white ml-2 h-10"
                  placeholder={t('searchCategories', 'Search categories...')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <StyledTouchableOpacity onPress={() => setSearchQuery("")}>
                    <Feather name="x" size={20} color="rgba(255, 255, 255, 0.7)" />
                  </StyledTouchableOpacity>
                )}
              </StyledView>
            </StyledView>

            {/* Categories List */}
            {isLoading ? (
              <StyledView className="flex-1 justify-center items-center">
                <StyledActivityIndicator size="large" color="#ffffff" />
              </StyledView>
            ) : (
              <StyledScrollView className="flex-1 px-4">
                {/* User Categories */}
                {filteredUserCategories.length > 0 && (
                  <StyledView className="mb-6">
                    <StyledText className="text-emerald-300 text-base font-semibold mb-3">
                      {t('categories.yourCategories', 'Your Categories')}
                    </StyledText>
                    <StyledView className="flex-row flex-wrap">
                      {filteredUserCategories.map((category) => (
                        <StyledTouchableOpacity
                          key={category.id}
                          onPress={() => selectCategory(category.id)}
                          className={`m-1 px-4 py-2 rounded-full ${
                            selectedCategoryId === category.id 
                              ? "bg-emerald-600" 
                              : "bg-white/10 border border-white/20"
                          }`}
                        >
                          <StyledText className="text-white text-sm">{category.name}</StyledText>
                        </StyledTouchableOpacity>
                      ))}
                    </StyledView>
                  </StyledView>
                )}

                {/* Predefined Categories */}
                {filteredPredefinedCategories.length > 0 && (
                  <StyledView className="mb-6">
                    <StyledText className="text-blue-300 text-base font-semibold mb-3">
                      {t('categories.suggestedCategories', 'Suggested Categories')}
                    </StyledText>
                    <StyledView className="flex-row flex-wrap">
                      {filteredPredefinedCategories.map((category) => (
                        <StyledTouchableOpacity
                          key={category.id}
                          onPress={() => selectCategory(category.id)}
                          className={`m-1 px-4 py-2 rounded-full ${
                            selectedCategoryId === category.id 
                              ? "bg-emerald-600" 
                              : "bg-white/10 border border-white/20"
                          }`}
                        >
                          <StyledText className="text-white text-sm">{category.name}</StyledText>
                        </StyledTouchableOpacity>
                      ))}
                    </StyledView>
                  </StyledView>
                )}

                {/* No Categories Found */}
                {filteredUserCategories.length === 0 && filteredPredefinedCategories.length === 0 && (
                  <StyledView className="flex-1 justify-center items-center py-12">
                    <Feather name="folder" size={48} color="rgba(255, 255, 255, 0.5)" />
                    <StyledText className="text-white/70 mt-4 text-center">
                      {searchQuery 
                        ? t('noMatchingCategories', 'No categories match your search')
                        : t('noCategoriesFound', 'No categories found')
                      }
                    </StyledText>
                  </StyledView>
                )}
                
                {/* Create New Category Button */}
                <StyledTouchableOpacity
                  className="w-full py-4 rounded-lg items-center justify-center flex-row mb-6 bg-emerald-600"
                  onPress={() => setIsCreateCategoryVisible(true)}
                >
                  <StyledText className="text-white font-semibold text-base">
                    {t('actions.createNewCategory', 'Create New Category')}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledScrollView>
            )}
          </>
        )}
      </StyledView>
    </StyledModal>
  )
}