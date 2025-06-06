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

  // Hooks de cifrado
  const { decryptForSelf, getPublicKey, keyPair } = useEncryption();
  const encryptedContentService = new EncryptedContentService();
  const fileEncryption = new FileEncryptionService();

  // Ref para evitar cargas múltiples
  const videosLoadedRef = useRef(false);
  const photosLoadedRef = useRef(false);

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
        console.log("\n🎬 INICIANDO CARGA DE VIDEOS");
        console.log("- Trick ID:", trick.id);
        console.log("- Is Encrypted:", trick.is_encrypted);
        console.log("- Effect Video URL:", trick.effect_video_url);
        console.log("- Secret Video URL:", trick.secret_video_url);
        if (videosLoadedRef.current) {
          return;
        }

        setIsLoadingVideos(true);
        setVideoLoadError(null);

        // Array temporal para fotos mal clasificadas
        const misplacedPhotos: string[] = [];

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
          console.log("⏳ Esperando claves de cifrado...");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuario no autenticado");
        }
        console.log("👤 Usuario:", user.id);

        console.log("\n📊 VERIFICANDO BASE DE DATOS:");
        const { data: trickData, error: trickError } = await supabase
          .from("magic_tricks")
          .select("*")
          .eq("id", trick.id)
          .single();

        if (trickData) {
          console.log("📝 Datos del truco:");
          console.log("- effect_video_url:", trickData.effect_video_url);
          console.log("- secret_video_url:", trickData.secret_video_url);
          console.log("- photo_url:", trickData.photo_url);
          console.log("- is_encrypted:", trickData.is_encrypted);
        }

        // Verificar tabla encrypted_content
        const { data: encryptedMeta, error: metaError } = await supabase
          .from("encrypted_content")
          .select("*")
          .eq("content_id", trick.id)
          .eq("content_type", "magic_tricks")
          .single();

        if (encryptedMeta) {
          console.log("\n🔐 Metadatos cifrados:");
          console.log("- encrypted_fields:", encryptedMeta.encrypted_fields);
          console.log("- encrypted_files:", encryptedMeta.encrypted_files);
        } else {
          console.error("❌ No se encontraron metadatos cifrados");
        }

        // Obtener contenido descifrado
        const decryptedContent = await encryptedContentService.getContent(
          trick.id,
          "magic_tricks",
          user.id,
          decryptForSelf,
          () => keyPair.privateKey
        );

        if (!decryptedContent) {
          throw new Error("No se pudo obtener el contenido");
        }
        console.log("\n📦 Contenido descifrado:");
        console.log("- effect_video_url:", decryptedContent.effect_video_url);
        console.log(
          "- effect_video_encrypted:",
          decryptedContent.effect_video_encrypted
        );
        console.log("- secret_video_url:", decryptedContent.secret_video_url);
        console.log(
          "- secret_video_encrypted:",
          decryptedContent.secret_video_encrypted
        );
        // Variables para almacenar las URLs finales
        let finalEffectUrl = null;
        let finalSecretUrl = null;

        // Procesar video de efecto
        if (decryptedContent.effect_video_url) {
          console.log("\n🎥 Procesando video de efecto...");
          if (
            decryptedContent.effect_video_encrypted ||
            decryptedContent.effect_video_url.startsWith("enc_")
          ) {
            try {
              console.log(
                "📹 ID del archivo cifrado:",
                decryptedContent.effect_video_url
              );
              const { data: fileCheck } = await supabase
                .from("encrypted_files")
                .select("file_id, original_name, mime_type, size")
                .eq("file_id", decryptedContent.effect_video_url)
                .single();

              if (fileCheck) {
                console.log("✅ Archivo encontrado en DB:");
                console.log("- Nombre:", fileCheck.original_name);
                console.log("- Tipo:", fileCheck.mime_type);
                console.log("- Tamaño:", fileCheck.size);
              } else {
                console.error("❌ Archivo no encontrado en encrypted_files");
              }
              const decryptedVideo = await retryDownload(async () =>
                fileEncryption.downloadAndDecryptFile(
                  decryptedContent.effect_video_url,
                  user.id,
                  getPublicKey,
                  () => keyPair.privateKey
                )
              );
              console.log("📹 Archivo descifrado:");
              console.log("- Tipo:", decryptedVideo.mimeType);
              console.log("- Tamaño:", decryptedVideo.data.length);
              // PARCHE: Verificar si es realmente un video
              if (!decryptedVideo.mimeType.includes("video")) {
                console.warn(
                  `⚠️ El video de efecto es en realidad ${decryptedVideo.mimeType}`
                );

                if (decryptedVideo.mimeType.includes("image")) {
                  // Es una imagen, guardarla para las fotos
                  const tempPhotoUri = `${
                    FileSystem.cacheDirectory
                  }misplaced_effect_${Date.now()}.jpg`;
                  const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                    decryptedVideo.data
                  );
                  await FileSystem.writeAsStringAsync(
                    tempPhotoUri,
                    base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  misplacedPhotos.push(tempPhotoUri);
                  console.log("📸 Imagen guardada como foto:", tempPhotoUri);
                }

                // No establecer URL de video
                finalEffectUrl = null;
              } else {
                // Es un video real
                const tempUri = `${
                  FileSystem.cacheDirectory
                }effect_${Date.now()}.mp4`;
                const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                  decryptedVideo.data
                );
                await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                console.log("✅ Video de efecto guardado en:", tempUri);

                const fileInfo = await FileSystem.getInfoAsync(tempUri);
                console.log("📁 Info del archivo guardado:", fileInfo);

                finalEffectUrl = tempUri;
              }
            } catch (error) {
              console.error("❌ Error descargando video de efecto:", error);
              finalEffectUrl = null;
            }
          } else {
            // Video no cifrado
            finalEffectUrl = getPublicUrl(decryptedContent.effect_video_url);
            console.log("📹 Video no cifrado, URL pública:", finalEffectUrl);
          }
        }

        // Procesar video secreto
        if (decryptedContent.secret_video_url) {
          if (
            decryptedContent.secret_video_encrypted ||
            decryptedContent.secret_video_url.startsWith("enc_")
          ) {
            try {
              console.log("📹 Descargando video secreto cifrado...");
              const decryptedVideo = await retryDownload(async () =>
                fileEncryption.downloadAndDecryptFile(
                  decryptedContent.secret_video_url,
                  user.id,
                  getPublicKey,
                  () => keyPair.privateKey
                )
              );

              // Verificar tipo MIME
              if (!decryptedVideo.mimeType.includes("video")) {
                console.warn(
                  `⚠️ El video secreto es en realidad ${decryptedVideo.mimeType}`
                );

                if (decryptedVideo.mimeType.includes("image")) {
                  const tempPhotoUri = `${
                    FileSystem.cacheDirectory
                  }misplaced_secret_${Date.now()}.jpg`;
                  const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                    decryptedVideo.data
                  );
                  await FileSystem.writeAsStringAsync(
                    tempPhotoUri,
                    base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  misplacedPhotos.push(tempPhotoUri);
                }

                finalSecretUrl = null;
              } else {
                const tempUri = `${
                  FileSystem.cacheDirectory
                }secret_${Date.now()}.mp4`;
                const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                  decryptedVideo.data
                );
                await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                console.log("✅ Video secreto guardado en:", tempUri);
                finalSecretUrl = tempUri;
              }
            } catch (error) {
              console.error("❌ Error descargando video secreto:", error);
              finalSecretUrl = null;
            }
          } else {
            finalSecretUrl = getPublicUrl(decryptedContent.secret_video_url);
          }
        }

        // Actualizar las URLs de estado
        console.log("\n📊 URLS FINALES:");
        console.log("- Effect Video:", finalEffectUrl);
        console.log("- Secret Video:", finalSecretUrl);
        console.log("- Fotos mal clasificadas:", misplacedPhotos.length);
        setEffectVideoUrl(finalEffectUrl);
        setSecretVideoUrl(finalSecretUrl);

        // Si encontramos fotos mal clasificadas, agregarlas
        if (misplacedPhotos.length > 0) {
          setDecryptedPhotos((prev) => [...prev, ...misplacedPhotos]);
        }

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

        console.log("📸 Iniciando carga de fotos...");
        console.log("📸 trick.photos:", trick.photos);
        console.log("📸 trick.photo_url:", trick.photo_url);

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
          const photoPromises = trick.photos.map(
            async (photoIdOrUrl: string, index: number) => {
              try {
                console.log(`📸 Procesando foto ${index + 1}:`, photoIdOrUrl);

                // Si ya es una URL completa o ruta local, usarla directamente
                if (
                  photoIdOrUrl.startsWith("http") ||
                  photoIdOrUrl.startsWith("file://")
                ) {
                  return { index, dataUri: photoIdOrUrl };
                }

                // Si es un ID de archivo cifrado (enc_*)
                if (photoIdOrUrl.startsWith("enc_")) {
                  const decryptedPhoto = await retryDownload(async () =>
                    fileEncryption.downloadAndDecryptFile(
                      photoIdOrUrl,
                      user.id,
                      getPublicKey,
                      () => keyPair.privateKey
                    )
                  );

                  // Verificar que la imagen se descifró correctamente
                  if (
                    !decryptedPhoto.data ||
                    decryptedPhoto.data.length === 0
                  ) {
                    console.error(
                      `❌ Foto ${index} vacía después de descifrar`
                    );
                    return null;
                  }

                  console.log(
                    `✅ Foto ${index + 1} descifrada, tamaño:`,
                    decryptedPhoto.data.length
                  );
                  console.log(`📸 MimeType: ${decryptedPhoto.mimeType}`);

                  // Para fotos muy grandes, crear archivo temporal
                  if (decryptedPhoto.data.length > 1000000) {
                    // 1MB
                    const tempUri = `${
                      FileSystem.cacheDirectory
                    }photo_${Date.now()}_${index}.jpg`;

                    // Intentar comprimir si es muy grande
                    if (decryptedPhoto.data.length > 3000000) {
                      // 3MB
                      try {
                        // Crear data URI temporal para comprimir
                        const base64Data =
                          await OptimizedBase64.uint8ArrayToBase64(
                            decryptedPhoto.data
                          );
                        const dataUri = `data:${decryptedPhoto.mimeType};base64,${base64Data}`;

                        // Comprimir con expo-image-manipulator
                        const { manipulateAsync, SaveFormat } = await import(
                          "expo-image-manipulator"
                        );
                        const compressed = await manipulateAsync(
                          dataUri,
                          [{ resize: { width: 1920 } }],
                          { compress: 0.8, format: SaveFormat.JPEG }
                        );

                        console.log(
                          `✅ Foto comprimida de ${decryptedPhoto.data.length} a archivo temporal`
                        );
                        return { index, dataUri: compressed.uri };
                      } catch (compressionError) {
                        console.warn(
                          "No se pudo comprimir, usando original:",
                          compressionError
                        );
                      }
                    }

                    // Guardar sin comprimir
                    const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                      decryptedPhoto.data
                    );
                    await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    console.log(`📸 Foto guardada en: ${tempUri}`);
                    return { index, dataUri: tempUri };
                  } else {
                    // Foto pequeña, usar data URI
                    const base64Data = await OptimizedBase64.uint8ArrayToBase64(
                      decryptedPhoto.data
                    );
                    const dataUri = `data:${decryptedPhoto.mimeType};base64,${base64Data}`;
                    return { index, dataUri };
                  }
                }

                // Si es un path relativo, construir URL pública
                const publicUrl = getPublicUrl(photoIdOrUrl, "encrypted_media");
                return { index, dataUri: publicUrl };
              } catch (err) {
                console.error(`❌ Error procesando foto ${index}:`, err);
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
        }

        // Si no hay fotos procesadas, intentar con la foto principal
        if (processedPhotos.length === 0 && trick.photo_url) {
          const publicUrl = getPublicUrl(trick.photo_url);
          if (publicUrl) {
            processedPhotos.push(publicUrl);
          }
        }

        console.log(`📸 Total fotos procesadas: ${processedPhotos.length}`);
        setDecryptedPhotos((prev) => {
          // Combinar con fotos mal clasificadas de videos
          const combined = [...processedPhotos, ...prev];
          return [...new Set(combined)]; // Eliminar duplicados
        });
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
  }, [currentSection, isEffectPlaying, isSecretPlaying]);

  // Limpiar archivos temporales al desmontar
  useEffect(() => {
    return () => {
      const cleanupFiles = async () => {
        const filesToDelete = [
          effectVideoUrl,
          secretVideoUrl,
          ...decryptedPhotos.filter((photo) =>
            photo.startsWith(FileSystem.cacheDirectory || "")
          ),
        ].filter(Boolean);

        for (const file of filesToDelete) {
          if (file) {
            try {
              await FileSystem.deleteAsync(file, { idempotent: true });
            } catch (error) {
              console.warn("Error limpiando archivo:", error);
            }
          }
        }
      };

      cleanupFiles();
    };
  }, [effectVideoUrl, secretVideoUrl, decryptedPhotos]);

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
          <Text style={{ color: "white", fontSize: 18, marginTop: 16 }}>
            {trick.is_encrypted
              ? t("decryptingVideo", "Descifrando video...")
              : t("loadingVideo", "Cargando video...")}
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
          <Text style={{ color: "white", fontSize: 18, marginTop: 16 }}>
            {t("videoLoadError", "Error al cargar el video")}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              marginTop: 8,
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
              <Text style={{ color: "white", fontSize: 18 }}>
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
          <Text style={{ color: "white", fontSize: 20 }}>
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
                  <Text style={{ color: "white" }}>Error loading image</Text>
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
