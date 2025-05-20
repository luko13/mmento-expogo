"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Dimensions, ScrollView } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, AntDesign, Ionicons, FontAwesome6 } from "@expo/vector-icons"
import { supabase } from "../../../lib/supabase"
import type { MagicTrick } from "../AddMagicWizard"
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
  totalSteps = 2,
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

  // Refs para el carrusel de tags
  const scrollRef1 = useRef<ScrollView>(null)
  const scrollRef2 = useRef<ScrollView>(null)

  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Validación en tiempo real del título
  const titleValidation = useMemo(() => {
    if (!trickData.title) {
      return { isValid: false, message: '' }
    }
    
    const trimmedTitle = trickData.title.trim()
    
    if (trimmedTitle.length === 0) {
      return { 
        isValid: false, 
        message: t("validation.titleRequired") 
      }
    }
    
    if (trimmedTitle.length < 3) {
      return { 
        isValid: false, 
        message: t("validation.titleTooShort") 
      }
    }
    
    if (trimmedTitle.length > 100) {
      return { 
        isValid: false, 
        message: t("validation.titleTooLong") 
      }
    }
    
    return { isValid: true, message: '' }
  }, [trickData.title, t])

  // Validación de categoría
  const categoryValidation = useMemo(() => {
    if (!trickData.selectedCategoryId) {
      return { 
        isValid: false, 
        message: t("validation.categoryRequired") 
      }
    }
    return { isValid: true, message: '' }
  }, [trickData.selectedCategoryId, t])

  // Validación general para el botón Next
  const isFormValid = titleValidation.isValid && categoryValidation.isValid

  // Dividir tags en dos filas para mejor distribución
  const availableTags = tags.filter(tag => !trickData.tags.includes(tag.id))
  const midpoint = Math.ceil(availableTags.length / 2)
  const firstRowTags = availableTags.slice(0, midpoint)
  const secondRowTags = availableTags.slice(midpoint)

  // Componente para el carrusel de tags
  const TagCarousel = ({ tagsArray, rowIndex }: { tagsArray: { id: string; name: string }[], rowIndex: number }) => {
    if (tagsArray.length === 0) return null

    return (
      <View style={{ height: 44, marginBottom: 8 }}>
        <ScrollView
          ref={rowIndex === 1 ? scrollRef1 : scrollRef2}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            alignItems: 'center',
            height: 44
          }}
          style={{ flex: 1 }}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          bouncesZoom={false}
          alwaysBounceHorizontal={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {tagsArray.map((tag, index) => (
            <TouchableOpacity
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: index === tagsArray.length - 1 ? 16 : 12,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center'
              }}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: 14,
                textAlign: 'center'
              }}>
                {tag.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

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
      Alert.alert(t("common.error"), t("validation.categoryNameRequired"))
      return
    }

    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        Alert.alert(t("common.error"), t("errors.userNotFound"))
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
          t("common.success"),
          t("messages.categoryCreatedSuccessfully")
        )
      }
    } catch (error) {
      console.error("Error creating category:", error)
      Alert.alert(t("common.error"), t("errors.errorCreatingCategory"))
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
        t("common.error"),
        t("errors.invalidCategory")
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
          Alert.alert(t("common.error"), t("errors.errorCreatingTag"))
        }
      }

      setNewTag("")
    } catch (error) {
      console.error("Error adding tag:", error)
      Alert.alert(t("common.error"), t("errors.errorAddingTag"))
    }
  }

  // Obtener el nombre de la categoría seleccionada
  const getSelectedCategoryName = () => {
    if (!trickData.selectedCategoryId) return t("forms.categoryPlaceholder")
    
    const selectedCategory = [...userCategories, ...predefinedCategories]
      .find(cat => cat.id === trickData.selectedCategoryId)
    
    return selectedCategory?.name || t("forms.categoryPlaceholder")
  }

  return (
    <StyledView className="flex-1">
      <StyledView className="flex-1" style={{ paddingTop: 15 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-6">
          <StyledTouchableOpacity className="p-2" onPress={onCancel}>
            <Feather name="x" size={24} color="white" />
          </StyledTouchableOpacity>
          
          <StyledView className="flex-1 items-center">
            <StyledText className="text-white text-lg font-semibold">
              {t("forms.registerMagic")}
            </StyledText>
            <StyledText className="text-emerald-200 text-sm opacity-70">
              {getCurrentDate()}
            </StyledText>
          </StyledView>
          
          <StyledTouchableOpacity className="p-2">
            <Feather name="help-circle" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Form Fields */}
        <StyledView className="flex-1 px-6 mt-24">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("clasify", "Clasify")}
          </StyledText>
          {/* Magic Title Field */}
          <StyledView className="mb-8">
            <StyledView className="flex-row items-center mb-3">
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <FontAwesome6 name="wand-magic-sparkles" size={18} color="white" />
              </StyledView>
              <StyledTextInput
                className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
                placeholder={t("forms.magicTitlePlaceholder")}
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
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="folder" size={24} color="white" />
              </StyledView>
              <StyledTouchableOpacity 
                className="flex-1 flex-row items-center justify-between text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
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
            {/* {!categoryValidation.isValid && (
              <StyledText className="text-red-400 text-xs ml-11 mt-1">
                {categoryValidation.message}
              </StyledText>
            )} */}
          </StyledView>

          {/* Tag Field */}
          <StyledView className="mb-6">
            <StyledView className="flex-row items-center">
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                <Feather name="tag" size={24} color="white" />
              </StyledView>
              <StyledView className="flex-1 flex-row items-center text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40">
                <StyledTextInput
                  className="flex-1 text-white text-base bg-transparent"
                  placeholder={t("forms.tagPlaceholder")}
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

            {/* Carrusel de Tags Sugeridos */}
            {availableTags.length > 0 && (
              <StyledView className="mt-4">
                <StyledText className="text-white/60 text-xs mb-2">
                  {t("labels.suggestedTags")}
                </StyledText>
                <TagCarousel tagsArray={firstRowTags} rowIndex={1} />
                {secondRowTags.length > 0 && (
                  <TagCarousel tagsArray={secondRowTags} rowIndex={2} />
                )}
              </StyledView>
            )}
          </StyledView>

          {/* Shield Icon */}
          <StyledView className="items-center mb-8">
            <StyledView className="w-16 h-16 bg-white/5 rounded-full items-center justify-center">
              <Feather name="shield" size={32} color="rgba(255, 255, 255, 0.3)" />
            </StyledView>
            <StyledText className="text-white/40 text-xs mt-2 text-center">
              {t("security.identitySafe")}
            </StyledText>
            <StyledText className="text-white/40 text-xs text-center">
              {t("security.endToEndEncrypted")}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Bottom Section */}
        <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 20 }}>
          {/* Step indicator */}
          <StyledText className="text-white/60 text-center text-sm mb-6">
            {t("navigation.stepIndicator", { current: currentStep + 1, total: totalSteps })}
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
                  {t("actions.saving")}
                </StyledText>
                <Ionicons name="refresh" size={20} color="white" />
              </>
            ) : (
              <>
                <StyledText className="text-white font-semibold text-base mr-2">
                  {isLastStep ? t("actions.save") : t("actions.next")}
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
                {t("modals.selectCategory")}
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
                    {t("categories.yourCategories")}
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
                    {t("categories.suggestedCategories")}
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
                    {t("messages.noCategoriesFound")}
                  </StyledText>
                </StyledView>
              )}

              {/* Loading indicator */}
              {loading && (
                <StyledView className="items-center py-8">
                  <StyledText className="text-white/60">{t("common.loadingCategories")}</StyledText>
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
                {t("actions.createNewCategory")}
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
                {t("modals.createCategory")}
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
                {t("forms.categoryName")}
                <StyledText className="text-red-400"> *</StyledText>
              </StyledText>
              <StyledView className="bg-gray-700 rounded-lg border border-gray-600">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder={t("forms.categoryNamePlaceholder")}
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
                {t("forms.description")} ({t("forms.optional")})
              </StyledText>
              <StyledView className="bg-gray-700 rounded-lg border border-gray-600">
                <StyledTextInput
                  className="text-white p-3 text-base"
                  placeholder={t("forms.descriptionPlaceholder")}
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
                <StyledText className="text-white font-medium">{t("actions.cancel")}</StyledText>
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
                  {loading ? t("actions.creating") : t("actions.create")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </Modal>
      </StyledView>
    </StyledView>
  )
}