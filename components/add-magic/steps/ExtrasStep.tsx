"use client";

import { useState, useEffect, useRef } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Entypo,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  EvilIcons,
} from "@expo/vector-icons";
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { useEncryption } from "../../../hooks/useEncryption";
import { FileEncryptionService } from "../../../utils/fileEncryption";
import CustomTooltip from "../../ui/Tooltip";

// Importar modales
import TechniquesModal from "../../../components/add-magic/ui/TechniquesModal";
import GimmicksModal from "../../../components/add-magic/ui/GimmicksModal";
import ScriptModal from "../../../components/add-magic/ui/ScriptModal";
import DifficultySlider from "../../../components/add-magic/ui/DifficultySlider";
import TimePickerModal from "../ui/TimePickerModal";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);
const StyledModal = styled(Modal);

// Definir interfaces para técnica y gimmick
interface Technique {
  id: string;
  name: string;
  description?: string;
}

interface Gimmick {
  id: string;
  name: string;
  description?: string;
}

interface ScriptData {
  id?: string;
  title: string;
  content: string;
}

interface StepProps {
  trickData: EncryptedMagicTrick;
  updateTrickData: (data: Partial<EncryptedMagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
}

// Componente de Modal de Progreso
const UploadProgressModal = ({
  visible,
  progress,
  currentFile,
  elapsedTime,
  totalFiles,
  processedFiles,
}: {
  visible: boolean;
  progress: number;
  currentFile: string;
  elapsedTime: number;
  totalFiles: number;
  processedFiles: number;
}) => {
  const { t } = useTranslation();
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <StyledModal visible={visible} transparent={true} animationType="fade">
      <StyledView className="flex-1 justify-center items-center bg-black/80">
        <StyledView className="bg-[#1a3a32] rounded-2xl p-6 mx-6 w-full max-w-sm">
          {/* Header */}
          <StyledView className="items-center mb-6">
            <StyledView className="w-16 h-16 bg-emerald-500/20 rounded-full items-center justify-center mb-4">
              <MaterialIcons name="cloud-upload" size={32} color="#10b981" />
            </StyledView>
            <StyledText className="text-white text-lg font-semibold mb-2">
              {t("uploadingFiles", "Subiendo archivos")}
            </StyledText>
            <StyledText className="text-white/60 text-sm text-center">
              {t(
                "encryptingAndUploading",
                "Cifrando y subiendo tus archivos de forma segura"
              )}
            </StyledText>
          </StyledView>

          {/* Progress Info */}
          <StyledView className="mb-4">
            <StyledView className="flex-row justify-between mb-2">
              <StyledText className="text-white/80 text-sm">
                {t("file", "Archivo")} {processedFiles}/{totalFiles}
              </StyledText>
              <StyledText className="text-emerald-400 text-sm font-medium">
                {progress.toFixed(0)}%
              </StyledText>
            </StyledView>

            {/* Progress Bar */}
            <StyledView className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <Animated.View
                style={{
                  height: "100%",
                  width: progressWidth,
                  backgroundColor: "#10b981",
                  borderRadius: 4,
                }}
              />
            </StyledView>

            {/* Current File */}
            <StyledView className="bg-black/20 rounded-lg px-3 py-2 mb-3">
              <StyledText className="text-white/50 text-xs mb-1">
                {t("processing", "Procesando")}:
              </StyledText>
              <StyledText className="text-white/80 text-sm" numberOfLines={1}>
                {currentFile || t("preparingFiles", "Preparando archivos...")}
              </StyledText>
            </StyledView>

            {/* Timer */}
            <StyledView className="flex-row items-center justify-center">
              <Feather name="clock" size={16} color="rgba(255,255,255,0.6)" />
              <StyledText className="text-white/60 text-sm ml-2">
                {t("elapsedTime", "Tiempo transcurrido")}:{" "}
                {formatTime(elapsedTime)}
              </StyledText>
            </StyledView>
          </StyledView>

          {/* Estimated Time (opcional) */}
          {progress > 10 && (
            <StyledView className="border-t border-white/10 pt-4">
              <StyledText className="text-white/40 text-xs text-center">
                {t("estimatedRemaining", "Tiempo estimado restante")}:{" "}
                {formatTime(
                  Math.round((elapsedTime / progress) * (100 - progress))
                )}
              </StyledText>
            </StyledView>
          )}

          {/* Security Note */}
          <StyledView className="flex-row items-center justify-center mt-4">
            <Feather name="shield" size={12} color="rgba(16, 185, 129, 0.6)" />
            <StyledText className="text-emerald-500/60 text-xs ml-1">
              {t("endToEndEncrypted", "Cifrado de extremo a extremo")}
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledModal>
  );
};

