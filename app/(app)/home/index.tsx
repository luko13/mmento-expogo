"use client"
import { useRef, useState, useEffect } from "react"
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
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { useRouter } from "expo-router"
// Cambiar la importación de Search de lucide-react-native
// Reemplazar:
// import { Search } from "lucide-react-native"
// Por:
import { Ionicons } from "@expo/vector-icons"
import UserProfile from "../../../components/home/UserProfile"
import ActionButtonsCarousel from "../../../components/home/ActionButtonsCarousel"
import LibrariesSection from "../../../components/home/LibrariesSection"
import CompactSearchBar, { type SearchFilters } from "../../../components/home/CompactSearchBar"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledAnimatedView = styled(Animated.View)

const { width, height } = Dimensions.get("window")

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 60
const BOTTOM_SPACING = Platform.OS === "ios" ? 20 : 10
const AUTO_HIDE_DELAY = 10000 // 10 segundos
const SEARCH_BAR_HEIGHT = 260 // Estimated height to avoid overlap

export default function Home() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const searchVisibleRef = useRef(false) // Referencia para el estado real
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    categories: [],
    tags: [],
    difficulties: [],
  })
  const [carouselInteractive, setCarouselInteractive] = useState(true)
  const [indicatorInteractive, setIndicatorInteractive] = useState(true)
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isAnimating = useRef(false)
  const pendingAnimationState = useRef<boolean | null>(null)
  const componentMounted = useRef(true)
  const appState = useRef(AppState.currentState)

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current
  const librariesTranslateY = useRef(new Animated.Value(0)).current
  const carouselTranslateY = useRef(new Animated.Value(0)).current
  const carouselOpacity = useRef(new Animated.Value(1)).current

  // Actualizar ambos estados a la vez
  const updateSearchVisible = (value: boolean) => {
    if (!componentMounted.current) return
    searchVisibleRef.current = value
    setSearchVisible(value)
  }

  // Configuración inicial y forzar valores de animación
  useEffect(() => {
    componentMounted.current = true

    // Asegurar que las animaciones tengan valores iniciales correctos
    scrollY.setValue(0)
    librariesTranslateY.setValue(0)
    carouselTranslateY.setValue(0)
    carouselOpacity.setValue(1)

    // Monitorear cambios en el estado de la aplicación
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // Reiniciar los valores de animación cuando la app vuelve al primer plano
        if (!searchVisibleRef.current) {
          scrollY.setValue(0)
          librariesTranslateY.setValue(0)
          carouselTranslateY.setValue(0)
          carouselOpacity.setValue(1)
        } else {
          scrollY.setValue(100)
          librariesTranslateY.setValue(90)
          carouselTranslateY.setValue(-150)
          carouselOpacity.setValue(0)
        }
      }
      appState.current = nextAppState
    })

    // Breve retraso para garantizar la inicialización completa
    const timer = setTimeout(() => {
      if (!componentMounted.current) return
      setIsReady(true)
    }, 150)

    // Limpieza al desmontar
    return () => {
      componentMounted.current = false
      clearTimeout(timer)
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
      subscription.remove()
    }
  }, [])

  // Reset auto-hide timer when search is visible or query changes
  useEffect(() => {
    if (searchVisible) {
      resetAutoHideTimer()
    }
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current)
      }
    }
  }, [searchVisible, searchQuery, searchFilters])

  // Function to reset the auto-hide timer
  const resetAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current)
    }

    autoHideTimerRef.current = setTimeout(() => {
      // Usar la referencia para estado más actual
      if (
        searchVisibleRef.current &&
        !searchQuery &&
        searchFilters.categories.length === 0 &&
        searchFilters.tags.length === 0 &&
        searchFilters.difficulties.length === 0
      ) {
        animateSearch(false)
      }
    }, AUTO_HIDE_DELAY)
  }

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!isReady) return false
        const shouldRespond = Math.abs(gestureState.dy) > 10
        return shouldRespond
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isReady) return

        // Usar la referencia para el estado más actualizado
        const isSearchCurrentlyVisible = searchVisibleRef.current

        // Swipe down shows search, swipe up hides it
        if (gestureState.dy > 0 && !isSearchCurrentlyVisible) {
          // Map gesture movement to animation value (0-100)
          const newValue = Math.min(100, gestureState.dy)
          scrollY.setValue(newValue)

          // Animate libraries section down
          librariesTranslateY.setValue((newValue * 90) / 100)

          // Animate carousel up and fade out
          const carouselYValue = -Math.min(150, newValue * 1.5)
          carouselTranslateY.setValue(carouselYValue)
          carouselOpacity.setValue(Math.max(0, 1 - newValue / 50))
        } else if (gestureState.dy < 0 && isSearchCurrentlyVisible) {
          // Allow upward swipes to hide search
          const newValue = Math.max(0, 100 + gestureState.dy)
          scrollY.setValue(newValue)

          // Animate libraries section back up
          librariesTranslateY.setValue(90 - (90 * (100 - newValue)) / 100)

          // Animate carousel back down and fade in
          const carouselProgress = (newValue - 100) / -100 // 0 to 1
          const carouselYValue = -150 * (1 - carouselProgress)
          carouselTranslateY.setValue(carouselYValue)
          carouselOpacity.setValue(carouselProgress)
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isReady) return

        // Usar la referencia para el estado más actualizado
        const isSearchCurrentlyVisible = searchVisibleRef.current

        // If swiped down enough, show search
        if (gestureState.dy > 30 && !isSearchCurrentlyVisible) {
          animateSearch(true)
        }
        // If swiped up enough, hide search
        else if (gestureState.dy < -30 && isSearchCurrentlyVisible) {
          animateSearch(false)
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
              toValue: isSearchCurrentlyVisible ? 90 : 0,
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
            if (!componentMounted.current) return
            // Forzar actualización en Android después de regresar a posición
            if (!isSearchCurrentlyVisible) {
              setTimeout(() => {
                if (!componentMounted.current) return
                setCarouselInteractive(true)
                setIndicatorInteractive(true)
              }, 50)
            }
          })
        }
      },
    }),
  ).current

  // Function to animate search appearance/disappearance
  const animateSearch = (show: boolean) => {
    if (!isReady || !componentMounted.current) return

    // Si hay una animación en curso, guarda la solicitud para ejecutarla después
    if (isAnimating.current) {
      pendingAnimationState.current = show
      return
    }

    isAnimating.current = true

    // Para mostrar la búsqueda, primero actualizamos el estado y luego animamos
    if (show) {
      setCarouselInteractive(false)
      setIndicatorInteractive(false)
      updateSearchVisible(true) // Actualiza ambos estados

      // Luego inicia la animación
      Animated.parallel([
        Animated.spring(scrollY, {
          toValue: 100,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(librariesTranslateY, {
          toValue: 90,
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
        if (!componentMounted.current) return
        resetAutoHideTimer()
        isAnimating.current = false

        // Ejecuta animación pendiente si existe
        if (pendingAnimationState.current !== null) {
          const nextState = pendingAnimationState.current
          pendingAnimationState.current = null
          animateSearch(nextState)
        }
      })
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
        if (!componentMounted.current) return
        updateSearchVisible(false) // Actualiza ambos estados después de la animación

        // Reset search filters when closing search
        setSearchFilters({
          categories: [],
          tags: [],
          difficulties: [],
        })

        // Pequeño retraso para garantizar que Android reconstruya hitboxes correctamente
        setTimeout(() => {
          if (!componentMounted.current) return
          setCarouselInteractive(true)
          setIndicatorInteractive(true)
        }, 50)

        isAnimating.current = false

        // Ejecuta animación pendiente si existe
        if (pendingAnimationState.current !== null) {
          const nextState = pendingAnimationState.current
          pendingAnimationState.current = null
          animateSearch(nextState)
        }
      })
    }
  }

  // Handle search query changes
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query)
    resetAutoHideTimer()
  }

  // Handle search filters changes
  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters)
    resetAutoHideTimer()

    // If filters are applied, make sure search stays visible
    if (filters.categories.length > 0 || filters.tags.length > 0 || filters.difficulties.length > 0) {
      if (!searchVisibleRef.current) {
        animateSearch(true)
      }
    }
  }

  // Animation values for swipe indicator and search bar
  const indicatorOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  })

  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 1, 1],
    extrapolate: "clamp",
  })

  return (
    <StyledView className="flex-1" {...panResponder.panHandlers}>
      <Image
        source={require("../../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />

      <StyledView className="flex-1 p-6">
        {/* User Profile - always visible */}
        <StyledView style={{ zIndex: 10, marginBottom: 10 }}>
          <UserProfile onProfilePress={() => router.push("/(app)/profile")} />
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
        <StyledView className="mb-4 h-12 justify-center" style={{ marginTop: 0 }}>
          {/* Search Bar Compact (only visible when full search is hidden) */}
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
              className="flex-row items-center justify-between bg-white/10 px-4 py-3 rounded-full w-full"
              onPress={() => {
                animateSearch(true)
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Reemplazar el uso del icono Search */}
                {/* Cambiar: */}
                {/* <Search size={16} color="white" style={{ marginRight: 8 }} /> */}
                {/* Por: */}
                <Ionicons name="search" size={16} color="white" style={{ marginRight: 8 }} />
                <StyledText className="text-white opacity-60">{t("search", "Buscar")}</StyledText>
              </View>
            </StyledTouchableOpacity>
          </StyledAnimatedView>

          {/* Compact Search Bar (replaces the indicator when visible) */}
          <StyledAnimatedView
            className="absolute left-0 right-0"
            style={{
              opacity: searchOpacity,
              zIndex: 50,
              position: "absolute",
              top: -165,
            }}
            pointerEvents={isReady && searchVisibleRef.current ? "auto" : "none"}
          >
            <CompactSearchBar
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onClose={() => {
                animateSearch(false)
              }}
              onFiltersChange={handleFiltersChange}
            />
          </StyledAnimatedView>
        </StyledView>

        {/* Libraries Section - animates down when search is visible */}
        <StyledAnimatedView
          className="flex-1"
          style={{
            transform: [{ translateY: librariesTranslateY }],
            marginTop: 5,
            paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING,
            zIndex: 1,
          }}
        >
          <LibrariesSection searchQuery={searchQuery} searchFilters={searchFilters} />
        </StyledAnimatedView>
      </StyledView>
    </StyledView>
  )
}
