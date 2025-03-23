"use client"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { router } from "expo-router"
import { BlurView } from "expo-blur"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { signUp } from "../../utils/auth"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width, height } = Dimensions.get("window")

export default function Register() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t("error"), "Por favor, completa todos los campos")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"))
      return
    }

    setLoading(true)
    try {
      const success = await signUp(email, password)

      if (success) {
        // Guardar la sesión en AsyncStorage para mantener al usuario logueado
        await AsyncStorage.setItem("session", "true")

        // Mostrar mensaje de éxito
        Alert.alert(t("registrationSuccess"), t("checkYourEmail"), [
          {
            text: "OK",
            onPress: () => {
              // Redirección a la homepage después de cerrar la alerta
              router.replace("/(app)/home")
            },
          },
        ])
      } else {
        Alert.alert(t("registrationError"), "No se pudo completar el registro")
      }
    } catch (error) {
      console.error("Error en registro:", error)
      Alert.alert(t("registrationError"), error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    router.push("/auth/login")
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Image
          source={require("../../assets/BG_Auth.png")}
          style={{
            width: width,
            height: height,
            position: "absolute",
          }}
          resizeMode="cover"
        />
        <StyledView className="flex-1 justify-center p-6">
          <StyledView className="mb-8 items-center">
          </StyledView>

          <StyledView className="mb-6 overflow-hidden rounded-xl">
            <BlurView intensity={20} tint="dark" style={{ padding: 20 }}>
              <StyledView className="mb-4">
                <StyledText className="text-white mb-2">{t("email")}</StyledText>
                <StyledTextInput
                  className="bg-white/10 text-white p-3 rounded-lg"
                  placeholder={t("email")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </StyledView>

              <StyledView className="mb-4">
                <StyledText className="text-white mb-2">{t("password")}</StyledText>
                <StyledTextInput
                  className="bg-white/10 text-white p-3 rounded-lg"
                  placeholder={t("password")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </StyledView>

              <StyledView className="mb-6">
                <StyledText className="text-white mb-2">{t("confirmPassword")}</StyledText>
                <StyledTextInput
                  className="bg-white/10 text-white p-3 rounded-lg"
                  placeholder={t("confirmPassword")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </StyledView>

              <StyledTouchableOpacity
                className="bg-emerald-700 py-3 rounded-lg items-center mb-4"
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <StyledText className="text-white font-bold">{t("register")}</StyledText>
                )}
              </StyledTouchableOpacity>
            </BlurView>
          </StyledView>

          <StyledView className="flex-row justify-center">
            <StyledText className="text-white/70 mr-1">{t("alreadyHaveAccount")}</StyledText>
            <StyledTouchableOpacity onPress={goToLogin}>
              <StyledText className="text-emerald-400 font-bold">{t("login")}</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

