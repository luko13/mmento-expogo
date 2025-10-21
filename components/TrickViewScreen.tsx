// components/TrickViewScreen.tsx
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

const TrickViewScreen: React.FC<TrickViewScreenProps> = ({
  trick,
  userId,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifyTrickDeleted } = useTrickDeletion();

  // Estados básicos
  const [currentSection, setCurrentSection] = useState<StageType>("effect");
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Estados de reproducción - Iniciar con video reproduciendo
  const [isEffectPlaying, setIsEffectPlaying] = useState(true);
  const [isSecretPlaying, setIsSecretPlaying] = useState(true);

  // Estados de overlay
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const blurOpacity = useRef(new Animated.Value(0)).current;

  // Estados previos
  const [wasEffectPlaying, setWasEffectPlaying] = useState(true);
  const [wasSecretPlaying, setWasSecretPlaying] = useState(true);

  // Estados de carga
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  // Estados de modales
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trickIsPublic, setTrickIsPublic] = useState(trick.is_public || false);

  // Estados de progress bar
  const [showProgressBar, setShowProgressBar] = useState(true);
  const progressBarHideTimer = useRef<NodeJS.Timeout | null>(null);
  const [isSeekingVideo, setIsSeekingVideo] = useState(false);

  // Estados de videos
  const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null);
  const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Estados de fotos
  const [decryptedPhotos, setDecryptedPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [photoLoadError, setPhotoLoadError] = useState<string | null>(null);

  // Estados de tags
  const [localTagIds, setLocalTagIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados de tiempo
  const [effectDuration, setEffectDuration] = useState(0);
  const [secretDuration, setSecretDuration] = useState(0);
  const [effectTime, setEffectTime] = useState(0);
  const [secretTime, setSecretTime] = useState(0);

  // Referencias para tracking
  const lastEffectTimeRef = useRef(0);
  const lastSecretTimeRef = useRef(0);

  // Hook de favoritos
  const { isFavorite, toggleFavorite } = useFavorites(trick.id, "magic");

  // Helper para URLs - MEMOIZADO
  const getPublicUrl = useCallback(
    (path: string, bucket: string = "magic_trick_media") => {
      if (!path || path === "") return null;
      if (path.startsWith("http://") || path.startsWith("https://"))
        return path;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
    },
    []
  );

  // URLs de videos memoizadas
  const effectVideoUrlMemo = useMemo(() => {
    return trick.effect_video_url ? getPublicUrl(trick.effect_video_url) : "";
  }, [trick.effect_video_url, getPublicUrl]);

  const secretVideoUrlMemo = useMemo(() => {
    return trick.secret_video_url ? getPublicUrl(trick.secret_video_url) : "";
  }, [trick.secret_video_url, getPublicUrl]);

  // Players con URLs estables
  const effectPlayer = useVideoPlayer(
    effectVideoUrlMemo,
    useCallback((player: any) => {
      player.loop = true;
      player.play(); // Auto-reproducir
    }, [])
  );

  const secretPlayer = useVideoPlayer(
    secretVideoUrlMemo,
    useCallback((player: any) => {
      player.loop = true;
      player.pause(); // El secreto empieza pausado
    }, [])
  );

  // Referencias a los players
  const effectPlayerRef = useRef(effectPlayer);
  const secretPlayerRef = useRef(secretPlayer);

  useEffect(() => {
    effectPlayerRef.current = effectPlayer;
  }, [effectPlayer]);

  useEffect(() => {
    secretPlayerRef.current = secretPlayer;
  }, [secretPlayer]);

  // Fotos memoizadas
  const photos = useMemo(
    () => trick.photos || (trick.photo_url ? [trick.photo_url] : []),
    [trick.photos, trick.photo_url]
  );

  // Timer para ocultar progress bar
  const showProgressBarWithTimer = useCallback(() => {
    setShowProgressBar(true);
    if (progressBarHideTimer.current) {
      clearTimeout(progressBarHideTimer.current);
    }
    if (!isSeekingVideo) {
      progressBarHideTimer.current = setTimeout(() => {
        if (!isSeekingVideo) setShowProgressBar(false);
      }, 3000);
    }
  }, [isSeekingVideo]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (progressBarHideTimer.current) {
        clearTimeout(progressBarHideTimer.current);
      }
    };
  }, []);

  // Cargar usuario actual
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted && user) {
        setCurrentUserId(user.id);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Configurar URLs de videos
  useEffect(() => {
    setEffectVideoUrl(effectVideoUrlMemo);
    setSecretVideoUrl(secretVideoUrlMemo);
    setIsLoadingVideos(false);
  }, [effectVideoUrlMemo, secretVideoUrlMemo]);

  // Cargar fotos
  useEffect(() => {
    setIsLoadingPhotos(true);
    const publicPhotos = photos.map((photo) => {
      const url = getPublicUrl(photo) || photo;
      return url;
    });
    setDecryptedPhotos(publicPhotos);
    setIsLoadingPhotos(false);
  }, [photos, getPublicUrl]);

  // Obtener duración del video effect
  useEffect(() => {
    if (!effectPlayer || !effectVideoUrlMemo) return;

    const checkDuration = () => {
      const d = effectPlayer.duration;
      if (typeof d === "number" && d > 0) {
        setEffectDuration(d);
        return true;
      }
      return false;
    };

    if (checkDuration()) return;

    const interval = setInterval(() => {
      if (checkDuration()) {
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [effectPlayer, effectVideoUrlMemo]);

  // Obtener duración del video secret
  useEffect(() => {
    if (!secretPlayer || !secretVideoUrlMemo) return;

    const checkDuration = () => {
      const d = secretPlayer.duration;
      if (typeof d === "number" && d > 0) {
        setSecretDuration(d);
        return true;
      }
      return false;
    };

    if (checkDuration()) return;

    const interval = setInterval(() => {
      if (checkDuration()) {
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [secretPlayer, secretVideoUrlMemo]);

  // Tracking de tiempo actual (effect)
  useEffect(() => {
    if (
      !effectPlayerRef.current ||
      currentSection !== "effect" ||
      isSeekingVideo ||
      !isEffectPlaying
    )
      return;

    const interval = setInterval(() => {
      const player = effectPlayerRef.current;
      if (!player) return;

      const time = player.currentTime;
      if (typeof time === "number" && !isNaN(time)) {
        const delta = Math.abs(time - lastEffectTimeRef.current);
        if (delta >= 0.05) {
          lastEffectTimeRef.current = time;
          setEffectTime(time);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentSection, isSeekingVideo, isEffectPlaying]);

  // Tracking de tiempo actual (secret)
  useEffect(() => {
    if (
      !secretPlayerRef.current ||
      currentSection !== "secret" ||
      isSeekingVideo ||
      !isSecretPlaying
    )
      return;

    const interval = setInterval(() => {
      const player = secretPlayerRef.current;
      if (!player) return;

      const time = player.currentTime;
      if (typeof time === "number" && !isNaN(time)) {
        const delta = Math.abs(time - lastSecretTimeRef.current);
        if (delta >= 0.05) {
          lastSecretTimeRef.current = time;
          setSecretTime(time);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentSection, isSeekingVideo, isSecretPlaying]);

  // Control de reproducción al cambiar sección
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

  // Cargar tags
  useEffect(() => {
    const loadTrickTags = async () => {
      try {
        const { data, error } = await supabase
          .from("trick_tags")
          .select("tag_id")
          .eq("trick_id", trick.id);

        if (data && !error) {
          setLocalTagIds(data.map((item) => item.tag_id));
        }
      } catch (error) {
        console.error("Error loading trick tags:", error);
      }
    };

    if (trick.id) loadTrickTags();
  }, [trick.id]);

  const canEdit =
    currentUserId && (currentUserId === trick.user_id || !trick.user_id);

  // Handlers
  const handleClose = () => {
    if (onClose) onClose();
    else router.push("/(app)/home");
  };

  const handleLikePress = async () => {
    await toggleFavorite();
  };

  const handleMorePress = () => {
    effectPlayerRef.current?.pause();
    secretPlayerRef.current?.pause();
    setIsEffectPlaying(false);
    setIsSecretPlaying(false);
    setShowActionsModal(true);
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const sectionIndex = Math.round(offsetY / height);

    const newSection =
      sectionIndex === 0 ? "effect" : sectionIndex === 1 ? "secret" : "extra";

    if (newSection !== currentSection) {
      setCurrentSection(newSection as StageType);
    }
  };

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

  // Render del video
  const renderVideo = (type: "effect" | "secret") => {
    const player =
      type === "effect" ? effectPlayerRef.current : secretPlayerRef.current;
    const url = type === "effect" ? effectVideoUrl : secretVideoUrl;
    const isPlaying = type === "effect" ? isEffectPlaying : isSecretPlaying;
    const duration = type === "effect" ? effectDuration : secretDuration;
    const time = type === "effect" ? effectTime : secretTime;

    if (isLoadingVideos) {
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
            }}
          >
            {t("loadingVideo", "Loading video...")}
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
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontFamily: fontNames.light,
            }}
          >
            {t("noVideo", "No Video")}
          </Text>
        </View>
      );
    }

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

        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 200, // Dejar espacio para la barra de progreso
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => {
            if (!player || isStageExpanded) return;

            showProgressBarWithTimer();

            if (isPlaying) {
              player.pause();
              if (type === "effect") setIsEffectPlaying(false);
              else setIsSecretPlaying(false);
            } else {
              player.play();
              if (type === "effect") setIsEffectPlaying(true);
              else setIsSecretPlaying(true);
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

  // Render de galería de fotos
  const renderPhotoGallery = () => {
    if (isLoadingPhotos) {
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
        </View>
      );
    }

    const photosToDisplay =
      decryptedPhotos.length > 0 ? decryptedPhotos : photos;
    if (photosToDisplay.length === 0) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#15322C",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontFamily: fontNames.light,
            }}
          >
            {t("noPhotos", "No Photos")}
          </Text>
        </View>
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
          renderItem={({ item }) => (
            <Image
              source={{ uri: item as string }}
              style={{ width, height }}
              resizeMode="contain"
            />
          )}
        />
        {photosToDisplay.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {photosToDisplay.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={{
                  width: 8,
                  height: 8,
                  marginHorizontal: 4,
                  borderRadius: 4,
                  backgroundColor:
                    index === currentPhotoIndex
                      ? "white"
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>
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

  // Determinar el userId correcto para las tags
  const userIdForTags = trick.user_id || currentUserId || undefined;

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
      >
        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo("effect")}
        </View>

        <View style={{ width, height, backgroundColor: "#15322C" }}>
          {renderVideo("secret")}
        </View>

        <View style={{ width, height }}>{renderPhotoGallery()}</View>
      </StyledScrollView>

      {/* Barra de progreso FUERA del ScrollView y de todo */}
      {(currentSection === "effect" || currentSection === "secret") && (
        <>
          <View
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              right: 0,
              zIndex: 9999,
              elevation: 999,
            }}
            pointerEvents="box-none"
          >
            <VideoProgressBar
              duration={
                currentSection === "effect" ? effectDuration : secretDuration
              }
              currentTime={
                currentSection === "effect" ? effectTime : secretTime
              }
              visible={showProgressBar && !isStageExpanded}
              onBarInteraction={() => {
                showProgressBarWithTimer();
              }}
              onSeekStart={() => {
                setIsSeekingVideo(true);
                const player =
                  currentSection === "effect"
                    ? effectPlayerRef.current
                    : secretPlayerRef.current;
                const isPlaying =
                  currentSection === "effect"
                    ? isEffectPlaying
                    : isSecretPlaying;

                if (player && isPlaying) {
                  player.pause();
                  if (currentSection === "effect") setIsEffectPlaying(false);
                  else setIsSecretPlaying(false);
                }
              }}
              onSeek={(seekTime) => {
                if (currentSection === "effect") {
                  setEffectTime(seekTime);
                  lastEffectTimeRef.current = seekTime;
                } else {
                  setSecretTime(seekTime);
                  lastSecretTimeRef.current = seekTime;
                }
              }}
              onSeekEnd={(seekTime) => {
                setIsSeekingVideo(false);
                const player =
                  currentSection === "effect"
                    ? effectPlayerRef.current
                    : secretPlayerRef.current;

                if (player) {
                  const currentTime = player.currentTime || 0;
                  const delta = seekTime - currentTime;
                  if (Math.abs(delta) > 0.1) {
                    player.seekBy(delta);
                  }
                  player.play();
                  if (currentSection === "effect") {
                    setIsEffectPlaying(true);
                    lastEffectTimeRef.current = seekTime;
                  } else {
                    setIsSecretPlaying(true);
                    lastSecretTimeRef.current = seekTime;
                  }
                }
                showProgressBarWithTimer();
              }}
            />
          </View>

          {/* Área táctil invisible cuando la barra está oculta */}
          {!showProgressBar && !isStageExpanded && (
            <TouchableOpacity
              style={{
                position: "absolute",
                bottom: 20,
                left: 0,
                right: 0,
                height: 60,
                zIndex: 10000,
                backgroundColor: "transparent",
              }}
              activeOpacity={1}
              onPress={() => {
                showProgressBarWithTimer();
              }}
            />
          )}
        </>
      )}

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
          userId={userIdForTags}
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

      <TrickActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        onEdit={() =>
          router.push({
            pathname: "/(app)/edit-trick",
            params: { trickId: trick.id },
          })
        }
        onPrivacy={() => setShowPrivacyModal(true)}
        onDelete={() => setShowDeleteModal(true)}
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
          // NO cerrar el modal aquí - dejar que se muestre el estado de carga

          try {
            const success = await trickService.deleteTrick(trick.id);

            if (success) {
              setShowDeleteModal(false); // Cerrar modal solo después de éxito
              notifyTrickDeleted(trick.id);
              router.push("/(app)/home");
            } else {
              console.error("[TrickViewScreen] Delete failed, showing error");
              setShowDeleteModal(false); // Cerrar modal antes de mostrar alert
              Alert.alert(t("error"), t("errorDeletingTrick", "Error deleting trick"));
            }
          } catch (error) {
            console.error("[TrickViewScreen] Exception during delete:", error);
            setShowDeleteModal(false); // Cerrar modal antes de mostrar alert
            Alert.alert(t("error"), t("errorDeletingTrick", "Error deleting trick"));
          }
        }}
        itemName={trick.title}
        itemType={t("trick", "trick")}
      />
    </StyledView>
  );
};

export default TrickViewScreen;
