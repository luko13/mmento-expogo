"use client"

import { View, Image, Dimensions, TouchableOpacity } from "react-native"
import { styled } from "nativewind"
import { Slot, useRouter, usePathname } from "expo-router"
import { Home, Wand2, User } from "lucide-react-native"

const StyledView = styled(View)
const StyledTouchableOpacity = styled(TouchableOpacity)
const { width, height } = Dimensions.get("window")

export default function AppLayout() {
  const router = useRouter()
  const pathname = usePathname()

  // Verificar si estamos en la ruta de add-magic
  const isAddMagicRoute = pathname.startsWith("/add-magic")

  return (
    <StyledView className="flex-1">
      <Image
        source={require("../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />

      {!isAddMagicRoute && (
        <StyledView
          className="absolute bottom-0 left-24 right-0 z-10"
          style={{
            height: 60,
            backgroundColor: "rgba(15, 63, 52, 0.80)",
            borderTopStartRadius: 20,
            borderBottomLeftRadius: 20,
            overflow: "hidden",
          }}
        >
          <StyledView className="flex-1 flex-row justify-evenly items-center">
            <StyledTouchableOpacity onPress={() => router.push("/(app)/home")} className="p-3">
              <Home size={24} color="#FFFFFF" strokeWidth={2} />
            </StyledTouchableOpacity>

            <StyledTouchableOpacity onPress={() => router.push("/(app)/tricks")} className="p-3">
              <Wand2 size={24} color="#FFFFFF" strokeWidth={2} />
            </StyledTouchableOpacity>

            <StyledTouchableOpacity onPress={() => router.push("/(app)/profile")} className="p-3">
              <User size={24} color="#FFFFFF" strokeWidth={2} />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      )}

      {/* Contenido de la página */}
      <Slot />
    </StyledView>
  )
}

