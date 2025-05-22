"use client"

import { useState, useEffect, useMemo } from "react"
import { Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"
import TechniqueBasicsStep from "./steps/TechniqueBasicsStep"
import TechniqueDetailsStep from "./steps/TechniqueDetailsStep"

// Tipo para la técnica
export interface Technique {
  // ID y usuario
  id?: string
  user_id?: string

  // Paso 1: Información básica con categorías y tags
  name: string
  description: string
  difficulty: number | null
  categories: string[]
  tags: string[]
  selectedCategoryId: string | null

  // Paso 2: Detalles
  angles: string[]
  notes: string
  special_materials: string[]
  image_url: string | null
  video_url: string | null
  is_public: boolean
  status: string
  price: number | null
}

// Props para el componente
interface AddTechniqueWizardProps {
  onComplete?: (techniqueId: string) => void
  onCancel?: () => void
}

export default function AddTechniqueWizard({ onComplete, onCancel }: AddTechniqueWizardProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado inicial de la técnica
  const [techniqueData, setTechniqueData] = useState<Technique>({
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
  })

  // Actualizar datos de la técnica
  const updateTechniqueData = (data: Partial<Technique>) => {
    setTechniqueData((prev) => ({ ...prev, ...data }))
  }

  // Función para actualizar el contador de uso de las etiquetas seleccionadas
  const updateTagsUsageCount = async (tagIds: string[]) => {
    try {
      if (!tagIds || tagIds.length === 0) return

      // Llamamos a la función de Supabase para cada etiqueta
      for (const tagId of tagIds) {
        const { error } = await supabase.rpc("increment_tag_usage", {
          tag_id: tagId,
        })

        if (error) {
          console.error(
            `Error incrementing usage count for tag ${tagId}:`,
            error
          )
        }
      }
    } catch (error) {
      console.error("Error updating tag usage counts:", error)
    }
  }

  // Pasos del asistente
  const steps = [
    { title: t("basicInformation", "Basic Information"), component: TechniqueBasicsStep },
    { title: t("details", "Details"), component: TechniqueDetailsStep },
  ]

  // Validación mejorada de los campos obligatorios de cada paso
  const validateCurrentStep = (): { isValid: boolean; errorMessage?: string } => {
    switch (currentStep) {
      case 0: // Paso 1: Información básica
        if (!techniqueData.name?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("nameRequired", "El nombre es obligatorio") 
          }
        }

        if (techniqueData.name.trim().length < 3) {
          return { 
            isValid: false, 
            errorMessage: t("nameTooShort", "El nombre debe tener al menos 3 caracteres") 
          }
        }

        if (techniqueData.name.trim().length > 100) {
          return { 
            isValid: false, 
            errorMessage: t("nameTooLong", "El nombre no debe exceder los 100 caracteres") 
          }
        }

        if (!techniqueData.description?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("descriptionRequired", "La descripción es obligatoria") 
          }
        }

        if (techniqueData.description.trim().length < 10) {
          return { 
            isValid: false, 
            errorMessage: t("descriptionTooShort", "La descripción debe tener al menos 10 caracteres") 
          }
        }

        if (!techniqueData.selectedCategoryId) {
          return { 
            isValid: false, 
            errorMessage: t("categoryRequired", "Por favor selecciona una categoría") 
          }
        }

        return { isValid: true }

      case 1: // Paso 2: Detalles (todos opcionales)
        return { isValid: true }

      default:
        return { isValid: true }
    }
  }

  // IMPORTANTE: Calcular el estado del botón usando useMemo
  const isNextButtonDisabled = useMemo(() => {
    const validation = validateCurrentStep()
    return !validation.isValid
  }, [techniqueData, currentStep])

  // Nueva función para validar todos los pasos antes del envío final
  const validateAllSteps = (): { isValid: boolean; errorMessage?: string } => {
    // Validar paso 1: Información básica
    if (!techniqueData.name?.trim()) {
      return { 
        isValid: false, 
        errorMessage: t("nameRequired", "El nombre es obligatorio") 
      }
    }
    
    if (techniqueData.name.trim().length < 3) {
      return { 
        isValid: false, 
        errorMessage: t("nameTooShort", "El nombre debe tener al menos 3 caracteres") 
      }
    }
    
    if (!techniqueData.description?.trim()) {
      return { 
        isValid: false, 
        errorMessage: t("descriptionRequired", "La descripción es obligatoria") 
      }
    }

    if (techniqueData.description.trim().length < 10) {
      return { 
        isValid: false, 
        errorMessage: t("descriptionTooShort", "La descripción debe tener al menos 10 caracteres") 
      }
    }

    if (!techniqueData.selectedCategoryId) {
      return { 
        isValid: false, 
        errorMessage: t("categoryRequired", "Por favor selecciona una categoría") 
      }
    }

    return { isValid: true }
  }

  // Ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  // Función mejorada para ir al siguiente paso con mejor manejo de errores
  const goToNextStep = async () => {
    try {
      // Validar el paso actual antes de continuar
      const validation = validateCurrentStep()
      
      if (!validation.isValid) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          validation.errorMessage,
          [{ text: t("ok", "OK") }]
        )
        return
      }

      // Si es el último paso, validar todo antes de enviar
      if (currentStep === steps.length - 1) {
        // Validación final completa
        const finalValidation = validateAllSteps()
        if (!finalValidation.isValid) {
          Alert.alert(
            t("validationError", "Error de Validación"),
            finalValidation.errorMessage,
            [{ text: t("ok", "OK") }]
          )
          return
        }
        
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
    // Verificamos si el usuario ya tiene un perfil
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      // Error diferente a "no se encontró ningún registro"
      console.error("Error checking profile:", profileError)
      throw new Error("Error checking user profile")
    }

    // Si el perfil no existe, lo creamos
    if (!existingProfile) {
      // Extraer username del email
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

  // Enviar la técnica a la base de datos
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validar una última vez antes de enviar
      const validation = validateAllSteps()
      if (!validation.isValid) {
        Alert.alert(
          t("validationError", "Error de Validación"),
          validation.errorMessage,
          [{ text: t("ok", "OK") }]
        )
        return
      }

      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("No user found")
        Alert.alert(t("error"), t("userNotFound", "User not found"))
        return
      }

      // Asegurarnos de que el usuario tiene un perfil
      const profileId = await ensureUserProfile(user.id, user.email || "")

      // Insertar la técnica en la base de datos
      const { data, error } = await supabase
        .from("techniques")
        .insert({
          user_id: profileId,
          name: techniqueData.name.trim(),
          description: techniqueData.description.trim(),
          difficulty: techniqueData.difficulty,
          angles: techniqueData.angles.length > 0 ? JSON.stringify(techniqueData.angles) : null,
          notes: techniqueData.notes.trim(),
          special_materials: techniqueData.special_materials,
          image_url: techniqueData.image_url,
          video_url: techniqueData.video_url,
          is_public: techniqueData.is_public,
          status: techniqueData.status,
          price: techniqueData.price,
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error creating technique:", error)
        Alert.alert(t("error"), t("errorCreatingTechnique", "Error creating technique"))
        return
      }

      // Si hay una categoría seleccionada, asociarla
      if (techniqueData.selectedCategoryId) {
        try {
          const { error: categoryError } = await supabase.from("technique_categories").insert({
            technique_id: data.id,
            category_id: techniqueData.selectedCategoryId,
            created_at: new Date().toISOString(),
          })

          if (categoryError) {
            console.error("Error associating category with technique:", categoryError)
          }
        } catch (categoryError) {
          console.error("Error in category association:", categoryError)
        }
      }

      // Para compatibilidad hacia atrás, manejar el array de categorías también
      if (techniqueData.categories.length > 0) {
        for (const categoryId of techniqueData.categories) {
          try {
            const { error: categoryError } = await supabase.from("technique_categories").insert({
              technique_id: data.id,
              category_id: categoryId,
              created_at: new Date().toISOString(),
            })

            if (categoryError && categoryError.code !== "23505") {
              // Ignorar errores de clave duplicada
              console.error("Error associating category with technique:", categoryError)
            }
          } catch (categoryError) {
            console.error("Error in category association:", categoryError)
          }
        }
      }

      // Si hay etiquetas, asociarlas a la técnica
      if (techniqueData.tags.length > 0) {
        try {
          // Crear tabla de relación technique_tags si no existe
          const tagInserts = techniqueData.tags.map(tagId => ({
            technique_id: data.id,
            tag_id: tagId,
            created_at: new Date().toISOString(),
          }))

          // Nota: Necesitarás crear la tabla technique_tags similar a trick_tags
          const { error: tagError } = await supabase
            .from("technique_tags")
            .insert(tagInserts)

          if (tagError && tagError.code !== "23505") {
            console.error("Error associating tags with technique:", tagError)
          }
          
          // Actualizar el contador de uso de las etiquetas
          await updateTagsUsageCount(techniqueData.tags)
          
        } catch (tagError) {
          console.error("Error in tag association:", tagError)
        }
      }

      // Mostrar mensaje de éxito
      Alert.alert(
        t("success", "Éxito"),
        t("techniqueCreatedSuccessfully", "La técnica ha sido creada exitosamente"),
        [{ text: t("ok", "OK") }]
      )

      // Llamar al callback de completado
      if (onComplete) {
        onComplete(data.id)
      }
    } catch (error) {
      console.error("Error in submission:", error)
      Alert.alert(
        t("error", "Error"), 
        t("unexpectedError", "Ocurrió un error inesperado")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar el componente del paso actual
  const StepComponent = steps[currentStep].component

  return (
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
  )
}