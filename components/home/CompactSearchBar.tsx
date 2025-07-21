"use client";

import { useRef, useEffect, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Ionicons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { fontNames } from "../../app/_layout";

// Importar nuestro componente Text personalizado
import Text from "../ui/Text";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

// Define a search filters interface with all properties
export interface SearchFilters {
  categories: string[];
  tags: string[];
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
  tagsMode?: "and" | "or";
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
}

interface CompactSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFiltersPress?: () => void;
  appliedFiltersCount?: number;
}

export default function CompactSearchBar({
  value,
  onChangeText,
  onFiltersPress,
  appliedFiltersCount = 0,
}: CompactSearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <StyledView style={styles.searchBarContainer}>
      <BlurView intensity={10} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.blurEffect}>
        <StyledView style={styles.searchInputContainer}>
          <Ionicons name="search" size={16} color="white" />
          <StyledTextInput
            ref={inputRef}
            className="flex-1 text-white mx-2 h-10"
            style={styles.searchInput}
            placeholder={t("searchPlaceholder", "Search for tricks...")}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={value}
            onChangeText={onChangeText}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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

          {/* Contador de filtros aplicados */}
          {appliedFiltersCount > 0 && (
            <StyledView style={styles.filterCountContainer}>
              <Text style={styles.filterCountText}>{appliedFiltersCount}</Text>
            </StyledView>
          )}

          {/* Botón de filtros */}
          <StyledTouchableOpacity
            onPress={onFiltersPress}
            style={[styles.actionButton, styles.filterButton]}
          >
            <Feather name="sliders" size={18} color="white" />
          </StyledTouchableOpacity>
        </StyledView>
      </BlurView>
    </StyledView>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.40)",
  },
  blurEffect: {
    width: "100%",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: {
    fontFamily: fontNames.light,
    fontSize: 16,
    includeFontPadding: false,
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterButton: {
    marginLeft: 8,
  },
  filterCountContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    color: "white",
    fontSize: 12,
    fontFamily: fontNames.regular,
    includeFontPadding: false,
  },
});