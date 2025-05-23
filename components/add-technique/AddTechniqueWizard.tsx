// components/add-technique/AddTechniqueWizard.tsx - Simplified version
"use client"

import { useState, useEffect, useMemo } from "react"
import { Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { v4 as uuidv4 } from 'uuid'
import { supabase } from "../../lib/supabase"
import { useEncryption } from "../../hooks/useEncryption"
import { FileEncryptionService } from "../../utils/fileEncryption"
import { EncryptionSetup } from "../security/EncryptionSetup"
import { type EncryptedTechnique, type TechniqueDBRecord } from "../../types/encryptedTechnique"
import TechniqueBasicsStepEncrypted from "./steps/TechniqueBasicsStepEncrypted"
import TechniqueDetailsStepEncrypted from "./steps/TechniqueDetailsStepEncrypted"

interface AddTechniqueWizardEncryptedProps {
  onComplete?: (techniqueId: string) => void
  onCancel?: () => void
}

export default function AddTechniqueWizardEncrypted({ 
  onComplete, 
  onCancel 
}: AddTechniqueWizardEncryptedProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false)
  
  // Encryption hook
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    generateKeys,
    error: encryptionError
  } = useEncryption()

  const fileEncryptionService = new FileEncryptionService()

  const [techniqueData, setTechniqueData] = useState<EncryptedTechnique>({
    name: "",
    description: "",
    difficulty: 5,
    categories: [],
    tags: [],
    selectedCategoryId: null,
    angles: [],
    notes: "",
    special_materials: [],
    image_url: null,
    video_url: null,
    is_public: false,
    status: "draft",
    price: null,
    isEncryptionEnabled: true,
    encryptedFields: {},
    encryptedFiles: {}
  })

  const updateTechniqueData = (data: Partial<EncryptedTechnique>) => {
    setTechniqueData((prev) => ({ ...prev, ...data }))
  }

  // Automaticamente generar claves de cifrado al iniciar
  useEffect(() => {
    const checkEncryptionSetup = async () => {
      if (encryptionReady && !keyPair && !encryptionError) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Generar claves automáticamente sin mostrar modal
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

  const steps = [
    { title: t("basicInformation", "Información Básica"), component: TechniqueBasicsStepEncrypted },
    { title: t("details", "Detalles"), component: TechniqueDetailsStepEncrypted },
  ]

  const validateCurrentStep = (): { isValid: boolean; errorMessage?: string } => {
    switch (currentStep) {
      case 0:
        if (!techniqueData.name?.trim()) {
          return { isValid: false, errorMessage: t("nameRequired", "El nombre es obligatorio") }
        }
        if (techniqueData.name.trim().length < 3) {
          return { isValid: false, errorMessage: t("nameTooShort", "El nombre debe tener al menos 3 caracteres") }
        }
        if (!techniqueData.description?.trim()) {
          return { isValid: false, errorMessage: t("descriptionRequired", "La descripción es obligatoria") }
        }
        if (techniqueData.description.trim().length < 10) {
          return { isValid: false, errorMessage: t("descriptionTooShort", "La descripción debe tener al menos 10 caracteres") }
        }
        if (!techniqueData.selectedCategoryId) {
          return { isValid: false, errorMessage: t("categoryRequired", "Por favor selecciona una categoría") }
        }
        return { isValid: true }
      case 1:
        return { isValid: true }
      default:
        return { isValid: true }
    }
  }

  const isNextButtonDisabled = useMemo(() => {
    const validation = validateCurrentStep()
    return !validation.isValid
  }, [techniqueData, currentStep])

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  const goToNextStep = async () => {
    try {
      const validation = validateCurrentStep()
      
      if (!validation.isValid) {
        Alert.alert(t("validationError", "Error de Validación"), validation.errorMessage, [{ text: t("ok", "OK") }])
        return
      }

      if (currentStep === steps.length - 1) {
        await handleSubmit()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } catch (error) {
      console.error("Error in goToNextStep:", error)
      Alert.alert(t("error", "Error"), t("unexpectedError", "Ocurrió un error inesperado"), [{ text: t("ok", "OK") }])
    }
  }

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

  const encryptAllSensitiveFields = async (data: EncryptedTechnique): Promise<EncryptedTechnique> => {
    if (!keyPair) {
      throw new Error('Claves de cifrado no disponibles')
    }

    const encryptedData = { ...data }
    const encryptedFields: any = {}

    try {
      if (data.name?.trim()) {
        encryptedFields.name = await encryptForSelf(data.name.trim())
        encryptedData.name = "[ENCRYPTED]"
      }

      if (data.description?.trim()) {
        encryptedFields.description = await encryptForSelf(data.description.trim())
        encryptedData.description = "[ENCRYPTED]"
      }

      if (data.notes?.trim()) {
        encryptedFields.notes = await encryptForSelf(data.notes.trim())
        encryptedData.notes = "[ENCRYPTED]"
      }

      if (data.special_materials && data.special_materials.length > 0) {
        const materialsJson = JSON.stringify(data.special_materials)
        encryptedFields.special_materials = await encryptForSelf(materialsJson)
        encryptedData.special_materials = ["[ENCRYPTED]"]
      }

      encryptedData.encryptedFields = encryptedFields
      return encryptedData
    } catch (error) {
      console.error('Error cifrando campos de técnica:', error)
      throw new Error('Error al cifrar información de la técnica')
    }
  }

  const handleSubmit = async () => {
  try {
    setIsSubmitting(true)

    // Verificar que las claves de cifrado estén disponibles
    if (!keyPair) {
      Alert.alert(
        t("security.encryptionRequired", "Cifrado Requerido"),
        t("security.setupEncryptionFirst", "Configura el cifrado antes de guardar la técnica"),
        [
          { text: t("actions.cancel", "Cancelar"), style: "cancel" },
          { text: t("security.setupNow", "Configurar"), onPress: () => setShowEncryptionSetup(true) }
        ]
      )
      return
    }

    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error("No se encontró usuario autenticado")
      Alert.alert(t("error"), t("userNotFound", "Usuario no encontrado"))
      return
    }

    // Asegurar que el perfil del usuario existe
    const profileId = await ensureUserProfile(user.id, user.email || "")
    
    // Cifrar todos los campos sensibles de la técnica
    const encryptedTechniqueData = await encryptAllSensitiveFields(techniqueData)
    
    // Manejar archivos cifrados si existen
    const encryptedFileIds: { [key: string]: string } = {}
    
    // Procesar imagen si existe
    if (techniqueData.image_url && techniqueData.image_url.startsWith('file://')) {
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        techniqueData.image_url,
        `technique_image_${Date.now()}.jpg`,
        'image/jpeg',
        profileId,
        [profileId],
        getPublicKey,
        () => keyPair.privateKey
      )
      encryptedFileIds.image = metadata.fileId
    }

    // Procesar video si existe
    if (techniqueData.video_url && techniqueData.video_url.startsWith('file://')) {
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        techniqueData.video_url,
        `technique_video_${Date.now()}.mp4`,
        'video/mp4',
        profileId,
        [profileId],
        getPublicKey,
        () => keyPair.privateKey
      )
      encryptedFileIds.video = metadata.fileId
    }

    // Generar un ID único para la técnica
    const techniqueId = uuidv4()

    // Usar la función RPC para crear técnica y metadatos en una transacción
const { data, error } = await supabase.rpc('create_encrypted_technique', {
  technique_id: techniqueId,
  technique_data: {
    user_id: profileId,
    name: encryptedTechniqueData.name,
    description: encryptedTechniqueData.description,
    difficulty: encryptedTechniqueData.difficulty,
    angles: encryptedTechniqueData.angles,
    notes: encryptedTechniqueData.notes,
    special_materials: encryptedTechniqueData.special_materials,
    image_url: encryptedFileIds.image || encryptedTechniqueData.image_url,
    video_url: encryptedFileIds.video || encryptedTechniqueData.video_url,
    is_public: encryptedTechniqueData.is_public,
    status: encryptedTechniqueData.status,
    price: encryptedTechniqueData.price,
    is_encrypted: true,
  },
  encryption_metadata: {
    content_type: "techniques",
    user_id: profileId,
    encrypted_fields: encryptedTechniqueData.encryptedFields,
    encrypted_files: encryptedFileIds,
  }
})

if (error) {
  console.error("Error al crear la técnica:", error)
  Alert.alert(t("error"), t("errorCreatingTechnique", "Error creando la técnica"))
  return
}

    // Asociar la categoría seleccionada
    if (techniqueData.selectedCategoryId) {
      try {
        const { error: categoryError } = await supabase.from("technique_categories").insert({
          technique_id: techniqueId,
          category_id: techniqueData.selectedCategoryId,
          created_at: new Date().toISOString(),
        })

        if (categoryError) {
          console.error("Error al asociar categoría:", categoryError)
        }
      } catch (categoryError) {
        console.error("Fallo al vincular categoría:", categoryError)
      }
    }

    // Asociar las etiquetas seleccionadas
    if (techniqueData.tags.length > 0) {
      try {
        const tagInserts = techniqueData.tags.map(tagId => ({
          technique_id: techniqueId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }))

        const { error: tagError } = await supabase
          .from("technique_tags")
          .insert(tagInserts)

        if (tagError && tagError.code !== "23505") {
          console.error("Error al asociar etiquetas:", tagError)
        }
        
        // Actualizar estadísticas de uso de las etiquetas
        await updateTagsUsageCount(techniqueData.tags)
        
      } catch (tagError) {
        console.error("Fallo al vincular etiquetas:", tagError)
      }
    }

    // Notificar éxito al usuario
    Alert.alert(
      t("success", "Éxito"),
      t("techniqueCreatedSuccessfully", "La técnica ha sido creada y cifrada exitosamente"),
      [{ text: t("ok", "OK") }]
    )

    // Ejecutar callback de finalización
    if (onComplete) {
      onComplete(techniqueId)
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
  // Actualizar contadores de uso de tags
  const updateTagsUsageCount = async (tagIds: string[]) => {
    try {
      if (!tagIds || tagIds.length === 0) return

      for (const tagId of tagIds) {
        const { error } = await supabase.rpc('increment_tag_usage', {
          tag_id: tagId
        })

        if (error) {
          console.error(`Error incrementing usage count for tag ${tagId}:`, error)
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error)
    }
  }

  // Renderizar componente del paso actual
  const StepComponent = steps[currentStep].component

  return (
    <>
      <StepComponent 
        techniqueData={techniqueData} 
        updateTechniqueData={updateTechniqueData}
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
          console.log('Cifrado configurado correctamente para técnicas')
        }}
      />
    </>
  )
}