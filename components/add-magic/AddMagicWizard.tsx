"use client"

import { useState, useEffect, useMemo } from "react"
import { Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"
import TitleCategoryStep from "./steps/TitleCategoryStep"
import EffectStep from "./steps/EffectStep"
//import SecretStep from "./steps/SecretStep"
import ExtrasStep from "./steps/ExtrasStep"

// Tipo para el truco de magia
export interface MagicTrick {
  // ID y usuario (necesarios para referencias en la base de datos)
  id?: string
  user_id?: string

  // Paso 1: Título y categorización
  title: string
  categories: string[]
  tags: string[]
  selectedCategoryId: string | null

  // Paso 2: Efecto
  effect: string
  effect_video_url: string | null
  angles: string[]
  duration: number | null
  reset: number | null
  difficulty: number | null

  // Paso 3: Secreto
  secret: string
  secret_video_url: string | null
  special_materials: string[]

  // Paso 4: Extras
  notes: string
  // Relaciones con otras entidades
  techniqueIds?: string[]
  gimmickIds?: string[]
  // Scripts
  script: string
  scriptId?: string
  photo_url: string | null
}

// Props para el componente
interface AddMagicWizardProps {
  onComplete?: (trickId: string) => void
  onCancel?: () => void
}

export default function AddMagicWizard({ onComplete, onCancel }: AddMagicWizardProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado inicial del truco
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
  })

  // Actualizar datos del truco
  const updateTrickData = (data: Partial<MagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }))
  }
