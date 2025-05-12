"use client"

import { useRef, useEffect, useState } from "react"
import { View, TextInput, TouchableOpacity, Animated, Text, ScrollView, BackHandler, StyleSheet } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Search, X } from "lucide-react-native"
import { BlurView } from "expo-blur"
import { supabase } from "../../lib/supabase"
import { getUserCategories, getPredefinedCategories, type Category } from "../../utils/categoryService"

const StyledView = styled(View)
const StyledAnimatedView = styled(Animated.View)
const StyledText = styled(Text)
const StyledScrollView = styled(ScrollView)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledTextInput = styled(TextInput)

// Define a search filters interface
export interface SearchFilters {
  categories: string[]
  tags: string[]
  difficulties: string[]
}

interface CompactSearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onClose: () => void
  autoHideDelay?: number
  onFiltersChange?: (filters: SearchFilters) => void
}

export default function CompactSearchBar({
  value,
  onChangeText,
  onClose,
  autoHideDelay = 8000,
  onFiltersChange,
}: CompactSearchBarProps) {
  const { t } = useTranslation()
  const inputRef = useRef<TextInput>(null)
  const translateY = useRef(new Animated.Value(-20)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.9)).current
  const [isFocused, setIsFocused] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch categories and tags on mount
  useEffect(() => {
    fetchCategoriesAndTags()
  }, [])

  // Notify parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        categories: selectedCategories,
        tags: selectedTags,
        difficulties: selectedDifficulties,
      })
    }
  }, [selectedCategories, selectedTags, selectedDifficulties])

  const fetchCategoriesAndTags = async () => {
    setLoading(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Fetch user categories
        const userCats = await getUserCategories(user.id)

        // Fetch predefined categories
        const predefinedCats = await getPredefinedCategories()

        // Combine categories
        setCategories([...userCats, ...predefinedCats])

        // Fetch tags
        const { data: tagData, error: tagError } = await supabase.from("predefined_tags").select("id, name")
        if (tagData && !tagError) {
          setTags(tagData)
        }
      }
    } catch (error) {
      console.error("Error fetching categories and tags:", error)
    } finally {
      setLoading(false)
    }
  }

  const animateIn = () => {
    // Limpiar cualquier timeout existente
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Animar la aparición
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
    ]).start()
  }

  const animateOut = () => {
    // Solo animar hacia fuera si no hay texto y no está enfocado
    if (value.length === 0 && !isFocused) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (value.length === 0 && !isFocused) {
          onClose()
        }
      })
    }
  }

  const setupAutoHide = () => {
    // Limpiar cualquier timeout existente
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    
    // Solo configurar el timeout si no está enfocado y no hay texto
    if (!isFocused && value.length === 0) {
      hideTimeoutRef.current = setTimeout(() => {
        animateOut()
      }, autoHideDelay)
    }
  }

  // Manejar el botón de retroceso en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (value.length > 0) {
        onChangeText("")
        return true
      } else if (isFocused) {
        inputRef.current?.blur()
        return true
      }
      return false
    })

    return () => backHandler.remove()
  }, [value, isFocused, onChangeText])

  // Focus the input when the component mounts
  useEffect(() => {
    animateIn()
    
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Configurar el timeout para auto-ocultar cuando cambian las condiciones
  useEffect(() => {
    setupAutoHide()
  }, [isFocused, value])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    )
    animateIn()
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    )
    animateIn()
  }

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty) 
        : [...prev, difficulty]
    )
    animateIn()
  }

  // Dificultades disponibles
  const difficulties = [
    { id: 'beginner', label: t("difficulty.beginner") },
    { id: 'easy', label: t("difficulty.easy") },
    { id: 'intermediate', label: t("difficulty.intermediate") }, 
    { id: 'advanced', label: t("difficulty.advanced") },
    { id: 'expert', label: t("difficulty.expert") }
  ]

  return (
    <StyledAnimatedView
      style={[
        {
          width: "100%",
          transform: [{ translateY }, { scale }],
          opacity,
        }
      ]}
    >
      {/* Barra de búsqueda */}
      <StyledView style={styles.searchBarContainer}>
        <BlurView intensity={10} tint="dark" style={styles.blurEffect}>
          <StyledView style={styles.searchInputContainer}>
            <Search size={16} color="white" />
            <StyledTextInput
              ref={inputRef}
              className="flex-1 text-white mx-2 h-10"
              placeholder={t("searchPlaceholder")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={value}
              onChangeText={(text) => {
                onChangeText(text)
                animateIn()
              }}
              returnKeyType="search"
              onFocus={() => {
                setIsFocused(true)
                animateIn()
              }}
              onBlur={() => {
                setIsFocused(false)
                setupAutoHide()
              }}
            />
            {value.length > 0 && (
              <StyledTouchableOpacity 
                onPress={() => onChangeText("")}
                style={styles.clearButton}
              >
                <X size={16} color="white" />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </BlurView>
      </StyledView>

      {/* Categorías */}
      <StyledView style={styles.sectionContainer}>
        <StyledText style={styles.sectionTitle}>{t("categories")}</StyledText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {categories.map(category => (
            <StyledTouchableOpacity
              key={category.id}
              style={[
                styles.filterChip,
                selectedCategories.includes(category.id) ? styles.selectedChip : null
              ]}
              onPress={() => toggleCategory(category.id)}
            >
              <StyledText style={styles.filterChipText}>{category.name}</StyledText>
            </StyledTouchableOpacity>
          ))}
          {categories.length === 0 && (
            <StyledView style={[styles.filterChip, styles.emptyChip]}>
              <StyledText style={styles.emptyChipText}>—</StyledText>
            </StyledView>
          )}
        </ScrollView>
      </StyledView>

      {/* Etiquetas */}
      <StyledView style={styles.sectionContainer}>
        <StyledText style={styles.sectionTitle}>{t("tags")}</StyledText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {tags.map(tag => (
            <StyledTouchableOpacity
              key={tag.id}
              style={[
                styles.filterChip,
                selectedTags.includes(tag.id) ? styles.selectedChip : null
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <StyledText style={styles.filterChipText}>{tag.name}</StyledText>
            </StyledTouchableOpacity>
          ))}
          {tags.length === 0 && (
            <StyledView style={[styles.filterChip, styles.emptyChip]}>
              <StyledText style={styles.emptyChipText}>—</StyledText>
            </StyledView>
          )}
        </ScrollView>
      </StyledView>

      {/* Dificultad */}
      <StyledView style={styles.sectionContainer}>
        <StyledText style={styles.sectionTitle}>{t("difficulty", "Difficulty")}</StyledText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {difficulties.map(difficulty => (
            <StyledTouchableOpacity
              key={difficulty.id}
              style={[
                styles.filterChip,
                selectedDifficulties.includes(difficulty.id) ? styles.selectedChip : null
              ]}
              onPress={() => toggleDifficulty(difficulty.id)}
            >
              <StyledText style={styles.filterChipText}>{difficulty.label}</StyledText>
            </StyledTouchableOpacity>
          ))}
        </ScrollView>
      </StyledView>
    </StyledAnimatedView>
  )
}

const styles = StyleSheet.create({
  searchBarContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  blurEffect: {
    width: '100%',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingRight: 24,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectedChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.6)',
    borderColor: 'rgba(16, 185, 129, 0.8)',
  },
  filterChipText: {
    color: 'white',
    fontSize: 13,
  },
  emptyChip: {
    minWidth: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChipText: {
    color: 'rgba(255, 255, 255, 0.4)',
  }
});
