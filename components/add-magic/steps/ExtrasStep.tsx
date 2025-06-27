// components/add-magic/steps/ExtrasStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import type { MagicTrick } from "../../../types/magicTrick";
import { supabase } from "../../../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import CustomTooltip from "../../ui/Tooltip";
import { fontNames } from "../../../app/_layout";

// Importar modales
import TechniquesModal from "../../../components/add-magic/ui/TechniquesModal";
import GimmicksModal from "../../../components/add-magic/ui/GimmicksModal";
import ScriptModal from "../../../components/add-magic/ui/ScriptModal";
import DifficultySlider from "../../../components/add-magic/ui/DifficultySlider";
import TimePickerModal from "../ui/TimePickerModal";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);

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
  trickData: MagicTrick;
  updateTrickData: (data: Partial<MagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
  isEditMode?: boolean;
}

// Componente de Modal de Progreso (actualizado sin referencias a cifrado)
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
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        display: visible ? "flex" : "none",
      }}
    >
      <StyledView className="bg-[#1a3a32] rounded-2xl p-6 mx-6 w-full max-w-sm">
        {/* Header */}
        <StyledView className="items-center mb-6">
          <StyledView className="w-16 h-16 bg-emerald-500/20 rounded-full items-center justify-center mb-4">
            <MaterialIcons name="cloud-upload" size={32} color="#10b981" />
          </StyledView>
          <StyledText
            className="text-white text-lg font-semibold mb-2"
            style={{
              fontFamily: fontNames.light,
              fontSize: 20,
              includeFontPadding: false,
            }}
          >
            {t("uploadingFiles", "Subiendo archivos")}
          </StyledText>
          <StyledText
            className="text-[#FFFFFF]/50 text-sm text-center"
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              includeFontPadding: false,
            }}
          >
            {t(
              "compressingAndUploading",
              "Comprimiendo y subiendo tus archivos"
            )}
          </StyledText>
        </StyledView>

        {/* Progress Info */}
        <StyledView className="mb-4">
          <StyledView className="flex-row justify-between mb-2">
            <StyledText
              className="text-white/80 text-sm"
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
              {t("file", "Archivo")} {processedFiles}/{totalFiles}
            </StyledText>
            <StyledText
              className="text-emerald-400 text-sm font-medium"
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
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
            <StyledText
              className="text-white/50 text-xs mb-1"
              style={{
                fontFamily: fontNames.light,
                fontSize: 12,
                includeFontPadding: false,
              }}
            >
              {t("processing", "Procesando")}:
            </StyledText>
            <StyledText
              className="text-white/80 text-sm"
              numberOfLines={1}
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
              {currentFile || t("preparingFiles", "Preparando archivos...")}
            </StyledText>
          </StyledView>

          {/* Timer */}
          <StyledView className="flex-row items-center justify-center">
            <Feather name="clock" size={16} color="rgba(255,255,255,0.6)" />
            <StyledText
              className="text-white/60 text-sm ml-2"
              style={{
                fontFamily: fontNames.light,
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
              {t("elapsedTime", "Tiempo transcurrido")}:{" "}
              {formatTime(elapsedTime)}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Estimated Time (opcional) */}
        {progress > 10 && (
          <StyledView className="border-t border-white/10 pt-4">
            <StyledText
              className="text-white/40 text-xs text-center"
              style={{
                fontFamily: fontNames.light,
                fontSize: 12,
                includeFontPadding: false,
              }}
            >
              {t("estimatedRemaining", "Tiempo estimado restante")}:{" "}
              {formatTime(
                Math.round((elapsedTime / progress) * (100 - progress))
              )}
            </StyledText>
          </StyledView>
        )}

        {/* Compression Note */}
        <StyledView className="flex-row items-center justify-center mt-4">
          <MaterialIcons
            name="compress"
            size={12}
            color="rgba(16, 185, 129, 0.6)"
          />
          <StyledText
            className="text-emerald-500/60 text-xs ml-1"
            style={{
              fontFamily: fontNames.light,
              fontSize: 12,
              includeFontPadding: false,
            }}
          >
            {t("automaticCompression", "Compresión automática")}
          </StyledText>
        </StyledView>
      </StyledView>
    </View>
  );
};

