"use client";

import { useRouter } from "expo-router";
import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  Share,
} from "react-native";
import { useFavorites } from "../hooks/useFavorites";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopNavigationBar from "./trick-viewer/TopNavigationBar";
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection";
import type { StageType } from "./trick-viewer/StageInfoSection";
import { supabase } from "../lib/supabase";
import { fontNames } from "../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledFlatList = styled(FlatList);

const { width, height } = Dimensions.get("window");

interface TrickViewScreenProps {
  trick: {
    id: string;
    title: string;
    category: string;
    effect: string;
    secret: string;
    effect_video_url: string;
    secret_video_url: string;
    photo_url: string | null;
    script: string | null;
    angles: string[];
    duration: number | null;
    reset: number | null;
    difficulty: number | null;
    notes?: string;
    tagIds?: string[]; // Cambio: IDs en lugar de objetos Tag
    photos?: string[];
    user_id?: string;
  };
  userId?: string; // Nuevo: para pasar al TrickViewerBottomSection
  onClose?: () => void;
}

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({
  trick,
  userId,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<StageType>("effect");
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEffectPlaying, setIsEffectPlaying] = useState(true);
  const [isSecretPlaying, setIsSecretPlaying] = useState(true);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Hook de favoritos
  const { isFavorite, toggleFavorite } = useFavorites(trick.id, "magic");

  // Estados para videos
  const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null);
  const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Estados para fotos
  const [decryptedPhotos, setDecryptedPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [photoLoadError, setPhotoLoadError] = useState<string | null>(null);

  // Función helper para construir URL pública desde un path
  const getPublicUrl = (path: string, bucket: string = "magic_trick_media") => {
    if (!path) return null;

    // Si ya es una URL completa, devolverla
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // Si es un path relativo, construir la URL completa
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  // Referencias para los videos
  const effectPlayer = useVideoPlayer(effectVideoUrl || "", (player) => {
    player.loop = true;
    if (currentSection === "effect" && isEffectPlaying) {
      player.play();
    }
  });

  const secretPlayer = useVideoPlayer(secretVideoUrl || "", (player) => {
    player.loop = true;
    if (currentSection === "secret" && isSecretPlaying) {
      player.play();
    }
  });

  // Usar las fotos proporcionadas o crear un array con la foto principal si existe
  const photos = useMemo(
    () => trick.photos || (trick.photo_url ? [trick.photo_url] : []),
    [trick.photos, trick.photo_url]
  );

  // Usar tagIds del trick o array vacío
  const tagIds = useMemo(() => trick.tagIds || [], [trick.tagIds]);

  // Función para cerrar
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/(app)/home");
    }
  };

  // useEffect para cargar videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        console.log("\n🎬 INICIANDO CARGA DE VIDEOS");
        console.log("- Trick ID:", trick.id);
        console.log("- Effect Video URL:", trick.effect_video_url);
        console.log("- Secret Video URL:", trick.secret_video_url);

        setIsLoadingVideos(true);
        setVideoLoadError(null);

        // Usar URLs directamente
        const effectUrl = getPublicUrl(trick.effect_video_url);
        const secretUrl = getPublicUrl(trick.secret_video_url);

        console.log("\n📊 URLS FINALES:");
        console.log("- Effect Video:", effectUrl);
        console.log("- Secret Video:", secretUrl);

        setEffectVideoUrl(effectUrl);
        setSecretVideoUrl(secretUrl);
      } catch (error) {
        console.error("❌ Error general cargando videos:", error);
        setVideoLoadError(
          error instanceof Error ? error.message : "Error desconocido"
        );
      } finally {
        setIsLoadingVideos(false);
      }
    };

    loadVideos();
  }, [trick.id, trick.effect_video_url, trick.secret_video_url]);

  // useEffect para cargar fotos
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        console.log("📸 Iniciando carga de fotos...");
        console.log("📸 trick.photos:", trick.photos);
        console.log("📸 trick.photo_url:", trick.photo_url);

        setIsLoadingPhotos(true);
        setPhotoLoadError(null);

        // Convertir las URLs a URLs públicas si es necesario
        const publicPhotos = photos.map(
          (photo) => getPublicUrl(photo) || photo
        );

        setDecryptedPhotos(publicPhotos);
      } catch (error) {
        console.error("❌ Error general cargando fotos:", error);
        setPhotoLoadError(
          error instanceof Error ? error.message : "Error desconocido"
        );
        // En caso de error, usar las fotos originales
        const publicPhotos = photos.map(
          (photo) => getPublicUrl(photo) || photo
        );
        setDecryptedPhotos(publicPhotos);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    loadPhotos();
  }, [trick.id, photos]);

  // Pausar/reproducir videos según la sección actual
  useEffect(() => {
    if (currentSection === "effect") {
      if (effectPlayer && isEffectPlaying) {
        effectPlayer.play();
      }
      if (secretPlayer) {
        secretPlayer.pause();
      }
    } else if (currentSection === "secret") {
      if (secretPlayer && isSecretPlaying) {
        secretPlayer.play();
      }
      if (effectPlayer) {
        effectPlayer.pause();
      }
    } else {
      if (effectPlayer) effectPlayer.pause();
      if (secretPlayer) secretPlayer.pause();
    }
  }, [
    currentSection,
    isEffectPlaying,
    isSecretPlaying,
    effectPlayer,
    secretPlayer,
  ]);

  // Función para manejar el cambio de sección al deslizar
  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const sectionIndex = Math.floor(offsetY / height + 0.5);

      if (sectionIndex === 0 && currentSection !== "effect") {
        setCurrentSection("effect");
      } else if (sectionIndex === 1 && currentSection !== "secret") {
        setCurrentSection("secret");
      } else if (sectionIndex === 2 && currentSection !== "extra") {
        setCurrentSection("extra");
      }
    },
    [currentSection]
  );

  // Función para navegar a una sección específica
  const navigateToSection = (section: StageType) => {
    const sectionIndex =
      section === "effect" ? 0 : section === "secret" ? 1 : 2;
    scrollViewRef.current?.scrollTo({
      y: sectionIndex * height,
      animated: true,
    });
    setCurrentSection(section);
  };

  // Alternar reproducción de video
  const togglePlayPause = (type: "effect" | "secret") => {
    if (type === "effect") {
      setIsEffectPlaying(!isEffectPlaying);
    } else {
      setIsSecretPlaying(!isSecretPlaying);
    }
  };

  // Manejar el botón de like/favorito
  const handleLikePress = async () => {
    await toggleFavorite();
  };

  // Manejar el botón de editar
  const handleEditPress = () => {
    router.push({
      pathname: "/(app)/edit-trick",
      params: { trickId: trick.id },
    });
  };

  // Manejar el botón de compartir
  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `${t("checkOutThisTrick", "¡Mira este truco!")}: ${
          trick.title
        }\n\n${trick.effect}`,
        title: trick.title,
      });
    } catch (error) {
      console.error("Error compartiendo:", error);
    }
  };

  // Estado local para tags
  const [localTagIds, setLocalTagIds] = useState(() => tagIds);

  // Actualizar estado local cuando cambian las props
  useEffect(() => {
    // Only update if the arrays are actually different
    const tagIdsString = (tagIds || []).sort().join(",");
    const localTagIdsString = (localTagIds || []).sort().join(",");
    if (tagIdsString !== localTagIdsString) {
      setLocalTagIds(tagIds);
    }
  }, [tagIds]);

  // Manejar la eliminación de etiquetas
  const handleRemoveTag = async (tagId: string) => {
    try {
      // Actualizar estado local inmediatamente
      const updatedTagIds = localTagIds.filter((id) => id !== tagId);
      setLocalTagIds(updatedTagIds);

      // Actualizar en la base de datos
      const { error } = await supabase
        .from("magic_tricks")
        .update({ tags: updatedTagIds })
        .eq("id", trick.id);

      if (error) {
        console.error("Error removing tag:", error);
        // Revertir cambio local si falla
        setLocalTagIds(localTagIds);
        return;
      }

      console.log("Tag removed successfully");
    } catch (error) {
      console.error("Error removing tag:", error);
      // Revertir cambio local si falla
      setLocalTagIds(localTagIds);
    }
  };

  // Renderizar video
  const renderVideo = (
    url: string | null,
    isPlaying: boolean,
    isLoading: boolean,
    type: "effect" | "secret"
  ) => {
    // Seleccionar el player correcto
    const player = type === "effect" ? effectPlayer : secretPlayer;

    if (isLoading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <ActivityIndicator size="large" color="white" />
          <Text
            style={{
              color: "white",
              fontSize: 18,
              marginTop: 16,
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("loadingVideo", "Cargando video...")}
          </Text>
        </View>
      );
    }

    if (videoLoadError && !url) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <Ionicons name="alert-circle-outline" size={50} color="white" />
          <Text
            style={{
              color: "white",
              fontSize: 18,
              marginTop: 16,
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("videoLoadError", "Error al cargar el video")}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              marginTop: 8,
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {videoLoadError}
          </Text>
        </View>
      );
    }

    if (!url) {
      if (decryptedPhotos.length > 0) {
        return (
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: decryptedPhotos[0] }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("noVideoButPhoto", "Sin video - Ver fotos abajo")}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("noVideoAvailable", "No video available")}
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <VideoView
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          player={player}
          contentFit="cover"
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
        />

        {/* Control de play/pause */}
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => {
            if (player) {
              if (isPlaying) {
                player.pause();
              } else {
                player.play();
              }
            }
            togglePlayPause(type);
          }}
        >
          {!isPlaying && (
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: 50,
                padding: 20,
              }}
            >
              <Ionicons name="play" color="white" size={50} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Renderizar galería de fotos con scroll horizontal
  const renderPhotoGallery = () => {
    if (isLoadingPhotos) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <ActivityIndicator size="large" color="white" />
          <StyledText
            className="text-white text-lg mt-4"
            style={{
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("loadingPhotos", "Cargando fotos...")}
          </StyledText>
        </StyledView>
      );
    }

    if (photoLoadError) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <Ionicons name="alert-circle-outline" size={50} color="white" />
          <StyledText
            className="text-white text-lg mt-4"
            style={{
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("photoLoadError", "Error al cargar las fotos")}
          </StyledText>
          <StyledText
            className="text-white/70 text-sm mt-2"
            style={{
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {photoLoadError}
          </StyledText>
        </StyledView>
      );
    }

    const photosToDisplay =
      decryptedPhotos.length > 0 ? decryptedPhotos : photos;

    if (photosToDisplay.length === 0) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <StyledText
            className="text-white text-xl"
            style={{
              fontFamily: fontNames.light,
              includeFontPadding: false,
            }}
          >
            {t("noPhotosAvailable", "No photos available")}
          </StyledText>
        </StyledView>
      );
    }

    return (
      <StyledView className="flex-1">
        <StyledFlatList
          data={photosToDisplay}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `photo-${index}`}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentPhotoIndex(index);
          }}
          renderItem={({ item }) => {
            // Validar que el URI sea válido
            if (!item || typeof item !== "string" || item.length < 10) {
              console.error("❌ URI de foto inválido:", item);
              return (
                <View
                  style={{
                    width,
                    height,
                    backgroundColor: "#333",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontFamily: fontNames.light,
                      includeFontPadding: false,
                    }}
                  >
                    Error loading image
                  </Text>
                </View>
              );
            }

            return (
              <Image
                source={{ uri: item }}
                style={{ width, height }}
                resizeMode="contain"
                onError={(e) => {
                  console.error(
                    "❌ Error cargando imagen:",
                    e.nativeEvent.error
                  );
                }}
                onLoad={() => {
                  console.log("✅ Imagen cargada correctamente");
                }}
              />
            );
          }}
        />

        {photosToDisplay.length > 1 && (
          <StyledView className="absolute bottom-20 left-0 right-0 flex-row justify-center">
            {photosToDisplay.map((_, index) => (
              <StyledView
                key={`dot-${index}`}
                className={`w-2 h-2 mx-1 rounded-full ${
                  index === currentPhotoIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </StyledView>
        )}
      </StyledView>
    );
  };

  // Obtener la descripción según la sección actual
  const getCurrentDescription = () => {
    switch (currentSection) {
      case "effect":
        return trick.effect;
      case "secret":
        return trick.secret;
      case "extra":
        return trick.notes;
      default:
        return "";
    }
  };

  return (
    <StyledView className="flex-1 bg-black">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

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
        contentInsetAdjustmentBehavior="never"
      >
        {/* Sección de Efecto */}
        <View style={{ width, height, backgroundColor: "black" }}>
          {renderVideo(
            effectVideoUrl,
            isEffectPlaying,
            isLoadingVideos,
            "effect"
          )}
        </View>

        {/* Sección de Secreto */}
        <View style={{ width, height, backgroundColor: "black" }}>
          {renderVideo(
            secretVideoUrl,
            isSecretPlaying,
            isLoadingVideos,
            "secret"
          )}
        </View>

        {/* Sección de Fotos/Detalles */}
        <StyledView style={{ width, height }}>
          <StyledView className="flex-1 bg-black">
            {renderPhotoGallery()}
          </StyledView>
        </StyledView>
      </StyledScrollView>

      {/* Barra de navegación superior */}
      <StyledView
        style={{
          position: "absolute",
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: insets.left,
        }}
      >
        <TopNavigationBar
          title={trick.title}
          onBackPress={handleClose}
          onLikePress={handleLikePress}
          onEditPress={handleEditPress}
          isLiked={isFavorite}
        />
      </StyledView>

      {/* Sección inferior */}
      <StyledView
        style={{
          position: "absolute",
          bottom: insets.bottom,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: insets.left,
        }}
      >
        <TrickViewerBottomSection
          tagIds={localTagIds}
          userId={userId}
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
  );
};

export default TrickViewScreen;
