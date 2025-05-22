"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons"
import type { Technique } from "../AddTechniqueWizard"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import DifficultySlider from "../../add-magic/ui/DifficultySlider"
import CategoryModal from "../../add-magic/ui/CategoryModal"
import { supabase } from "../../../lib/supabase"
import {
  getUserCategories,
  getPredefinedCategories,
  type Category,
} from "../../../utils/categoryService"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

interface StepProps {
  techniqueData: Technique
  updateTechniqueData: (data: Partial<Technique>) => void
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

export default function TechniqueBasicsStep({
  techniqueData,
  updateTechniqueData,
  onNext,
  onCancel,
  currentStep = 1,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
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

  // Validación en tiempo real del nombre
  const nameValidation = useMemo(() => {
    if (!techniqueData.name) {
      return { isValid: false, message: '' }
    }
    
    const trimmedName = techniqueData.name.trim()
    
    if (trimmedName.length === 0) {
      return { 
        isValid: false, 
        message: t("validation.nameRequired") 
      }
    }
    
    if (trimmedName.length < 3) {
      return { 
        isValid: false, 
        message: t("validation.nameTooShort") 
      }
    }
    
    if (trimmedName.length > 100) {
      return { 
        isValid: false, 
        message: t("validation.nameTooLong") 
      }
    }
    
    return { isValid: true, message: '' }
  }, [techniqueData.name, t])

  // Validación de la descripción
  const descriptionValidation = useMemo(() => {
    if (!techniqueData.description) {
      return { isValid: false, message: '' }
    }
    
    const trimmedDescription = techniqueData.description.trim()
    
    if (trimmedDescription.length === 0) {
      return { 
        isValid: false, 
        message: t("validation.descriptionRequired") 
      }
    }
    
    if (trimmedDescription.length < 10) {
      return { 
        isValid: false, 
        message: t("validation.descriptionTooShort") 
      }
    }
    
    return { isValid: true, message: '' }
  }, [techniqueData.description, t])

  // Validación de categoría
  const categoryValidation = useMemo(() => {
    if (!techniqueData.selectedCategoryId) {
      return { 
        isValid: false, 
        message: t("validation.categoryRequired") 
      }
    }
    return { isValid: true, message: '' }
  }, [techniqueData.selectedCategoryId, t])

  // Validación general para el botón Next
  const isFormValid = nameValidation.isValid && descriptionValidation.isValid && categoryValidation.isValid

  // Filtro para las tags basado en el texto de búsqueda
  useEffect(() => {
    if (newTag.trim() === '') {
      // Si no hay texto, mostrar todas las tags disponibles (las que no están seleccionadas)
      // ordenadas por frecuencia de uso (de mayor a menor)
      setFilteredTags(
        tags
          .filter(tag => !techniqueData.tags.includes(tag.id))
          .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      );
    } else {
      // Filtrar las tags por el texto ingresado y ordenarlas por frecuencia de uso
      const filtered = tags
        .filter(
          tag => 
            !techniqueData.tags.includes(tag.id) && 
            tag.name.toLowerCase().includes(newTag.toLowerCase())
        )
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      
      setFilteredTags(filtered);
    }
  }, [newTag, tags, techniqueData.tags]);

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
    if (techniqueData.selectedCategoryId) {
      fetchCategoryName(techniqueData.selectedCategoryId)
    } else {
      setSelectedCategoryName("")
    }
  }, [techniqueData.selectedCategoryId])

  // Función para cargar los datos iniciales
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch categories
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const userCats = await getUserCategories(user.id)
        setUserCategories(userCats)

        const predefinedCats = await getPredefinedCategories()
        setPredefinedCategories(predefinedCats)

