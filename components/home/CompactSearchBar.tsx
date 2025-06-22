"use client";

import { useRef, useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  BackHandler,
  StyleSheet,
  PanResponder,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Ionicons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import {
  getUserCategories,
  getPredefinedCategories,
  type Category,
} from "../../utils/categoryService";
import { fontNames } from "../../app/_layout";

// Importar nuestro componente Text personalizado
import Text from "../ui/Text";

const StyledView = styled(View);
const StyledAnimatedView = styled(Animated.View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

// Define a search filters interface - KEEP USING IDs for better performance
export interface SearchFilters {
  categories: string[];
  tags: string[]; // Keep as IDs for consistency with database
  difficulties: string[];
}

interface CompactSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  onSearchBarPress?: () => void; // Callback cuando se presiona la barra de búsqueda
}

export default function CompactSearchBar({
  value,
  onChangeText,
  onClose,
  onFiltersChange,
  onSearchBarPress,
}: CompactSearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch categories and tags on mount
  useEffect(() => {
    fetchCategoriesAndTags();
  }, []);

  // Notify parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        categories: selectedCategories,
        tags: selectedTags, // Send IDs - LibrariesSection will handle the lookup
        difficulties: selectedDifficulties,
      });
    }
  }, [selectedCategories, selectedTags, selectedDifficulties]);

  const fetchCategoriesAndTags = async () => {
    setLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch user categories
        const userCats = await getUserCategories(user.id);

        // Fetch predefined categories
        const predefinedCats = await getPredefinedCategories();

        // Combine categories
        setCategories([...userCats, ...predefinedCats]);

        // Fetch tags
        const { data: tagData, error: tagError } = await supabase
          .from("predefined_tags")
          .select("id, name");
        if (tagData && !tagError) {
          setTags(tagData);
        }
      }
    } catch (error) {
      console.error("Error fetching categories and tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const animateIn = () => {
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
    ]).start();
  };

  // Pan responder for swipe to close gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes to the right
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          gestureState.dx > 10
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        // Update scale and opacity based on swipe progress
        if (gestureState.dx > 0) {
          const progress = Math.min(gestureState.dx / 100, 1);
          scale.setValue(1 - progress * 0.1);
          opacity.setValue(1 - progress * 0.5);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped far enough to the right, close the search
        if (gestureState.dx > 80) {
          onClose();
        } else {
          // Otherwise, animate back to original position
          Animated.parallel([
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Función para cerrar el teclado
  const dismissKeyboard = () => {
    inputRef.current?.blur();
  };

  // Manejar el botón de retroceso en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (value.length > 0) {
          onChangeText("");
          return true;
        } else if (isFocused) {
          dismissKeyboard();
          return true;
        } else {
          // Si no hay texto y no está enfocado, cerrar la búsqueda
          onClose();
          return true;
        }
      }
    );

    return () => backHandler.remove();
  }, [value, isFocused, onChangeText, onClose]);

  // Initialize component animation without focusing input
  useEffect(() => {
    animateIn();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
    animateIn();
  };

  // Keep using IDs for tags - this is more efficient
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
    animateIn();
  };

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty)
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty]
    );
    animateIn();
  };

  // Función para manejar cuando se presiona la barra de búsqueda (desde el home)
  const handleSearchBarPress = () => {
    // Llamar al callback del padre (home) para ejecutar las animaciones
    if (onSearchBarPress) {
      onSearchBarPress();
    }

    // Enfocar el input después de un pequeño delay para que la animación sea smooth
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  // Dificultades disponibles
  const difficulties = [
    { id: "beginner", label: t("difficulty.beginner", "Beginner") },
    { id: "easy", label: t("difficulty.easy", "Easy") },
    { id: "intermediate", label: t("difficulty.intermediate", "Intermediate") },
    { id: "advanced", label: t("difficulty.advanced", "Advanced") },
    { id: "expert", label: t("difficulty.expert", "Expert") },
  ];

  return (
    <StyledAnimatedView
      style={[
        {
          width: "100%",
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Barra de búsqueda */}
      <StyledTouchableOpacity
        style={styles.searchBarContainer}
        onPress={handleSearchBarPress}
        activeOpacity={0.9}
      >
        <BlurView intensity={10} tint="dark" style={styles.blurEffect}>
          <StyledView style={styles.searchInputContainer}>
            <Ionicons name="search" size={16} color="white" />
            <StyledTextInput
              ref={inputRef}
              className="flex-1 text-white mx-2 h-10"
              style={styles.searchInput}
              placeholder={t("searchPlaceholder", "Search for tricks...")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={value}
              onChangeText={(text) => {
                onChangeText(text);
                animateIn();
              }}
              returnKeyType="search"
              onFocus={() => {
                setIsFocused(true);
                animateIn();
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              blurOnSubmit={true}
              enterKeyHint="done"
            />

            {/* Botón para limpiar texto */}
            {value.length > 0 && (
              <StyledTouchableOpacity
                onPress={() => onChangeText("")}
                style={styles.actionButton}
              >
                <Feather name="x" size={16} color="white" />
              </StyledTouchableOpacity>
            )}

            {/* Botón para cerrar teclado (visible cuando el input está enfocado) */}
            {isFocused && (
              <StyledTouchableOpacity
                onPress={dismissKeyboard}
                style={styles.actionButton}
              >
                <Ionicons name="chevron-down" size={16} color="white" />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </BlurView>
      </StyledTouchableOpacity>

      {/* Categorías */}
      <StyledView style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("categories", "Categories")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {categories.map((category) => (
            <StyledTouchableOpacity
              key={category.id}
              style={[
                styles.filterChip,
                selectedCategories.includes(category.id)
                  ? styles.selectedChip
                  : null,
              ]}
              onPress={() => toggleCategory(category.id)}
            >
              <Text style={styles.filterChipText}>{category.name}</Text>
            </StyledTouchableOpacity>
          ))}
          {categories.length === 0 && (
            <StyledView style={[styles.filterChip, styles.emptyChip]}>
              <Text style={styles.emptyChipText}>—</Text>
            </StyledView>
          )}
        </ScrollView>
      </StyledView>

      {/* Etiquetas - Keep using IDs for selection */}
      <StyledView style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("tags", "Tags")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {tags.map((tag) => (
            <StyledTouchableOpacity
              key={tag.id}
              style={[
                styles.filterChip,
                selectedTags.includes(tag.id) ? styles.selectedChip : null,
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text style={styles.filterChipText}>{tag.name}</Text>
            </StyledTouchableOpacity>
          ))}
          {tags.length === 0 && (
            <StyledView style={[styles.filterChip, styles.emptyChip]}>
              <Text style={styles.emptyChipText}>—</Text>
            </StyledView>
          )}
        </ScrollView>
      </StyledView>

      {/* Dificultad */}
      <StyledView style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("difficulty", "Difficulty")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {difficulties.map((difficulty) => (
            <StyledTouchableOpacity
              key={difficulty.id}
              style={[
                styles.filterChip,
                selectedDifficulties.includes(difficulty.id)
                  ? styles.selectedChip
                  : null,
              ]}
              onPress={() => toggleDifficulty(difficulty.id)}
            >
              <Text style={styles.filterChipText}>{difficulty.label}</Text>
            </StyledTouchableOpacity>
          ))}
        </ScrollView>
      </StyledView>
    </StyledAnimatedView>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  blurEffect: {
    width: "100%",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    fontFamily: fontNames.regular,
    fontSize: 16,
    includeFontPadding: false,
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "white",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: fontNames.medium,
    includeFontPadding: false,
  },
  filtersContainer: {
    paddingRight: 24,
  },
  filterChip: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  selectedChip: {
    backgroundColor: "rgba(16, 185, 129, 0.6)",
    borderColor: "rgba(16, 185, 129, 0.8)",
  },
  filterChipText: {
    color: "white",
    fontSize: 13,
    fontFamily: fontNames.regular,
    includeFontPadding: false,
  },
  emptyChip: {
    minWidth: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChipText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: fontNames.light,
    includeFontPadding: false,
  },
});