export default function ExtrasStepEncrypted({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 2,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = true,
}: StepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Estados para archivos locales
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);

  // Estados para el progreso de carga
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    error: encryptionError,
  } = useEncryption();

  const fileEncryptionService = new FileEncryptionService();

  // Estados para modales
  const [techniquesModalVisible, setTechniquesModalVisible] = useState(false);
  const [gimmicksModalVisible, setGimmicksModalVisible] = useState(false);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);

  // Estados para los selectores de tiempo
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResetPicker, setShowResetPicker] = useState(false);

  // Estados para datos
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [gimmicks, setGimmicks] = useState<Gimmick[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Technique[]>([]);
  const [selectedGimmicks, setSelectedGimmicks] = useState<Gimmick[]>([]);
  const [scriptData, setScriptData] = useState<ScriptData>({
    title: "",
    content: "",
  });

  // Verificar que el cifrado esté listo
  useEffect(() => {
    if (!encryptionReady && !encryptionError) {
    } else if (encryptionError) {
      console.error("Error en el cifrado:", encryptionError);
      Alert.alert(
        t("security.error", "Error de Seguridad"),
        t("security.encryptionNotReady", "El sistema de cifrado no está listo")
      );
    }
  }, [encryptionReady, encryptionError, t]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Función para manejar el progreso de carga
  const handleUploadProgress = (progress: number, fileName: string) => {
    setUploadProgress(progress);
    setCurrentUploadFile(fileName);

    // Actualizar archivos procesados
    const processed = Math.floor((progress / 100) * totalFiles);
    setProcessedFiles(processed);
  };

  // Iniciar el timer cuando comienza la carga
  const startUploadTimer = () => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  // Detener el timer
  const stopUploadTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Modificar el handler onNext para mostrar el progreso
  const handleNext = async () => {
    if (onNext) {
      // Calcular total de archivos
      const photoCount = localPhotos.length;
      const videoCount =
        (trickData.localFiles?.effectVideo ? 1 : 0) +
        (trickData.localFiles?.secretVideo ? 1 : 0);
      const total = photoCount + videoCount;

      if (total > 0) {
        setTotalFiles(total);
        setProcessedFiles(0);
        setShowUploadProgress(true);
        startUploadTimer();
      }

      try {
        await onNext();
      } finally {
        setShowUploadProgress(false);
        stopUploadTimer();
      }
    }
  };

  // Opciones de selección de ángulos
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ];

  // Seleccionar ángulo (estilo botón de radio)
  const selectAngle = (angle: string): void => {
    const updatedAngles = trickData.angles.includes(angle)
      ? trickData.angles.filter((a) => a !== angle)
      : [...trickData.angles, angle];

    updateTrickData({ angles: updatedAngles });
  };

  // Mostrar selector de tiempo de duración
  const openDurationPicker = () => {
    setShowDurationPicker(true);
  };

  // Mostrar selector de tiempo de reinicio
  const openResetTimePicker = () => {
    setShowResetPicker(true);
  };

  // Manejar cambio de duración
  const handleDurationChange = (totalSeconds: number) => {
    updateTrickData({ duration: totalSeconds });
    setShowDurationPicker(false);
  };

  // Manejar cambio de tiempo de reinicio
  const handleResetChange = (totalSeconds: number) => {
    updateTrickData({ reset: totalSeconds });
    setShowResetPicker(false);
  };

  // Manejar cambio de dificultad
  const handleDifficultyChange = (value: number) => {
    updateTrickData({ difficulty: value });
  };

  // Obtener técnicas y gimmicks de la base de datos
  useEffect(() => {
    fetchTechniques();
    fetchGimmicks();

    // Inicializar fotos locales desde trickData si existen
    if (trickData.localFiles?.photos) {
      setLocalPhotos(trickData.localFiles.photos);
    }

    // Inicializar elementos seleccionados si los datos del truco los tienen
    if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
      fetchSelectedTechniques(trickData.techniqueIds);
    }

    if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
      fetchSelectedGimmicks(trickData.gimmickIds);
    }

    // Inicializar datos del script si están disponibles
    if (trickData.scriptId) {
      fetchScriptData(trickData.scriptId);
    }
  }, []);

  const fetchTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("id, name, description")
        .eq("is_public", true);

      if (error) throw error;
      setTechniques(data || []);
    } catch (error) {
      console.error("Error al obtener técnicas:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorFetchingTechniques", "Error al obtener técnicas")
      );
    }
  };

  const fetchGimmicks = async () => {
    try {
      const { data, error } = await supabase
        .from("gimmicks")
        .select("id, name, description")
        .eq("is_public", true);

      if (error) throw error;
      setGimmicks(data || []);
    } catch (error) {
      console.error("Error al obtener gimmicks:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorFetchingGimmicks", "Error al obtener gimmicks")
      );
    }
  };

  const fetchSelectedTechniques = async (techniqueIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("id, name, description")
        .in("id", techniqueIds);

      if (error) throw error;
      setSelectedTechniques(data || []);
    } catch (error) {
      console.error("Error al obtener técnicas seleccionadas:", error);
    }
  };

  const fetchSelectedGimmicks = async (gimmickIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("gimmicks")
        .select("id, name, description")
        .in("id", gimmickIds);

      if (error) throw error;
      setSelectedGimmicks(data || []);
    } catch (error) {
      console.error("Error al obtener gimmicks seleccionados:", error);
    }
  };

  const fetchScriptData = async (scriptId: string) => {
    try {
      const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content")
        .eq("id", scriptId)
        .single();

      if (error) throw error;
      if (data) {
        setScriptData(data);
      }
    } catch (error) {
      console.error("Error al obtener datos del script:", error);
    }
  };

  // Alternar selección de técnicas
  const toggleTechniqueSelection = (technique: Technique) => {
    const isSelected = selectedTechniques.some((t) => t.id === technique.id);

    if (isSelected) {
      setSelectedTechniques(
        selectedTechniques.filter((t) => t.id !== technique.id)
      );
    } else {
      setSelectedTechniques([...selectedTechniques, technique]);
    }
  };

  // Alternar selección de gimmicks
  const toggleGimmickSelection = (gimmick: Gimmick) => {
    const isSelected = selectedGimmicks.some((g) => g.id === gimmick.id);

    if (isSelected) {
      setSelectedGimmicks(selectedGimmicks.filter((g) => g.id !== gimmick.id));
    } else {
      setSelectedGimmicks([...selectedGimmicks, gimmick]);
    }
  };

  // Guardar técnicas en el truco
  const saveTechniques = () => {
    const techniqueIds = selectedTechniques.map((t) => t.id);
    updateTrickData({ techniqueIds });
    setTechniquesModalVisible(false);
  };

  // Guardar gimmicks en el truco
  const saveGimmicks = () => {
    const gimmickIds = selectedGimmicks.map((g) => g.id);
    updateTrickData({ gimmickIds });
    setGimmicksModalVisible(false);
  };

  // Guardar script para el truco
  const saveScript = async () => {
    try {
      if (!scriptData.title || !scriptData.content) {
        Alert.alert(
          t("missingFields", "Campos faltantes"),
          t(
            "pleaseCompleteTitleAndContent",
            "Por favor completa tanto el título como el contenido"
          )
        );
        return;
      }

      // Actualizar el script en el estado del truco
      updateTrickData({ script: scriptData.content });
      setScriptModalVisible(false);
    } catch (error) {
      console.error("Error al guardar script:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorSavingScript", "Error al guardar el script")
      );
    }
  };

  // Seleccionar imagen para el truco (solo guardar localmente)
  const pickImage = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t("security.error", "Error de Seguridad"),
          t(
            "security.encryptionNotReady",
            "El sistema de cifrado no está listo"
          )
        );
        return;
      }

      // Solicitar permisos primero
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permiso Requerido"),
          t(
            "mediaLibraryPermission",
            "Necesitamos acceso a tu galería de medios para subir fotos."
          ),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        allowsMultipleSelection: true,
        quality: 0.4,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos: string[] = [];

        // Procesar múltiples imágenes
        for (const asset of result.assets) {
          const uri = asset.uri;

          // Verificar tamaño del archivo
          try {
            const fileInfo = await FileSystem.getInfoAsync(uri);

            if (fileInfo.exists && "size" in fileInfo) {
              if (fileInfo.size > 10 * 1024 * 1024) {
                Alert.alert(
                  t("fileTooLarge", "Archivo Demasiado Grande"),
                  t(
                    "imageSizeWarning",
                    "Una o más imágenes son demasiado grandes. El límite es 10MB por imagen."
                  ),
                  [{ text: t("ok", "OK") }]
                );
                continue;
              }
            }
          } catch (error) {
            console.error("Error al verificar tamaño del archivo:", error);
          }

          newPhotos.push(uri);
        }

        // Actualizar estado local y trickData
        const updatedPhotos = [...localPhotos, ...newPhotos];
        setLocalPhotos(updatedPhotos);
        updateTrickData({
          localFiles: {
            ...trickData.localFiles,
            photos: updatedPhotos,
          },
        });
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "imagePickError",
          "Hubo un error al seleccionar las imágenes. Por favor intenta de nuevo."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Eliminar foto
  const removePhoto = (index: number) => {
    const updatedPhotos = localPhotos.filter((_, i) => i !== index);
    setLocalPhotos(updatedPhotos);
    updateTrickData({
      localFiles: {
        ...trickData.localFiles,
        photos: updatedPhotos,
      },
    });
  };

  // Eliminar todas las fotos
  /* const removeAllPhotos = () => {
    Alert.alert(
      t("confirmDelete", "Confirmar eliminación"),
      t(
        "deleteAllPhotosConfirm",
        "¿Estás seguro de que quieres eliminar todas las fotos?"
      ),
      [
        { text: t("cancel", "Cancelar"), style: "cancel" },
        {
          text: t("delete", "Eliminar"),
          style: "destructive",
          onPress: () => {
            setLocalPhotos([]);
            updateTrickData({
              localFiles: {
                ...trickData.localFiles,
                photos: [],
              },
            });
          },
        },
      ]
    );
  }; */

  // Manejar datos de componentes modales
  const handleSaveTechniques = (techniqueIds: string[]) => {
    updateTrickData({ techniqueIds });
  };

  const handleSaveGimmicks = (gimmickIds: string[]) => {
    updateTrickData({ gimmickIds });
  };

  const handleSaveScript = (newScriptId: string) => {
    updateTrickData({ scriptId: newScriptId });
  };

  // Formatear tiempo de duración para mostrar
  const formatDuration = (durationInSeconds: number | null) => {
    if (!durationInSeconds)
      return t("setDurationTime", "Establecer tiempo de duración");

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;

    if (minutes === 0) {
      return `${seconds} s`;
    } else if (seconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${seconds} s`;
    }
  };

  // Formatear tiempo de reinicio para mostrar
  const formatReset = (resetInSeconds: number | null) => {
    if (!resetInSeconds)
      return t("setResetTime", "Establecer tiempo de reinicio");

    const minutes = Math.floor(resetInSeconds / 60);
    const seconds = resetInSeconds % 60;

    if (minutes === 0) {
      return `${seconds} s`;
    } else if (seconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${seconds} s`;
    }
  };

  // Actualizar el contexto padre con el callback de progreso
  useEffect(() => {
    // Si el padre (AddMagicWizard) necesita el callback de progreso
    if (updateTrickData) {
      updateTrickData({
        uploadProgressCallback: handleUploadProgress,
      } as any);
    }
  }, []);

  return (
    <StyledView className="flex-1">
      {/* Gradiente de fondo */}
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      {/* Encabezado */}
      <StyledView className="flex-row items-center px-6 pt-4">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {trickData.title || t("trickTitle", "[Título Magia]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("statistics", "Estadísticas")}
          </StyledText>
        </StyledView>
        <StyledView className="p-2 opacity-0">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Sección de Estadísticas */}
        <StyledView className="mt-3">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("statistics", "Estadísticas")}
          </StyledText>

          {/* Selección de Ángulos */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.angle")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="angle-acute"
                  size={32}
                  color="white"
                />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#5bb9a3] flex-row items-center justify-between">
                {angles.map((angle) => (
                  <StyledTouchableOpacity
                    key={angle.value}
                    onPress={() => selectAngle(angle.value)}
                    className="flex-row items-center"
                  >
                    <StyledView
                      className={`w-5 h-5 rounded-full border ${
                        trickData.angles.includes(angle.value)
                          ? "border-white bg-white"
                          : "border-white/50"
                      } mr-2`}
                    >
                      {trickData.angles.includes(angle.value) && (
                        <StyledView className="w-3 h-3 rounded-full bg-emerald-800 m-auto" />
                      )}
                    </StyledView>
                    <StyledText className="text-white">
                      {angle.label}
                    </StyledText>
                  </StyledTouchableOpacity>
                ))}
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Tiempo de Duración */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.duration")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="clock" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={openDurationPicker}
              >
                <StyledText className="text-white/70">
                  {formatDuration(trickData.duration)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Tiempo de Reinicio */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.reset")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="refresh-cw" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={openResetTimePicker}
              >
                <StyledText className="text-white/70">
                  {formatReset(trickData.reset)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Deslizador de dificultad */}
          <StyledView className="flex-row mb-3">
            <CustomTooltip
              text={t("tooltips.difficulty")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[70px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="bar-chart" size={28} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#5bb9a3]">
                {/* Componente DifficultySlider */}
                <DifficultySlider
                  value={trickData.difficulty || 5}
                  onChange={handleDifficultyChange}
                  min={1}
                  max={10}
                  step={1}
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Sección de Extras */}
        <StyledView className="mb-2">
          <StyledText className="text-white/60 text-lg font-semibold mb-2">
            {t("extras", "Extras")}
          </StyledText>

          {/* Subida de Imagen con selección local */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.imageUpload")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="image" size={28} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickImage}
                disabled={!encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[15px] border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  <StyledText className="text-white/70 flex-1">
                    {localPhotos.length > 0
                      ? t(
                          "photosSelected",
                          `${localPhotos.length} fotos seleccionadas`
                        )
                      : t("imagesUpload", "Subir Imágenes")}
                  </StyledText>
                  <StyledView className="flex-row items-center">
                    <Feather
                      name={"upload"}
                      size={16}
                      style={{ marginLeft: 4 }}
                    />
                  </StyledView>
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Preview de fotos en pills */}
          {localPhotos.length > 0 && (
            <StyledView className="mb-6 -mt-3">
              <StyledScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {localPhotos.map((photoUri, index) => (
                  <StyledView
                    key={index}
                    className="mr-2 bg-white/5 border border-emerald-500/20 rounded-full flex-row items-center px-2 py-1"
                  >
                    <StyledImage
                      source={{ uri: photoUri }}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <StyledText
                      className="text-white/50 text-xs mr-2"
                      numberOfLines={1}
                    >
                      {`IMG_${(index + 1).toString().padStart(3, "0")}.jpg`}
                    </StyledText>
                    <StyledTouchableOpacity
                      onPress={() => removePhoto(index)}
                      className="p-1"
                    >
                      <Feather
                        name="x"
                        size={12}
                        color="rgba(255,255,255,0.5)"
                      />
                    </StyledTouchableOpacity>
                  </StyledView>
                ))}
              </StyledScrollView>
            </StyledView>
          )}

          {/* Selección de Técnicas */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.techniques")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <MaterialIcons name="animation" size={30} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13px] border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setTechniquesModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedTechniques.length > 0
                    ? `${selectedTechniques.length} ${t(
                        "techniquesSelected",
                        "técnicas seleccionadas"
                      )}`
                    : t("technique", "Técnica")}
                </StyledText>
                <Feather name="link" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Selección de Gimmicks */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.gimmicks")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="box" size={28} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13px] border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setGimmicksModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedGimmicks.length > 0
                    ? `${selectedGimmicks.length} ${t(
                        "gimmicksSelected",
                        "gimmicks seleccionados"
                      )}`
                    : t("gimmicks", "Gimmicks")}
                </StyledText>
                <Feather name="link" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Escritura de Script con Cifrado */}
          <StyledView className="flex-row mb-2">
            <CustomTooltip
              text={t("tooltips.script")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-[48px] h-[48px] bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="text-box-outline"
                  size={28}
                  color="white"
                />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setScriptModalVisible(true)}
              >
                <StyledView className="flex-row items-center flex-1">
                  <StyledText className="text-white/70 flex-1">
                    {scriptData.title
                      ? scriptData.title
                      : t("writeScript", "Escribir Script")}
                  </StyledText>
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>
      <StyledView className="justify-end px-6 pb-6">
        {/* Indicador de paso */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} de ${totalSteps}`}
        </StyledText>

        {/* Botón de Registro de Magia */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            isSubmitting || !encryptionReady ? "bg-white/10" : "bg-emerald-700"
          }`}
          disabled={isSubmitting || !encryptionReady}
          onPress={handleNext}
        >
          <StyledText className="text-white font-semibold text-base">
            {isSubmitting
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Modal de Progreso de Carga */}
      <UploadProgressModal
        visible={showUploadProgress}
        progress={uploadProgress}
        currentFile={currentUploadFile}
        elapsedTime={elapsedTime}
        totalFiles={totalFiles}
        processedFiles={processedFiles}
      />

      {/* Modales */}
      {techniquesModalVisible && (
        <TechniquesModal
          visible={techniquesModalVisible}
          onClose={() => setTechniquesModalVisible(false)}
          techniques={techniques}
          selectedTechniques={selectedTechniques}
          onSave={handleSaveTechniques}
          onToggleSelection={toggleTechniqueSelection}
        />
      )}

      {gimmicksModalVisible && (
        <GimmicksModal
          visible={gimmicksModalVisible}
          onClose={() => setGimmicksModalVisible(false)}
          gimmicks={gimmicks}
          selectedGimmicks={selectedGimmicks}
          onSave={handleSaveGimmicks}
          onToggleSelection={toggleGimmickSelection}
        />
      )}

      {scriptModalVisible && (
        <ScriptModal
          visible={scriptModalVisible}
          onClose={() => setScriptModalVisible(false)}
          scriptData={scriptData}
          onSave={handleSaveScript}
          trickId={trickData.id}
          userId={trickData.user_id}
        />
      )}

      {/* DateTimePicker nativo para duración */}
      {showDurationPicker && (
        <TimePickerModal
          visible={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onConfirm={handleDurationChange}
          initialMinutes={
            trickData.duration ? Math.floor(trickData.duration / 60) : 0
          }
          initialSeconds={trickData.duration ? trickData.duration % 60 : 0}
          title={t("setDurationTime", "Set Duration Time")}
        />
      )}

      {/* DateTimePicker nativo para reinicio */}
      {showResetPicker && (
        <TimePickerModal
          visible={showResetPicker}
          onClose={() => setShowResetPicker(false)}
          onConfirm={handleResetChange}
          initialMinutes={
            trickData.reset ? Math.floor(trickData.reset / 60) : 0
          }
          initialSeconds={trickData.reset ? trickData.reset % 60 : 0}
          title={t("setResetTime", "Set Reset Time")}
        />
      )}
    </StyledView>
  );
}
