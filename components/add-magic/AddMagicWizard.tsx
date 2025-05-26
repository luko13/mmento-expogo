// components/add-magic/AddMagicWizardEncrypted.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { v4 as uuidv4 } from 'uuid'
import { supabase } from "../../lib/supabase"
import { useEncryption } from "../../hooks/useEncryption"
import { FileEncryptionService } from "../../utils/fileEncryption"
import { EncryptionSetup } from "../security/EncryptionSetup"
import { type EncryptedMagicTrick, type MagicTrickDBRecord } from "../../types/encryptedMagicTrick"
import TitleCategoryStepEncrypted from "./steps/TitleCategoryStep"
import EffectStepEncrypted from "./steps/EffectStep"
import ExtrasStepEncrypted from "./steps/ExtrasStep"

interface AddMagicWizardEncryptedProps {
  onComplete?: (trickId: string) => void
  onCancel?: () => void
}

export default function AddMagicWizardEncrypted({ 
  onComplete, 
  onCancel 
}: AddMagicWizardEncryptedProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false)
  
  // Hook de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    generateKeys,
    error: encryptionError
  } = useEncryption()

  const fileEncryptionService = new FileEncryptionService()

  // Estado inicial del truco con cifrado
  const [trickData, setTrickData] = useState<EncryptedMagicTrick>({
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
    isEncryptionEnabled: true,
    encryptedFields: {},
    encryptedFiles: {}
  })

  // Actualizar datos del truco
  const updateTrickData = (data: Partial<EncryptedMagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }))
  }

  // Generar claves automáticamente si no existen
  useEffect(() => {
    const checkEncryptionSetup = async () => {
      if (encryptionReady && !keyPair && !encryptionError) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            await generateKeys()
          } catch (error) {
            console.error("Error generando claves automáticamente:", error)
          }
        }
      }
    }
    
    checkEncryptionSetup()
  }, [encryptionReady, keyPair, encryptionError])

  // Función para actualizar el contador de uso de las etiquetas
  const updateTagsUsageCount = async (tagIds: string[]) => {
    try {
      if (!tagIds || tagIds.length === 0) return;
      
      for (const tagId of tagIds) {
        const { error } = await supabase.rpc('increment_tag_usage', {
          tag_id: tagId
        });
        
        if (error) {
          console.error(`Error incrementing usage count for tag ${tagId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error);
    }
  }

  // Pasos del asistente con componentes cifrados
  const steps = [
    { title: t("titleAndCategories", "Title & Categories"), component: TitleCategoryStepEncrypted },
    { title: t("effect", "Effect"), component: EffectStepEncrypted },
    { title: t("extras", "Extras"), component: ExtrasStepEncrypted },
  ]

  // Validación de los campos obligatorios
  const validateCurrentStep = (): { isValid: boolean; errorMessage?: string } => {
    switch (currentStep) {
      case 0: // Título y categorización
        if (!trickData.title?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("titleRequired", "El título es obligatorio") 
          }
        }
        if (trickData.title.trim().length < 3) {
          return { 
            isValid: false, 
            errorMessage: t("titleTooShort", "El título debe tener al menos 3 caracteres") 
          }
        }
        if (!trickData.selectedCategoryId) {
          return { 
            isValid: false, 
            errorMessage: t("categoryRequired", "Por favor selecciona una categoría") 
          }
        }
        return { isValid: true }

      case 1: // Efecto y secreto
        if (!trickData.effect?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("effectRequired", "La descripción del efecto es obligatoria") 
          }
        }
        if (!trickData.secret?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("secretRequired", "La descripción del secreto es obligatoria") 
          }
        }
        return { isValid: true }

      case 2: // Extras (opcional)
        return { isValid: true }

      default:
        return { isValid: true }
    }
  }

  const isNextButtonDisabled = useMemo(() => {
    const validation = validateCurrentStep()
    return !validation.isValid
  }, [trickData, currentStep])

  // Ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  // Ir al siguiente paso
  const goToNextStep = async () => {
    try {
      const validation = validateCurrentStep()
      
      if (!validation.isValid) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          validation.errorMessage,
          [{ text: t("ok", "OK") }]
        )
        return
      }

      if (currentStep === steps.length - 1) {
        await handleSubmit()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } catch (error) {
      console.error("Error in goToNextStep:", error)
      Alert.alert(
        t("error", "Error"),
        t("unexpectedError", "Ocurrió un error inesperado"),
        [{ text: t("ok", "OK") }]
      )
    }
  }

  // Verificar o crear perfil de usuario
  const ensureUserProfile = async (userId: string, email: string) => {
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking profile:", profileError)
      throw new Error("Error checking user profile")
    }

    if (!existingProfile) {
      const username = email.split("@")[0]
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email: email,
        username: username,
        is_active: true,
        is_verified: false,
        subscription_type: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
        throw new Error("Could not create user profile")
      }
    }

    return userId
  }

  // Cifrar todos los campos sensibles
  const encryptAllSensitiveFields = async (data: EncryptedMagicTrick): Promise<EncryptedMagicTrick> => {
    if (!keyPair) {
      throw new Error('Claves de cifrado no disponibles')
    }

    const encryptedData = { ...data }
    const encryptedFields: any = {}

    try {
      // Cifrar título
      if (data.title?.trim()) {
        encryptedFields.title = await encryptForSelf(data.title.trim())
        encryptedData.title = "[ENCRYPTED]"
      }

      // Cifrar efecto
      if (data.effect?.trim()) {
        encryptedFields.effect = await encryptForSelf(data.effect.trim())
        encryptedData.effect = "[ENCRYPTED]"
      }

      // Cifrar secreto
      if (data.secret?.trim()) {
        encryptedFields.secret = await encryptForSelf(data.secret.trim())
        encryptedData.secret = "[ENCRYPTED]"
      }

      // Cifrar notas
      if (data.notes?.trim()) {
        encryptedFields.notes = await encryptForSelf(data.notes.trim())
        encryptedData.notes = "[ENCRYPTED]"
      }

      encryptedData.encryptedFields = encryptedFields
      return encryptedData
    } catch (error) {
      console.error('Error cifrando campos del truco:', error)
      throw new Error('Error al cifrar información del truco')
    }
  }

  // Enviar el truco cifrado a la base de datos
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Verificar cifrado
      if (!keyPair) {
        Alert.alert(
          t("security.encryptionRequired", "Cifrado Requerido"),
          t("security.setupEncryptionFirst", "Configura el cifrado antes de guardar el truco"),
          [
            { text: t("actions.cancel", "Cancelar"), style: "cancel" },
            { text: t("security.setupNow", "Configurar"), onPress: () => setShowEncryptionSetup(true) }
          ]
        )
        return
      }

      // Obtener usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"))
        return
      }

      const profileId = await ensureUserProfile(user.id, user.email || "")
      
      // Cifrar campos sensibles
      const encryptedTrickData = await encryptAllSensitiveFields(trickData)
      
      // Manejar archivos cifrados
      const encryptedFileIds: { [key: string]: string } = {}
      
      // Cifrar foto si existe
      if (trickData.photo_url && trickData.photo_url.startsWith('file://')) {
        const metadata = await fileEncryptionService.encryptAndUploadFile(
          trickData.photo_url,
          `trick_photo_${Date.now()}.jpg`,
          'image/jpeg',
          profileId,
          [profileId],
          getPublicKey,
          () => keyPair.privateKey
        )
        encryptedFileIds.photo = metadata.fileId
      }

      // Cifrar video del efecto si existe
      if (trickData.effect_video_url && trickData.effect_video_url.startsWith('file://')) {
        const metadata = await fileEncryptionService.encryptAndUploadFile(
          trickData.effect_video_url,
          `effect_video_${Date.now()}.mp4`,
          'video/mp4',
          profileId,
          [profileId],
          getPublicKey,
          () => keyPair.privateKey
        )
        encryptedFileIds.effect_video = metadata.fileId
      }

      // Cifrar video del secreto si existe
      if (trickData.secret_video_url && trickData.secret_video_url.startsWith('file://')) {
        const metadata = await fileEncryptionService.encryptAndUploadFile(
          trickData.secret_video_url,
          `secret_video_${Date.now()}.mp4`,
          'video/mp4',
          profileId,
          [profileId],
          getPublicKey,
          () => keyPair.privateKey
        )
        encryptedFileIds.secret_video = metadata.fileId
      }

      // Generar ID único
      const trickId = uuidv4()

      // Usar la función RPC para crear el truco
      const { data, error } = await supabase.rpc('create_encrypted_magic_trick', {
        trick_id: trickId,
        trick_data: {
          user_id: profileId,
          title: encryptedTrickData.title,
          effect: encryptedTrickData.effect,
          secret: encryptedTrickData.secret,
          duration: encryptedTrickData.duration,
          angles: encryptedTrickData.angles,
          notes: encryptedTrickData.notes,
          special_materials: encryptedTrickData.special_materials,
          is_public: encryptedTrickData.is_public,
          status: encryptedTrickData.status,
          price: encryptedTrickData.price,
          photo_url: encryptedFileIds.photo || encryptedTrickData.photo_url,
          effect_video_url: encryptedFileIds.effect_video || encryptedTrickData.effect_video_url,
          secret_video_url: encryptedFileIds.secret_video || encryptedTrickData.secret_video_url,
          views_count: 0,
          likes_count: 0,
          dislikes_count: 0,
          version: 1,
          parent_trick_id: null,
          reset: encryptedTrickData.reset,
          difficulty: encryptedTrickData.difficulty,
          is_encrypted: true,
        },
        encryption_metadata: {
          content_type: "magic_tricks",
          user_id: profileId,
          encrypted_fields: encryptedTrickData.encryptedFields,
          encrypted_files: encryptedFileIds,
        }
      })

      if (error) {
        console.error("Error al crear el truco:", error)
        Alert.alert(t("error"), t("errorCreatingTrick", "Error creando el truco"))
        return
      }

      // Asociar categoría
      if (trickData.selectedCategoryId) {
        try {
          await supabase.from("trick_categories").insert({
            trick_id: trickId,
            category_id: trickData.selectedCategoryId,
            created_at: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error asociando categoría:", error)
        }
      }

      // Asociar etiquetas
      if (trickData.tags.length > 0) {
        try {
          const tagInserts = trickData.tags.map(tagId => ({
            trick_id: trickId,
            tag_id: tagId,
            created_at: new Date().toISOString(),
          }))

          await supabase.from("trick_tags").insert(tagInserts)
          
          // Actualizar contador de uso
          await updateTagsUsageCount(trickData.tags)
        } catch (error) {
          console.error("Error asociando etiquetas:", error)
        }
      }

      // Guardar script si existe
      if (trickData.script?.trim()) {
        try {
          await supabase.from("scripts").insert({
            user_id: profileId,
            trick_id: trickId,
            title: `Script for ${trickData.title}`,
            content: trickData.script.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error creando script:", error)
        }
      }
      
      // Asociar técnicas
      if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
        try {
          const techniqueInserts = trickData.techniqueIds.map(techniqueId => ({
            trick_id: trickId,
            technique_id: techniqueId,
            created_at: new Date().toISOString(),
          }))

          await supabase.from("trick_techniques").insert(techniqueInserts)
        } catch (error) {
          console.error("Error asociando técnicas:", error)
        }
      }
      
      // Asociar gimmicks
      if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
        try {
          const gimmickInserts = trickData.gimmickIds.map(gimmickId => ({
            trick_id: trickId,
            gimmick_id: gimmickId,
            created_at: new Date().toISOString(),
          }))

          await supabase.from("trick_gimmicks").insert(gimmickInserts)
        } catch (error) {
          console.error("Error asociando gimmicks:", error)
        }
      }

      // Éxito
      Alert.alert(
        t("success", "Éxito"),
        t("trickCreatedSuccessfully", "El truco ha sido creado y cifrado exitosamente"),
        [{ text: t("ok", "OK") }]
      )

      if (onComplete) {
        onComplete(trickId)
      }
    } catch (error) {
      console.error("Error durante el guardado:", error)
      Alert.alert(
        t("error", "Error"), 
        error instanceof Error ? error.message : t("unexpectedError", "Ocurrió un error inesperado")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar el componente del paso actual
  const StepComponent = steps[currentStep].component

  return (
    <>
      <StepComponent 
        trickData={trickData} 
        updateTrickData={updateTrickData}
        onNext={goToNextStep}
        onCancel={goToPreviousStep}
        currentStep={currentStep + 1}
        totalSteps={steps.length}
        isSubmitting={isSubmitting}
        isNextButtonDisabled={isNextButtonDisabled}
        isLastStep={currentStep === steps.length - 1}
      />

      {/* Modal de configuración de cifrado */}
      <EncryptionSetup
        visible={showEncryptionSetup}
        onClose={() => setShowEncryptionSetup(false)}
        onSetupComplete={() => {
        }}
      />
    </>
  )
}