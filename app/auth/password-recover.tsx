import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { fontNames } from "../_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

const { width, height } = Dimensions.get("window");

export default function PasswordRecoverScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // Estado para controlar la navegación

  // Reset el estado de navegación al montar el componente
  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const handleRecover = async () => {
    if (!email) {
      Alert.alert(t("error"), t("emailRequired"));
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "mmento://reset-password",
      });

      if (error) throw error;

      Alert.alert(t("passwordResetSent"), t("passwordResetInstructions"), [
        {
          text: "OK",
          onPress: () => {
            // Ocultar la pantalla antes de navegar
            setIsNavigating(true);

            // Pequeño delay para asegurar que la UI se ha actualizado
            setTimeout(() => {
              router.replace("/auth/login");
            }, 10);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("unexpectedError"));
    } finally {
      if (!isNavigating) {
        setIsLoading(false);
      }
    }
  };

  const goBack = () => {
    // Ocultar la pantalla actual antes de navegar
    setIsNavigating(true);

    // Pequeño delay para asegurar que la UI se ha actualizado
    setTimeout(() => {
      router.replace("/auth/login");
    }, 10);
  };

  // Si estamos navegando, no mostramos ningún contenido
  if (isNavigating) {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  return (
    <StyledSafeAreaView
      className="flex-1"
      style={{ backgroundColor: "transparent" }}
    >
      <StyledView className="flex-1 justify-center items-center px-6">
        {/* Tarjeta de recuperación de contraseña */}
        <StyledView className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-100/50">
          <StyledText
            className="text-white text-xl mb-6"
            style={{
              fontFamily: fontNames.light,
              fontSize: 20,
              includeFontPadding: false,
            }}
          >
            {t("passwordRecover")}
          </StyledText>

          {/* Campo de correo electrónico */}
          <StyledTextInput
            className="w-full bg-white/10 border border-white/20 rounded-md h-12 px-4 text-white mb-6"
            style={{
              fontFamily: fontNames.regular,
              fontSize: 16,
              includeFontPadding: false,
            }}
            placeholder={t("email")}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {/* Botón de recuperación */}
          <StyledTouchableOpacity
            className="w-full bg-[#2C6B5C] rounded-md h-12 items-center justify-center"
            disabled={isLoading}
            onPress={handleRecover}
          >
            {isLoading ? (
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
                {t("recoverViaEmail")}
              </StyledText>
            )}
          </StyledTouchableOpacity>
        </StyledView>

        {/* Enlace para volver */}
        <StyledTouchableOpacity className="mt-6" onPress={goBack}>
          <StyledText
            className="text-white/70"
            style={{
              fontFamily: fontNames.regular,
              fontSize: 14,
              includeFontPadding: false,
            }}
          >
            {t("goBack")}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledSafeAreaView>
  );
}
