"use client";

import { useRouter } from "expo-router";
import type React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
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
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopNavigationBar from "./trick-viewer/TopNavigationBar";
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection";
import type { Tag } from "./trick-viewer/TagPillsSection";
import type { StageType } from "./trick-viewer/StageInfoSection";
import { EncryptedContentService } from "../services/encryptedContentService";
import { useEncryption } from "../hooks/useEncryption";
import { FileEncryptionService } from "../utils/fileEncryption";
import { supabase } from "../lib/supabase";
import { OptimizedBase64 } from "../utils/optimizedBase64";
import * as FileSystem from "expo-file-system";

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
    tags?: Tag[];
    photos?: string[];
    is_encrypted?: boolean;
    user_id?: string;
  };
  onClose?: () => void;
}

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({
  trick,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<StageType>("effect");
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEffectPlaying, setIsEffectPlaying] = useState(true);
  const [isSecretPlaying, setIsSecretPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Estados para videos descifrados
  const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null);
  const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Estados para fotos descifradas
  const [decryptedPhotos, setDecryptedPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [photoLoadError, setPhotoLoadError] = useState<string | null>(null);

  // Hooks de cifrado
  const { decryptForSelf, getPublicKey, keyPair } = useEncryption();
  const encryptedContentService = new EncryptedContentService();
  const fileEncryption = new FileEncryptionService();

  // Ref para evitar cargas múltiples
  const videosLoadedRef = useRef(false);
  const photosLoadedRef = useRef(false);

  // Crear video players solo cuando tengamos URLs válidas
  const effectVideoPlayer = useVideoPlayer(effectVideoUrl || "", (player) => {
    if (effectVideoUrl) {
      player.loop = true;
      player.play();
    }
  });

  const secretVideoPlayer = useVideoPlayer(secretVideoUrl || "", (player) => {
    if (secretVideoUrl) {
      player.loop = true;
      player.play();
    }
  });

  // Usar las fotos proporcionadas o crear un array con la foto principal si existe
  const photos = trick.photos || (trick.photo_url ? [trick.photo_url] : []);

  // Crear tags de ejemplo si no existen
  const tags = trick.tags || [
    { id: "1", name: "Card Magic" },
    { id: "2", name: "Sleight of Hand" },
    { id: "3", name: "Beginner" },
  ];

  // Función para cerrar
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/(app)/home");
    }
  };

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

  // Función helper para retry de descargas
  const retryDownload = async (
    downloadFunction: () => Promise<any>,
    maxRetries = 3
  ): Promise<any> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await downloadFunction();
      } catch (error) {
        console.log(`Intento ${i + 1} falló:`, error);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
  };

  // useEffect para cargar videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        if (videosLoadedRef.current) {
          return;
        }

        setIsLoadingVideos(true);
        setVideoLoadError(null);

        // Si no está cifrado, usar URLs directamente
        if (!trick.is_encrypted) {
          const effectUrl = getPublicUrl(trick.effect_video_url);
          const secretUrl = getPublicUrl(trick.secret_video_url);

          setEffectVideoUrl(effectUrl);
          setSecretVideoUrl(secretUrl);
          videosLoadedRef.current = true;
          setIsLoadingVideos(false);
          return;
        }

        // Verificar que tengamos las claves necesarias
        if (!keyPair) {
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuario no autenticado");
        }

        // Obtener contenido descifrado
        const decryptedContent = await encryptedContentService.getContent(
          trick.id,
          "magic_tricks",
          user.id,
          decryptForSelf,
          () => keyPair.privateKey
        );
        console.log(
          "📋 decryptedContent:",
          JSON.stringify(decryptedContent, null, 2)
        );
        if (!decryptedContent) {
          throw new Error("No se pudo obtener el contenido");
        }

        // Variables para almacenar las URLs finales
        let finalEffectUrl = null;
        let finalSecretUrl = null;

        // Procesar video de efecto
        if (decryptedContent.effect_video_url) {
          if (
            decryptedContent.effect_video_encrypted ||
            decryptedContent.effect_video_url.startsWith("encrypted_")
          ) {
            try {
              console.log("🔓 Descifrando video de efecto...");
              const decryptedVideo = await retryDownload(async () =>
                fileEncryption.downloadAndDecryptFile(
                  decryptedContent.effect_video_url,
                  user.id,
                  getPublicKey,
                  () => keyPair.privateKey
                )
              );

              // Crear URL temporal para el video descifrado
              const tempUri = `${
                FileSystem.cacheDirectory
              }effect_${Date.now()}.mp4`;
              const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                decryptedVideo.data
              );
              await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              finalEffectUrl = tempUri;
              console.log("✅ Video de efecto descifrado:", tempUri);
            } catch (error) {
              console.error("❌ Error descargando video de efecto:", error);
              // Intentar con URL pública como fallback
              finalEffectUrl = getPublicUrl(
                decryptedContent.effect_video_url,
                "encrypted_media"
              );
            }
          } else {
            // Video no cifrado
            finalEffectUrl = getPublicUrl(decryptedContent.effect_video_url);
          }
        }

        // Procesar video secreto
        if (decryptedContent.secret_video_url) {
          if (
            decryptedContent.secret_video_encrypted ||
            decryptedContent.secret_video_url.startsWith("encrypted_")
          ) {
            try {
              console.log("🔓 Descifrando video secreto...");
              const decryptedVideo = await retryDownload(async () =>
                fileEncryption.downloadAndDecryptFile(
                  decryptedContent.secret_video_url,
                  user.id,
                  getPublicKey,
                  () => keyPair.privateKey
                )
              );

              const tempUri = `${
                FileSystem.cacheDirectory
              }secret_${Date.now()}.mp4`;
              const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                decryptedVideo.data
              );
              await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              finalSecretUrl = tempUri;
              console.log("✅ Video secreto descifrado:", tempUri);
            } catch (error) {
              console.error("❌ Error descargando video secreto:", error);
              finalSecretUrl = getPublicUrl(
                decryptedContent.secret_video_url,
                "encrypted_media"
              );
            }
          } else {
            finalSecretUrl = getPublicUrl(decryptedContent.secret_video_url);
          }
        }

        // Actualizar las URLs de estado
        setEffectVideoUrl(finalEffectUrl);
        setSecretVideoUrl(finalSecretUrl);
        videosLoadedRef.current = true;
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

    return () => {
      videosLoadedRef.current = false;
    };
  }, [trick.id, keyPair]);

  // useEffect para cargar fotos
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        if (photosLoadedRef.current) {
          return;
        }

        // Si no está cifrado, usar fotos originales
        if (!trick.is_encrypted) {
          // Convertir las URLs a URLs públicas si es necesario
          const publicPhotos = photos.map(
            (photo) => getPublicUrl(photo) || photo
          );
          setDecryptedPhotos(publicPhotos);
          photosLoadedRef.current = true;
          setIsLoadingPhotos(false);
          return;
        }

        // Si aún no tenemos las claves, esperamos
        if (!keyPair) {
          return;
        }

        setIsLoadingPhotos(true);
        setPhotoLoadError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const processedPhotos: string[] = [];

        // Procesar las fotos del prop
        if (
          trick.photos &&
          Array.isArray(trick.photos) &&
          trick.photos.length > 0
        ) {
          console.log("🎯 Procesando fotos cifradas:", trick.photos.length);

          const photoPromises = trick.photos.map(
            async (photoId: string, index: number) => {
              try {
                console.log(`📸 Descifrando foto ${index + 1}:`, photoId);
                const decryptedPhoto = await retryDownload(async () =>
                  fileEncryption.downloadAndDecryptFile(
                    photoId,
                    user.id,
                    getPublicKey,
                    () => keyPair.privateKey
                  )
                );

                const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                  decryptedPhoto.data
                );
                const dataUri = `data:${decryptedPhoto.mimeType};base64,${base64Data}`;
                console.log(`✅ Foto ${index + 1} descifrada`);

                return { index, dataUri };
              } catch (err) {
                console.error(`❌ Error descifrando foto ${index + 1}:`, err);
                // Intentar con URL pública como fallback
                const publicUrl = getPublicUrl(photoId, "encrypted_media");
                if (publicUrl) {
                  return { index, dataUri: publicUrl };
                }
                return null;
              }
            }
          );

          const results = await Promise.all(photoPromises);

          const orderedPhotos = results
            .filter(
              (result): result is { index: number; dataUri: string } =>
                result !== null
            )
            .sort((a, b) => a.index - b.index)
            .map((result) => result.dataUri);

          processedPhotos.push(...orderedPhotos);
          console.log(`📊 Total fotos procesadas: ${processedPhotos.length}`);
        }

        // Si no hay fotos procesadas, intentar con la foto principal
        if (processedPhotos.length === 0 && trick.photo_url) {
          const publicUrl = getPublicUrl(trick.photo_url);
          if (publicUrl) {
            processedPhotos.push(publicUrl);
          }
        }

        setDecryptedPhotos(processedPhotos);
        photosLoadedRef.current = true;
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

    return () => {
      photosLoadedRef.current = false;
    };
  }, [trick.id, trick.photos, keyPair]);

  // Pausar/reproducir videos según la sección actual
  useEffect(() => {
    if (currentSection === "effect") {
      effectVideoPlayer?.play();
      secretVideoPlayer?.pause();
    } else if (currentSection === "secret") {
      secretVideoPlayer?.play();
      effectVideoPlayer?.pause();
    } else {
      effectVideoPlayer?.pause();
      secretVideoPlayer?.pause();
    }
  }, [currentSection, effectVideoPlayer, secretVideoPlayer]);

  // Limpiar archivos temporales al desmontar
  useEffect(() => {
    return () => {
      if (
        effectVideoUrl &&
        effectVideoUrl.startsWith(FileSystem.cacheDirectory || "")
      ) {
        FileSystem.deleteAsync(effectVideoUrl, { idempotent: true }).catch(
          (err) => console.log("Error limpiando archivo temporal:", err)
        );
      }
      if (
        secretVideoUrl &&
        secretVideoUrl.startsWith(FileSystem.cacheDirectory || "")
      ) {
        FileSystem.deleteAsync(secretVideoUrl, { idempotent: true }).catch(
          (err) => console.log("Error limpiando archivo temporal:", err)
        );
      }
    };
  }, [effectVideoUrl, secretVideoUrl]);

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
  const togglePlayPause = () => {
    if (currentSection === "effect" && effectVideoPlayer) {
      if (effectVideoPlayer.playing) {
        effectVideoPlayer.pause();
        setIsEffectPlaying(false);
      } else {
        effectVideoPlayer.play();
        setIsEffectPlaying(true);
      }
    } else if (currentSection === "secret" && secretVideoPlayer) {
      if (secretVideoPlayer.playing) {
        secretVideoPlayer.pause();
        setIsSecretPlaying(false);
      } else {
        secretVideoPlayer.play();
        setIsSecretPlaying(true);
      }
    }
  };

  // Manejar el botón de like
  const handleLikePress = () => {
    setIsLiked(!isLiked);
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

  // Manejar la eliminación de etiquetas
  const handleRemoveTag = (tagId: string) => {
    // Implementar lógica para eliminar la etiqueta
  };

  // Renderizar video con controles
  const renderVideo = (
    url: string | null,
    player: any,
    isPlaying: boolean,
    isLoading: boolean
  ) => {
    if (isLoading) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <ActivityIndicator size="large" color="white" />
          <StyledText className="text-white text-lg mt-4">
            {trick.is_encrypted
              ? t("decryptingVideo", "Descifrando video...")
              : t("loadingVideo", "Cargando video...")}
          </StyledText>
        </StyledView>
      );
    }

    if (videoLoadError) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <Ionicons name="alert-circle-outline" size={50} color="white" />
          <StyledText className="text-white text-lg mt-4">
            {t("videoLoadError", "Error al cargar el video")}
          </StyledText>
          <StyledText className="text-white/70 text-sm mt-2">
            {videoLoadError}
          </StyledText>
        </StyledView>
      );
    }

    if (!url || !player) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <StyledText className="text-white text-xl">
            {t("noVideoAvailable", "No video available")}
          </StyledText>
        </StyledView>
      );
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
    );
  };

  // Renderizar galería de fotos con scroll horizontal
  const renderPhotoGallery = () => {
    if (isLoadingPhotos) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <ActivityIndicator size="large" color="white" />
          <StyledText className="text-white text-lg mt-4">
            {trick.is_encrypted
              ? t("decryptingPhotos", "Descifrando fotos...")
              : t("loadingPhotos", "Cargando fotos...")}
          </StyledText>
        </StyledView>
      );
    }

    if (photoLoadError) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <Ionicons name="alert-circle-outline" size={50} color="white" />
          <StyledText className="text-white text-lg mt-4">
            {t("photoLoadError", "Error al cargar las fotos")}
          </StyledText>
          <StyledText className="text-white/70 text-sm mt-2">
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
          <StyledText className="text-white text-xl">
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
          renderItem={({ item }) => (
            <Image
              source={{ uri: item as string }}
              style={{ width, height: height }}
              resizeMode="contain"
            />
          )}
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
        <StyledView style={{ width, height }}>
          {renderVideo(
            effectVideoUrl,
            effectVideoPlayer,
            isEffectPlaying,
            isLoadingVideos
          )}
        </StyledView>

        {/* Sección de Secreto */}
        <StyledView style={{ width, height }}>
          {renderVideo(
            secretVideoUrl,
            secretVideoPlayer,
            isSecretPlaying,
            isLoadingVideos
          )}
        </StyledView>

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
          isLiked={isLiked}
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
  );
};

export default TrickViewScreen;
