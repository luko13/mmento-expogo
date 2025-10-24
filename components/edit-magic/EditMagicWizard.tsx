// components/edit-magic/EditMagicWizard.tsx
"use client";

import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";
import { compressionService } from "../../utils/compressionService";
import { uploadFileToStorage } from "../../services/fileUploadService";
import type { MagicTrick, MagicTrickDBRecord } from "../../types/magicTrick";
import TitleCategoryStep from "../add-magic/steps/TitleCategoryStep";
import EffectStep from "../add-magic/steps/EffectStep";
import ExtrasStep from "../add-magic/steps/ExtrasStep";
import { useLibraryData } from "../../context/LibraryDataContext";

interface EditMagicWizardProps {
  trickId: string;
  initialStep?: number;
  onComplete?: (trickId: string, trickTitle: string) => void;
  onCancel?: () => void;
}

export default function EditMagicWizard({
  trickId,
  initialStep,
  onComplete,
  onCancel,
}: EditMagicWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh: refreshLibrary } = useLibraryData();
  const [currentStep, setCurrentStep] = useState(initialStep || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estado del truco
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

  // Cargar datos existentes del truco
  useEffect(() => {
    loadTrickData();
  }, [trickId]);

  const loadTrickData = async () => {
    try {
      setIsLoading(true);

      // Cargar datos básicos del truco
      const { data: trick, error: trickError } = await supabase
        .from("magic_tricks")
        .select("*")
        .eq("id", trickId)
        .single();

      if (trickError) throw trickError;

      // Cargar categoría
      const { data: categoryData } = await supabase
        .from("trick_categories")
        .select("category_id")
        .eq("trick_id", trickId)
        .single();

      // Cargar tags
      const { data: tagsData } = await supabase
        .from("trick_tags")
        .select("tag_id")
        .eq("trick_id", trickId);

      // Cargar técnicas
      const { data: techniquesData } = await supabase
        .from("trick_techniques")
        .select("technique_id")
        .eq("trick_id", trickId);

      // Cargar gimmicks
      const { data: gimmicksData } = await supabase
        .from("trick_gimmicks")
        .select("gimmick_id")
        .eq("trick_id", trickId);

      // Cargar script si existe
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("content")
        .eq("trick_id", trickId)
        .single();

      // Actualizar estado con datos cargados
      setTrickData({
        ...trickData,
        title: trick.title || "",
        selectedCategoryId: categoryData?.category_id || null,
        tags: tagsData?.map(t => t.tag_id) || [],
        effect: trick.effect || "",
        effect_video_url: trick.effect_video_url || null,
        angles: trick.angles || [],
        duration: trick.duration || null,
        reset: trick.reset || null,
        difficulty: trick.difficulty || 5,
        secret: trick.secret || "",
        secret_video_url: trick.secret_video_url || null,
        special_materials: trick.special_materials || [],
        notes: trick.notes || "",
        script: scriptData?.content || "",
        photo_url: trick.photo_url || null,
        techniqueIds: techniquesData?.map(t => t.technique_id) || [],
        gimmickIds: gimmicksData?.map(g => g.gimmick_id) || [],
        is_public: trick.is_public || false,
        status: trick.status || "draft",
        price: trick.price || null,
        // Mantener localFiles vacío ya que son URLs existentes
        localFiles: {
          effectVideo: null,
          secretVideo: null,
          photos: [],
        },
      });

    } catch (error) {
      console.error("Error loading trick data:", error);
      Alert.alert(
        t("error"),
        t("errorLoadingTrick", "Error loading trick data")
      );
      if (onCancel) onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar datos del truco
  const updateTrickData = (data: Partial<MagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }));
  };

  // Actualizar contador de uso de tags
  const updateTagsUsageCount = async (newTags: string[], oldTags: string[]) => {
    try {
      // Incrementar uso de nuevos tags
      const addedTags = newTags.filter(tag => !oldTags.includes(tag));
      for (const tagId of addedTags) {
        await supabase.rpc("increment_tag_usage", { tag_id: tagId });
      }

      // Decrementar uso de tags removidos
      const removedTags = oldTags.filter(tag => !newTags.includes(tag));
      for (const tagId of removedTags) {
        await supabase.rpc("decrement_tag_usage", { tag_id: tagId });
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

  // Validación
  const validateCurrentStep = (): {
    isValid: boolean;
    errorMessage?: string;
  } => {
    return { isValid: true };
  };

  const isNextButtonDisabled = false;

  // Navegación
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  const goToNextStep = async () => {
    try {
      if (currentStep === steps.length - 1) {
        await handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Error in goToNextStep:", error);
      Alert.alert(
        t("error", "Error"),
        t("unexpectedError", "An unexpected error occurred")
      );
    }
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
      console.log(`📤 [EDIT] Subiendo archivo: ${fileName}`);
      console.log(`📍 URI original: ${uri}`);

      // Verificar que el archivo existe ANTES de hacer nada
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log(`🔍 Archivo existe: ${fileInfo.exists}`);

      if (!fileInfo.exists) {
        console.error(`❌ El archivo NO existe en: ${uri}`);
        return null;
      }

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

      // Usar el archivo comprimido si existe, sino el original
      const fileToUpload = compressionResult.wasCompressed
        ? compressionResult.uri
        : uri;

      console.log(`📤 Subiendo desde: ${fileToUpload}`);

      // Subir archivo
      const uploadUrl = await uploadFileToStorage(
        fileToUpload,
        userId,
        folder,
        fileType,
        fileName
      );

      // Limpiar archivo comprimido si se creó
      if (compressionResult.wasCompressed && compressionResult.uri !== uri) {
        try {
          await FileSystem.deleteAsync(compressionResult.uri, { idempotent: true });
          console.log(`🧹 Archivo comprimido limpiado`);
        } catch (cleanupError) {
          console.warn("Error limpiando archivo comprimido:", cleanupError);
        }
      }

      return uploadUrl;
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      return null;
    }
  };

  // Actualizar el truco
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "User not found"));
        return;
      }

      // Cargar tags antiguos para comparación
      const { data: oldTagsData } = await supabase
        .from("trick_tags")
        .select("tag_id")
        .eq("trick_id", trickId);
      const oldTags = oldTagsData?.map(t => t.tag_id) || [];

      // Subir nuevos archivos si existen
      let photoUrl = trickData.photo_url;
      let effectVideoUrl = trickData.effect_video_url;
      let secretVideoUrl = trickData.secret_video_url;

      // Subir nuevo video de efecto si se seleccionó
      if (trickData.localFiles?.effectVideo) {
        effectVideoUrl = await uploadFileWithCompression(
          trickData.localFiles.effectVideo,
          `${user.id}/effects`,
          "video/mp4",
          `effect_${Date.now()}.mp4`,
          user.id
        );
      }

      // Subir nuevo video secreto si se seleccionó
      if (trickData.localFiles?.secretVideo) {
        secretVideoUrl = await uploadFileWithCompression(
          trickData.localFiles.secretVideo,
          `${user.id}/secrets`,
          "video/mp4",
          `secret_${Date.now()}.mp4`,
          user.id
        );
      }

      // Subir nuevas fotos si se seleccionaron
      const uploadedPhotos: string[] = [];
      if (trickData.localFiles?.photos && trickData.localFiles.photos.length > 0) {
        for (let i = 0; i < trickData.localFiles.photos.length; i++) {
          const photoUri = trickData.localFiles.photos[i];
          const uploadedUrl = await uploadFileWithCompression(
            photoUri,
            `${user.id}/photos`,
            "image/jpeg",
            `photo_${Date.now()}_${i}.jpg`,
            user.id
          );
          if (uploadedUrl) {
            uploadedPhotos.push(uploadedUrl);
          }
        }
        if (uploadedPhotos.length > 0) {
          photoUrl = uploadedPhotos[0];
        }
      }

      // Actualizar truco principal
      const { error: updateError } = await supabase
        .from("magic_tricks")
        .update({
          title: trickData.title,
          effect: trickData.effect,
          secret: trickData.secret,
          duration: trickData.duration,
          angles: trickData.angles,
          notes: trickData.notes,
          special_materials: trickData.special_materials,
          is_public: trickData.is_public,
          status: trickData.status,
          price: trickData.price,
          photo_url: photoUrl,
          effect_video_url: effectVideoUrl,
          secret_video_url: secretVideoUrl,
          reset: trickData.reset,
          difficulty: trickData.difficulty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trickId);

      if (updateError) {
        throw updateError;
      }

      // Refrescar cache para que los cambios se reflejen inmediatamente
      await refreshLibrary();

      // Actualizar categoría
      await supabase
        .from("trick_categories")
        .delete()
        .eq("trick_id", trickId);

      if (trickData.selectedCategoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: trickData.selectedCategoryId,
          created_at: new Date().toISOString(),
        });
      }

      // Actualizar tags
      await supabase
        .from("trick_tags")
        .delete()
        .eq("trick_id", trickId);

      if (trickData.tags.length > 0) {
        const tagInserts = trickData.tags.map((tagId) => ({
          trick_id: trickId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("trick_tags").insert(tagInserts);
      }

      // Actualizar contadores de uso de tags
      await updateTagsUsageCount(trickData.tags, oldTags);

      // Actualizar script
      await supabase
        .from("scripts")
        .delete()
        .eq("trick_id", trickId);

      if (trickData.script?.trim()) {
        await supabase.from("scripts").insert({
          user_id: user.id,
          trick_id: trickId,
          title: `Script for ${trickData.title}`,
          content: trickData.script.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Actualizar técnicas
      await supabase
        .from("trick_techniques")
        .delete()
        .eq("trick_id", trickId);

      if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
        const techniqueInserts = trickData.techniqueIds.map((techniqueId) => ({
          trick_id: trickId,
          technique_id: techniqueId,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("trick_techniques").insert(techniqueInserts);
      }

      // Actualizar gimmicks
      await supabase
        .from("trick_gimmicks")
        .delete()
        .eq("trick_id", trickId);

      if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
        const gimmickInserts = trickData.gimmickIds.map((gimmickId) => ({
          trick_id: trickId,
          gimmick_id: gimmickId,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("trick_gimmicks").insert(gimmickInserts);
      }

      // Actualizar fotos en trick_photos solo si se subieron nuevas fotos
      if (uploadedPhotos.length > 0) {
        // Eliminar fotos antiguas
        await supabase
          .from("trick_photos")
          .delete()
          .eq("trick_id", trickId);

        // Insertar nuevas fotos
        const photoInserts = uploadedPhotos.map((photoUrl) => ({
          trick_id: trickId,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
        }));

        const { error: photosError } = await supabase
          .from("trick_photos")
          .insert(photoInserts);

        if (photosError) {
          console.error("Error al guardar fotos adicionales:", photosError);
        }
      }

      // Éxito - navegar de vuelta al trick
      Alert.alert(
        t("success", "Success"),
        t("trickUpdatedSuccessfully", `"${trickData.title}" updated successfully`),
        [
          {
            text: "OK",
            onPress: () => {
              // Navegar de vuelta al trick para mostrar cambios
              router.replace({
                pathname: "/(app)/trick/[id]",
                params: { id: trickId },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error updating trick:", error);
      Alert.alert(
        t("error", "Error"),
        error instanceof Error
          ? error.message
          : t("unexpectedError", "An unexpected error occurred")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    // Puedes mostrar un loading spinner aquí
    return null;
  }

  // Renderizar el componente del paso actual
  const StepComponent = steps[currentStep].component;

  return (
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
      isEditMode={true}
    />
  );
}