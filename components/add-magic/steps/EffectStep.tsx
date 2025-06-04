// components/add-magic/steps/EffectStep.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Feather,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick";
import { supabase } from "../../../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { useEncryption } from "../../../hooks/useEncryption";
import CustomTooltip from "../../ui/Tooltip";
import SuccessCreationModal from "../../ui/SuccessCreationModal";
import { MediaSelector, MediaSelectorRef } from "../../ui/MediaSelector";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface StepProps {
  trickData: EncryptedMagicTrick;
  updateTrickData: (data: Partial<EncryptedMagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  onViewItem?: (trickId: string) => void;
  onSave?: () => void; // Añadir prop para guardar
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
  encryptionTasks?: any;
  setEncryptionTasks?: (tasks: any) => void;
}

export default function EffectStepEncrypted({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  onViewItem,
  onSave, // Recibir función de guardado
  currentStep = 2,
  totalSteps = 3,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false,
}: StepProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  // Referencias a los selectores de media
  const effectVideoRef = useRef<MediaSelectorRef>(null);
  const secretVideoRef = useRef<MediaSelectorRef>(null);
  const photosRef = useRef<MediaSelectorRef>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    error: encryptionError,
  } = useEncryption();

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

  // Navigate to extras step
  const goToExtrasStep = () => {
    if (onNext) {
      onNext();
    }
  };

  // IMPORTANTE: NO implementar handleRegisterMagic aquí
  // El guardado se hace en AddMagicWizardEncrypted.tsx al final de todos los pasos

  return (
    <StyledView className="flex-1">
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

      {/* Header */}
      <StyledView className="flex-row items-center px-6 pt-4 pb-4">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {trickData.title || t("trickTitle", "[Title Magic]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("content", "Contenido")}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity className="p-2 opacity-0">
          <MaterialIcons name="security" size={24} color="#10b981" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Effect Section */}
        <StyledView className="mt-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("effect", "Efecto")}
          </StyledText>

          {/* Effect Video - Usando MediaSelector pero solo para selección local */}
          <MediaSelector
            ref={effectVideoRef}
            type="video"
            multiple={false}
            maxFiles={1}
            maxFileSize={50}
            quality={0.5}
            tooltip={t("tooltips.effectVideo")}
            placeholder={t("uploadEffectVideo", "Subir video del efecto*")}
            onFilesSelected={(files) => {
              // Guardar en trickData para persistir entre steps
              updateTrickData({
                localFiles: {
                  ...trickData.localFiles,
                  effectVideo: files[0]?.uri || null,
                },
              });
            }}
            // NO usar getEncryptedFileIds aquí - el cifrado se hace en el wizard principal
            disableEncryption={true}
          />

          {/* Effect Description */}
          <StyledView className="mb-6 mt-6">
            <StyledView className="flex-row items-center">
              <CustomTooltip
                text={t("tooltips.effectDescription")}
                backgroundColor="rgba(91, 185, 163, 0.95)"
                textColor="white"
              >
                <StyledView className="w-12 h-20 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="creation"
                    size={24}
                    color="white"
                  />
                </StyledView>
              </CustomTooltip>
              <StyledView className="flex-1 ">
                <StyledView className="flex-row"></StyledView>
                <StyledTextInput
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
                  placeholder={t(
                    "effectShortDescription",
                    "Descripción corta del efecto"
                  )}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={trickData.effect}
                  onChangeText={(text) => updateTrickData({ effect: text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Secret Section */}
        <StyledView className="mb-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("secret", "Secreto")}
          </StyledText>

          {/* Secret Video - Usando MediaSelector pero solo para selección local */}
          <MediaSelector
            ref={secretVideoRef}
            type="video"
            multiple={false}
            maxFiles={1}
            maxFileSize={50}
            quality={0.5}
            tooltip={t("tooltips.secretVideo")}
            placeholder={t("secretVideoUpload", "Subir video del secreto")}
            onFilesSelected={(files) => {
              // Guardar en trickData para persistir entre steps
              updateTrickData({
                localFiles: {
                  ...trickData.localFiles,
                  secretVideo: files[0]?.uri || null,
                },
              });
            }}
            disableEncryption={true}
          />

          {/* Secret Description */}
          <StyledView className="mb-6 mt-6">
            <StyledView className="flex-row items-center">
              <CustomTooltip
                text={t("tooltips.secretDescription")}
                backgroundColor="rgba(91, 185, 163, 0.95)"
                textColor="white"
              >
                <StyledView className="w-12 h-20 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
                  <Feather name="lock" size={24} color="white" />
                </StyledView>
              </CustomTooltip>
              <StyledView className="flex-1 ">
                <StyledView className="flex-row"></StyledView>
                <StyledTextInput
                  className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#eafffb]/40 min-h-[80px]"
                  placeholder={t(
                    "effectSecretDescription",
                    "Descripción del secreto del efecto"
                  )}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={trickData.secret}
                  onChangeText={(text) => updateTrickData({ secret: text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Photos Section */}
        <StyledView className="mb-16">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("photos", "Fotos")}
          </StyledText>

          {/* Photos - Usando MediaSelector pero solo para selección local */}
          <MediaSelector
            ref={photosRef}
            type="photo"
            multiple={true}
            maxFiles={10}
            maxFileSize={10}
            quality={0.4}
            tooltip={t("tooltips.imageUpload")}
            placeholder={t("imagesUpload", "Subir Imágenes")}
            onFilesSelected={(files) => {
              // Guardar en trickData para persistir entre steps
              updateTrickData({
                localFiles: {
                  ...trickData.localFiles,
                  photos: files.map((f) => f.uri),
                },
              });
            }}
            disableEncryption={true}
          />
        </StyledView>
      </StyledScrollView>

      <StyledView className="justify-end px-6 pb-6">
        {/* Step indicator */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} de ${totalSteps}`}
        </StyledText>

        {/* Statistics Button */}
        <StyledTouchableOpacity
          className="w-full py-4 rounded-lg items-center justify-center flex-row border border-[#2C6B5C] bg-transparent mb-4"
          onPress={goToExtrasStep}
        >
          <StyledText className="text-white font-semibold text-base">
            {t("statistics", "Estadísticas")}
          </StyledText>
          <StyledText className="text-white/60 text-base ml-1">
            {t("optional", "(Opcional)")}
          </StyledText>
          <Feather
            name="chevron-right"
            size={20}
            color="white"
            style={{ position: "absolute", right: 16 }}
          />
        </StyledTouchableOpacity>

        {/* Register Magic Button - Siempre visible */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            isSubmitting || !encryptionReady ? "bg-white/10" : "bg-emerald-700"
          }`}
          disabled={isSubmitting || !encryptionReady}
          onPress={onSave}
        >
          <StyledText className="text-white font-semibold text-base">
            {isSubmitting
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Success Modal - Se manejará desde el wizard principal */}
    </StyledView>
  );
}
