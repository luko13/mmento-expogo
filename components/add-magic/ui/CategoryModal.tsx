"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { supabase } from "../../../lib/supabase"
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../../utils/categoryService"
import { fontNames } from "../../../app/_layout"
import BlinkingCursor from "../../ui/BlinkingCursor"

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
  const [isFocusedName, setIsFocusedName] = useState(false)
  const [isFocusedDescription, setIsFocusedDescription] = useState(false)
  const [isFocusedSearch, setIsFocusedSearch] = useState(false)

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
      transparent={true}
      onRequestClose={onClose}
    >
      
<TouchableOpacity 
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0)'
        }} 
        activeOpacity={1}
        onPress={onClose}
      />

      <StyledView 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%', // Ajusta este valor para cambiar la altura del modal
          backgroundColor: '#0d1d1d',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden'
        }}
      >
        {/* Línea de indicación para arrastrar */}
        {/* <StyledView 
          style={{
            alignSelf: 'center',
            width: 50,
            height: 5,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 2.5,
            marginTop: 10,
            marginBottom: 10
          }} 
        /> */}
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
                <StyledText 
                  className="text-white text-lg font-semibold"
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 18,
                    includeFontPadding: false,
                  }}
                >
                  {t('modals.createCategory', 'Create Category')}
                </StyledText>
              </StyledView>
              
              <StyledView className="w-10" />
            </StyledView>

            <StyledView className="mt-4">
              <StyledText 
                className="text-white mb-2 font-medium"
                style={{
                  fontFamily: fontNames.medium,
                  fontSize: 16,
                  includeFontPadding: false,
                }}
              >
                {t('forms.categoryName', 'Category Name')}
                <StyledText className="text-red-400"> *</StyledText>
              </StyledText>
              <StyledView className="bg-white/10 rounded-lg border border-white/20 mb-4" style={{ position: 'relative' }}>
                <StyledView style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                  <BlinkingCursor visible={!isFocusedName && newCategoryName.length === 0} color="rgba(255, 255, 255, 0.5)" />
                  {!isFocusedName && newCategoryName.length === 0 && (
                    <StyledText style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: fontNames.regular, fontSize: 16, marginLeft: 4 }}>
                      {t('forms.categoryNamePlaceholder', 'Enter category name')}
                    </StyledText>
                  )}
                </StyledView>
                <StyledTextInput
                  className="text-white p-3 text-base"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                  placeholder=""
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  onFocus={() => setIsFocusedName(true)}
                  onBlur={() => setIsFocusedName(false)}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </StyledView>

              <StyledText 
                className="text-white mb-2 font-medium"
                style={{
                  fontFamily: fontNames.medium,
                  fontSize: 16,
                  includeFontPadding: false,
                }}
              >
                {t('forms.description', 'Description')} 
                <StyledText 
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  ({t('forms.optional', 'Optional')})
                </StyledText>
              </StyledText>
              <StyledView className="bg-white/10 rounded-lg border border-white/20 mb-8" style={{ position: 'relative' }}>
                <StyledView style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'flex-start', pointerEvents: 'none', zIndex: 1 }}>
                  <BlinkingCursor visible={!isFocusedDescription && newCategoryDescription.length === 0} color="rgba(255, 255, 255, 0.5)" />
                  {!isFocusedDescription && newCategoryDescription.length === 0 && (
                    <StyledText style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: fontNames.regular, fontSize: 16, marginLeft: 4 }}>
                      ... {t('forms.descriptionPlaceholder', 'Enter description (optional)')}
                    </StyledText>
                  )}
                </StyledView>
                <StyledTextInput
                  className="text-white p-3 text-base"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                  placeholder=""
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  onFocus={() => setIsFocusedDescription(true)}
                  onBlur={() => setIsFocusedDescription(false)}
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
                    <StyledText 
                      className="text-white font-semibold text-base mr-2"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t('actions.creating', 'Creating...')}
                    </StyledText>
                    <ActivityIndicator size="small" color="white" />
                  </>
                ) : (
                  <StyledText 
                    className="text-white font-semibold text-base"
                    style={{
                      fontFamily: fontNames.semiBold,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
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
                <StyledText 
                  className="text-white text-lg font-semibold"
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 18,
                    includeFontPadding: false,
                  }}
                >
                  {t('modals.selectCategory', 'Select Category')}
                </StyledText>
                <StyledText 
                  className="text-emerald-200 text-sm opacity-70"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 14,
                    includeFontPadding: false,
                  }}
                >
                  {trickTitle ? `[${trickTitle}]` : ''}
                </StyledText>
              </StyledView>
              
              <StyledView className="w-10" />
            </StyledView>

            {/* Search Bar */}
            <StyledView className="px-4 mb-2">
              <StyledView className="flex-row items-center bg-white/10 rounded-lg px-3 py-2" style={{ position: 'relative' }}>
                <Feather name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
                <StyledView className="flex-1 ml-2" style={{ position: 'relative' }}>
                  <StyledView style={{ position: 'absolute', left: 0, top: 10, flexDirection: 'row', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                    <BlinkingCursor visible={!isFocusedSearch && searchQuery.length === 0} color="rgba(255, 255, 255, 0.5)" />
                    {!isFocusedSearch && searchQuery.length === 0 && (
                      <StyledText style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: fontNames.regular, fontSize: 16, marginLeft: 4 }}>
                        ... {t('searchCategories', 'Search categories...')}
                      </StyledText>
                    )}
                  </StyledView>
                  <StyledTextInput
                    className="flex-1 text-white h-10"
                    style={{
                      fontFamily: fontNames.regular,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setIsFocusedSearch(true)}
                    onBlur={() => setIsFocusedSearch(false)}
                    autoCapitalize="none"
                  />
                </StyledView>
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
                    <StyledText 
                      className="text-emerald-300 text-base font-semibold mb-3"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t('categorie.yourCategories', 'Your Categories')}
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
                          <StyledText 
                            className="text-white text-sm"
                            style={{
                              fontFamily: fontNames.regular,
                              fontSize: 14,
                              includeFontPadding: false,
                            }}
                          >
                            {category.name}
                          </StyledText>
                        </StyledTouchableOpacity>
                      ))}
                    </StyledView>
                  </StyledView>
                )}

                {/* Predefined Categories */}
                {filteredPredefinedCategories.length > 0 && (
                  <StyledView className="mb-6">
                    <StyledText 
                      className="text-blue-300 text-base font-semibold mb-3"
                      style={{
                        fontFamily: fontNames.semiBold,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t('categorie.suggestedCategories', 'Suggested Categories')}
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
                          <StyledText 
                            className="text-white text-sm"
                            style={{
                              fontFamily: fontNames.regular,
                              fontSize: 14,
                              includeFontPadding: false,
                            }}
                          >
                            {category.name}
                          </StyledText>
                        </StyledTouchableOpacity>
                      ))}
                    </StyledView>
                  </StyledView>
                )}

                {/* No Categories Found */}
                {filteredUserCategories.length === 0 && filteredPredefinedCategories.length === 0 && (
                  <StyledView className="flex-1 justify-center items-center py-12">
                    <Feather name="folder" size={48} color="rgba(255, 255, 255, 0.5)" />
                    <StyledText 
                      className="text-white/70 mt-4 text-center"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
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
                  <StyledText 
                    className="text-white font-semibold text-base"
                    style={{
                      fontFamily: fontNames.semiBold,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
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