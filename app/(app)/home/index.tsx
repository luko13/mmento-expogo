"use client";
import { useRef, useState, useEffect } from "react";
import {
  View,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  Platform,
  AppState,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import UserProfile from "../../../components/home/UserProfile";
import ActionButtonsCarousel from "../../../components/home/ActionButtonsCarousel";
import LibrariesSection from "../../../components/home/LibrariesSection";
import CompactSearchBar, {
  type SearchFilters,
} from "../../../components/home/CompactSearchBar";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);

const { width, height } = Dimensions.get("window");

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 90;
const BOTTOM_SPACING = Platform.OS === "ios" ? 20 : 10;
const SEARCH_BAR_HEIGHT = 140; // Altura más precisa de la barra de búsqueda expandida
const SEARCH_SPACING = 15; // Espacio entre búsqueda y libraries

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const searchVisibleRef = useRef(false); // Referencia para el estado real
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    categories: [],
    tags: [],
    difficulties: [],
  });
  const [carouselInteractive, setCarouselInteractive] = useState(true);
  const [indicatorInteractive, setIndicatorInteractive] = useState(true);
  const isAnimating = useRef(false);
  const pendingAnimationState = useRef<boolean | null>(null);
  const componentMounted = useRef(true);
  const appState = useRef(AppState.currentState);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const librariesTranslateY = useRef(new Animated.Value(0)).current;
  const carouselTranslateY = useRef(new Animated.Value(0)).current;
  const carouselOpacity = useRef(new Animated.Value(1)).current;

  // Actualizar ambos estados a la vez
  const updateSearchVisible = (value: boolean) => {
    if (!componentMounted.current) return;
    searchVisibleRef.current = value;
    setSearchVisible(value);
  };

  // Configuración inicial y forzar valores de animación
  useEffect(() => {
    componentMounted.current = true;

    // Asegurar que las animaciones tengan valores iniciales correctos
    scrollY.setValue(0);
    librariesTranslateY.setValue(0);
    carouselTranslateY.setValue(0);
    carouselOpacity.setValue(1);

    // Monitorear cambios en el estado de la aplicación
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Reiniciar los valores de animación cuando la app vuelve al primer plano
        if (!searchVisibleRef.current) {
          scrollY.setValue(0);
          librariesTranslateY.setValue(0);
          carouselTranslateY.setValue(0);
          carouselOpacity.setValue(1);
        } else {
          scrollY.setValue(100);
          librariesTranslateY.setValue(SEARCH_BAR_HEIGHT + SEARCH_SPACING);
          carouselTranslateY.setValue(-150);
          carouselOpacity.setValue(0);
        }
      }
      appState.current = nextAppState;
    });

    // Breve retraso para garantizar la inicialización completa
    const timer = setTimeout(() => {
      if (!componentMounted.current) return;
      setIsReady(true);
    }, 150);

    // Limpieza al desmontar
    return () => {
      componentMounted.current = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!isReady) return false;
        const shouldRespond = Math.abs(gestureState.dy) > 10;
        return shouldRespond;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isReady) return;

        // Usar la referencia para el estado más actualizado
        const isSearchCurrentlyVisible = searchVisibleRef.current;

        // Swipe down shows search, swipe up hides it
        if (gestureState.dy > 0 && !isSearchCurrentlyVisible) {
          // Map gesture movement to animation value (0-100)
          const newValue = Math.min(100, gestureState.dy);
          scrollY.setValue(newValue);

          // Animate libraries section down with proper spacing
          const targetTranslateY =
            (newValue * (SEARCH_BAR_HEIGHT + SEARCH_SPACING)) / 100;
          librariesTranslateY.setValue(targetTranslateY);

          // Animate carousel up and fade out
          const carouselYValue = -Math.min(150, newValue * 1.5);
          carouselTranslateY.setValue(carouselYValue);
          carouselOpacity.setValue(Math.max(0, 1 - newValue / 50));
        } else if (gestureState.dy < 0 && isSearchCurrentlyVisible) {
          // Allow upward swipes to hide search
          const newValue = Math.max(0, 100 + gestureState.dy);
          scrollY.setValue(newValue);

          // Animate libraries section back up with proper spacing
          const maxTranslateY = SEARCH_BAR_HEIGHT + SEARCH_SPACING;
          const currentProgress = (100 - newValue) / 100;
          librariesTranslateY.setValue(maxTranslateY * currentProgress);

          // Animate carousel back down and fade in
          const carouselProgress = (newValue - 100) / -100; // 0 to 1
          const carouselYValue = -150 * (1 - carouselProgress);
          carouselTranslateY.setValue(carouselYValue);
          carouselOpacity.setValue(carouselProgress);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isReady) return;

        // Usar la referencia para el estado más actualizado
        const isSearchCurrentlyVisible = searchVisibleRef.current;

        // If swiped down enough, show search
        if (gestureState.dy > 30 && !isSearchCurrentlyVisible) {
          animateSearch(true);
        }
        // If swiped up enough, hide search
        else if (gestureState.dy < -30 && isSearchCurrentlyVisible) {
          animateSearch(false);
        }
        // Otherwise, return to original position
        else {
          Animated.parallel([
            Animated.spring(scrollY, {
              toValue: isSearchCurrentlyVisible ? 100 : 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.spring(librariesTranslateY, {
              toValue: isSearchCurrentlyVisible
                ? SEARCH_BAR_HEIGHT + SEARCH_SPACING
                : 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.spring(carouselTranslateY, {
              toValue: isSearchCurrentlyVisible ? -150 : 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.spring(carouselOpacity, {
              toValue: isSearchCurrentlyVisible ? 0 : 1,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
          ]).start(() => {
            if (!componentMounted.current) return;
            // Forzar actualización en Android después de regresar a posición
            if (!isSearchCurrentlyVisible) {
              setTimeout(() => {
                if (!componentMounted.current) return;
                setCarouselInteractive(true);
                setIndicatorInteractive(true);
              }, 50);
            }
          });
        }
      },
    })
  ).current;

  // Function to animate search appearance/disappearance
  const animateSearch = (show: boolean) => {
    if (!isReady || !componentMounted.current) return;

    // Si hay una animación en curso, guarda la solicitud para ejecutarla después
    if (isAnimating.current) {
      pendingAnimationState.current = show;
      return;
    }

    isAnimating.current = true;

    // Para mostrar la búsqueda, primero actualizamos el estado y luego animamos
    if (show) {
      setCarouselInteractive(false);
      setIndicatorInteractive(false);
      updateSearchVisible(true); // Actualiza ambos estados

      // Luego inicia la animación
      Animated.parallel([
        Animated.spring(scrollY, {
          toValue: 100,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(librariesTranslateY, {
          toValue: SEARCH_BAR_HEIGHT + SEARCH_SPACING,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(carouselTranslateY, {
          toValue: -150,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(carouselOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!componentMounted.current) return;
        isAnimating.current = false;

        // Ejecuta animación pendiente si existe
        if (pendingAnimationState.current !== null) {
          const nextState = pendingAnimationState.current;
          pendingAnimationState.current = null;
          animateSearch(nextState);
        }
      });
    } else {
      // Para ocultar, primero animamos y luego actualizamos el estado
      Animated.parallel([
        Animated.spring(scrollY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(librariesTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(carouselTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(carouselOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!componentMounted.current) return;
        updateSearchVisible(false); // Actualiza ambos estados después de la animación

        // Reset search filters when closing search
        setSearchFilters({
          categories: [],
          tags: [],
          difficulties: [],
        });

        // Pequeño retraso para garantizar que Android reconstruya hitboxes correctamente
        setTimeout(() => {
          if (!componentMounted.current) return;
          setCarouselInteractive(true);
          setIndicatorInteractive(true);
        }, 50);

        isAnimating.current = false;

        // Ejecuta animación pendiente si existe
        if (pendingAnimationState.current !== null) {
          const nextState = pendingAnimationState.current;
          pendingAnimationState.current = null;
          animateSearch(nextState);
        }
      });
    }
  };

  // Handle search query changes
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle search filters changes
  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);

    // If filters are applied, make sure search stays visible
    if (
      filters.categories.length > 0 ||
      filters.tags.length > 0 ||
      filters.difficulties.length > 0
    ) {
      if (!searchVisibleRef.current) {
        animateSearch(true);
      }
    }
  };

  // Animation values for swipe indicator and search bar
  const indicatorOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });

  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 1, 1],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StyledView className="flex-1" {...panResponder.panHandlers}>
        {/* Background image que viene del layout padre */}

        {/* Container principal con padding para todos los componentes */}
        <StyledView className="flex-1" style={{ paddingHorizontal: 24 }}>
          {/* User Profile - always visible */}
          <StyledView style={{ zIndex: 10, marginBottom: 10, marginTop: 10 }}>
            <UserProfile
              onProfilePress={() => router.push("/(app)/profile")}
              isSearchVisible={searchVisible}
              onCloseSearch={() => animateSearch(false)}
            />
          </StyledView>

          {/* Action Buttons Carousel - animates up and out when search is visible */}
          <StyledAnimatedView
            style={{
              marginBottom: 2,
              zIndex: 10,
              transform: [{ translateY: carouselTranslateY }],
              opacity: carouselOpacity,
              pointerEvents: carouselInteractive ? "auto" : "none",
            }}
          >
            <ActionButtonsCarousel />
          </StyledAnimatedView>

          {/* Swipe Indicator / Search Bar Container */}
          <StyledView
            className="mb-4 h-12 justify-center "
            style={{ marginTop: 0 }}
          >
            {/* Search Bar Compact (Solo visible cuando la búsqueda está oculta) */}
            <StyledAnimatedView
              className="absolute left-0 right-0"
              style={{
                opacity: indicatorOpacity,
                zIndex: 5,
                alignItems: "center",
              }}
              pointerEvents={isReady && indicatorInteractive ? "auto" : "none"}
            >
              <StyledTouchableOpacity
                className="flex-row items-center justify-between px-4 py-3 rounded-lg w-full border border-white/40"
                onPress={() => {
                  animateSearch(true);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="search"
                    size={16}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <StyledText className="text-white opacity-60">
                    {t("search", "Buscar")}
                  </StyledText>
                </View>
              </StyledTouchableOpacity>
            </StyledAnimatedView>

            {/* Compact Search Bar */}
            <StyledAnimatedView
              className="absolute left-0 right-0"
              style={{
                opacity: searchOpacity,
                zIndex: 50,
                position: "absolute",
                top: -140, // Posición más cerca del UserProfile
              }}
              pointerEvents={
                isReady && searchVisibleRef.current ? "auto" : "none"
              }
            >
              <CompactSearchBar
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                onClose={() => {
                  animateSearch(false);
                }}
                onFiltersChange={handleFiltersChange}
                onSearchBarPress={() => {
                  // Esta función se llama cuando se presiona la barra de búsqueda expandida
                  // No necesita hacer nada adicional porque la barra ya está visible
                }}
              />
            </StyledAnimatedView>
          </StyledView>

          {/* Libraries Section - con márgenes negativos para extenderse */}
          <StyledAnimatedView
            className="flex-1"
            style={{
              transform: [{ translateY: librariesTranslateY }],
              marginTop: 5,
              marginHorizontal: -18, // Márgenes negativos para compensar el padding del padre
              paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING + insets.bottom,
              zIndex: 1,
            }}
          >
            <LibrariesSection
              searchQuery={searchQuery}
              searchFilters={searchFilters}
            />
          </StyledAnimatedView>
        </StyledView>
      </StyledView>
    </SafeAreaView>
  );
}
