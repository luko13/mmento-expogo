// components/edit-magic/EditMagicWizard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";
import { uploadFileToStorage } from "../../services/fileUploadService";
import type { MagicTrick, MagicTrickDBRecord } from "../../types/magicTrick";
import TitleCategoryStep from "../add-magic/steps/TitleCategoryStep";
import EffectStep from "../add-magic/steps/EffectStep";
import ExtrasStep from "../add-magic/steps/ExtrasStep";
import { useLibraryData } from "../../context/LibraryDataContext";
import UploadProgressModal from "../add-magic/ui/UploadProgressModal";
import LargeFileWarningModal from "../add-magic/ui/LargeFileWarningModal";

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

  // Estados para el progreso de carga
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para el modal de advertencia
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const [largeFileInfo, setLargeFileInfo] = useState<{
    size: number;
    estimatedTime: number;
  } | null>(null);
  const [pendingUploadCallback, setPendingUploadCallback] = useState<(() => void) | null>(null);

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

      // Cargar fotos adicionales
      const { data: photosData } = await supabase
        .from("trick_photos")
        .select("photo_url")
        .eq("trick_id", trickId);

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
        photos: photosData?.map(p => p.photo_url) || [],  // ✅ Agregar fotos adicionales
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Subir archivo con compresión y métricas avanzadas
  const uploadFileWithCompression = async (
    uri: string,
    folder: string,
    fileType: string,
    fileName: string,
    userId: string,
    onProgress?: (
      progress: number,
      fileName: string,
      metrics?: {
        bytesUploaded: number;
        bytesTotal: number;
        speedMBps: number;
        eta: number;
      }
    ) => void
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

      // Obtener tamaño del archivo
      const fileSize = fileInfo.size || 0;

      // Variables para cálculo de velocidad
      let lastBytes = 0;
      let lastTime = Date.now();
      let speedSamples: number[] = [];

      // OPTIMIZACIÓN: NO comprimir NADA localmente
      // Cloudflare Stream comprime videos automáticamente
      // Cloudflare Images optimiza imágenes automáticamente
      console.log('☁️ [EDIT] Subiendo directamente a Cloudflare (sin compresión local)');
      console.log(`📤 Subiendo desde: ${uri} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

      // Subir archivo DIRECTAMENTE con callback de progreso mejorado
      const uploadUrl = await uploadFileToStorage(
        uri,
        userId,
        folder,
        fileType,
        fileName,
        onProgress
          ? (progress, currentBytes = 0, totalBytes = fileSize) => {
              const now = Date.now();
              const deltaTime = (now - lastTime) / 1000; // Segundos
              const deltaBytes = currentBytes - lastBytes;

              // Calcular velocidad instantánea (MB/s)
              let speedMBps = 0;
              if (deltaTime > 0 && deltaBytes > 0) {
                speedMBps = deltaBytes / deltaTime / (1024 * 1024);
                speedSamples.push(speedMBps);

                // Mantener solo las últimas 5 muestras para suavizar la velocidad
                if (speedSamples.length > 5) {
                  speedSamples = speedSamples.slice(-5);
                }
              }

              // Velocidad promedio suavizada
              const avgSpeed =
                speedSamples.length > 0
                  ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
                  : 0;

              // Calcular ETA (segundos restantes)
              const remainingBytes = totalBytes - currentBytes;
              const eta = avgSpeed > 0 ? remainingBytes / (avgSpeed * 1024 * 1024) : 0;

              // Actualizar para próxima iteración
              lastBytes = currentBytes;
              lastTime = now;

              onProgress(progress, fileName, {
                bytesUploaded: currentBytes,
                bytesTotal: totalBytes,
                speedMBps: avgSpeed,
                eta: Math.round(eta),
              });
            }
          : undefined
      );

      return uploadUrl;
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      return null;
    }
  };

  // Helper para subir múltiples archivos en paralelo
  const uploadFilesInParallel = async (
    files: Array<{
      uri: string;
      folder: string;
      type: string;
      name: string;
      key: string;
    }>,
    userId: string
  ): Promise<Map<string, string | null>> => {
    console.log(`🚀 [EDIT] Subiendo ${files.length} archivos en paralelo...`);

    // Configurar progreso
    setTotalFiles(files.length);
    setProcessedFiles(0);
    setShowUploadProgress(true);
    startUploadTimer();

    // Maps para rastrear progreso y métricas de cada archivo
    const fileProgress = new Map<string, number>();
    const fileBytesUploaded = new Map<string, number>();
    const fileBytesTotal = new Map<string, number>();
    const fileSpeeds = new Map<string, number>();
    const fileETAs = new Map<string, number>();

    const uploads = files.map((file) =>
      uploadFileWithCompression(
        file.uri,
        file.folder,
        file.type,
        file.name,
        userId,
        (progress, fileName, metrics) => {
          // Actualizar progreso de este archivo específico
          fileProgress.set(file.key, progress);

          if (metrics) {
            fileBytesUploaded.set(file.key, metrics.bytesUploaded);
            fileBytesTotal.set(file.key, metrics.bytesTotal);
            fileSpeeds.set(file.key, metrics.speedMBps);
            fileETAs.set(file.key, metrics.eta);
          }

          // Calcular progreso global (promedio de todos los archivos)
          const totalProgress = Array.from(fileProgress.values()).reduce((a, b) => a + b, 0);
          const avgProgress = totalProgress / files.length;

          // Calcular métricas agregadas
          const totalBytesUploaded = Array.from(fileBytesUploaded.values()).reduce((a, b) => a + b, 0);
          const totalBytesTotal = Array.from(fileBytesTotal.values()).reduce((a, b) => a + b, 0);
          const avgSpeed =
            fileSpeeds.size > 0
              ? Array.from(fileSpeeds.values()).reduce((a, b) => a + b, 0) / fileSpeeds.size
              : 0;
          const maxETA = fileSpeeds.size > 0 ? Math.max(...Array.from(fileETAs.values())) : 0;

          setUploadProgress(avgProgress);
          setCurrentUploadFile(fileName);
          setProcessedFiles(Array.from(fileProgress.values()).filter(p => p === 100).length);
          setBytesUploaded(totalBytesUploaded);
          setBytesTotal(totalBytesTotal);
          setUploadSpeed(avgSpeed);
          setEstimatedTimeRemaining(maxETA);
        }
      )
        .then((url) => ({ key: file.key, url }))
        .catch((error) => {
          console.error(`❌ Error subiendo ${file.name}:`, error);
          return { key: file.key, url: null };
        })
    );

    const results = await Promise.all(uploads);

    // Detener timer y ocultar modal
    stopUploadTimer();
    setShowUploadProgress(false);

    // Convertir array a Map para fácil acceso
    const resultMap = new Map<string, string | null>();
    results.forEach((result) => {
      resultMap.set(result.key, result.url);
    });

    return resultMap;
  };

  // Verificar tamaño de archivos y mostrar advertencia si es necesario
  const checkLargeFilesAndUpload = async (callback: () => Promise<void>) => {
    try {
      // Verificar si hay archivos grandes (>200MB)
      const largeFileThreshold = 200 * 1024 * 1024; // 200MB en bytes
      let hasLargeFiles = false;
      let totalLargeSize = 0;

      // Verificar video de efecto
      if (trickData.localFiles?.effectVideo) {
        const fileInfo = await FileSystem.getInfoAsync(trickData.localFiles.effectVideo);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > largeFileThreshold) {
          hasLargeFiles = true;
          totalLargeSize = Math.max(totalLargeSize, fileInfo.size);
        }
      }

      // Verificar video secreto
      if (trickData.localFiles?.secretVideo) {
        const fileInfo = await FileSystem.getInfoAsync(trickData.localFiles.secretVideo);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > largeFileThreshold) {
          hasLargeFiles = true;
          totalLargeSize = Math.max(totalLargeSize, fileInfo.size);
        }
      }

      // Si hay archivos grandes, mostrar advertencia
      if (hasLargeFiles) {
        // Estimar tiempo de subida (asumiendo 2 MB/s promedio)
        const estimatedSeconds = Math.round(totalLargeSize / (2 * 1024 * 1024));

        setLargeFileInfo({
          size: totalLargeSize,
          estimatedTime: estimatedSeconds,
        });
        setShowLargeFileWarning(true);
        setPendingUploadCallback(() => callback);
      } else {
        // No hay archivos grandes, proceder directamente
        await callback();
      }
    } catch (error) {
      console.error("Error checking file sizes:", error);
      // Si hay error verificando, proceder de todos modos
      await callback();
    }
  };

  // Actualizar el truco
  const handleSubmit = async () => {
    // Envolver la lógica de subida para poder verificar tamaños primero
    await checkLargeFilesAndUpload(async () => {
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

      // 🚀 OPTIMIZACIÓN: Subir archivos multimedia EN PARALELO
      const filesToUpload: Array<{
        uri: string;
        folder: string;
        type: string;
        name: string;
        key: string;
      }> = [];

      // Preparar video de efecto si hay uno nuevo
      if (trickData.localFiles?.effectVideo) {
        filesToUpload.push({
          uri: trickData.localFiles.effectVideo,
          folder: `${user.id}/effects`,
          type: 'video/mp4',
          name: `effect_${Date.now()}.mp4`,
          key: 'effect'
        });
      }

      // Preparar video secreto si hay uno nuevo
      if (trickData.localFiles?.secretVideo) {
        filesToUpload.push({
          uri: trickData.localFiles.secretVideo,
          folder: `${user.id}/secrets`,
          type: 'video/mp4',
          name: `secret_${Date.now()}.mp4`,
          key: 'secret'
        });
      }

      // Preparar fotos nuevas
      if (trickData.localFiles?.photos && trickData.localFiles.photos.length > 0) {
        trickData.localFiles.photos.forEach((photoUri, i) => {
          filesToUpload.push({
            uri: photoUri,
            folder: `${user.id}/photos`,
            type: 'image/jpeg',
            name: `photo_${Date.now()}_${i}.jpg`,
            key: `photo_${i}`
          });
        });
      }

      // Subir TODO en paralelo (solo si hay archivos nuevos)
      let photoUrl = trickData.photo_url;
      let effectVideoUrl = trickData.effect_video_url;
      let secretVideoUrl = trickData.secret_video_url;
      const uploadedPhotos: string[] = [];

      if (filesToUpload.length > 0) {
        const uploadResults = await uploadFilesInParallel(filesToUpload, user.id);

        // Extraer resultados
        const effectResult = uploadResults.get('effect');
        if (effectResult) effectVideoUrl = effectResult;

        const secretResult = uploadResults.get('secret');
        if (secretResult) secretVideoUrl = secretResult;

        for (let i = 0; i < (trickData.localFiles?.photos?.length || 0); i++) {
          const photoResult = uploadResults.get(`photo_${i}`);
          if (photoResult) {
            uploadedPhotos.push(photoResult);
          }
        }

        // Usar la primera foto como principal
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

      // Actualizar fotos en trick_photos
      // Siempre sincronizar la base de datos con el estado actual de trickData.photos
      // para reflejar tanto fotos eliminadas como fotos nuevas

      // 1. Eliminar TODAS las fotos antiguas de la base de datos
      await supabase
        .from("trick_photos")
        .delete()
        .eq("trick_id", trickId);

      // 2. Preparar array final de fotos para insertar
      const finalPhotos: string[] = [];

      // 2a. Agregar fotos existentes que NO fueron eliminadas
      if (trickData.photos && trickData.photos.length > 0) {
        finalPhotos.push(...trickData.photos);
      }

      // 2b. Agregar fotos nuevas recién subidas
      if (uploadedPhotos.length > 0) {
        finalPhotos.push(...uploadedPhotos);
      }

      // 3. Insertar todas las fotos finales (existentes + nuevas)
      if (finalPhotos.length > 0) {
        const photoInserts = finalPhotos.map((photoUrl) => ({
          trick_id: trickId,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
        }));

        const { error: photosError } = await supabase
          .from("trick_photos")
          .insert(photoInserts);

        if (photosError) {
          console.error("Error al guardar fotos adicionales:", photosError);
        } else {
          console.log(`✅ ${finalPhotos.length} fotos sincronizadas exitosamente`);
        }
      }

      // Refrescar cache DESPUÉS de todas las actualizaciones en base de datos
      // para que los cambios se reflejen inmediatamente en la homepage
      await refreshLibrary();

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
    });
  };

  if (isLoading) {
    // Puedes mostrar un loading spinner aquí
    return null;
  }

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
        isEditMode={true}
      />

      {/* Modal de progreso de subida */}
      <UploadProgressModal
        visible={showUploadProgress}
        progress={uploadProgress}
        currentFile={currentUploadFile}
        elapsedTime={elapsedTime}
        totalFiles={totalFiles}
        processedFiles={processedFiles}
        uploadSpeed={uploadSpeed}
        bytesUploaded={bytesUploaded}
        bytesTotal={bytesTotal}
        estimatedTimeRemaining={estimatedTimeRemaining}
      />

      {/* Modal de advertencia para archivos grandes */}
      <LargeFileWarningModal
        visible={showLargeFileWarning}
        fileSize={largeFileInfo?.size || 0}
        estimatedTime={largeFileInfo?.estimatedTime || 0}
        onCancel={() => {
          setShowLargeFileWarning(false);
          setLargeFileInfo(null);
          setPendingUploadCallback(null);
        }}
        onProceed={() => {
          setShowLargeFileWarning(false);
          if (pendingUploadCallback) {
            pendingUploadCallback();
            setPendingUploadCallback(null);
          }
        }}
      />
    </>
  );
}