// components/add-magic/AddMagicWizard.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabase";
import { compressionService } from "../../utils/compressionService";
import { uploadFileToStorage } from "../../services/fileUploadService";
import type { MagicTrick, MagicTrickDBRecord } from "../../types/magicTrick";
import TitleCategoryStep from "./steps/TitleCategoryStep";
import EffectStep from "./steps/EffectStep";
import ExtrasStep from "./steps/ExtrasStep";
import SuccessCreationModal from "../ui/SuccessCreationModal";

interface AddMagicWizardProps {
  onComplete?: (trickId: string) => void;
  onCancel?: () => void;
  onViewItem?: (trickId: string) => void;
}

export default function AddMagicWizard({
  onComplete,
  onCancel,
  onViewItem,
}: AddMagicWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  // Estado del truco sin cifrado
  const [trickData, setTrickData] = useState<MagicTrick>({
    title: "",
    categories: [],
    tags: [],
    selectedCategoryId: null,
    effect: "",
    effect_video_url: null,
    angles: [],
    duration: null,
    reset: null,
    difficulty: 5,
    secret: "",
    secret_video_url: null,
    special_materials: [],
    notes: "",
    script: "",
    photo_url: null,
    techniqueIds: [],
    gimmickIds: [],
    is_public: false,
    status: "draft",
    price: null,
    localFiles: {
      effectVideo: null,
      secretVideo: null,
      photos: [],
    },
  });

  // Actualizar datos del truco
  const updateTrickData = (data: Partial<MagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }));
  };

  // Función para actualizar el contador de uso de las etiquetas
  const updateTagsUsageCount = async (tagIds: string[]) => {
    try {
      if (!tagIds || tagIds.length === 0) return;

      for (const tagId of tagIds) {
        const { error } = await supabase.rpc("increment_tag_usage", {
          tag_id: tagId,
        });

        if (error) {
          console.error(
            `Error incrementing usage count for tag ${tagId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error);
    }
  };

  // Pasos del asistente
  const steps = [
    {
      title: t("titleAndCategories", "Title & Categories"),
      component: TitleCategoryStep,
    },
    { title: t("effect", "Effect"), component: EffectStep },
    { title: t("extras", "Extras"), component: ExtrasStep },
  ];

  // Validación de los campos obligatorios
  const validateCurrentStep = (): {
    isValid: boolean;
    errorMessage?: string;
  } => {
    return { isValid: true }; // Siempre devuelve true, ya no hay campos obligatorios.
  };

  const isNextButtonDisabled = useMemo(() => {
    const validation = validateCurrentStep();
    return !validation.isValid;
  }, [trickData, currentStep]);

  // Ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  // Ir al siguiente paso
  const goToNextStep = async () => {
    try {
      const validation = validateCurrentStep();

      if (!validation.isValid) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          validation.errorMessage,
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      if (currentStep === steps.length - 1) {
        await handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Error in goToNextStep:", error);
      Alert.alert(
        t("error", "Error"),
        t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Verificar o crear perfil de usuario
  const ensureUserProfile = async (userId: string, email: string) => {
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking profile:", profileError);
      throw new Error("Error checking user profile");
    }

    if (!existingProfile) {
      const username = email.split("@")[0];
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email: email,
        username: username,
        is_active: true,
        is_verified: false,
        subscription_type: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error creating profile:", insertError);
        throw new Error("Could not create user profile");
      }
    }

    return userId;
  };

  // Subir archivo con compresión
  const uploadFileWithCompression = async (
    uri: string,
    folder: string,
    fileType: string,
    fileName: string,
    userId: string
  ): Promise<string | null> => {
    try {
      console.log(`📤 Subiendo archivo: ${fileName}`);

      // Comprimir si es necesario
      const compressionResult = await compressionService.compressFile(
        uri,
        fileType,
        { quality: 0.7, maxWidth: 1920 }
      );

      console.log(
        `📊 Compresión: ${
          compressionResult.wasCompressed ? "Sí" : "No"
        } - Ratio: ${compressionResult.ratio}`
      );

      // Subir archivo (comprimido o original)
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

  // Enviar el truco a la base de datos
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      console.log("🚀 INICIANDO GUARDADO DE TRUCO");

      // Obtener usuario
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"));
        return;
      }

      const profileId = await ensureUserProfile(user.id, user.email || "");

      // Subir archivos multimedia
      let photoUrl = null;
      let effectVideoUrl = null;
      let secretVideoUrl = null;

      // Subir video de efecto
      if (trickData.localFiles?.effectVideo) {
        effectVideoUrl = await uploadFileWithCompression(
          trickData.localFiles.effectVideo,
          `${profileId}/effects`,
          "video/mp4",
          `effect_${Date.now()}.mp4`,
          profileId
        );
      }

      // Subir video secreto
      if (trickData.localFiles?.secretVideo) {
        secretVideoUrl = await uploadFileWithCompression(
          trickData.localFiles.secretVideo,
          `${profileId}/secrets`,
          "video/mp4",
          `secret_${Date.now()}.mp4`,
          profileId
        );
      }

      // Subir fotos
      const uploadedPhotos: string[] = [];
      if (
        trickData.localFiles?.photos &&
        trickData.localFiles.photos.length > 0
      ) {
        for (let i = 0; i < trickData.localFiles.photos.length; i++) {
          const photoUri = trickData.localFiles.photos[i];
          const photoUrl = await uploadFileWithCompression(
            photoUri,
            `${profileId}/photos`,
            "image/jpeg",
            `photo_${Date.now()}_${i}.jpg`,
            profileId
          );
          if (photoUrl) {
            uploadedPhotos.push(photoUrl);
          }
        }
        // Usar la primera foto como principal
        if (uploadedPhotos.length > 0) {
          photoUrl = uploadedPhotos[0];
        }
      }

      // Generar ID único
      const trickId = uuidv4();

      // Crear truco usando la nueva función
      const { data, error } = await supabase.rpc("create_magic_trick", {
        p_trick_id: trickId,
        p_user_id: profileId,
        p_title: trickData.title || "",
        p_effect: trickData.effect || "",
        p_secret: trickData.secret || "",
        p_duration: trickData.duration,
        p_angles: trickData.angles,
        p_notes: trickData.notes || "",
        p_special_materials: trickData.special_materials,
        p_is_public: trickData.is_public,
        p_status: trickData.status,
        p_price: trickData.price,
        p_photo_url: photoUrl,
        p_effect_video_url: effectVideoUrl,
        p_secret_video_url: secretVideoUrl,
        p_reset: trickData.reset,
        p_difficulty: trickData.difficulty,
      });

      if (error) {
        console.error("❌ Error al crear el truco:", error);
        Alert.alert(
          t("error"),
          t("errorCreatingTrick", "Error creando el truco")
        );
        return;
      }

      console.log("✅ Truco creado exitosamente");

      // Asociar categoría
      if (trickData.selectedCategoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: trickData.selectedCategoryId,
          created_at: new Date().toISOString(),
        });
      }

      // Asociar etiquetas
      if (trickData.tags.length > 0) {
        const tagInserts = trickData.tags.map((tagId) => ({
          trick_id: trickId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_tags").insert(tagInserts);
        await updateTagsUsageCount(trickData.tags);
      }

      // Guardar script si existe
      if (trickData.script?.trim()) {
        await supabase.from("scripts").insert({
          user_id: profileId,
          trick_id: trickId,
          title: `Script for ${trickData.title}`,
          content: trickData.script.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Asociar técnicas
      if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
        const techniqueInserts = trickData.techniqueIds.map((techniqueId) => ({
          trick_id: trickId,
          technique_id: techniqueId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_techniques").insert(techniqueInserts);
      }

      // Asociar gimmicks
      if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
        const gimmickInserts = trickData.gimmickIds.map((gimmickId) => ({
          trick_id: trickId,
          gimmick_id: gimmickId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_gimmicks").insert(gimmickInserts);
      }

      // Guardar fotos adicionales en una tabla separada si es necesario
      if (uploadedPhotos.length > 1) {
        // Aquí podrías guardar las fotos adicionales si tienes una tabla para ello
        // Por ahora solo usamos la primera foto como principal
      }

      // Éxito
      setCreatedItemId(trickId);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Error durante el guardado:", error);
      Alert.alert(
        t("error", "Error"),
        error instanceof Error
          ? error.message
          : t("unexpectedError", "Ocurrió un error inesperado")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    if (onComplete && createdItemId) {
      onComplete(createdItemId);
    }
  };

  const handleViewItem = async () => {
    setShowSuccessModal(false);
    if (createdItemId && onViewItem) {
      onViewItem(createdItemId);
    }
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    // Reset form data
    setTrickData({
      title: "",
      categories: [],
      tags: [],
      selectedCategoryId: null,
      effect: "",
      effect_video_url: null,
      angles: [],
      duration: null,
      reset: null,
      difficulty: 5,
      secret: "",
      secret_video_url: null,
      special_materials: [],
      notes: "",
      script: "",
      photo_url: null,
      techniqueIds: [],
      gimmickIds: [],
      is_public: false,
      status: "draft",
      price: null,
      localFiles: {
        effectVideo: null,
        secretVideo: null,
        photos: [],
      },
    });
    setCurrentStep(0);
  };

  // Renderizar el componente del paso actual
  const StepComponent = steps[currentStep].component;

  return (
    <>
      <StepComponent
        trickData={trickData}
        updateTrickData={updateTrickData}
        onNext={goToNextStep}
        onCancel={goToPreviousStep}
        onSave={handleSubmit}
        currentStep={currentStep + 1}
        totalSteps={steps.length}
        isSubmitting={isSubmitting}
        isNextButtonDisabled={isNextButtonDisabled}
        isLastStep={currentStep === steps.length - 1}
      />

      {/* Success Modal */}
      <SuccessCreationModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onViewItem={handleViewItem}
        onAddAnother={handleAddAnother}
        itemName={trickData.title || t("common.trick", "Trick")}
        itemType="trick"
      />
    </>
  );
}
