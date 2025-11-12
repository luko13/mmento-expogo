"use client";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { styled } from "nativewind";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <StyledView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <StyledView className="flex-row items-center px-5 py-4">
          <StyledTouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledText
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontFamily: fontNames.semiBold,
              includeFontPadding: false,
            }}
          >
            {t("profileOptions.settings")}
          </StyledText>
        </StyledView>

        {/* Content */}
        <StyledView className="flex-1 justify-center items-center px-5">
          <Ionicons name="settings-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <StyledText
            className="mt-4 text-center"
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 18,
              fontFamily: fontNames.medium,
              includeFontPadding: false,
            }}
          >
            Pantalla de Settings
          </StyledText>
          <StyledText
            className="mt-2 text-center"
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: 14,
              fontFamily: fontNames.regular,
              includeFontPadding: false,
            }}
          >
            Próximamente disponible
          </StyledText>
        </StyledView>
      </SafeAreaView>
    </StyledView>
  );
}
