"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  FlatList,
} from "react-native"
import { Video, ResizeMode } from "expo-av"
import { Ionicons } from "@expo/vector-icons"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import TopNavigationBar from "./trick-viewer/TopNavigationBar"
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection"
import type { Tag } from "./trick-viewer/TagPillsSection"
import type { StageType } from "./trick-viewer/StageInfoSection"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledScrollView = styled(ScrollView)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledFlatList = styled(FlatList)

const { width, height } = Dimensions.get("window")

interface TrickViewScreenProps {
  trick: {
    id: string
    title: string
    category: string
    effect: string
    secret: string
    effect_video_url: string | null
    secret_video_url: string | null
    photo_url: string | null
    script: string | null
    angles: string[]
    duration: number | null
    reset: number | null
    difficulty: number | null
    notes?: string
    tags?: Tag[]
    photos?: string[]
  }
  onClose: () => void
}

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({ trick, onClose }) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [currentSection, setCurrentSection] = useState<StageType>("effect")
  const scrollViewRef = useRef<ScrollView>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const effectVideoRef = useRef<Video>(null)
  const secretVideoRef = useRef<Video>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [overlayOpacity] = useState(new Animated.Value(0))

  // Usar las fotos proporcionadas o crear un array con la foto principal si existe
  const photos = trick.photos || (trick.photo_url ? [trick.photo_url] : [])

  // Crear tags de ejemplo si no existen
  const tags = trick.tags || [
    { id: "1", name: "Card Magic" },
    { id: "2", name: "Sleight of Hand" },
    { id: "3", name: "Beginner" },
  ]

  // Función para manejar el cambio de sección al deslizar
  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y
      const sectionIndex = Math.floor(offsetY / height + 0.5)

      if (sectionIndex === 0 && currentSection !== "effect") {
        setCurrentSection("effect")
      } else if (sectionIndex === 1 && currentSection !== "secret") {
        setCurrentSection("secret")
      } else if (sectionIndex === 2 && currentSection !== "extra") {
        setCurrentSection("extra")
      }
    },
    [currentSection],
  )

  // Función para navegar a una sección específica
  const navigateToSection = (section: StageType) => {
    const sectionIndex = section === "effect" ? 0 : section === "secret" ? 1 : 2
    scrollViewRef.current?.scrollTo({
      y: sectionIndex * height,
      animated: true,
    })
    setCurrentSection(section)
  }

  // Alternar reproducción de video
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (currentSection === "effect" && effectVideoRef.current) {
      if (isPlaying) {
        effectVideoRef.current.pauseAsync()
      } else {
        effectVideoRef.current.playAsync()
      }
    } else if (currentSection === "secret" && secretVideoRef.current) {
      if (isPlaying) {
        secretVideoRef.current.pauseAsync()
      } else {
        secretVideoRef.current.playAsync()
      }
    }
  }

  // Manejar el botón de like
  const handleLikePress = () => {
    setIsLiked(!isLiked)
    // Aquí podrías implementar la lógica para guardar el estado de "me gusta" en la base de datos
  }

  // Manejar el botón de editar
  const handleEditPress = () => {
    // Implementar la lógica para editar el truco
    console.log("Edit trick:", trick.id)
  }

  // Manejar la eliminación de etiquetas
  const handleRemoveTag = (tagId: string) => {
    console.log("Remove tag:", tagId)
    // Aquí implementarías la lógica para eliminar la etiqueta
  }

  // Renderizar video con controles
  const renderVideo = (url: string | null, videoRef: React.RefObject<Video | null>) => {
    if (!url) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <StyledText className="text-white text-xl">{t("noVideoAvailable", "No video available")}</StyledText>
        </StyledView>
      )
    }
    return (
      <StyledView className="absolute top-0 left-0 right-0 bottom-0">
        <Video
          ref={videoRef}
          source={{ uri: url }}
          rate={1.0}
          volume={1.0}
          isMuted={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          style={{ width: "100%", height: "100%" }}
        />

        {/* Área táctil para pausar/reproducir */}
        <StyledTouchableOpacity
          className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center"
          activeOpacity={1}
          onPress={togglePlayPause}
        >
          {/* Mostrar icono de reproducción solo cuando está pausado */}
          {!isPlaying && (
            <StyledView className="bg-black/30 rounded-full p-5">
              <Ionicons name="play" color="white" size={50} />
            </StyledView>
          )}
        </StyledTouchableOpacity>
      </StyledView>
    )
  }

  // Renderizar galería de fotos con scroll horizontal
  const renderPhotoGallery = () => {
    if (photos.length === 0) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <StyledText className="text-white text-xl">{t("noPhotosAvailable", "No photos available")}</StyledText>
        </StyledView>
      )
    }

    return (
      <StyledView className="flex-1">
        {/* Galería de fotos con scroll horizontal */}
        <StyledFlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `photo-${index}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item as string }} style={{ width, height: height * 0.7 }} resizeMode="cover" />
          )}
        />
      </StyledView>
    )
  }

  // Obtener la descripción según la sección actual
  const getCurrentDescription = () => {
    switch (currentSection) {
      case "effect":
        return trick.effect
      case "secret":
        return trick.secret
      case "extra":
        return trick.notes
      default:
        return ""
    }
  }

  return (
    <StyledView className="flex-1 bg-black">
      {/* StatusBar transparente para que los videos ocupen toda la pantalla */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ScrollView que ocupa toda la pantalla (incluyendo safe areas) */}
      <StyledScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={height}
        snapToAlignment="start"
        style={{ flex: 1 }}
        // Permitir que el contenido se extienda debajo de las safe areas
        contentInsetAdjustmentBehavior="never"
      >
        {/* Sección de Efecto - Video ocupa toda la pantalla */}
        <StyledView style={{ width, height }}>{renderVideo(trick.effect_video_url, effectVideoRef)}</StyledView>

        {/* Sección de Secreto - Video ocupa toda la pantalla */}
        <StyledView style={{ width, height }}>{renderVideo(trick.secret_video_url, secretVideoRef)}</StyledView>

        {/* Sección de Fotos/Detalles - Fotos ocupan toda la pantalla */}
        <StyledView style={{ width, height }}>{renderPhotoGallery()}</StyledView>
      </StyledScrollView>

      {/* Barra de navegación superior - Respeta las Safe Areas */}
      <StyledView
        style={{
          position: "absolute",
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: insets.left, // Respeta safe areas laterales
        }}
      >
        <TopNavigationBar
          title={trick.title}
          onBackPress={onClose}
          onLikePress={handleLikePress}
          onEditPress={handleEditPress}
          isLiked={isLiked}
        />
      </StyledView>

      {/* Sección inferior - Respeta las Safe Areas */}
      <StyledView
        style={{
          position: "absolute",
          bottom: insets.bottom,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: insets.left, // Respeta safe areas laterales
        }}
      >
        <TrickViewerBottomSection
          tags={tags}
          stage={currentSection}
          category={trick.category}
          description={getCurrentDescription()}
          angle={180}
          resetTime={trick.reset || 10}
          duration={trick.duration || 110}
          difficulty={trick.difficulty || 7}
          onRemoveTag={handleRemoveTag}
        />
      </StyledView>
    </StyledView>
  )
}

export default TrickViewScreen