// Función para actualizar el contador de uso de las etiquetas seleccionadas
const updateTagsUsageCount = async (tagIds: string[]) => {
  try {
    if (!tagIds || tagIds.length === 0) return;
    
    // Llamamos a la función de Supabase para cada etiqueta
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
  // Pasos del asistente
  const steps = [
    { title: t("titleAndCategories", "Title & Categories"), component: TitleCategoryStep },
    { title: t("effect", "Effect"), component: EffectStep },
    //{ title: t("secret", "Secret"), component: SecretStep },
    { title: t("extras", "Extras"), component: ExtrasStep },
  ]

  // Validación mejorada de los campos obligatorios de cada paso
  const validateCurrentStep = (): { isValid: boolean; errorMessage?: string } => {
    switch (currentStep) {
      case 0: // Paso 1: Título y categorización
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

        if (trickData.title.trim().length > 100) {
          return { 
            isValid: false, 
            errorMessage: t("titleTooLong", "El título no debe exceder los 100 caracteres") 
          }
        }

        if (!trickData.selectedCategoryId) {
          return { 
            isValid: false, 
            errorMessage: t("categoryRequired", "Por favor selecciona una categoría") 
          }
        }

        return { isValid: true }

      case 1: // Paso 2: Efecto
        if (!trickData.effect?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("effectRequired", "La descripción del efecto es obligatoria") 
          }
        }

        if (trickData.effect.trim().length < 10) {
          return { 
            isValid: false, 
            errorMessage: t("effectTooShort", "La descripción del efecto debe tener al menos 10 caracteres") 
          }
        }

        return { isValid: true }

      case 2: // Paso 3: Secreto
        if (!trickData.secret?.trim()) {
          return { 
            isValid: false, 
            errorMessage: t("secretRequired", "La descripción del secreto es obligatoria") 
          }
        }

        if (trickData.secret.trim().length < 10) {
          return { 
            isValid: false, 
            errorMessage: t("secretTooShort", "La descripción del secreto debe tener al menos 10 caracteres") 
          }
        }

        return { isValid: true }

      case 3: // Paso 4: Extras (todos opcionales)
        return { isValid: true }

      default:
        return { isValid: true }
    }
  }

  // IMPORTANTE: Calcular el estado del botón usando useMemo
  const isNextButtonDisabled = useMemo(() => {
    const validation = validateCurrentStep()
    return !validation.isValid
  }, [trickData, currentStep])

  // Nueva función para validar todos los pasos antes del envío final
  const validateAllSteps = (): { isValid: boolean; errorMessage?: string } => {
    // Validar paso 1: Título y categoría
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

    // Validar paso 2: Efecto
    if (!trickData.effect?.trim()) {
      return { 
        isValid: false, 
        errorMessage: t("effectRequired", "La descripción del efecto es obligatoria") 
      }
    }

    if (trickData.effect.trim().length < 10) {
      return { 
        isValid: false, 
        errorMessage: t("effectTooShort", "La descripción del efecto debe tener al menos 10 caracteres") 
      }
    }

    // Validar paso 3: Secreto
    if (!trickData.secret?.trim()) {
      return { 
        isValid: false, 
        errorMessage: t("secretRequired", "La descripción del secreto es obligatoria") 
      }
    }

    if (trickData.secret.trim().length < 10) {
      return { 
        isValid: false, 
        errorMessage: t("secretTooShort", "La descripción del secreto debe tener al menos 10 caracteres") 
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

  // Enviar el truco a la base de datos
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

      // Insertar el truco en la base de datos
      const { data, error } = await supabase
        .from("magic_tricks")
        .insert({
          user_id: profileId,
          title: trickData.title.trim(), // Asegurar que no hay espacios extra
          effect: trickData.effect.trim(),
          secret: trickData.secret.trim(),
          difficulty: trickData.difficulty,
          duration: trickData.duration,
          reset: trickData.reset,
          angles: trickData.angles.length > 0 ? JSON.stringify(trickData.angles) : null,
          notes: trickData.notes.trim(),
          special_materials: trickData.special_materials,
          effect_video_url: trickData.effect_video_url,
          secret_video_url: trickData.secret_video_url,
          photo_url: trickData.photo_url,
          status: "draft",
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error creating trick:", error)
        Alert.alert(t("error"), t("errorCreatingTrick", "Error creating trick"))
        return
      }

      // If a category is selected, associate it with the trick
      if (trickData.selectedCategoryId) {
        try {
          const { error: categoryError } = await supabase.from("trick_categories").insert({
            trick_id: data.id,
            category_id: trickData.selectedCategoryId,
            created_at: new Date().toISOString(),
          })

          if (categoryError) {
            console.error("Error associating category with trick:", categoryError)
          }
        } catch (categoryError) {
          console.error("Error in category association:", categoryError)
        }
      }

      // For backward compatibility, handle the categories array too
      if (trickData.categories.length > 0) {
        // Here we would implement the logic to associate categories
        // This depends on how categories are structured in your database
        for (const categoryId of trickData.categories) {
          try {
            const { error: categoryError } = await supabase.from("trick_categories").insert({
              trick_id: data.id,
              category_id: categoryId,
              created_at: new Date().toISOString(),
            })

            if (categoryError && categoryError.code !== "23505") {
              // Ignore duplicate key errors
              console.error("Error associating category with trick:", categoryError)
            }
          } catch (categoryError) {
            console.error("Error in category association:", categoryError)
          }
        }
      }

      // Si hay etiquetas, asociarlas al truco
      if (trickData.tags.length > 0) {
  try {
    const tagInserts = trickData.tags.map(tagId => ({
      trick_id: data.id,
      tag_id: tagId,
      created_at: new Date().toISOString(),
    }))

    const { error: tagError } = await supabase
      .from("trick_tags")
      .insert(tagInserts)

    if (tagError && tagError.code !== "23505") {
      console.error("Error associating tags with trick:", tagError)
    }
    
    // Agregar esta llamada para actualizar el contador de uso de las etiquetas
    await updateTagsUsageCount(trickData.tags);
    
  } catch (tagError) {
    console.error("Error in tag association:", tagError)
  }
}

      // Si hay un script, guardarlo
      if (trickData.script && trickData.script.trim()) {
        try {
          const { error: scriptError } = await supabase.from("scripts").insert({
            user_id: profileId,
            trick_id: data.id,
            title: `Script for ${trickData.title}`,
            content: trickData.script.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (scriptError) {
            console.error("Error creating script:", scriptError)
          }
        } catch (scriptError) {
          console.error("Error in script creation:", scriptError)
        }
      }
      
      // Si hay técnicas seleccionadas, asociarlas al truco
      if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
        try {
          const techniqueInserts = trickData.techniqueIds.map(techniqueId => ({
            trick_id: data.id,
            technique_id: techniqueId,
            created_at: new Date().toISOString(),
          }))

          const { error: techniqueError } = await supabase
            .from("trick_techniques")
            .insert(techniqueInserts)

          if (techniqueError && techniqueError.code !== "23505") {
            console.error("Error associating techniques with trick:", techniqueError)
          }
        } catch (techniqueError) {
          console.error("Error in technique association:", techniqueError)
        }
      }
      
      // Si hay gimmicks seleccionados, asociarlos al truco
      if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
        try {
          const gimmickInserts = trickData.gimmickIds.map(gimmickId => ({
            trick_id: data.id,
            gimmick_id: gimmickId,
            created_at: new Date().toISOString(),
          }))

          const { error: gimmickError } = await supabase
            .from("trick_gimmicks")
            .insert(gimmickInserts)

          if (gimmickError && gimmickError.code !== "23505") {
            console.error("Error associating gimmicks with trick:", gimmickError)
          }
        } catch (gimmickError) {
          console.error("Error in gimmick association:", gimmickError)
        }
      }

      // Mostrar mensaje de éxito
      Alert.alert(
        t("success", "Éxito"),
        t("trickCreatedSuccessfully", "El truco ha sido creado exitosamente"),
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
  )
}