export default function ExtrasStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 3,
  totalSteps = 3,
  isSubmitting = false,
  isLastStep = true,
  isEditMode = false,
}: StepProps) {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const notesInputRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Estados para el progreso de carga
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Handle keyboard show/hide events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);

        // Auto-scroll when keyboard shows if notes field is focused
        if (notesInputRef.current) {
          setTimeout(() => {
            handleNotesFocus();
          }, 100);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Function to scroll to notes input when focused
  const handleNotesFocus = () => {
    setTimeout(() => {
      if (notesInputRef.current && scrollViewRef.current) {
        notesInputRef.current.measureLayout(
          scrollViewRef.current as any,
          (x, y, width, height) => {
            // Calculate the position to scroll to
            const screenHeight = Dimensions.get("window").height;
            const keyboardSpace = keyboardHeight || 300; // Use default if keyboard height not yet available
            const headerHeight = 120; // Approximate header height
            const bottomButtonHeight = 100; // Height of bottom section
            const visibleHeight =
              screenHeight - keyboardSpace - headerHeight - bottomButtonHeight;

            // Scroll to position the notes field in the middle of visible area
            const targetY = y - visibleHeight / 2 + height / 2;

            scrollViewRef.current?.scrollTo({
              y: Math.max(0, targetY),
              animated: true,
            });
          },
          () => {
            console.log("Failed to measure layout");
          }
        );
      }
    }, 300); // Increased delay to ensure keyboard is fully shown
  };

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
      const photoCount = trickData.localFiles?.photos?.length || 0;
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

  // Seleccionar ángulo (estilo botón de radio) - OPCIÓN ÚNICA
  const selectAngle = (angle: string): void => {
    updateTrickData({ angles: [angle] });
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

  // Manejar datos de componentes modales
  const handleSaveTechniques = (techniqueIds: string[]) => {
    updateTrickData({ techniqueIds });
    setTechniquesModalVisible(false);
  };

  const handleSaveGimmicks = (gimmickIds: string[]) => {
    updateTrickData({ gimmickIds });
    setGimmicksModalVisible(false);
  };

  const handleSaveScript = (scriptContent: string) => {
    updateTrickData({ script: scriptContent });
    setScriptModalVisible(false);
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
    if (updateTrickData) {
      updateTrickData({
        uploadProgressCallback: handleUploadProgress,
      } as any);
    }
  }, []);

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
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
        <StyledView className="px-2 pt-4">
          <StyledView className="flex-row items-center justify-between">
            <StyledTouchableOpacity onPress={onCancel} className="p-2">
              <Feather name="chevron-left" size={24} color="white" />
            </StyledTouchableOpacity>

            <StyledText
              className="text-white text-lg font-semibold"
              style={{
                fontFamily: fontNames.light,
                fontSize: 20,
                includeFontPadding: false,
              }}
            >
              {trickData.title || t("trickTitle", "[Título Magia]")}
            </StyledText>

            <StyledView className="p-2 opacity-0">
              <Feather name="chevron-left" size={24} color="white" />
            </StyledView>
          </StyledView>

          <StyledText
            className="text-[#FFFFFF]/50 text-sm opacity-70 text-center"
            style={{
              fontFamily: fontNames.light,
              fontSize: 16,
              includeFontPadding: false,
            }}
          >
            {t("statistics", "Estadísticas")}
          </StyledText>
        </StyledView>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 100}
        >
          <StyledScrollView
            ref={scrollViewRef}
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? 20 : 100,
            }}
          >
            {/* Sección de Estadísticas */}
            <StyledView className="mt-3">
              <StyledText
                className="text-white/60 text-lg font-semibold mb-4"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {t("statistics", "Estadísticas")}
              </StyledText>

              {/* Selección de Ángulos */}
              <StyledView className="flex-row mb-6">
                <CustomTooltip
                  text={t("tooltips.angle")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-[48px] h-[48px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="angle-acute"
                      size={32}
                      color="white"
                    />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1">
                  <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between">
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
                        <StyledText
                          className="text-white"
                          style={{
                            fontFamily: fontNames.light,
                            fontSize: 14,
                            includeFontPadding: false,
                          }}
                        >
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
                  <StyledView className="w-[48px] h-[48px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <Feather name="clock" size={24} color="white" />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1">
                  <StyledTouchableOpacity
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between"
                    onPress={() => setShowDurationPicker(true)}
                  >
                    <StyledText
                      className="text-white/70"
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
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
                  <StyledView className="w-[48px] h-[48px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <Feather name="refresh-cw" size={24} color="white" />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1">
                  <StyledTouchableOpacity
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between"
                    onPress={() => setShowResetPicker(true)}
                  >
                    <StyledText
                      className="text-white/70"
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {formatReset(trickData.reset)}
                    </StyledText>
                    <Feather name="plus" size={20} color="white" />
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>

              {/* Deslizador de dificultad */}
              <StyledView className="flex-row mb-6">
                <CustomTooltip
                  text={t("tooltips.difficulty")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-[48px] h-[70px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <Feather name="bar-chart" size={28} color="white" />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1">
                  <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#eafffb]/40">
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

              {/* Notes Field */}
              <StyledView className="flex-row mb-6" ref={notesInputRef}>
                <CustomTooltip
                  text={t("tooltips.notes")}
                  backgroundColor="rgba(91, 185, 163, 0.95)"
                  textColor="white"
                >
                  <StyledView className="w-[48px] h-[180px] bg-[#D4D4D4]/10 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="text-box-outline"
                      size={28}
                      color="white"
                    />
                  </StyledView>
                </CustomTooltip>
                <StyledView className="flex-1">
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[180px]"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                    placeholder={t("notes", "Notas")}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.notes || ""}
                    onChangeText={(text) => updateTrickData({ notes: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onFocus={handleNotesFocus}
                    returnKeyType="default"
                  />
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledScrollView>
        </KeyboardAvoidingView>

        <StyledView className="px-6 pb-6">
          {/* Indicador de paso */}
          <StyledText
            className="text-center text-white/60 mb-4"
            style={{
              fontFamily: fontNames.light,
              fontSize: 14,
              includeFontPadding: false,
            }}
          >
            {`${currentStep} de ${totalSteps}`}
          </StyledText>

          {/* Botón de Registro de Magia */}
          <StyledTouchableOpacity
            className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
              isSubmitting ? "bg-white/10" : "bg-[#2C6B5C]"
            }`}
            disabled={isSubmitting}
            onPress={handleNext}
          >
            <StyledText
              className="text-white font-semibold text-base"
              style={{
                fontFamily: fontNames.light,
                fontSize: 18,
                includeFontPadding: false,
              }}
            >
              {isSubmitting
                ? t("saving", "Guardando...")
                : isEditMode
                ? t("updateMagic", "Actualizar Magia")
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
    </TouchableWithoutFeedback>
  );
}
