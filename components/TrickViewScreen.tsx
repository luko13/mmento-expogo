"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
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
  ActivityIndicator,
} from "react-native"
import { useVideoPlayer, VideoView } from 'expo-video'
import { Ionicons } from "@expo/vector-icons"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import TopNavigationBar from "./trick-viewer/TopNavigationBar"
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection"
import type { Tag } from "./trick-viewer/TagPillsSection"
import type { StageType } from "./trick-viewer/StageInfoSection"
import { EncryptedContentService } from "../services/encryptedContentService"
import { useEncryption } from "../hooks/useEncryption"
import { FileEncryptionService } from "../utils/fileEncryption"
import { supabase } from "../lib/supabase"
import * as FileSystem from "expo-file-system"

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
    is_encrypted?: boolean
    user_id?: string
  }
  onClose: () => void
}

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({ trick, onClose }) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [currentSection, setCurrentSection] = useState<StageType>("effect")
  const scrollViewRef = useRef<ScrollView>(null)
  const [isEffectPlaying, setIsEffectPlaying] = useState(true)
  const [isSecretPlaying, setIsSecretPlaying] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [overlayOpacity] = useState(new Animated.Value(0))
  
  // Estados para videos descifrados
  const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null)
  const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null)
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null)
  
  // Hooks de cifrado
  const { decryptForSelf, getPublicKey, keyPair } = useEncryption()
  const encryptedContentService = new EncryptedContentService()
  const fileEncryption = new FileEncryptionService()

  // Ref para evitar cargas múltiples
  const videosLoadedRef = useRef(false)

  // Crear video players con las URLs descifradas
  const effectVideoPlayer = useVideoPlayer(effectVideoUrl || '', (player) => {
    if (effectVideoUrl) {
      player.loop = true
      player.play()
    }
  })
  
  const secretVideoPlayer = useVideoPlayer(secretVideoUrl || '', (player) => {
    if (secretVideoUrl) {
      player.loop = true
      player.play()
    }
  })

  // Usar las fotos proporcionadas o crear un array con la foto principal si existe
  const photos = trick.photos || (trick.photo_url ? [trick.photo_url] : [])

  // Crear tags de ejemplo si no existen
  const tags = trick.tags || [
    { id: "1", name: "Card Magic" },
    { id: "2", name: "Sleight of Hand" },
    { id: "3", name: "Beginner" },
  ]

  // Cargar y descifrar videos si es necesario
  useEffect(() => {
    const loadVideos = async () => {
      try {
        // Evitar cargas múltiples
        if (videosLoadedRef.current) {
          return
        }
        console.log("📦 Trick data:", {
          id: trick.id,
          is_encrypted: trick.is_encrypted,
          effect_video_url: trick.effect_video_url,
          secret_video_url: trick.secret_video_url,
          user_id: trick.user_id
        })
        
        setIsLoadingVideos(true)
        setVideoLoadError(null)
  
        // Si no está cifrado, usar URLs directamente
        if (!trick.is_encrypted) {
          setEffectVideoUrl(trick.effect_video_url)
          setSecretVideoUrl(trick.secret_video_url)
          videosLoadedRef.current = true
          setIsLoadingVideos(false)
          return
        }
        // Verificar que tengamos las claves necesarias
        if (!keyPair) {
          // Importante: no cambiar isLoadingVideos aquí para mantener el estado de carga
          return
        }
  
        console.log("🔑 Claves disponibles:", {
          hasPublicKey: !!keyPair.publicKey,
          hasPrivateKey: !!keyPair.privateKey
        })
  
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("Usuario no autenticado")
        }
        // Obtener contenido descifrado
        const decryptedContent = await encryptedContentService.getContent(
          trick.id,
          'magic_tricks',
          user.id,
          decryptForSelf,
          () => keyPair.privateKey
        )
  
        console.log("📄 Contenido descifrado:", {
          hasContent: !!decryptedContent,
          effect_video_url: decryptedContent?.effect_video_url,
          secret_video_url: decryptedContent?.secret_video_url,
          effect_video_encrypted: decryptedContent?.effect_video_encrypted,
          secret_video_encrypted: decryptedContent?.secret_video_encrypted,
          is_encrypted: decryptedContent?.is_encrypted
        })
  
        if (!decryptedContent) {
          throw new Error("No se pudo obtener el contenido")
        }
  
        // Variables para almacenar las URLs finales
        let finalEffectUrl = null
        let finalSecretUrl = null
  
        // Procesar video de efecto
        if (decryptedContent.effect_video_url) {
          // Si el video está marcado como cifrado o la URL empieza con 'encrypted_'
          if (decryptedContent.effect_video_encrypted || decryptedContent.effect_video_url.startsWith('encrypted_')) {
            try {
              const decryptedVideo = await fileEncryption.downloadAndDecryptFile(
                decryptedContent.effect_video_url,
                user.id,
                getPublicKey,
                () => keyPair.privateKey
              )
              // Crear URL temporal para el video descifrado
              const tempUri = `${FileSystem.cacheDirectory}effect_${Date.now()}.mp4`
              
              // Convertir Uint8Array a base64 sin stack overflow
              let binaryString = ''
              const chunkSize = 8192 // Procesar en chunks para evitar stack overflow
              for (let i = 0; i < decryptedVideo.data.length; i += chunkSize) {
                const chunk = decryptedVideo.data.slice(i, i + chunkSize)
                binaryString += String.fromCharCode.apply(null, Array.from(chunk))
              }
              const base64Data = btoa(binaryString)
              
              await FileSystem.writeAsStringAsync(
                tempUri,
                base64Data,
                { encoding: FileSystem.EncodingType.Base64 }
              )
              finalEffectUrl = tempUri
            } catch (error) {
              console.error("❌ Error descargando video de efecto:", error)
              // Si es un ID de archivo, construir URL pública como fallback
              const { data: publicURL } = supabase.storage
                .from('magic_trick_media')
                .getPublicUrl(decryptedContent.effect_video_url)
              finalEffectUrl = publicURL.publicUrl
            }
          } else {
            // Video no cifrado
            if (!decryptedContent.effect_video_url.startsWith('http')) {
              const { data: publicURL } = supabase.storage
                .from('magic_trick_media')
                .getPublicUrl(decryptedContent.effect_video_url)
              finalEffectUrl = publicURL.publicUrl
            } else {
              finalEffectUrl = decryptedContent.effect_video_url
            }
          }
        }
  
        // Procesar video secreto
        if (decryptedContent.secret_video_url) {
          if (decryptedContent.secret_video_encrypted || decryptedContent.secret_video_url.startsWith('encrypted_')) {
            try {
              const decryptedVideo = await fileEncryption.downloadAndDecryptFile(
                decryptedContent.secret_video_url,
                user.id,
                getPublicKey,
                () => keyPair.privateKey
              )
              const tempUri = `${FileSystem.cacheDirectory}secret_${Date.now()}.mp4`
              
              // Convertir Uint8Array a base64 sin stack overflow
              let binaryString = ''
              const chunkSize = 8192
              for (let i = 0; i < decryptedVideo.data.length; i += chunkSize) {
                const chunk = decryptedVideo.data.slice(i, i + chunkSize)
                binaryString += String.fromCharCode.apply(null, Array.from(chunk))
              }
              const base64Data = btoa(binaryString)
              
              await FileSystem.writeAsStringAsync(
                tempUri,
                base64Data,
                { encoding: FileSystem.EncodingType.Base64 }
              )
              finalSecretUrl = tempUri
            } catch (error) {
              console.error("❌ Error descargando video secreto:", error)
              const { data: publicURL } = supabase.storage
                .from('magic_trick_media')
                .getPublicUrl(decryptedContent.secret_video_url)
              finalSecretUrl = publicURL.publicUrl
            }
          } else {
            if (!decryptedContent.secret_video_url.startsWith('http')) {
              const { data: publicURL } = supabase.storage
                .from('magic_trick_media')
                .getPublicUrl(decryptedContent.secret_video_url)
              finalSecretUrl = publicURL.publicUrl
            } else {
              finalSecretUrl = decryptedContent.secret_video_url
            }
          }
        }
  
        // IMPORTANTE: Actualizar las URLs de estado
        console.log("🎬 URLs finales:", {
          effectVideoUrl: finalEffectUrl,
          secretVideoUrl: finalSecretUrl
        })
        
        setEffectVideoUrl(finalEffectUrl)
        setSecretVideoUrl(finalSecretUrl)
        videosLoadedRef.current = true
  
      } catch (error) {
        console.error("❌ Error general cargando videos:", error)
        setVideoLoadError(error instanceof Error ? error.message : "Error desconocido")
      } finally {
        setIsLoadingVideos(false)
      }
    }
  
    loadVideos()
    
    // Limpiar la referencia cuando se desmonta el componente
    return () => {
      videosLoadedRef.current = false
    }
  }, [trick.id, !!keyPair]) // Solo dependemos del ID del truco y la existencia de keyPair
  
  // También actualiza los video players cuando las URLs cambien
  useEffect(() => {
    if (effectVideoUrl && effectVideoPlayer) {
      effectVideoPlayer.replaceAsync({ uri: effectVideoUrl })
      effectVideoPlayer.loop = true
      if (currentSection === "effect") {
        effectVideoPlayer.play()
      }
    }
  }, [effectVideoUrl, effectVideoPlayer])
  
  useEffect(() => {
    if (secretVideoUrl && secretVideoPlayer) {
      secretVideoPlayer.replaceAsync({ uri: secretVideoUrl })
      secretVideoPlayer.loop = true
      if (currentSection === "secret") {
        secretVideoPlayer.play()
      }
    }
  }, [secretVideoUrl, secretVideoPlayer])

  // Pausar/reproducir videos según la sección actual
  useEffect(() => {
    if (currentSection === "effect") {
      effectVideoPlayer?.play()
      secretVideoPlayer?.pause()
    } else if (currentSection === "secret") {
      secretVideoPlayer?.play()
      effectVideoPlayer?.pause()
    } else {
      // En la sección extra, pausar ambos
      effectVideoPlayer?.pause()
      secretVideoPlayer?.pause()
    }
  }, [currentSection, effectVideoPlayer, secretVideoPlayer])

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
    if (currentSection === "effect" && effectVideoPlayer) {
      if (effectVideoPlayer.playing) {
        effectVideoPlayer.pause()
        setIsEffectPlaying(false)
      } else {
        effectVideoPlayer.play()
        setIsEffectPlaying(true)
      }
    } else if (currentSection === "secret" && secretVideoPlayer) {
      if (secretVideoPlayer.playing) {
        secretVideoPlayer.pause()
        setIsSecretPlaying(false)
      } else {
        secretVideoPlayer.play()
        setIsSecretPlaying(true)
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
  }

  // Manejar la eliminación de etiquetas
  const handleRemoveTag = (tagId: string) => {
    // Aquí implementarías la lógica para eliminar la etiqueta
  }

  // Renderizar video con controles
  const renderVideo = (url: string | null, player: any, isPlaying: boolean, isLoading: boolean) => {
    if (isLoading) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <ActivityIndicator size="large" color="white" />
          <StyledText className="text-white text-lg mt-4">
            {trick.is_encrypted ? t("decryptingVideo", "Descifrando video...") : t("loadingVideo", "Cargando video...")}
          </StyledText>
        </StyledView>
      )
    }

    if (videoLoadError) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <Ionicons name="alert-circle-outline" size={50} color="white" />
          <StyledText className="text-white text-lg mt-4">{t("videoLoadError", "Error al cargar el video")}</StyledText>
          <StyledText className="text-white/70 text-sm mt-2">{videoLoadError}</StyledText>
        </StyledView>
      )
    }

    if (!url) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <StyledText className="text-white text-xl">{t("noVideoAvailable", "No video available")}</StyledText>
        </StyledView>
      )
    }
    return (
      <StyledView className="absolute top-0 left-0 right-0 bottom-0">
        <VideoView
          player={player}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          nativeControls={false}
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
        <StyledView style={{ width, height }}>
          {renderVideo(effectVideoUrl, effectVideoPlayer, isEffectPlaying, isLoadingVideos)}
        </StyledView>

        {/* Sección de Secreto - Video ocupa toda la pantalla */}
        <StyledView style={{ width, height }}>
          {renderVideo(secretVideoUrl, secretVideoPlayer, isSecretPlaying, isLoadingVideos)}
        </StyledView>

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