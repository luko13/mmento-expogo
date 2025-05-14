"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Ionicons, Feather } from "@expo/vector-icons"
import { supabase } from "../../lib/supabase"
import TitleCategoryStep from "./steps/TitleCategoryStep"
import EffectStep from "./steps/EffectStep"
import SecretStep from "./steps/SecretStep"
import ExtrasStep from "./steps/ExtrasStep"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

// Tipo para el truco de magia
export interface MagicTrick {
  // Paso 1: Título y categorización
  title: string
  categories: string[]
  tags: string[]
  selectedCategoryId: string | null // Add this line

  // Paso 2: Efecto
  effect: string
  effect_video_url: string | null
  angles: string[]
  duration: number | null
  reset: number | null
  difficulty: string | null

  // Paso 3: Secreto
  secret: string
  secret_video_url: string | null
  special_materials: string[]

  // Paso 4: Extras
  notes: string
  script: string
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
    difficulty: null,
    secret: "",
    secret_video_url: null,
    special_materials: [],
    notes: "",
    script: "",
    photo_url: null,
  })

  // Actualizar datos del truco
  const updateTrickData = (data: Partial<MagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }))
  }

  // Pasos del asistente
  const steps = [
    { title: t("titleAndCategories", "Title & Categories"), component: TitleCategoryStep },
    { title: t("effect", "Effect"), component: EffectStep },
    { title: t("secret", "Secret"), component: SecretStep },
    { title: t("extras", "Extras"), component: ExtrasStep },
  ]

  // Ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  // Ir al paso siguiente
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
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
      console.log("Creating new profile for user:", userId)

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

  // Update the handleSubmit function to save the selected category
  // Enviar el truco a la base de datos
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

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
          title: trickData.title,
          effect: trickData.effect,
          secret: trickData.secret,
          difficulty: trickData.difficulty,
          duration: trickData.duration,
          reset: trickData.reset,
          angles: trickData.angles.length > 0 ? JSON.stringify(trickData.angles) : null,
          notes: trickData.notes,
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
        // Aquí se implementaría la lógica para asociar etiquetas
      }

      // Si hay un script, guardarlo
      if (trickData.script) {
        await supabase.from("scripts").insert({
          user_id: profileId,
          trick_id: data.id,
          title: `Script for ${trickData.title}`,
          content: trickData.script,
        })
      }

      // Llamar al callback de completado
      if (onComplete) {
        onComplete(data.id)
      }
    } catch (error) {
      console.error("Error in submission:", error)
      Alert.alert(t("error"), t("unexpectedError", "An unexpected error occurred"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar el componente del paso actual
  const StepComponent = steps[currentStep].component

  return (
    <StyledView className="flex-1">
      <StyledView className="bg-emerald-900/90 p-4 rounded-b-xl">
        <StyledText className="text-white text-xl font-bold text-center">{t("addMagic", "Add Magic")}</StyledText>

        {/* Indicador de pasos */}
        <StyledView className="flex-row justify-between mt-4">
          {steps.map((step, index) => (
            <StyledView
              key={index}
              className={`flex-1 h-1 mx-1 rounded-full ${index <= currentStep ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </StyledView>

        <StyledText className="text-white text-center mt-2">{steps[currentStep].title}</StyledText>
      </StyledView>

      <StyledScrollView className="flex-1 p-4">
        <StepComponent trickData={trickData} updateTrickData={updateTrickData} />
      </StyledScrollView>

      {/* Botones de navegación */}
      <StyledView className="flex-row justify-between p-4 bg-emerald-900/90">
        <StyledTouchableOpacity
          onPress={goToPreviousStep}
          className="bg-emerald-700 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons name="chevron-back" size={20} color="white" />
          <StyledText className="text-white ml-1">
            {currentStep === 0 ? t("cancel", "Cancel") : t("back_", "Back")}
          </StyledText>
        </StyledTouchableOpacity>

        <StyledTouchableOpacity
          onPress={goToNextStep}
          className="bg-emerald-700 px-4 py-2 rounded-lg flex-row items-center"
          disabled={isSubmitting}
        >
          <StyledText className="text-white mr-1">
            {currentStep === steps.length - 1 ? t("save", "Save") : t("next", "Next")}
          </StyledText>
          {currentStep === steps.length - 1 ? (
            <Feather name="save" size={20} color="white" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="white" />
          )}
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  )
}