        // Si hay una categoría seleccionada, obtener su nombre
        if (techniqueData.selectedCategoryId) {
          const category = [...userCats, ...predefinedCats].find(
            cat => cat.id === techniqueData.selectedCategoryId
          )
          if (category) {
            setSelectedCategoryName(category.name)
          }
        }
      }

      // Obtener tags de la base de datos, incluyendo el contador de uso
      const { data: tagData, error: tagError } = await supabase
        .from("predefined_tags")
        .select("id, name, usage_count")
        .order('usage_count', { ascending: false }) // Ordenar por uso, de mayor a menor

      if (tagData && !tagError) {
        setTags(tagData);
        setFilteredTags(
          tagData
            .filter(tag => !techniqueData.tags.includes(tag.id))
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener el nombre de una categoría por su ID
  const fetchCategoryName = async (categoryId: string) => {
    try {
      // Primero buscar en las categorías ya cargadas
      let category = [...userCategories, ...predefinedCategories].find(
        cat => cat.id === categoryId
      )

      if (category) {
        setSelectedCategoryName(category.name)
        return
      }

      // Si no se encuentra, buscar en la base de datos
      // Primero en user_categories
      const { data: userCatData, error: userCatError } = await supabase
        .from("user_categories")
        .select("name")
        .eq("id", categoryId)
        .single()

      if (userCatData && !userCatError) {
        setSelectedCategoryName(userCatData.name)
        return
      }

      // Luego en predefined_categories
      const { data: predefinedCatData, error: predefinedCatError } = await supabase
        .from("predefined_categories")
        .select("name")
        .eq("id", categoryId)
        .single()

      if (predefinedCatData && !predefinedCatError) {
        setSelectedCategoryName(predefinedCatData.name)
        return
      }

      // Si no se encuentra en ninguna tabla
      setSelectedCategoryName(t("forms.unknownCategory", "Unknown category"))
    } catch (error) {
      console.error("Error fetching category name:", error)
      setSelectedCategoryName(t("forms.unknownCategory", "Unknown category"))
    }
  }

  // Handler para el cambio de nombre
  const handleNameChange = (text: string) => {
    updateTechniqueData({ name: text })
  }

  // Handler para el cambio de descripción
  const handleDescriptionChange = (text: string) => {
    updateTechniqueData({ description: text })
  }

  // Handler para selección de categoría
  const selectCategory = (categoryId: string, categoryName: string) => {
    updateTechniqueData({
      selectedCategoryId: categoryId,
      categories: techniqueData.categories,
    });
    
    // Actualizar directamente el nombre sin necesidad de hacer una llamada a la BD
    setSelectedCategoryName(categoryName);
  }

  // Tag functionality
  const toggleTag = (tagId: string) => {
    const updatedTags = techniqueData.tags.includes(tagId)
      ? techniqueData.tags.filter((id) => id !== tagId)
      : [...techniqueData.tags, tagId]

    updateTechniqueData({ tags: updatedTags })
  }

  const addNewTag = async () => {
    if (!newTag.trim()) return

    try {
      const existingTag = tags.find((tag) => tag.name.toLowerCase() === newTag.toLowerCase())

      if (existingTag) {
        if (!techniqueData.tags.includes(existingTag.id)) {
          toggleTag(existingTag.id)
        }
      } else {
        const { data, error } = await supabase
          .from("predefined_tags")
          .insert({ 
            name: newTag.trim(),
            usage_count: 0 // Inicializar con 0 usos
          })
          .select("id, name, usage_count")
          .single()

        if (data && !error) {
          setTags(prev => [...prev, data])
          updateTechniqueData({ tags: [...techniqueData.tags, data.id] })
        } else {
          console.error("Error creating tag:", error)
        }
      }

      setNewTag("")
    } catch (error) {
      console.error("Error adding tag:", error)
    }
  }

  // Manejar cambio de dificultad
  const handleDifficultyChange = (value: number) => {
    updateTechniqueData({ difficulty: value })
  }

  // Obtener el nombre de la categoría seleccionada para mostrar
  const getSelectedCategoryName = () => {
    if (!techniqueData.selectedCategoryId) {
      return t("forms.categoryPlaceholder", "Select category")
    }
    
    return selectedCategoryName || t("forms.loadingCategory", "Loading category...")
  }

  // Obtener tags seleccionadas como objetos
  const getSelectedTags = () => {
    return techniqueData.tags
      .map(tagId => tags.find(tag => tag.id === tagId))
      .filter(tag => tag !== undefined) as Tag[];
  }

  return (
    <StyledView className="flex-1">
      {/* Background gradient */}
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-6 pt-4">
        <StyledTouchableOpacity className="p-2" onPress={onCancel}>
          <Feather name="x" size={24} color="white" />
        </StyledTouchableOpacity>
        
        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {t("addTechnique", "Add Technique")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {getCurrentDate()}
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <Feather name="help-circle" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6 mt-6">
        <StyledText className="text-white/60 text-lg font-semibold mb-6">
          {t("clasify", "Clasify")}
        </StyledText>

        {/* Technique Name Field */}
        <StyledView className="mb-8">
          <StyledView className="flex-row items-center mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="flash" size={24} color="white" />
            </StyledView>
            <StyledTextInput
              className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
              placeholder={t("techniqueName", "Technique name")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={techniqueData.name}
              onChangeText={handleNameChange}
              maxLength={100}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="next"
            />
          </StyledView>
          {techniqueData.name && !nameValidation.isValid && (
            <StyledText className="text-red-400 text-xs ml-11">
              {nameValidation.message}
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
                techniqueData.selectedCategoryId ? 'text-white' : 'text-white/50'
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
          {techniqueData.tags.length > 0 && (
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

        {/* Description Field */}
        <StyledView className="mb-6">
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="file-text" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[120px]"
                placeholder={t("techniqueDescription", "Describe the technique in detail")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={techniqueData.description}
                onChangeText={handleDescriptionChange}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>
          {techniqueData.description && !descriptionValidation.isValid && (
            <StyledText className="text-red-400 text-xs ml-11">
              {descriptionValidation.message}
            </StyledText>
          )}
        </StyledView>

        {/* Difficulty Slider */}
        <StyledView className="mb-6">
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialCommunityIcons name="signal-cellular-3" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledText className="text-white mb-2 ml-1">
                {t("difficulty", "Difficulty")}
              </StyledText>
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#5bb9a3]">
                <DifficultySlider
                  value={techniqueData.difficulty || 5}
                  onChange={handleDifficultyChange}
                  min={1}
                  max={10}
                  step={1}
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Shield Icon */}
        <StyledView className="items-center mb-8">
          <StyledView className="w-16 h-16 bg-[#5BB9A3]/40 rounded-full items-center justify-center">
            <Feather name="shield" size={32} color="rgba(255, 255, 255, 0.3)" />
          </StyledView>
          <StyledText className="text-[#5BB9A3]/40 text-xs mt-2 text-center">
            {t("security.identitySafe", "Identity Safe")}
          </StyledText>
          <StyledText className="text-[#5BB9A3]/40 text-xs text-center">
            {t("security.endToEndEncrypted", "End-to-end encrypted")}
          </StyledText>
        </StyledView>
      </StyledScrollView>

      {/* Bottom Section */}
      <StyledView className="px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        {/* Step indicator */}
        <StyledText className="text-white/60 text-center text-sm mb-6">
          {t("navigation.stepIndicator", { current: currentStep, total: totalSteps })}
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
              <MaterialCommunityIcons name="loading" size={20} color="white" />
            </>
          ) : (
            <>
              <StyledText className="text-white font-semibold text-base mr-2">
                {isLastStep ? t("createTechnique", "Create Technique") : t("actions.next")}
              </StyledText>
              {isLastStep ? (
                <Feather name="check" size={20} color="white" />
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
        selectedCategoryId={techniqueData.selectedCategoryId}
        onSelectCategory={selectCategory}
        trickTitle={techniqueData.name}
      />
    </StyledView>
  )
}