// components/add-magic/AddMagicWizard.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";
import { uploadFileToStorage } from "../../services/fileUploadService";
import type { MagicTrick, MagicTrickDBRecord } from "../../types/magicTrick";
import TitleCategoryStep from "./steps/TitleCategoryStep";
import EffectStep from "./steps/EffectStep";
import ExtrasStep from "./steps/ExtrasStep";
import UploadProgressModal from "./ui/UploadProgressModal";
import LargeFileWarningModal from "./ui/LargeFileWarningModal";

interface AddMagicWizardProps {
  onComplete?: (trickId: string, trickTitle: string) => void;
  onCancel?: () => void;
}

export default function AddMagicWizard({
  onComplete,
  onCancel,
}: AddMagicWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    difficulty: null, // Cambiado de 5 a null
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
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        console.error('El archivo NO existe');
        return null;
      }

      const fileSize = fileInfo.size || 0;
      const fileSizeMB = fileSize / (1024 * 1024);

      // Rechazar videos muy grandes (>500MB)
      if (fileType.startsWith('video/') && fileSizeMB > 500) {
        Alert.alert(
          'Video demasiado grande',
          `El video seleccionado (${fileSizeMB.toFixed(0)} MB) excede el límite de 500 MB. Por favor selecciona un video más corto o de menor resolución.`,
          [{ text: 'OK' }]
        );
        return null;
      }

      let lastBytes = 0;
      let lastTime = Date.now();
      let speedSamples: number[] = [];

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
    console.log(`🚀 Subiendo ${files.length} archivos en paralelo...`);

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
        // Videos >200MB se comprimen primero (reduce tamaño ~70%)
        // Estimar tiempo: compresión + upload
        const compressionTime = Math.round(totalLargeSize / (50 * 1024 * 1024)); // ~50 MB/s de procesamiento
        const uploadTime = Math.round((totalLargeSize * 0.3) / (2 * 1024 * 1024)); // ~70% reducción, 2 MB/s upload
        const estimatedSeconds = compressionTime + uploadTime;

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

  // Enviar el truco a la base de datos
  const handleSubmit = async () => {
    // 🔒 PROTECCIÓN: Evitar múltiples llamadas simultáneas (debouncing)
    if (isSubmitting) {
      console.log('⚠️ Ya hay una subida en progreso, ignorando clic duplicado');
      return;
    }

    // Envolver la lógica de subida para poder verificar tamaños primero
    await checkLargeFilesAndUpload(async () => {
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

        // 🚀 OPTIMIZACIÓN: Subir archivos multimedia EN PARALELO
        const filesToUpload: Array<{
          uri: string;
          folder: string;
          type: string;
          name: string;
          key: string;
        }> = [];

      // 🔒 MEJORA: Generar timestamp único al inicio para evitar duplicados por timing
      const uploadTimestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);

      // Preparar video de efecto
      if (trickData.localFiles?.effectVideo) {
        filesToUpload.push({
          uri: trickData.localFiles.effectVideo,
          folder: `${profileId}/effects`,
          type: 'video/mp4',
          name: `effect_${uploadTimestamp}_${randomSuffix}.mp4`,
          key: 'effect'
        });
      }

      // Preparar video secreto
      if (trickData.localFiles?.secretVideo) {
        filesToUpload.push({
          uri: trickData.localFiles.secretVideo,
          folder: `${profileId}/secrets`,
          type: 'video/mp4',
          name: `secret_${uploadTimestamp}_${randomSuffix}.mp4`,
          key: 'secret'
        });
      }

      // Preparar fotos
      if (trickData.localFiles?.photos && trickData.localFiles.photos.length > 0) {
        trickData.localFiles.photos.forEach((photoUri, i) => {
          filesToUpload.push({
            uri: photoUri,
            folder: `${profileId}/photos`,
            type: 'image/jpeg',
            name: `photo_${uploadTimestamp}_${randomSuffix}_${i}.jpg`,
            key: `photo_${i}`
          });
        });
      }

      // Subir TODO en paralelo
      const uploadResults = await uploadFilesInParallel(filesToUpload, profileId);

      // Extraer resultados
      let photoUrl: string | null = null;
      let effectVideoUrl: string | null = uploadResults.get('effect') || null;
      let secretVideoUrl: string | null = uploadResults.get('secret') || null;

      const uploadedPhotos: string[] = [];
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

      // Generar ID único
      const trickId = uuidv4();

      // Debug: ver qué valores estamos enviando
      console.log('📝 Valores para create_magic_trick:', {
        effectVideoUrl,
        secretVideoUrl,
        photoUrl,
        hasEffectVideo: !!effectVideoUrl,
        hasSecretVideo: !!secretVideoUrl,
        hasPhoto: !!photoUrl,
      });

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

      // Guardar todas las fotos en la tabla trick_photos
      if (uploadedPhotos.length > 0) {
        const photoInserts = uploadedPhotos.map((photoUrl) => ({
          trick_id: trickId,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
        }));

        const { error: photosError } = await supabase
          .from("trick_photos")
          .insert(photoInserts);

        if (photosError) {
          console.error("❌ Error al guardar fotos adicionales:", photosError);
        } else {
          console.log(`✅ ${uploadedPhotos.length} fotos guardadas exitosamente`);
        }
      }

      // Limpiar caché del servicio paginado ANTES de notificar
      console.log("🧹 Limpiando caché del usuario");
      // Comentado temporalmente - el servicio paginado está deshabilitado
      // paginatedContentService.clearUserCache(profileId);

        // Éxito - Notificar al componente padre
        if (onComplete) {
          onComplete(trickId, trickData.title);
        }
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
    });
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
