"use client";

import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { styled } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { fontNames } from "../../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledLinearGradient = styled(LinearGradient);

export default function EditProfile() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <StyledLinearGradient colors={["#15322C", "#15322C"]} className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />

      {/* Header */}
      <StyledView className="flex-row items-center justify-center px-5 py-3">
        <StyledTouchableOpacity
          onPress={() => router.back()}
          className="absolute left-5"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </StyledTouchableOpacity>
        <StyledText
          style={{
            color: "#FFFFFF",
            fontSize: 20,
            fontFamily: fontNames.semiBold,
          }}
        >
          {t("profile.editProfile")}
        </StyledText>
      </StyledView>

      {/* Content */}
      <StyledView className="flex-1 justify-center items-center px-6">
        <Ionicons name="construct-outline" size={80} color="#5BB9A3" />
        <StyledText
          className="text-white text-xl mt-6 text-center"
          style={{ fontFamily: fontNames.bold }}
        >
          {t("profile.underConstruction")}
        </StyledText>
        <StyledText
          className="text-gray-400 text-center mt-4"
          style={{ fontFamily: fontNames.regular }}
        >
          {t("profile.underConstructionMessage")}
        </StyledText>
      </StyledView>
    </StyledLinearGradient>
  );
}
