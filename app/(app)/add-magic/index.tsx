"use client";
import { View, StatusBar } from "react-native";
import { styled } from "nativewind";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AddMagicWizardEncrypted from "../../../components/add-magic/AddMagicWizard";

const StyledView = styled(View);

export default function AddMagicScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleComplete = (trickId: string, trickTitle: string) => {
    // Navegar a home con parámetros para mostrar el modal
    router.replace({
      pathname: "/(app)/home",
      params: {
        showSuccessModal: "true",
        trickId: trickId,
        trickTitle: trickTitle,
      },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <StyledView className="flex-1">
      {/* StatusBar configuration */}
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Full screen gradient background */}
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

        {/* Wizard content */}
        <AddMagicWizardEncrypted
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </SafeAreaView>
    </StyledView>
  );
}