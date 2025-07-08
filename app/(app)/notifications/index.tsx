"use client";
import { View, Text } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { fontNames } from "../../_layout";

const StyledView = styled(View);
const StyledText = styled(Text);

export default function Trick() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StyledView className="flex-1 justify-center items-center">
        <StyledText 
          className="text-white text-2xl"
          style={{
            fontFamily: fontNames.extraLight,
            fontSize: 20,
            includeFontPadding: false,
          }}
        >
          Coming Soon
        </StyledText>
      </StyledView>
    </SafeAreaView>
  );
}