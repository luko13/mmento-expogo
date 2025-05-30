"use client";

import { View, Image, Dimensions, TouchableOpacity } from "react-native";
import { styled } from "nativewind";
import { Slot, useRouter, usePathname } from "expo-router";
import { Ionicons, FontAwesome5, FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const { width, height } = Dimensions.get("window");

export default function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Verificar si estamos en la ruta de add-magic
  const isAddMagicRoute = pathname.includes("/add-magic");
  const isAddTechniqueRoute = pathname.includes("/add-technique");
  const isAddGimmickRoute = pathname.includes("/add-gimmick");
  const isAddQuickMagicRoute = pathname.includes("/add-quick-magic");
  const isAddScriptRoute = pathname.includes("/add-script");
  const isTrickViewRoute =
    pathname.includes("/trick/") || pathname.includes("/tricks/");
  const isTechniqueViewRoute =
    pathname.includes("/technique/") || pathname.includes("/techniques/");
  const isGimmickViewRoute =
    pathname.includes("/gimmick/") || pathname.includes("/gimmicks/");

  return (
    <StyledView className="flex-1">
      {/* Contenido principal SIN SafeAreaView wrapper - las pantallas individuales manejan sus own safe areas */}
      <Slot />

      {/* Bottom navigation bar que respeta las safe areas */}
      {!isAddMagicRoute &&
        !isAddTechniqueRoute &&
        !isAddQuickMagicRoute &&
        !isTrickViewRoute &&
        !isTechniqueViewRoute &&
        !isGimmickViewRoute && (
          <StyledView
            className="absolute bottom-0 left-24 right-0 z-10"
            style={{
              height: 48 + insets.bottom,
              backgroundColor: "rgba(15, 63, 52, 0.80)",
              borderTopStartRadius: 20,
              borderBottomLeftRadius: 20,
              overflow: "hidden",
              paddingBottom: insets.bottom,
            }}
          >
            <StyledView className="flex-1 flex-row justify-evenly items-center">
              <StyledTouchableOpacity
                onPress={() => router.push("/(app)/home")}
                className="p-3"
              >
                <Ionicons name="home" size={24} color="#FFFFFF" />
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => router.push("/(app)/tricks")}
                className="p-3"
              >
                <FontAwesome5 name="magic" size={24} color="#FFFFFF" />
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                onPress={() => router.push("/(app)/profile")}
                className="p-3"
              >
                <FontAwesome name="user" size={24} color="#FFFFFF" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        )}
    </StyledView>
  );
}
