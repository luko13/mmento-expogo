"use client";

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
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";

import TopNavigationBar from "./trick-viewer/TopNavigationBar";
import TrickViewerBottomSection from "./trick-viewer/TrickViewerBottomSection";
import VideoProgressBar from "./trick-viewer/videoProgressBar";
import type { StageType } from "./trick-viewer/StageInfoSection";

import { useFavorites } from "../hooks/useFavorites";
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

const EPS = 0.05; // ~50 ms
const TICK_MS = 120; // polling tiempos

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({
  trick,
  userId,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifyTrickDeleted } = useTrickDeletion();

  // navegación / UI
  const [currentSection, setCurrentSection] = useState<StageType>("effect");
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // reproducción
  const [isEffectPlaying, setIsEffectPlaying] = useState(true);
  const [isSecretPlaying, setIsSecretPlaying] = useState(true);

  // blur overlay
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const blurOpacity = useRef(new Animated.Value(0)).current;

  // estados previos para restaurar tras overlay
  const [wasEffectPlaying, setWasEffectPlaying] = useState(true);
  const [wasSecretPlaying, setWasSecretPlaying] = useState(true);

  // subida ficheros
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  // modales
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trickIsPublic, setTrickIsPublic] = useState(false);

  // barra de progreso
  const [showProgressBar, setShowProgressBar] = useState(true);
  const progressBarHideTimer = useRef<NodeJS.Timeout | null>(null);
  const [isSeekingVideo, setIsSeekingVideo] = useState(false);

  // favoritos
  const { isFavorite, toggleFavorite } = useFavorites(trick.id, "magic");

  // videos/fotos
  const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null);
  const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  const [decryptedPhotos, setDecryptedPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [photoLoadError, setPhotoLoadError] = useState<string | null>(null);

  // tags / usuario
  const [localTagIds, setLocalTagIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // tiempos/duraciones controlados por el padre
  const [effectDuration, setEffectDuration] = useState(0);
  const [secretDuration, setSecretDuration] = useState(0);
  const [effectTime, setEffectTime] = useState(0);
  const [secretTime, setSecretTime] = useState(0);

  // helper construir URL pública desde path (Supabase)
  const getPublicUrl = (path: string, bucket: string = "magic_trick_media") => {
    if (!path || path === "") return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  // init del player MEMOIZADO (solo loop=true)
  const initEffectPlayer = useCallback((p: any) => {
    p.loop = true;
  }, []);
  const initSecretPlayer = useCallback((p: any) => {
    p.loop = true;
  }, []);

  // players
  const effectPlayer = useVideoPlayer(effectVideoUrl || "", initEffectPlayer);
  const secretPlayer = useVideoPlayer(secretVideoUrl || "", initSecretPlayer);

  // refs a players (para evitar deps en useEffect)
  const effectPlayerRef = useRef(effectPlayer);
  const secretPlayerRef = useRef(secretPlayer);
  useEffect(() => {
    effectPlayerRef.current = effectPlayer;
  }, [effectPlayer]);
  useEffect(() => {
    secretPlayerRef.current = secretPlayer;
  }, [secretPlayer]);

  // fotos a usar
  const photos = useMemo(
    () => trick.photos || (trick.photo_url ? [trick.photo_url] : []),
    [trick.photos, trick.photo_url]
  );

  // mostrar/ocultar progress bar con timer
  const showProgressBarWithTimer = useCallback(() => {
    setShowProgressBar(true);
    if (progressBarHideTimer.current)
      clearTimeout(progressBarHideTimer.current);
    if (!isSeekingVideo) {
      progressBarHideTimer.current = setTimeout(() => {
        if (!isSeekingVideo) setShowProgressBar(false);
      }, 3000);
    }
  }, [isSeekingVideo]);

  useEffect(() => {
    return () => {
      if (progressBarHideTimer.current)
        clearTimeout(progressBarHideTimer.current);
    };
  }, []);

  // cerrar
  const handleClose = () => {
    if (onClose) onClose();
    else router.push("/(app)/home");
  };

  // usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  // permisos de edición
  const canEdit =
    currentUserId && (currentUserId === trick.user_id || !trick.user_id);

  // subir con compresión
  const uploadFileWithCompression = async (
    uri: string,
    folder: string,
    fileType: string,
    fileName: string,
    userId: string
  ): Promise<string | null> => {
    try {
      const compressionResult = await compressionService.compressFile(
        uri,
        fileType,
        {
          quality: 0.7,
          maxWidth: 1920,
        }
      );
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

  // seleccionar + subir video
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

      setIsProcessingSelection(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 0.5,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets[0]) {
        setIsProcessingSelection(false);
        return;
      }

      setIsProcessingSelection(false);
      setIsUploading(true);

      const asset = result.assets[0];
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
        const updateData =
          type === "effect"
            ? { effect_video_url: uploadedUrl }
            : { secret_video_url: uploadedUrl };

        const { error } = await supabase
          .from("magic_tricks")
          .update(updateData)
          .eq("id", trick.id);

        if (!error) {
          if (type === "effect") setEffectVideoUrl(uploadedUrl);
          else setSecretVideoUrl(uploadedUrl);
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

  // seleccionar + subir fotos
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

      if (result.canceled || result.assets.length === 0) return;

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

        if (uploadedUrl) uploadedPhotos.push(uploadedUrl);
      }

      if (uploadedPhotos.length > 0) {
        const updateData: any = {};
        if (!trick.photo_url) updateData.photo_url = uploadedPhotos[0];

        const { error } = await supabase
          .from("magic_tricks")
          .update(updateData)
          .eq("id", trick.id);

        if (!error) {
          setDecryptedPhotos((prev) => [...prev, ...uploadedPhotos]);
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

  // cargar tags del truco
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

    if (trick.id) loadTrickTags();
  }, [trick.id]);

  // cargar estado is_public
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
          if (!trick.user_id && data.user_id) {
            trick.user_id = data.user_id;
          }
        }
      } catch (error) {
        console.error("Error loading trick public state:", error);
      }
    };

    if (trick.id) loadTrickPublicState();
  }, [trick.id]);

  // cargar videos
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoadingVideos(true);
        setVideoLoadError(null);

        const effectUrl = trick.effect_video_url
          ? getPublicUrl(trick.effect_video_url)
          : null;
        const secretUrl = trick.secret_video_url
          ? getPublicUrl(trick.secret_video_url)
          : null;

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

  // cargar fotos
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setIsLoadingPhotos(true);
        setPhotoLoadError(null);
        const publicPhotos = photos.map(
          (photo) => getPublicUrl(photo) || photo
        );
        setDecryptedPhotos(publicPhotos);
      } catch (error) {
        console.error("❌ Error general cargando fotos:", error);
        setPhotoLoadError(
          error instanceof Error ? error.message : "Error desconocido"
        );
        const fallback = photos.map((photo) => getPublicUrl(photo) || photo);
        setDecryptedPhotos(fallback);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    loadPhotos();
  }, [trick.id, photos]);

  // descubrir DURACIÓN (effect)
  useEffect(() => {
    const p = effectPlayerRef.current;
    if (!p) {
      setEffectDuration(0);
      return;
    }
    const d0 = typeof p.duration === "number" ? p.duration : 0;
    if (d0 > 0) setEffectDuration(d0);
    if (d0 > 0) return;

    const iv = setInterval(() => {
      const d =
        typeof effectPlayerRef.current?.duration === "number"
          ? effectPlayerRef.current!.duration
          : 0;
      if (d > 0) {
        setEffectDuration(d);
        clearInterval(iv);
      }
    }, 150);
    const to = setTimeout(() => clearInterval(iv), 5000);

    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [effectVideoUrl, effectPlayer]);

  // descubrir DURACIÓN (secret)
  useEffect(() => {
    const p = secretPlayerRef.current;
    if (!p) {
      setSecretDuration(0);
      return;
    }
    const d0 = typeof p.duration === "number" ? p.duration : 0;
    if (d0 > 0) setSecretDuration(d0);
    if (d0 > 0) return;

    const iv = setInterval(() => {
      const d =
        typeof secretPlayerRef.current?.duration === "number"
          ? secretPlayerRef.current!.duration
          : 0;
      if (d > 0) {
        setSecretDuration(d);
        clearInterval(iv);
      }
    }, 150);
    const to = setTimeout(() => clearInterval(iv), 5000);

    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [secretVideoUrl, secretPlayer]);

  // actualizar TIEMPO ACTUAL (tick)
  useEffect(() => {
    const shouldTrackEffect =
      currentSection === "effect" &&
      isEffectPlaying &&
      !isStageExpanded &&
      !isSeekingVideo &&
      effectDuration > 0;

    const shouldTrackSecret =
      currentSection === "secret" &&
      isSecretPlaying &&
      !isStageExpanded &&
      !isSeekingVideo &&
      secretDuration > 0;

    if (!shouldTrackEffect && !shouldTrackSecret) return;

    const iv = setInterval(() => {
      if (shouldTrackEffect) {
        const p = effectPlayerRef.current;
        const t = p && typeof p.currentTime === "number" ? p.currentTime : null;
        if (t !== null && Math.abs(t - effectTime) >= EPS) setEffectTime(t);
      } else if (shouldTrackSecret) {
        const p = secretPlayerRef.current;
        const t = p && typeof p.currentTime === "number" ? p.currentTime : null;
        if (t !== null && Math.abs(t - secretTime) >= EPS) setSecretTime(t);
      }
    }, TICK_MS);

    return () => clearInterval(iv);
  }, [
    currentSection,
    isEffectPlaying,
    isSecretPlaying,
    isStageExpanded,
    isSeekingVideo,
    effectDuration,
    secretDuration,
    effectTime,
    secretTime,
  ]);

  // expand/collapse blur + pausa/reanuda
  const handleStageExpandedChange = useCallback(
    (expanded: boolean) => {
      setIsStageExpanded(expanded);
      Animated.timing(blurOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (expanded) {
        if (currentSection === "effect") {
          setWasEffectPlaying(isEffectPlaying);
          effectPlayerRef.current?.pause();
          setIsEffectPlaying(false);
        } else if (currentSection === "secret") {
          setWasSecretPlaying(isSecretPlaying);
          secretPlayerRef.current?.pause();
          setIsSecretPlaying(false);
        }
      } else {
        if (currentSection === "effect" && wasEffectPlaying) {
          effectPlayerRef.current?.play();
          setIsEffectPlaying(true);
        } else if (currentSection === "secret" && wasSecretPlaying) {
          secretPlayerRef.current?.play();
          setIsSecretPlaying(true);
        }
      }
    },
    [
      currentSection,
      isEffectPlaying,
      isSecretPlaying,
      wasEffectPlaying,
      wasSecretPlaying,
      blurOpacity,
    ]
  );

  // play/pause al cambiar sección o flags (sin tocar estado)
  useEffect(() => {
    if (isStageExpanded) {
      effectPlayerRef.current?.pause();
      secretPlayerRef.current?.pause();
      return;
    }

    if (currentSection === "effect") {
      if (isEffectPlaying) effectPlayerRef.current?.play();
      else effectPlayerRef.current?.pause();
      secretPlayerRef.current?.pause();
    } else if (currentSection === "secret") {
      if (isSecretPlaying) secretPlayerRef.current?.play();
      else secretPlayerRef.current?.pause();
      effectPlayerRef.current?.pause();
    } else {
      effectPlayerRef.current?.pause();
      secretPlayerRef.current?.pause();
    }
  }, [currentSection, isEffectPlaying, isSecretPlaying, isStageExpanded]);

  // scroll vertical → cambia sección
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

  // navegar a sección
  const navigateToSection = (section: StageType) => {
    const sectionIndex =
      section === "effect" ? 0 : section === "secret" ? 1 : 2;
    scrollViewRef.current?.scrollTo({
      y: sectionIndex * height,
      animated: true,
    });
    setCurrentSection(section);
  };

  // toggle play/pause
  const togglePlayPause = (type: "effect" | "secret") => {
    if (isStageExpanded) return;
    if (type === "effect") setIsEffectPlaying((p) => !p);
    else setIsSecretPlaying((p) => !p);
  };

  // like
  const handleLikePress = async () => {
    await toggleFavorite();
  };

  // 🔧 FALTABAN ESTOS HANDLERS:
  const handleMorePress = useCallback(() => {
    // pausa ambos para que el modal no deje nada sonando
    effectPlayerRef.current?.pause();
    secretPlayerRef.current?.pause();
    setIsEffectPlaying(false);
    setIsSecretPlaying(false);
    setShowActionsModal(true);
  }, []);

  const handlePrivacyPress = useCallback(() => {
    setShowPrivacyModal(true);
  }, []);

  const handleDeletePress = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  // compartir (lo dejamos por si lo usas en otro lado)
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

  // quitar tag
  const handleRemoveTag = (tagId: string) => {
    const prevIds = localTagIds;
    const updated = prevIds.filter((id) => id !== tagId);
    setLocalTagIds(updated);

    (async () => {
      try {
        const { error } = await supabase
          .from("trick_tags")
          .delete()
          .eq("trick_id", trick.id)
          .eq("tag_id", tagId);

        if (error) {
          console.error("Error removing tag:", error);
          setLocalTagIds(prevIds);
        }
      } catch (error) {
        console.error("Error removing tag:", error);
        setLocalTagIds(prevIds);
      }
    })();
  };

  // render video
  const renderVideo = (
    url: string | null,
    isPlaying: boolean,
    isLoading: boolean,
    type: "effect" | "secret"
  ) => {
    const player =
      type === "effect" ? effectPlayerRef.current : secretPlayerRef.current;

    if (isLoading) {
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

    // valores controlados por tipo
    const duration = type === "effect" ? effectDuration : secretDuration;
    const time = type === "effect" ? effectTime : secretTime;

    return (
      <View style={{ flex: 1, backgroundColor: "#15322C" }}>
        <VideoView
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          player={player as any}
          contentFit="cover"
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
        />

        {/* Play/Pause overlay */}
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
              showProgressBarWithTimer();
              if (isPlaying) (player as any).pause();
              else (player as any).play();
              if (type === "effect") setIsEffectPlaying((p) => !p);
              else setIsSecretPlaying((p) => !p);
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

        {/* Barra de progreso controlada */}
        {currentSection === type && (
          <VideoProgressBar
            duration={duration}
            currentTime={time}
            visible={showProgressBar && !isStageExpanded}
            onSeekStart={() => {
              setIsSeekingVideo(true);
              if (player && isPlaying) {
                (player as any).pause();
                if (type === "effect") setIsEffectPlaying(false);
                else setIsSecretPlaying(false);
              }
            }}
            onSeek={(t) => {
              // Vista previa del tiempo
              if (type === "effect") setEffectTime(t);
              else setSecretTime(t);
            }}
            onSeekEnd={(t) => {
              setIsSeekingVideo(false);
              const p = player as any;
              if (p && typeof p.currentTime === "number") {
                const delta = t - p.currentTime;
                if (Math.abs(delta) > EPS) p.seekBy(delta);
              }
              if (p) {
                p.play();
                if (type === "effect") setIsEffectPlaying(true);
                else setIsSecretPlaying(true);
              }
              showProgressBarWithTimer();
            }}
          />
        )}
      </View>
    );
  };

  // galería de fotos
  const renderPhotoGallery = () => {
    if (isLoadingPhotos) {
      return (
        <StyledView className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80">
          <ActivityIndicator size="large" color="white" />
          <StyledText
            className="text-white text-lg mt-4"
            style={{ fontFamily: fontNames.light, includeFontPadding: false }}
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
            style={{ fontFamily: fontNames.light, includeFontPadding: false }}
          >
            {t("photoLoadError", "Error al cargar las fotos")}
          </StyledText>
          <StyledText
            className="text-white/70 text-sm mt-2"
            style={{ fontFamily: fontNames.light, includeFontPadding: false }}
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
            <StyledText
              className="text-[#5BB9A3] text-base mt-4"
              style={{
                fontFamily: fontNames.regular,
                includeFontPadding: false,
              }}
            >
              {t("processingSelection", "Processing selection...")}
            </StyledText>
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
          keyExtractor={(_, index) => `photo-${index}`}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentPhotoIndex(index);
          }}
          renderItem={({ item }) => {
            if (!item || typeof item !== "string" || item.length < 10) {
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
                onError={(e) =>
                  console.error(
                    "❌ Error cargando imagen:",
                    e.nativeEvent.error
                  )
                }
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

  const ownerId = trick.user_id;

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
        {/* Efecto */}
        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo(
            effectVideoUrl,
            isEffectPlaying,
            isLoadingVideos,
            "effect"
          )}
        </View>

        {/* Secreto */}
        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo(
            secretVideoUrl,
            isSecretPlaying,
            isLoadingVideos,
            "secret"
          )}
        </View>

        {/* Fotos/Detalles */}
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

      {/* Top bar */}
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

      {/* Bottom section */}
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
          userId={ownerId || currentUserId || undefined}
          stage={currentSection}
          category={trick.category}
          description={getCurrentDescription()}
          angle={180}
          resetTime={trick.reset || 10}
          duration={trick.duration || 110}
          difficulty={trick.difficulty}
          onRemoveTag={currentUserId === ownerId ? handleRemoveTag : undefined}
          stageExpanded={isStageExpanded}
          onStageExpandedChange={handleStageExpandedChange}
        />
      </StyledView>

      {/* Modals */}
      <TrickActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        onEdit={() =>
          router.push({
            pathname: "/(app)/edit-trick",
            params: { trickId: trick.id },
          })
        }
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
        onSuccess={(isPublic) => setTrickIsPublic(isPublic)}
      />

      <DeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          try {
            const success = await trickService.deleteTrick(trick.id);
            if (success) {
              notifyTrickDeleted(trick.id);
              router.push("/(app)/home");
            } else {
              Alert.alert(
                t("error"),
                t("errorDeletingTrick", "Error deleting trick")
              );
            }
          } catch (error) {
            console.error("Error deleting trick:", error);
            Alert.alert(
              t("error"),
              t("errorDeletingTrick", "Error deleting trick")
            );
          }
        }}
        itemName={trick.title}
        itemType={t("trick", "trick")}
      />
    </StyledView>
  );
};

export default TrickViewScreen;
