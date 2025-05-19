"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { signIn } from "../../utils/auth"
import { SafeAreaView } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledSafeAreaView = styled(SafeAreaView)

const { width, height } = Dimensions.get("window")

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false) // Estado para controlar la navegación

  // Reset el estado de navegación al montar el componente
  useEffect(() => {
    setIsNavigating(false)
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("error"), t("fillAllFields"))
      return
    }

    setLoading(true)
    try {
      const success = await signIn(email, password)

      if (success) {
        // Ocultar la pantalla antes de navegar
        setIsNavigating(true)
        
        // Guardar la sesión en AsyncStorage para mantener al usuario logueado
        await AsyncStorage.setItem("session", "true")

        // Redirección a la homepage - usar replace en lugar de push
        setTimeout(() => {
          router.replace("/(app)/home")
        }, 10) // Pequeño delay para asegurar que la UI se ha actualizado
      } else {
        Alert.alert(t("loginError"), t("incorrectCredentials"))
      }
    } catch (error) {
      console.error("Error en login:", error)
      Alert.alert(t("loginError"), error instanceof Error ? error.message : String(error))
    } finally {
      if (!isNavigating) {
        setLoading(false)
      }
    }
  }

  const goToRegister = () => {
    // Ocultar la pantalla actual antes de navegar
    setIsNavigating(true)
    
    // Pequeño delay para asegurar que la UI se ha actualizado
    setTimeout(() => {
      router.replace("/auth/register")
    }, 10)
  }

  const goToPasswordRecover = () => {
    // Ocultar la pantalla actual antes de navegar
    setIsNavigating(true)
    
    // Pequeño delay para asegurar que la UI se ha actualizado
    setTimeout(() => {
      router.replace("/auth/password-recover")
    }, 10)
  }

  const handleSocialLogin = (provider: string) => {
    Alert.alert(t("comingSoon"), t("socialLoginNotAvailable", { provider }))
  }

  // Si estamos navegando, no mostramos ningún contenido
  if (isNavigating) {
    return <View style={{ flex: 1, backgroundColor: 'transparent' }} />
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <StyledSafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <StyledView className="flex-1 justify-center items-center px-6">
            {/* Card Container */}
            <StyledView className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-100/50">
              <StyledText className="text-white text-xl font-semibold mb-6">
                {t("login")}
              </StyledText>

              {/* Email/Username Field */}
              <StyledView className="mb-4">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  placeholder={t("username")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </StyledView>

              {/* Password Field */}
              <StyledView className="mb-5">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  placeholder={t("password")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </StyledView>

              {/* Social Login Buttons */}
              <StyledTouchableOpacity
                className="w-full bg-white/20 rounded-md h-11 items-center justify-center mb-3"
                onPress={() => handleSocialLogin("Apple")}
              >
                <StyledText className="text-white/90 font-medium">
                  Apple
                </StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="w-full bg-white/20 rounded-md h-11 items-center justify-center mb-5"
                onPress={() => handleSocialLogin("Google")}
              >
                <StyledText className="text-white/90 font-medium">
                  Google
                </StyledText>
              </StyledTouchableOpacity>

              {/* Create Account Link */}
              <StyledView className="flex-row justify-center mb-6">
                <StyledText className="text-white/70 text-sm">
                  {t("createAccount")} 
                </StyledText>
                <StyledTouchableOpacity onPress={goToRegister}>
                  <StyledText className="text-white text-sm ml-1">
                    {t("here")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>

              {/* Login Button */}
              <StyledTouchableOpacity
                className="w-full bg-emerald-700 rounded-md h-12 items-center justify-center"
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <StyledText className="text-white font-semibold">
                    {t("login")}
                  </StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>

            {/* Forgot Password Link */}
            <StyledTouchableOpacity 
              className="mt-5" 
              onPress={goToPasswordRecover}
            >
              <StyledText className="text-white/70 text-sm">
                {t("forgotPassword")}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </ScrollView>
      </StyledSafeAreaView>
    </KeyboardAvoidingView>
  )
}