"use client"

import { useState, useEffect, useMemo } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Dimensions, StatusBar } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, AntDesign, Ionicons } from "@expo/vector-icons"
import { supabase } from "../../../lib/supabase"
import type { MagicTrick } from "../AddMagicWizard"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../../utils/categoryService"
import Modal from "react-native-modal"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

const { width } = Dimensions.get('window')

export default function TitleCategoryStep({ 
  trickData, 
  updateTrickData, 
  onNext, 
  onCancel,
  currentStep = 0,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false
}: StepProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [newTag, setNewTag] = useState("")
  const [isCreateCategoryModalVisible, setCreateCategoryModalVisible] = useState(false)
  const [isCategorySelectModalVisible, setCategorySelectModalVisible] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // Validación en tiempo real del título
  const titleValidation = useMemo(() => {
    if (!trickData.title) {
      return { isValid: false, message: '' }
    }
    
    const trimmedTitle = trickData.title.trim()
    
    if (trimmedTitle.length === 0) {
      return { 
        isValid: false, 
        message: t("titleRequired", "El título es obligatorio") 
      }
    }
    
    if (trimmedTitle.length < 3) {
      return { 
        isValid: false, 
        message: t("titleTooShort", "El título debe tener al menos 3 caracteres") 
      }
    }
    
    if (trimmedTitle.length > 100) {
      return { 
        isValid: false, 
        message: t("titleTooLong", "El título no debe exceder los 100 caracteres") 
      }
    }
    
    return { isValid: true, message: '' }
  }, [trickData.title, t])

  // Validación de categoría
  const categoryValidation = useMemo(() => {
    if (!trickData.selectedCategoryId) {
      return { 
        isValid: false, 
        message: t("categoryRequired", "Por favor selecciona una categoría") 
      }
    }
    return { isValid: true, message: '' }
  }, [trickData.selectedCategoryId, t])

  // Validación general para el botón Next
  const isFormValid = titleValidation.isValid && categoryValidation.isValid

  // Load user and predefined categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
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

  // Handler para el cambio de título
  const handleTitleChange = (text: string) => {
    updateTrickData({ title: text })
  }

  // Crear nueva categoría
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert(t("error"), t("categoryNameRequired", "El nombre de la categoría es obligatorio"))
      return
    }

    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"))
        return
      }

      const newCategory = await createCategory(
        user.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined,
      )

      if (newCategory) {
        setUserCategories(prev => [...prev, newCategory])

        updateTrickData({
          selectedCategoryId: newCategory.id,
          categories: [...trickData.categories],
        })

        setNewCategoryName("")
        setNewCategoryDescription("")
        setCreateCategoryModalVisible(false)

        Alert.alert(
          t("success", "Éxito"),
          t("categoryCreatedSuccessfully", "Categoría creada exitosamente")
        )
      }
    } catch (error) {
      console.error("Error creating category:", error)
      Alert.alert(t("error"), t("errorCreatingCategory", "Error al crear la categoría"))
    } finally {
      setLoading(false)
    }
  }

  // Handler para selección de categoría
  const selectCategory = (categoryId: string) => {
    const categoryExists = [...userCategories, ...predefinedCategories]
      .some(cat => cat.id === categoryId)
    
    if (!categoryExists) {
      Alert.alert(
        t("error", "Error"),
        t("invalidCategory", "Categoría inválida")
      )
      return
    }

    updateTrickData({
      selectedCategoryId: categoryId,
      categories: trickData.categories,
    })
  }

  // Tag functionality
  const toggleTag = (tagId: string) => {
    const updatedTags = trickData.tags.includes(tagId)
      ? trickData.tags.filter((id) => id !== tagId)
      : [...trickData.tags, tagId]

    updateTrickData({ tags: updatedTags })
  }

  const addNewTag = async () => {
    if (!newTag.trim()) return

    try {
      const existingTag = tags.find((tag) => tag.name.toLowerCase() === newTag.toLowerCase())

      if (existingTag) {
        if (!trickData.tags.includes(existingTag.id)) {
          toggleTag(existingTag.id)
        }
      } else {
        const { data, error } = await supabase
          .from("predefined_tags")
          .insert({ name: newTag.trim() })
          .select("id, name")
          .single()

        if (data && !error) {
          setTags(prev => [...prev, data])
          updateTrickData({ tags: [...trickData.tags, data.id] })
        } else {
          Alert.alert(t("error"), t("errorCreatingTag", "Error al crear la etiqueta"))
        }
      }

      setNewTag("")
    } catch (error) {
      console.error("Error adding tag:", error)
      Alert.alert(t("error"), t("errorAddingTag", "Error al agregar la etiqueta"))
    }
  }

  // Obtener el nombre de la categoría seleccionada
  const getSelectedCategoryName = () => {
    if (!trickData.selectedCategoryId) return "Category*"
    
    const selectedCategory = [...userCategories, ...predefinedCategories]
      .find(cat => cat.id === trickData.selectedCategoryId)
    
    return selectedCategory?.name || "Category*"
  }

  return (
    <LinearGradient
      colors={['#064e3b', '#065f46']}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      
      {/* Extend background to cover status bar area */}
      <StyledView className="absolute top-0 left-0 right-0 h-20 bg-emerald-900" />
      
      <StyledView className="flex-1" style={{ paddingTop: 10 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-6 py-4">
          <StyledTouchableOpacity className="p-2" onPress={onCancel}>
            <Feather name="x" size={24} color="white" />
          </StyledTouchableOpacity>
          
          <StyledView className="flex-1 items-center">
            <StyledText className="text-white text-lg font-semibold mb">
              Register Magic
            </StyledText>
            <StyledText className="text-emerald-200 text-sm opacity-70">
              [D/M/Y]
            </StyledText>
          </StyledView>
          
          <StyledTouchableOpacity className="p-2">
            <Feather name="help-circle" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Form Fields */}
        <StyledView className="flex-1 px-6 mt-28">
          {/* Magic Title Field */}
          <StyledView className="mb-8">
            <StyledView className="flex-row items-center mb-3">
              <StyledView className="w-8 h-8 bg-white/10 rounded-lg items-center justify-center mr-3">
                <Ionicons name="sparkles" size={18} color="white" />
              </StyledView>
              <StyledTextInput
                className="flex-1 text-white text-base bg-transparent border-b border-emerald-600 pb-2"
                placeholder="Magic Title*"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.title}
                onChangeText={handleTitleChange}
                maxLength={100}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="next"
              />
            </StyledView>
            {trickData.title && !titleValidation.isValid && (
              <StyledText className="text-red-400 text-xs ml-11">
                {titleValidation.message}
              </StyledText>
            )}
          </StyledView>

          {/* Category Field */}
          <StyledView className="mb-8">
            <StyledView className="flex-row items-center">
              <StyledView className="w-8 h-8 bg-white/10 rounded-lg items-center justify-center mr-3">
                <Feather name="folder" size={18} color="white" />
              </StyledView>
              <StyledTouchableOpacity 
                className="flex-1 flex-row items-center justify-between border-b border-emerald-600 pb-2"
                onPress={() => setCategorySelectModalVisible(true)}
              >
                <StyledText className={`text-base ${
                  trickData.selectedCategoryId ? 'text-white' : 'text-white/50'
                }`}>
                  {getSelectedCategoryName()}
                </StyledText>
                <Feather name="chevron-down" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
            {!categoryValidation.isValid && (
              <StyledText className="text-red-400 text-xs ml-11 mt-1">
                {categoryValidation.message}
              </StyledText>
            )}
          </StyledView>

          {/* Tag Field */}
          <StyledView className="mb-6">
            <StyledView className="flex-row items-center">
              <StyledView className="w-8 h-8 bg-white/10 rounded-lg items-center justify-center mr-3">
                <Feather name="tag" size={18} color="white" />
              </StyledView>
              <StyledView className="flex-1 flex-row items-center border-b border-emerald-600 pb-2">
                <StyledTextInput
                  className="flex-1 text-white text-base bg-transparent"
                  placeholder="Tag"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newTag}
                  onChangeText={setNewTag}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={addNewTag}
                />
                <StyledTouchableOpacity 
                  onPress={addNewTag}
                  className="ml-2"
                  disabled={!newTag.trim()}
                >
                  <Feather 
                    name="plus" 
                    size={20} 
                    color={newTag.trim() ? "white" : "rgba(255, 255, 255, 0.3)"} 
                  />
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
            
            {/* Selected Tags */}
            {trickData.tags.length > 0 && (
              <StyledView className="ml-11 mt-3 flex-row flex-wrap">
                {trickData.tags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId)
                  return tag ? (
                    <StyledView 
                      key={tag.id} 
                      className="bg-emerald-700 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
                    >
                      <StyledText className="text-white text-sm mr-1">{tag.name}</StyledText>
                      <StyledTouchableOpacity 
                        onPress={() => toggleTag(tag.id)}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Feather name="x" size={14} color="white" />
                      </StyledTouchableOpacity>
                    </StyledView>
                  ) : null
                })}
              </StyledView>
            )}

            {/* Available Tags Pills */}
            {tags.length > 0 && (
              <StyledView className="ml-11 mt-4">
                <StyledText className="text-white/60 text-xs mb-2">
                  Suggested Tags
                </StyledText>
                <StyledView className="flex-row flex-wrap">
                  {tags
                    .filter(tag => !trickData.tags.includes(tag.id))
                    .slice(0, 8)
                    .map((tag) => (
                      <StyledTouchableOpacity
                        key={tag.id}
                        onPress={() => toggleTag(tag.id)}
                        className="bg-white/10 border border-white/20 rounded-full px-3 py-1 mr-2 mb-2"
                        activeOpacity={0.7}
                      >
                        <StyledText className="text-white/70 text-sm">{tag.name}</StyledText>
                      </StyledTouchableOpacity>
                    ))}
                </StyledView>
              </StyledView>
            )}
          </StyledView>

          {/* Shield Icon */}
          <StyledView className="items-center mb-8">
            <StyledView className="w-16 h-16 bg-white/5 rounded-full items-center justify-center">
              <Feather name="shield" size={32} color="rgba(255, 255, 255, 0.3)" />
            </StyledView>
            <StyledText className="text-white/40 text-xs mt-2 text-center">
              Your identity is safe
            </StyledText>
            <StyledText className="text-white/40 text-xs text-center">
              *End-to-end Encrypted*
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Bottom Section */}
        <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 20 }}>
          {/* Step indicator */}
          <StyledText className="text-white/60 text-center text-sm mb-6">
            {currentStep + 1} of {totalSteps}
          </StyledText>

          {/* Next Button */}
          <StyledTouchableOpacity
            className={`w-full h-12 rounded-xl items-center justify-center flex-row ${
              isFormValid && !isSubmitting
                ? 'bg-emerald-700'
                : 'bg-white/10'
            }`}
            disabled={!isFormValid || isSubmitting}
            onPress={() => {
              if (isFormValid && onNext) {
                onNext()
              }
            }}
          >
            {isSubmitting ? (
              <>
                <StyledText className="text-white font-semibold text-base mr-2">
                  {t("saving", "Guardando...")}
                </StyledText>
                <Ionicons name="refresh" size={20} color="white" />
              </>
            ) : (
              <>
                <StyledText className="text-white font-semibold text-base mr-2">
                  {isLastStep ? t("save", "Save") : t("next", "Next")}
                </StyledText>
                {isLastStep ? (
                  <Feather name="save" size={20} color="white" />
                ) : (
                  <Feather name="chevron-right" size={20} color="white" />
                )}
              </>
            )}
          </StyledTouchableOpacity>
        </StyledView>

        {/* Category Selection Modal */}
        <Modal
          isVisible={isCategorySelectModalVisible}
          onBackdropPress={() => setCategorySelectModalVisible(false)}
          backdropOpacity={0.7}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          useNativeDriverForBackdrop={true}
          hideModalContentWhileAnimating={true}
        >
          <StyledView className="bg-gray-900 rounded-2xl mx-4 p-6 max-h-96">
            <StyledView className="flex-row justify-between items-center mb-6">
              <StyledText className="text-white text-xl font-bold">
                Select Category
              </StyledText>
              <StyledTouchableOpacity
                onPress={() => setCategorySelectModalVisible(false)}
                className="p-2"
              >
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="max-h-64">
              {/* User Categories */}
              {userCategories.length > 0 && (
                <StyledView className="mb-6">
                  <StyledText className="text-emerald-300 text-base font-semibold mb-3">
                    Your Categories
                  </StyledText>
                  <StyledView className="flex-row flex-wrap">
                    {userCategories.map((category) => (
                      <StyledTouchableOpacity
                        key={category.id}
                        onPress={() => {
                          selectCategory(category.id)
                          setCategorySelectModalVisible(false)
                        }}
                        className={`m-1 px-4 py-2 rounded-full ${
                          trickData.selectedCategoryId === category.id 
                            ? "bg-emerald-600" 
                            : "bg-gray-700 border border-gray-600"
                        }`}
                      >
                        <StyledText className="text-white text-sm">{category.name}</StyledText>
                      </StyledTouchableOpacity>
                    ))}
                  </StyledView>
                </StyledView>
              )}

              {/* Predefined Categories */}
              {predefinedCategories.length > 0 && (
                <StyledView className="mb-6">
                  <StyledText className="text-blue-300 text-base font-semibold mb-3">
                    Suggested Categories
                  </StyledText>
                  <StyledView className="flex-row flex-wrap">
                    {predefinedCategories.map((category) => (
                      <StyledTouchableOpacity
                        key={category.id}
                        onPress={() => {
                          selectCategory(category.id)
                          setCategorySelectModalVisible(false)
                        }}
                        className={`m-1 px-4 py-2 rounded-full ${
                          trickData.selectedCategoryId === category.id 
                            ? "bg-emerald-600" 
                            : "bg-gray-700 border border-gray-600"
                        }`}
                      >
                        <StyledText className="text-white text-sm">{category.name}</StyledText>
                      </StyledTouchableOpacity>
                    ))}
                  </StyledView>
                </StyledView>
              )}

              {/* No categories message */}
              {userCategories.length === 0 && predefinedCategories.length === 0 && !loading && (
                <StyledView className="items-center py-8">
                  <Feather name="folder-plus" size={48} color="rgba(255, 255, 255, 0.3)" />
                  <StyledText className="text-white/60 text-center mt-4">
                    No categories found
                  </StyledText>
                </StyledView>
              )}

              {/* Loading indicator */}
              {loading && (
                <StyledView className="items-center py-8">
                  <StyledText className="text-white/60">Loading categories...</StyledText>
                </StyledView>
              )}
            </StyledView>

            {/* Create new category button */}
            <StyledTouchableOpacity
              className="bg-emerald-700 rounded-xl py-3 items-center mt-4"
              onPress={() => {
                setCategorySelectModalVisible(false)
                setCreateCategoryModalVisible(true)
              }}
            >
              <StyledText className="text-white font-semibold">
                Create New Category
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </Modal>

        {/* Create Category Modal */}
        <Modal
          isVisible={isCreateCategoryModalVisible}
          onBackdropPress={() => setCreateCategoryModalVisible(false)}
          backdropOpacity={0.7}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          useNativeDriverForBackdrop={true}
          hideModalContentWhileAnimating={true}
        >
          <StyledView className="bg-gray-900 rounded-2xl mx-4 p-6">
            <StyledView className="flex-row justify-between items-center mb-6">
              <StyledText className="text-white text-xl font-bold">
                Create Category
              </StyledText>
              <StyledTouchableOpacity
                onPress={() => setCreateCategoryModalVisible(false)}
                className="p-2"
              >
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="mb-4">
              <StyledText className="text-white mb-2 font-medium">
                Category Name
                <StyledText className="text-red-400"> *</StyledText>
              </StyledText>
              <StyledView className="bg-gray-700 rounded-lg border border-gray-600">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder="Enter category name"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </StyledView>
            </StyledView>

            <StyledView className="mb-6">
              <StyledText className="text-white mb-2 font-medium">
                Description (optional)
              </StyledText>
              <StyledView className="bg-gray-700 rounded-lg border border-gray-600">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder="Enter description"
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
                <StyledText className="text-white font-medium">Cancel</StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  loading || !newCategoryName.trim() 
                    ? 'bg-gray-500' 
                    : 'bg-emerald-700'
                }`}
                onPress={handleCreateCategory}
                disabled={loading || !newCategoryName.trim()}
              >
                <StyledText className="text-white font-medium">
                  {loading ? "Creating..." : "Create"}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </Modal>
      </StyledView>
    </LinearGradient>
  )
}