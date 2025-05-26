"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Dimensions, ScrollView } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, AntDesign, Ionicons, FontAwesome6, MaterialIcons } from "@expo/vector-icons"
import { supabase } from "../../../lib/supabase"
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  getUserCategories,
  getPredefinedCategories,
  createCategory,
  type Category,
} from "../../../utils/categoryService"
import CategoryModal from "../../../components/add-magic/ui/CategoryModal"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface StepProps {
  trickData: EncryptedMagicTrick
  updateTrickData: (data: Partial<EncryptedMagicTrick>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

interface Tag {
  id: string
  name: string
  usage_count?: number
}

const { width } = Dimensions.get('window')

export default function TitleCategoryStepEncrypted({ 
  trickData, 
  updateTrickData, 
  onNext, 
  onCancel,
  currentStep = 1,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false
}: StepProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState("")
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("")

  // Ref para el carrusel de tags
  const tagsScrollRef = useRef<ScrollView>(null)
  const selectedTagsScrollRef = useRef<ScrollView>(null)

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

  // Filtro para las tags
  useEffect(() => {
    if (newTag.trim() === '') {
      setFilteredTags(
        tags
          .filter(tag => !trickData.tags.includes(tag.id))
          .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      );
    } else {
      const filtered = tags
        .filter(
          tag => 
            !trickData.tags.includes(tag.id) && 
            tag.name.toLowerCase().includes(newTag.toLowerCase())
        )
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      
      setFilteredTags(filtered);
    }
  }, [newTag, tags, trickData.tags]);

  // Componente para el carrusel de tags
  const TagCarousel = ({ tagsArray, isSelected = false }: { tagsArray: Tag[], isSelected?: boolean }) => {
    if (tagsArray.length === 0) return null

    return (
      <ScrollView
        ref={isSelected ? selectedTagsScrollRef : tagsScrollRef}
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
              backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: isSelected ? 'rgba(16, 185, 129, 0.9)' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: index === tagsArray.length - 1 ? 16 : 12,
              height: 36,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row'
            }}
            activeOpacity={0.7}
          >
            <Text style={{ 
              color: isSelected ? 'white' : 'rgba(255, 255, 255, 0.7)', 
              fontSize: 14,
              textAlign: 'center'
            }}>
              {tag.name}
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
    )
  }

  // Cargar las categorías y tags
  useEffect(() => {
    fetchData()
  }, [])

  // Cuando cambia la categoría seleccionada, actualizar el nombre
  useEffect(() => {
    if (trickData.selectedCategoryId) {
      fetchCategoryName(trickData.selectedCategoryId)
    } else {
      setSelectedCategoryName("")
    }
  }, [trickData.selectedCategoryId])

  // Función para cargar los datos iniciales
  const fetchData = async () => {
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

        if (trickData.selectedCategoryId) {
          const category = [...userCats, ...predefinedCats].find(
            cat => cat.id === trickData.selectedCategoryId
          )
          if (category) {
            setSelectedCategoryName(category.name)
          }
        }
      }

      // Obtener tags
      const { data: tagData, error: tagError } = await supabase
        .from("predefined_tags")
        .select("id, name, usage_count")
        .order('usage_count', { ascending: false })

      if (tagData && !tagError) {
        setTags(tagData);
        setFilteredTags(
          tagData
            .filter(tag => !trickData.tags.includes(tag.id))
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener el nombre de una categoría
  const fetchCategoryName = async (categoryId: string) => {
    try {
      let category = [...userCategories, ...predefinedCategories].find(
        cat => cat.id === categoryId
      )

      if (category) {
        setSelectedCategoryName(category.name)
        return
      }

      const { data: userCatData, error: userCatError } = await supabase
        .from("user_categories")
        .select("name")
        .eq("id", categoryId)
        .single()

      if (userCatData && !userCatError) {
        setSelectedCategoryName(userCatData.name)
        return
      }

      const { data: predefinedCatData, error: predefinedCatError } = await supabase
        .from("predefined_categories")
        .select("name")
        .eq("id", categoryId)
        .single()

      if (predefinedCatData && !predefinedCatError) {
        setSelectedCategoryName(predefinedCatData.name)
        return
      }

      setSelectedCategoryName(t("forms.unknownCategory", "Unknown category"))
    } catch (error) {
      console.error("Error fetching category name:", error)
      setSelectedCategoryName(t("forms.unknownCategory", "Unknown category"))
    }
  }

  // Handlers
  const handleTitleChange = (text: string) => {
    updateTrickData({ title: text })
  }

  const selectCategory = (categoryId: string, categoryName: string) => {
    updateTrickData({
      selectedCategoryId: categoryId,
      categories: trickData.categories,
    });
    
    setSelectedCategoryName(categoryName);
  }

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
          .insert({ 
            name: newTag.trim(),
            usage_count: 0
          })
          .select("id, name, usage_count")
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

  const getSelectedCategoryName = () => {
    if (!trickData.selectedCategoryId) {
      return t("forms.categoryPlaceholder", "Select category")
    }
    
    return selectedCategoryName || t("forms.loadingCategory", "Loading category...")
  }

  const getSelectedTags = () => {
    return trickData.tags
      .map(tagId => tags.find(tag => tag.id === tagId))
      .filter(tag => tag !== undefined) as Tag[];
  }

  return (
    <StyledView className="flex-1">
      <StyledView className="flex-1" style={{ paddingTop: 15 }}>
        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-6 mb-4">
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
            <MaterialIcons name="security" size={24} color="#10b981" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Form Fields */}
        <StyledView className="flex-1 px-6 mt-4">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("clasify", "Clasificar")}
          </StyledText>

          {/* Magic Title Field */}
          <StyledView className="mb-8">
            <StyledView className="flex-row items-center">
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
                onPress={() => setCategoryModalVisible(true)}
              >
                <StyledText className={`text-base ${
                  trickData.selectedCategoryId ? 'text-white' : 'text-white/50'
                }`}>
                  {getSelectedCategoryName()}
                </StyledText>
                <Feather name="chevron-down" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
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
            
            {/* Selected Tags Carousel */}
            {trickData.tags.length > 0 && (
              <StyledView className="ml-11 mt-3" style={{ height: 44 }}>
                <TagCarousel tagsArray={getSelectedTags()} isSelected={true} />
              </StyledView>
            )}

            {/* Carrusel de Tags Sugeridos/Filtrados */}
            {filteredTags.length > 0 && (
              <StyledView className="mt-4">
                <StyledText className="text-white/60 text-xs mb-2">
                  {t("labels.suggestedTags")}
                </StyledText>
                <StyledView style={{ height: 44 }}>
                  <TagCarousel tagsArray={filteredTags} />
                </StyledView>
              </StyledView>
            )}
          </StyledView>

          {/* Shield Icon */}
          <StyledView className="items-center mb-8">
            <StyledView className="w-16 h-16 bg-[#10b981]/40 rounded-full items-center justify-center">
              <MaterialIcons name="security" size={32} color="#10b981" />
            </StyledView>
            <StyledText className="text-[#10b981]/80 text-xs mt-2 text-center">
              {t("security.magicSecretsSafe", "Tus secretos están protegidos")}
            </StyledText>
            <StyledText className="text-[#10b981]/80 text-xs text-center">
              {t("security.endToEndEncrypted", "Cifrado de extremo a extremo")}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Bottom Section */}
        <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 12 }}>
          {/* Step indicator */}
          <StyledText className="text-white/60 text-center text-sm mb-4">
            {t("navigation.stepIndicator", { current: currentStep, total: totalSteps })}
          </StyledText>

          {/* Next Button */}
          <StyledTouchableOpacity
            className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
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
                  <MaterialIcons name="security" size={20} color="white" />
                ) : (
                  <Feather name="chevron-right" size={20} color="white" />
                )}
              </>
            )}
          </StyledTouchableOpacity>
        </StyledView>

        {/* Category Modal */}
        <CategoryModal
          visible={isCategoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          selectedCategoryId={trickData.selectedCategoryId}
          onSelectCategory={selectCategory}
          trickTitle={trickData.title}
        />
      </StyledView>
    </StyledView>
  )
}