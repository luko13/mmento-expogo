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
  Alert,
} from "react-native";
import { useFavorites } from "../hooks/useFavorites";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import TopNavigationBar from "./trick-viewer/TopNavigationBar";
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection";
import type { StageType } from "./trick-viewer/StageInfoSection";
import { supabase } from "../lib/supabase";
import { compressionService } from "../utils/compressionService";
import { uploadFileToStorage } from "../services/fileUploadService";
import { fontNames } from "../app/_layout";
import { trickService } from "../services/trickService";
import TrickActionsModal from "../components/ui/TrickActionsModal";
import MakePublicModal from "../components/ui/MakePublicModal";
import DeleteModal from "../components/ui/DeleteModal";
import { useTrickDeletion } from "../context/TrickDeletionContext";

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
    photos?: string[];
    user_id?: string;
    is_public?: boolean;
  };
  userId?: string;
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
  const { notifyTrickDeleted } = useTrickDeletion();

  // Nuevo estado para el blur
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const blurOpacity = useRef(new Animated.Value(0)).current;

  // Estados para guardar el estado anterior del video
  const [wasEffectPlaying, setWasEffectPlaying] = useState(true);
  const [wasSecretPlaying, setWasSecretPlaying] = useState(true);

  // Estado para subida
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  // Estados para modales
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trickIsPublic, setTrickIsPublic] = useState(false);

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

  // Estado local para tags
  const [localTagIds, setLocalTagIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Función helper para construir URL pública desde un path
  const getPublicUrl = (path: string, bucket: string = "magic_trick_media") => {
    if (!path || path === "") return null;

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
    if (currentSection === "effect" && isEffectPlaying && !isStageExpanded) {
      player.play();
    }
  });

  const secretPlayer = useVideoPlayer(secretVideoUrl || "", (player) => {
    player.loop = true;
    if (currentSection === "secret" && isSecretPlaying && !isStageExpanded) {
      player.play();
    }
  });

  // Usar las fotos proporcionadas o crear un array con la foto principal si existe
  const photos = useMemo(
    () => trick.photos || (trick.photo_url ? [trick.photo_url] : []),
    [trick.photos, trick.photo_url]
  );

  // Función para cerrar
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/(app)/home");
    }
  };

  // Obtener usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Verificar si el usuario puede editar
  const canEdit =
    currentUserId && (currentUserId === trick.user_id || !trick.user_id);

  // Función para subir archivo con compresión
  const uploadFileWithCompression = async (
    uri: string,
    folder: string,
    fileType: string,
    fileName: string,
    userId: string
  ): Promise<string | null> => {
    try {
      // Comprimir
      const compressionResult = await compressionService.compressFile(
        uri,
        fileType,
        { quality: 0.7, maxWidth: 1920 }
      );

      // Subir archivo
      const uploadUrl = await uploadFileToStorage(
        compressionResult.uri,
        userId,
        folder,
        fileType,
        fileName
      );

      return uploadUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  // Función para seleccionar y subir video
  const handleVideoUpload = async (type: "effect" | "secret") => {
    if (!canEdit) return;

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your gallery.")
        );
        return;
      }

      // Mostrar estado de procesando ANTES de abrir el picker
      setIsProcessingSelection(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 0.5,
        videoMaxDuration: 60,
      });

      // Si canceló, quitar el estado de procesando
      if (result.canceled || !result.assets[0]) {
        setIsProcessingSelection(false);
        return;
      }

      // Cambiar de procesando a uploading
      setIsProcessingSelection(false);
      setIsUploading(true);

      const asset = result.assets[0];

      // Subir video
      const folder =
        type === "effect"
          ? `${currentUserId}/effects`
          : `${currentUserId}/secrets`;

      const fileName = `${type}_${Date.now()}.mp4`;

      const uploadedUrl = await uploadFileWithCompression(
        asset.uri,
        folder,
        "video/mp4",
        fileName,
        currentUserId!
      );

      if (uploadedUrl) {
        // Actualizar en la base de datos
        const updateData =
          type === "effect"
            ? { effect_video_url: uploadedUrl }
            : { secret_video_url: uploadedUrl };

        const { error } = await supabase
          .from("magic_tricks")
          .update(updateData)
          .eq("id", trick.id);

        if (!error) {
          // Actualizar estado local
          if (type === "effect") {
            setEffectVideoUrl(uploadedUrl);
          } else {
            setSecretVideoUrl(uploadedUrl);
          }
        } else {
          Alert.alert(
            t("error"),
            t("errorUpdatingTrick", "Error updating trick")
          );
        }
      }

      setIsUploading(false);
    } catch (error) {
      console.error("Error uploading video:", error);
      Alert.alert(
        t("error"),
        t("errorUploadingVideo", "Error uploading video")
      );
      setIsUploading(false);
      setIsProcessingSelection(false);
    }
  };

  // Función para seleccionar y subir fotos
  const handlePhotoUpload = async () => {
    if (!canEdit) return;

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your gallery.")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      // Si canceló, no hacer nada
      if (result.canceled || result.assets.length === 0) {
        return;
      }

      // AQUÍ: Justo después de seleccionar y cerrar el modal
      setIsUploading(true);

      const uploadedPhotos: string[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const fileName = `photo_${Date.now()}_${i}.jpg`;

        const uploadedUrl = await uploadFileWithCompression(
          asset.uri,
          `${currentUserId}/photos`,
          "image/jpeg",
          fileName,
          currentUserId!
        );

        if (uploadedUrl) {
          uploadedPhotos.push(uploadedUrl);
        }
      }

      if (uploadedPhotos.length > 0) {
        // Si no hay foto principal, usar la primera
        const updateData: any = {};
        if (!trick.photo_url) {
          updateData.photo_url = uploadedPhotos[0];
        }

        // Actualizar en la base de datos
        const { error } = await supabase
          .from("magic_tricks")
          .update(updateData)
          .eq("id", trick.id);

        if (!error) {
          // Actualizar estado local
          setDecryptedPhotos([...decryptedPhotos, ...uploadedPhotos]);
        } else {
          Alert.alert(
            t("error"),
            t("errorUpdatingTrick", "Error updating trick")
          );
        }
      }

      setIsUploading(false);
    } catch (error) {
      console.error("Error uploading photos:", error);
      Alert.alert(
        t("error"),
        t("errorUploadingPhotos", "Error uploading photos")
      );
      setIsUploading(false);
    }
  };

  // Cargar tags del truco
  useEffect(() => {
    const loadTrickTags = async () => {
      try {
        const { data, error } = await supabase
          .from("trick_tags")
          .select("tag_id")
          .eq("trick_id", trick.id);

        if (data && !error) {
          const tagIds = data.map((item) => item.tag_id);
          setLocalTagIds(tagIds);
        } else if (error) {
          console.error("❌ Error loading tags:", error);
        }
      } catch (error) {
        console.error("Error loading trick tags:", error);
      }
    };

    if (trick.id) {
      loadTrickTags();
    }
  }, [trick.id]);

  // Cargar el estado is_public
  useEffect(() => {
    const loadTrickPublicState = async () => {
      try {
        const { data, error } = await supabase
          .from("magic_tricks")
          .select("is_public, user_id")
          .eq("id", trick.id)
          .single();

        if (data && !error) {
          setTrickIsPublic(data.is_public);
          // Si el trick no tiene user_id, actualizarlo desde la BD
          if (!trick.user_id && data.user_id) {
            trick.user_id = data.user_id;
          }
        }
      } catch (error) {
        console.error("Error loading trick public state:", error);
      }
    };

    if (trick.id) {
      loadTrickPublicState();
    }
  }, [trick.id]);

  // Manejar acciones del modal
  const handleMorePress = () => {
    // Pausar video actual
    if (currentSection === "effect" && effectPlayer) {
      effectPlayer.pause();
      setIsEffectPlaying(false);
    } else if (currentSection === "secret" && secretPlayer) {
      secretPlayer.pause();
      setIsSecretPlaying(false);
    }
    setShowActionsModal(true);
  };

  const handlePrivacyPress = () => {
    setShowPrivacyModal(true);
  };

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const success = await trickService.deleteTrick(trick.id);
      if (success) {
        // Notificar que el truco fue eliminado
        notifyTrickDeleted(trick.id);

        // Navegar a home
        router.push("/(app)/home");
      } else {
        Alert.alert(
          t("error"),
          t("errorDeletingTrick", "Error deleting trick")
        );
      }
    } catch (error) {
      console.error("Error deleting trick:", error);
      Alert.alert(t("error"), t("errorDeletingTrick", "Error deleting trick"));
    }
  };

  const handlePrivacySuccess = (isPublic: boolean) => {
    setTrickIsPublic(isPublic);
  };

  // useEffect para cargar videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoadingVideos(true);
        setVideoLoadError(null);

        console.log("🎥 Loading videos:", {
          effect_video_url: trick.effect_video_url,
          secret_video_url: trick.secret_video_url,
        });

        // Usar URLs directamente
        const effectUrl = trick.effect_video_url
          ? getPublicUrl(trick.effect_video_url)
          : null;
        const secretUrl = trick.secret_video_url
          ? getPublicUrl(trick.secret_video_url)
          : null;

        console.log("🔗 Processed URLs:", {
          effectUrl,
          secretUrl,
        });

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

  // Manejar el cambio de estado de expansión
  const handleStageExpandedChange = useCallback(
    (expanded: boolean) => {
      setIsStageExpanded(expanded);

      // Animar el blur
      Animated.timing(blurOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (expanded) {
        // Guardar estado actual y pausar
        if (currentSection === "effect") {
          setWasEffectPlaying(isEffectPlaying);
          if (effectPlayer && isEffectPlaying) {
            effectPlayer.pause();
            setIsEffectPlaying(false);
          }
        } else if (currentSection === "secret") {
          setWasSecretPlaying(isSecretPlaying);
          if (secretPlayer && isSecretPlaying) {
            secretPlayer.pause();
            setIsSecretPlaying(false);
          }
        }
      } else {
        // Restaurar estado anterior
        if (currentSection === "effect" && wasEffectPlaying) {
          if (effectPlayer) {
            effectPlayer.play();
            setIsEffectPlaying(true);
          }
        } else if (currentSection === "secret" && wasSecretPlaying) {
          if (secretPlayer) {
            secretPlayer.play();
            setIsSecretPlaying(true);
          }
        }
      }
    },
    [
      currentSection,
      isEffectPlaying,
      isSecretPlaying,
      effectPlayer,
      secretPlayer,
      wasEffectPlaying,
      wasSecretPlaying,
    ]
  );

  // Pausar/reproducir videos según la sección actual
  useEffect(() => {
    if (!isStageExpanded) {
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
    }
  }, [
    currentSection,
    isEffectPlaying,
    isSecretPlaying,
    effectPlayer,
    secretPlayer,
    isStageExpanded,
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
    if (!isStageExpanded) {
      if (type === "effect") {
        setIsEffectPlaying(!isEffectPlaying);
      } else {
        setIsSecretPlaying(!isSecretPlaying);
      }
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

  // Manejar la eliminación de etiquetas
  const handleRemoveTag = async (tagId: string) => {
    try {
      // Actualizar estado local inmediatamente
      const updatedTagIds = localTagIds.filter((id) => id !== tagId);
      setLocalTagIds(updatedTagIds);

      // Eliminar de la tabla trick_tags
      const { error } = await supabase
        .from("trick_tags")
        .delete()
        .eq("trick_id", trick.id)
        .eq("tag_id", tagId);

      if (error) {
        console.error("Error removing tag:", error);
        // Revertir cambio local si falla
        setLocalTagIds(localTagIds);
        return;
      }
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

    console.log(`🎬 renderVideo ${type}:`, {
      url,
      isLoading,
      videoLoadError,
      canEdit,
      currentUserId,
      trickUserId: trick.user_id,
    });

    if (isLoading) {
      console.log(`⏳ ${type} video is loading...`);
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#15322C",
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
      console.log(`❌ ${type} video error:`, videoLoadError);
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#15322C",
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
      console.log(
        `📹 ${type} no video URL, showing upload UI. canEdit:`,
        canEdit
      );
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#15322C",
          }}
        >
          {isProcessingSelection ? (
            <>
              <Text
                style={{
                  color: "#5BB9A3",
                  fontSize: 16,
                  marginTop: 16,
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                }}
              >
                {t("processingSelection", "Processing selection...")}
              </Text>
            </>
          ) : isUploading ? (
            <>
              <ActivityIndicator size="large" color="#5BB9A3" />
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  marginTop: 16,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("uploadingVideo", "Uploading video...")}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("noVideo", "No Video")}
              </Text>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => handleVideoUpload(type)}
                  style={{ marginTop: 16 }}
                >
                  <Text
                    style={{
                      color: "#5BB9A3",
                      fontSize: 18,
                      fontFamily: fontNames.light,
                      includeFontPadding: false,
                    }}
                  >
                    {t("uploadVideo", "Upload video")}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      );
    }

    console.log(`✅ ${type} video has URL, showing player`);
    return (
      <View style={{ flex: 1, backgroundColor: "#15322C" }}>
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
            if (!isStageExpanded && player) {
              if (isPlaying) {
                player.pause();
              } else {
                player.play();
              }
              togglePlayPause(type);
            }
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
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-[#15322C]">
          {isProcessingSelection ? (
            <>
              <StyledText
                className="text-[#5BB9A3] text-base mt-4"
                style={{
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                }}
              >
                {t("processingSelection", "Processing selection...")}
              </StyledText>
            </>
          ) : isUploading ? (
            <>
              <ActivityIndicator size="large" color="#5BB9A3" />
              <StyledText
                className="text-white text-lg mt-4"
                style={{
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("uploadingPhotos", "Uploading photos...")}
              </StyledText>
            </>
          ) : (
            <>
              <StyledText
                className="text-white text-xl"
                style={{
                  fontFamily: fontNames.light,
                  includeFontPadding: false,
                }}
              >
                {t("noPhotos", "No Photos")}
              </StyledText>
              {canEdit && (
                <TouchableOpacity
                  onPress={handlePhotoUpload}
                  style={{ marginTop: 16 }}
                >
                  <StyledText
                    className="text-[#5BB9A3] text-lg"
                    style={{
                      fontFamily: fontNames.light,
                      includeFontPadding: false,
                    }}
                  >
                    {t("uploadPhotos", "Upload photos")}
                  </StyledText>
                </TouchableOpacity>
              )}
            </>
          )}
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
                onLoad={() => {}}
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
    <StyledView className="flex-1 bg-[#15322C]">
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
        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo(
            effectVideoUrl,
            isEffectPlaying,
            isLoadingVideos,
            "effect"
          )}
        </View>

        {/* Sección de Secreto */}
        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo(
            secretVideoUrl,
            isSecretPlaying,
            isLoadingVideos,
            "secret"
          )}
        </View>

        {/* Sección de Fotos/Detalles */}
        <StyledView style={{ width, height }}>
          <StyledView className="flex-1 bg-[#15322C]">
            {renderPhotoGallery()}
          </StyledView>
        </StyledView>
      </StyledScrollView>

      {/* Blur overlay */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: blurOpacity,
          pointerEvents: isStageExpanded ? "auto" : "none",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleStageExpandedChange(false)}
          style={{ flex: 1 }}
        >
          <BlurView
            intensity={40}
            experimentalBlurMethod="dimezisBlurView"
            tint="dark"
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
          />
        </TouchableOpacity>
      </Animated.View>

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
          onMorePress={handleMorePress}
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
          userId={trick.user_id || (currentUserId ?? undefined)}
          stage={currentSection}
          category={trick.category}
          description={getCurrentDescription()}
          angle={180}
          resetTime={trick.reset || 10}
          duration={trick.duration || 110}
          difficulty={trick.difficulty}
          onRemoveTag={
            currentUserId === trick.user_id ? handleRemoveTag : undefined
          }
          stageExpanded={isStageExpanded}
          onStageExpandedChange={handleStageExpandedChange}
        />
      </StyledView>

      {/* Modals */}
      <TrickActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        onEdit={handleEditPress}
        onPrivacy={handlePrivacyPress}
        onDelete={handleDeletePress}
        isPublic={trickIsPublic}
        isOwner={currentUserId === trick.user_id}
      />

      <MakePublicModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        trickId={trick.id}
        initialIsPublic={trickIsPublic}
        onSuccess={handlePrivacySuccess}
      />

      <DeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={trick.title}
        itemType={t("trick", "trick")}
      />
    </StyledView>
  );
};

export default TrickViewScreen;
