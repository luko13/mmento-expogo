// app/auth/login.tsx - Enhanced with legacy user message
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
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signIn } from "../../utils/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fontNames } from "../_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

const { width, height } = Dimensions.get("window");

export default function Login() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLegacyMessage, setShowLegacyMessage] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    // Check if redirected due to legacy user
    if (params.legacy === "true") {
      setShowLegacyMessage(true);
    }
  }, [params]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const success = await signIn(email, password);

      if (success) {
        setIsNavigating(true);
        await AsyncStorage.setItem("session", "true");

        // Show success message for legacy users
        if (showLegacyMessage) {
          Alert.alert(
            t("encryptionEnabled", "Encryption Enabled"),
            t(
              "yourDataNowSynced",
              "Your encrypted data is now accessible from all your devices!"
            ),
            [
              {
                text: "OK",
                onPress: () => router.replace("/(app)/home"),
              },
            ]
          );
        } else {
          setTimeout(() => {
            router.replace("/(app)/home");
          }, 10);
        }
      } else {
        Alert.alert(t("loginError"), t("incorrectCredentials"));
      }
    } catch (error) {
      console.error("Error en login:", error);
      Alert.alert(
        t("loginError"),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (!isNavigating) {
        setLoading(false);
      }
    }
  };

  const goToRegister = () => {
    setIsNavigating(true);
    setTimeout(() => {
      router.replace("/auth/register");
    }, 10);
  };

  const goToPasswordRecover = () => {
    setIsNavigating(true);
    setTimeout(() => {
      router.replace("/auth/password-recover");
    }, 10);
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(t("comingSoon"), t("socialLoginNotAvailable", { provider }));
  };

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
            {/* Legacy User Message */}
            {showLegacyMessage && (
              <StyledView className="w-full bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-4 mb-4">
                <StyledView className="flex-row items-center mb-2">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#10b981"
                  />
                  <StyledText
                    className="text-emerald-400 font-semibold ml-2"
                    style={{
                      fontFamily: fontNames.semiBold,
                      includeFontPadding: false,
                    }}
                  >
                    {t("actionRequired", "Action Required")}
                  </StyledText>
                </StyledView>
                <StyledText
                  className="text-white/90 text-sm"
                  style={{
                    fontFamily: fontNames.regular,
                    includeFontPadding: false,
                  }}
                >
                  {t(
                    "legacyEncryptionMessage",
                    "Please log in again to enable cross-device encryption sync. Your encrypted data will then be accessible from all your devices."
                  )}
                </StyledText>
              </StyledView>
            )}

            {/* Card Container */}
            <StyledView className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-100/50">
              <StyledText
                className="text-white text-xl mb-6"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {t("login")}
              </StyledText>

              {/* Email/Username Field */}
              <StyledView className="mb-4">
                <StyledTextInput
                  className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
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

              {/* Social Login Buttons */}
              <StyledTouchableOpacity
                className="w-full bg-white/20 rounded-md h-11 items-center justify-center mb-3"
                onPress={() => handleSocialLogin("Apple")}
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
                onPress={() => handleSocialLogin("Google")}
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

              {/* Create Account Link */}
              <StyledView className="flex-row justify-center mb-6">
                <StyledText
                  className="text-white/70 text-sm"
                  style={{
                    fontFamily: fontNames.extraLight,
                    fontSize: 14,
                    includeFontPadding: false,
                  }}
                >
                  {t("createAccount")}
                </StyledText>
                <StyledTouchableOpacity onPress={goToRegister}>
                  <StyledText
                    className="text-white text-sm ml-1"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("here")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>

              {/* Login Button */}
              <StyledTouchableOpacity
                className="w-full bg-[#2C6B5C] rounded-md h-12 items-center justify-center"
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <StyledText
                    className="text-white"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
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
              <StyledText
                className="text-white/70 text-sm"
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 14,
                  includeFontPadding: false,
                }}
              >
                {t("forgotPassword")}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </ScrollView>
      </StyledSafeAreaView>
    </KeyboardAvoidingView>
  );
}
