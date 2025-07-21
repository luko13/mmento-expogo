// app/(app)/home/index.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import {
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import UserProfile from "../../../components/home/UserProfile";
import LibrariesSection from "../../../components/home/LibrariesSection";
import CompactSearchBar from "../../../components/home/CompactSearchBar";
import SuccessCreationModal from "../../../components/ui/SuccessCreationModal";
import FiltersModal from "../../../components/ui/FilterModal";
import { supabase } from "../../../lib/supabase";
import { paginatedContentService } from "../../../utils/paginatedContentService";
import { useSearch } from "../../../context/SearchContext";
import { useTrickDeletion } from "../../../context/TrickDeletionContext";
import { useIsFocused } from "@react-navigation/native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const { width, height } = Dimensions.get("window");

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const { deletedTrickId } = useTrickDeletion();
  const isFocused = useIsFocused();

  // Usar el contexto de búsqueda en lugar de estado local
  const { searchQuery, setSearchQuery, searchFilters, setSearchFilters } =
    useSearch();

  // Estados para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTrickData, setCreatedTrickData] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Estado para forzar refresh de LibrariesSection
  const [refreshKey, setRefreshKey] = useState(0);

  // Estado para el modal de filtros
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Detectar si venimos de crear un truco
  useEffect(() => {
    if (
      params.showSuccessModal === "true" &&
      params.trickId &&
      params.trickTitle
    ) {
      setCreatedTrickData({
        id: params.trickId as string,
        title: params.trickTitle as string,
      });
      setShowSuccessModal(true);

      // Limpiar el caché del servicio paginado
      const clearCache = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          paginatedContentService.clearUserCache(user.id);
        }
      };
      clearCache();

      // Forzar actualización de LibrariesSection
      setRefreshKey((prev) => prev + 1);

      // Limpiar los parámetros para evitar que se muestre de nuevo
      router.setParams({
        showSuccessModal: undefined,
        trickId: undefined,
        trickTitle: undefined,
      });
    }
  }, [params.showSuccessModal, params.trickId, params.trickTitle, router]);

  useEffect(() => {
    if (isFocused && deletedTrickId) {
      // Incrementar refreshKey para forzar actualización de LibrariesSection
      setRefreshKey((prev) => prev + 1);
    }
  }, [isFocused, deletedTrickId]);

  // Funciones del modal
  const handleViewItem = () => {
    setShowSuccessModal(false);
    if (createdTrickData) {
      router.push(`/(app)/tricks/${createdTrickData.id}`);
    }
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    router.push("/(app)/add-magic");
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
  };

  // Handle search query changes
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  // Function to dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setSearchExpanded(false);
  };

  // Calcular el número total de filtros aplicados
  const getTotalFiltersCount = () => {
    let count = 0;
    if (searchFilters.categories.length > 0)
      count += searchFilters.categories.length;
    if (searchFilters.tags.length > 0) count += searchFilters.tags.length;
    if (searchFilters.difficulties.length > 0)
      count += searchFilters.difficulties.length;
    if (searchFilters.resetTimes.min !== undefined) count++;
    if (searchFilters.resetTimes.max !== undefined) count++;
    if (searchFilters.durations.min !== undefined) count++;
    if (searchFilters.durations.max !== undefined) count++;
    if (searchFilters.angles.length > 0) count += searchFilters.angles.length;
    if (searchFilters.isPublic !== null && searchFilters.isPublic !== undefined)
      count++;
    if (searchFilters.sortOrder && searchFilters.sortOrder !== "recent")
      count++;
    return count;
  };

  // Función para abrir el modal de filtros
  const handleOpenFiltersModal = () => {
    setShowFiltersModal(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <StyledView className="flex-1">
          {/* Container principal con padding para todos los componentes */}
          <StyledView className="flex-1" style={{ paddingHorizontal: 24 }}>
            {/* User Profile - always visible */}
            <StyledView style={{ zIndex: 10, marginBottom: 10, marginTop: 10 }}>
              <UserProfile
                onProfilePress={() => router.push("/(app)/profile")}
                isSearchVisible={false}
                onCloseSearch={() => {}}
              />
            </StyledView>

            {/* Search Bar Container - Siempre el mismo componente */}
            <StyledView className="mb-4">
              <CompactSearchBar
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                onFiltersPress={handleOpenFiltersModal}
                appliedFiltersCount={getTotalFiltersCount()}
              />
            </StyledView>

            {/* Libraries Section */}
            <StyledView
              className="flex-1"
              style={{
                marginTop: 5,
                marginHorizontal: -18, // Márgenes negativos para compensar el padding del padre
                paddingBottom: 0,
                zIndex: 1,
              }}
            >
              <LibrariesSection
                key={refreshKey}
                searchQuery={searchQuery}
                searchFilters={searchFilters}
              />
            </StyledView>
          </StyledView>
        </StyledView>
      </TouchableWithoutFeedback>

      {/* Success Modal */}
      <SuccessCreationModal
        visible={showSuccessModal}
        onClose={handleCloseModal}
        onViewItem={handleViewItem}
        onAddAnother={handleAddAnother}
        itemName={createdTrickData?.title || "Trick"}
        itemType="trick"
        itemId={createdTrickData?.id}
      />

      {/* Filters Modal */}
      <FiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApplyFilters={(filters) => {
          setSearchFilters(filters);
          setShowFiltersModal(false);
        }}
        currentFilters={searchFilters}
      />
    </SafeAreaView>
  );
}
