// app/(app)/home/index.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import {
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Image,
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
import { useSearch } from "../../../context/SearchContext";
import { useTrickDeletion } from "../../../context/TrickDeletionContext";
import { useIsFocused } from "@react-navigation/native";
import { useLibraryData } from "../../../context/LibraryDataContext";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const { width, height } = Dimensions.get("window");

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { deletedTrickId } = useTrickDeletion();
  const isFocused = useIsFocused();
  const { initializing: contextInitializing } = useLibraryData();

  const { searchQuery, debouncedSearchQuery, setSearchQuery, searchFilters, setSearchFilters } =
    useSearch();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTrickData, setCreatedTrickData] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Delay mínimo para mostrar loading y evitar el "salto"
  useEffect(() => {
    if (!contextInitializing) {
      // Delay mínimo solo para permitir que se renderice el loading screen
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [contextInitializing]);

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

      router.setParams({
        showSuccessModal: undefined,
        trickId: undefined,
        trickTitle: undefined,
      });
    }
  }, [params.showSuccessModal, params.trickId, params.trickTitle, router]);

  const handleViewItem = () => {
    setShowSuccessModal(false);
    if (createdTrickData) router.push(`/(app)/trick/${createdTrickData.id}`);
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    router.push("/(app)/add-magic");
  };

  const handleCloseModal = () => setShowSuccessModal(false);
  const handleSearchQueryChange = (query: string) => setSearchQuery(query);
  const dismissKeyboard = () => Keyboard.dismiss();
  const handleOpenFiltersModal = () => setShowFiltersModal(true);
  const handleNotificationsPress = () => router.push("/(app)/notifications");

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

  // Mostrar pantalla de carga mientras inicializa o durante transición
  if (!showContent) {
    return (
      <StyledView style={{ flex: 1 }}>
        {/* Imagen de fondo igual que la app */}
        <Image
          source={require("../../../assets/Background.png")}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
          fadeDuration={0}
        />
        {/* Spinner centrado */}
        <StyledView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#10b981" />
        </StyledView>
      </StyledView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <StyledView className="flex-1">
          <StyledView className="flex-1" style={{ paddingHorizontal: 24 }}>
            <StyledView style={{ zIndex: 10, marginBottom: 10, marginTop: 10 }}>
              <UserProfile
                onProfilePress={() => router.push("/(app)/profile")}
                isSearchVisible={false}
                onCloseSearch={() => {}}
                onNotificationsPress={handleNotificationsPress}
              />
            </StyledView>

            <StyledView className="mb-4">
              <CompactSearchBar
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                onFiltersPress={handleOpenFiltersModal}
                appliedFiltersCount={getTotalFiltersCount()}
              />
            </StyledView>

            <StyledView
              className="flex-1"
              style={{
                marginTop: 5,
                marginHorizontal: -18,
                paddingBottom: 0,
                zIndex: 1,
              }}
            >
              <LibrariesSection
                searchQuery={debouncedSearchQuery}
                searchFilters={searchFilters}
              />
            </StyledView>
          </StyledView>
        </StyledView>
      </TouchableWithoutFeedback>

      <SuccessCreationModal
        visible={showSuccessModal}
        onClose={handleCloseModal}
        onViewItem={handleViewItem}
        onAddAnother={handleAddAnother}
        itemName={createdTrickData?.title || "Trick"}
        itemType="trick"
        itemId={createdTrickData?.id}
      />

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
