"use client";

import { useState, useEffect } from "react";
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
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signUp } from "../../utils/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { fontNames } from "../_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

const { width, height } = Dimensions.get("window");

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // Estado para controlar la navegación

  // Reset el estado de navegación al montar el componente
  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const success = await signUp(email, password);

      if (success) {
        // Ocultar la pantalla antes de navegar
        setIsNavigating(true);

        // Guardar la sesión en AsyncStorage para mantener al usuario logueado
        await AsyncStorage.setItem("session", "true");

        // Mostrar mensaje de éxito
        Alert.alert(t("registrationSuccess"), t("checkYourEmail"), [
          {
            text: "OK",
            onPress: () => {
              // Redirección a la homepage después de cerrar la alerta
              router.replace("/(app)/home");
            },
          },
        ]);
      } else {
        Alert.alert(t("registrationError"), t("registrationFailed"));
      }
    } catch (error) {
      console.error("Error en registro:", error);
      Alert.alert(
        t("registrationError"),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (!isNavigating) {
        setLoading(false);
      }
    }
  };

  const goToLogin = () => {
    // Ocultar la pantalla actual antes de navegar
    setIsNavigating(true);

    // Pequeño delay para asegurar que la UI se ha actualizado
    setTimeout(() => {
      router.replace("/auth/login");
    }, 10);
  };

  const handleSocialSignup = (provider: string) => {
    Alert.alert(t("comingSoon"), t("socialSignupNotAvailable", { provider }));
  };

  // Si estamos navegando, no mostramos ningún contenido
  if (isNavigating) {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <StyledSafeAreaView
        className="flex-1"
        style={{ backgroundColor: "transparent" }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <StyledView className="flex-1 justify-center items-center px-6">
            {/* Card Container */}
            <StyledView className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-100/50">
              <StyledText
                className="text-white text-xl font-semibold mb-6"
                style={{
                  fontFamily: fontNames.semiBold,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {t("register")}
              </StyledText>

              {/* Email Field */}
              <StyledView className="mb-4">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                  placeholder={t("email")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </StyledView>

              {/* Password Field */}
              <StyledView className="mb-4">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                  placeholder={t("password")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </StyledView>

              {/* Confirm Password Field */}
              <StyledView className="mb-5">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                  placeholder={t("password")}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </StyledView>

              {/* Social Signup Buttons */}
              <StyledTouchableOpacity
                className="w-full bg-white/20 rounded-md h-11 items-center justify-center mb-3"
                onPress={() => handleSocialSignup("Apple")}
              >
                <StyledText
                  className="text-white/90 font-medium"
                  style={{
                    fontFamily: fontNames.medium,
                    includeFontPadding: false,
                  }}
                >
                  Apple
                </StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="w-full bg-white/20 rounded-md h-11 items-center justify-center mb-5"
                onPress={() => handleSocialSignup("Google")}
              >
                <StyledText
                  className="text-white/90 font-medium"
                  style={{
                    fontFamily: fontNames.medium,
                    includeFontPadding: false,
                  }}
                >
                  Google
                </StyledText>
              </StyledTouchableOpacity>

              {/* Login Link */}
              <StyledView className="flex-row justify-center mb-6">
                <StyledText
                  className="text-white/70 text-sm"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 14,
                    includeFontPadding: false,
                  }}
                >
                  {t("login")}
                </StyledText>
                <StyledTouchableOpacity onPress={goToLogin}>
                  <StyledText
                    className="text-white text-sm ml-1"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("here")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>

              {/* Register Button */}
              <StyledTouchableOpacity
                className="w-full bg-emerald-700 rounded-md h-12 items-center justify-center"
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <StyledText
                    className="text-white font-semibold"
                    style={{
                      fontFamily: fontNames.semiBold,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {t("register")}
                  </StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </ScrollView>
      </StyledSafeAreaView>
    </KeyboardAvoidingView>
  );
}
