// components/add-magic/steps/ExtrasStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { MagicTrick } from "../../../types/magicTrick";
import { LinearGradient } from "expo-linear-gradient";
import { fontNames } from "../../../app/_layout";

// Importar modales y componentes necesarios
import DifficultySlider from "../../../components/add-magic/ui/DifficultySlider";
import TimePickerModal from "../ui/TimePickerModal";
import UploadProgressModal from "../ui/UploadProgressModal";
import { FullScreenTextModal } from "../../ui/FullScreenTextModal";
import { StatField } from "../../ui/StatField";
import { useKeyboardScrolling } from "../../../hooks/useKeyboardScrolling";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);

// Constantes
const TOOLTIP_BG_COLOR = "rgba(91, 185, 163, 0.95)";

const LAYOUT_CONSTANTS = {
  HEADER_HEIGHT: 120,
  BOTTOM_BUTTON_HEIGHT: 100,
  KEYBOARD_DEFAULT_HEIGHT: 300,
  KEYBOARD_SCROLL_DELAY: 300,
} as const;

const ANGLE_OPTIONS = [
  { value: "90", label: "90°" },
  { value: "120", label: "120°" },
  { value: "180", label: "180°" },
  { value: "360", label: "360°" },
] as const;

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

const { width } = Dimensions.get("window");

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

  // Custom hook para manejo del teclado
  const { keyboardHeight, scrollToInput } = useKeyboardScrolling(
    scrollViewRef,
    notesInputRef,
    {
      headerHeight: LAYOUT_CONSTANTS.HEADER_HEIGHT,
      bottomHeight: LAYOUT_CONSTANTS.BOTTOM_BUTTON_HEIGHT,
      scrollDelay: LAYOUT_CONSTANTS.KEYBOARD_SCROLL_DELAY,
      defaultKeyboardHeight: LAYOUT_CONSTANTS.KEYBOARD_DEFAULT_HEIGHT,
    }
  );

  // Estados para el progreso de carga
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para los selectores de tiempo
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResetPicker, setShowResetPicker] = useState(false);

  // Estado para el modal de notas
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
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

  // Seleccionar ángulo - toggle on/off
  const selectAngle = (angle: string): void => {
    const isSelected = trickData.angles.includes(angle);
    updateTrickData({ angles: isSelected ? [] : [angle] });
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

  // Formatear tiempo para mostrar (duración o reinicio)
  const formatTime = (timeInSeconds: number | null, placeholder: string) => {
    if (!timeInSeconds) return placeholder;

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;

    if (minutes === 0) return `${seconds} s`;
    if (seconds === 0) return `${minutes} min`;
    return `${minutes} min ${seconds} s`;
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
        <StyledView className="pt-4" style={{ paddingHorizontal: 8 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Botón izquierdo: centrado verticalmente considerando su padding */}
            <StyledTouchableOpacity
              onPress={onCancel}
              className="p-2"
              style={{ width: 40, flexShrink: 0, marginTop: 0 }}
            >
              <Feather name="chevron-left" size={24} color="white" />
            </StyledTouchableOpacity>

            {/* Contenedor del texto: alineado para que la primera línea quede centrada */}
            <StyledView style={{
              flex: 1,
              paddingHorizontal: 8,
              maxWidth: width - 96,
              marginTop: 6, // Ajuste fino para centrar la primera línea con los iconos
            }}>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  lineHeight: 24,
                  color: 'white',
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {trickData.title || t("trickTitle", "[Título Magia]")}
              </Text>
            </StyledView>

            {/* Elemento invisible para balancear el layout */}
            <StyledView className="p-2 opacity-0" style={{ width: 40, flexShrink: 0, marginTop: 0 }}>
              <Feather name="chevron-left" size={24} color="white" />
            </StyledView>
          </StyledView>
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
                className="text-white text-lg mb-4"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {t("statistics", "Statistics")}
              </StyledText>

              {/* Selección de Ángulos */}
              <StatField
                icon={
                  <MaterialCommunityIcons
                    name="angle-acute"
                    size={32}
                    color="white"
                  />
                }
                tooltip={t("tooltips.angle")}
                tooltipBgColor={TOOLTIP_BG_COLOR}
              >
                <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between">
                  {ANGLE_OPTIONS.map((angle) => (
                    <StyledTouchableOpacity
                      key={angle.value}
                      onPress={() => selectAngle(angle.value)}
                      className="flex-row items-center"
                      accessible={true}
                      accessibilityRole="radio"
                      accessibilityLabel={`${angle.label} ${t("angle", "angle")}`}
                      accessibilityState={{
                        checked: trickData.angles.includes(angle.value),
                      }}
                      accessibilityHint={t(
                        "accessibility.selectAngle",
                        "Select this angle option"
                      )}
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
              </StatField>

              {/* Tiempo de Duración */}
              <StatField
                icon={<Feather name="clock" size={24} color="white" />}
                tooltip={t("tooltips.duration")}
                tooltipBgColor={TOOLTIP_BG_COLOR}
              >
                <StyledTouchableOpacity
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between"
                  onPress={() => setShowDurationPicker(true)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "accessibility.setDuration",
                    "Set duration time"
                  )}
                  accessibilityValue={{
                    text: formatTime(
                      trickData.duration,
                      t("setDurationTime", "Set duration time")
                    ),
                  }}
                >
                  <StyledText
                    className="text-white/70"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {formatTime(
                      trickData.duration,
                      t("setDurationTime", "Set duration time")
                    )}
                  </StyledText>
                  <Feather name="plus" size={20} color="white" />
                </StyledTouchableOpacity>
              </StatField>

              {/* Tiempo de Reinicio */}
              <StatField
                icon={<Feather name="refresh-cw" size={24} color="white" />}
                tooltip={t("tooltips.reset")}
                tooltipBgColor={TOOLTIP_BG_COLOR}
              >
                <StyledTouchableOpacity
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg px-3 py-[13.5px] border border-[#eafffb]/40 flex-row items-center justify-between"
                  onPress={() => setShowResetPicker(true)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "accessibility.setReset",
                    "Set reset time"
                  )}
                  accessibilityValue={{
                    text: formatTime(
                      trickData.reset,
                      t("setResetTime", "Set reset time")
                    ),
                  }}
                >
                  <StyledText
                    className="text-white/70"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {formatTime(trickData.reset, t("setResetTime", "Set reset time"))}
                  </StyledText>
                  <Feather name="plus" size={20} color="white" />
                </StyledTouchableOpacity>
              </StatField>

              {/* Deslizador de dificultad */}
              <StatField
                icon={<Feather name="bar-chart" size={28} color="white" />}
                tooltip={t("tooltips.difficulty")}
                tooltipBgColor={TOOLTIP_BG_COLOR}
                iconHeight={70}
              >
                <StyledView
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#eafffb]/40"
                  accessible={true}
                  accessibilityRole="adjustable"
                  accessibilityLabel={t(
                    "accessibility.difficulty",
                    "Difficulty level"
                  )}
                  accessibilityValue={{
                    min: 1,
                    max: 10,
                    now: trickData.difficulty || undefined,
                    text: `${trickData.difficulty} ${t("outOf", "out of")} 10`,
                  }}
                >
                  {/* Componente DifficultySlider */}
                  <DifficultySlider
                    value={trickData.difficulty}
                    onChange={handleDifficultyChange}
                    min={1}
                    max={10}
                    step={1}
                  />
                </StyledView>
              </StatField>
            </StyledView>

            {/* Sección Extra */}
            <StyledView className="mt-6">
              <StyledText
                className="text-white text-lg mb-4"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {t("extra", "Extra")}
              </StyledText>

              {/* Notes Field */}
              <StatField
                icon={
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={28}
                    color="white"
                  />
                }
                tooltip={t("tooltips.notes")}
                tooltipBgColor={TOOLTIP_BG_COLOR}
                iconHeight={120}
                inputRef={notesInputRef}
              >
                <StyledView className="flex-1 relative" style={{ height: 120 }}>
                  <StyledTextInput
                    className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                      paddingRight: 40,
                      height: 120,
                      maxHeight: 120,
                    }}
                    placeholder={t("notes", "Notes")}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={trickData.notes || ""}
                    onChangeText={(text) => updateTrickData({ notes: text })}
                    maxLength={3000}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    scrollEnabled={true}
                    onFocus={scrollToInput}
                    returnKeyType="default"
                    accessible={true}
                    accessibilityLabel={t("accessibility.notes", "Notes")}
                    accessibilityHint={t(
                      "accessibility.notesHint",
                      "Add notes about this trick"
                    )}
                  />
                  {/* Expand button */}
                  <StyledTouchableOpacity
                    onPress={() => setShowNotesModal(true)}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded items-center justify-center"
                    style={{ zIndex: 10 }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "accessibility.expandNotes",
                      "Expand notes to full screen"
                    )}
                  >
                    <Feather
                      name="maximize-2"
                      size={16}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </StyledTouchableOpacity>
                </StyledView>
              </StatField>
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
            {`${currentStep} ${t("of", "of")} ${totalSteps}`}
          </StyledText>

          {/* Botón de Registro de Magia */}
          <StyledTouchableOpacity
            className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
              isSubmitting ? "bg-white/10" : "bg-[#2C6B5C]"
            }`}
            disabled={isSubmitting}
            onPress={handleNext}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={
              isSubmitting
                ? t("accessibility.saving", "Saving magic trick")
                : isEditMode
                ? t("accessibility.updateMagic", "Update magic trick")
                : t("accessibility.registerMagic", "Register magic trick")
            }
            accessibilityState={{
              disabled: isSubmitting,
              busy: isSubmitting,
            }}
            accessibilityHint={
              isEditMode
                ? t(
                    "accessibility.updateMagicHint",
                    "Save changes to your magic trick"
                  )
                : t(
                    "accessibility.registerMagicHint",
                    "Create a new magic trick in your library"
                  )
            }
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
                ? t("saving", "Saving...")
                : isEditMode
                ? t("updateMagic", "Update Magic")
                : t("registerMagic", "Register Magic")}
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

        {/* Modal de pantalla completa para notas */}
        <FullScreenTextModal
          visible={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          value={trickData.notes || ""}
          onSave={(text) => updateTrickData({ notes: text })}
          title={t("notes", "Notes")}
          placeholder={t("notes", "Notes")}
        />
      </StyledView>
    </TouchableWithoutFeedback>
  );
}
