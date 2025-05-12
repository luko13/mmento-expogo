"use client"

import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { router } from "expo-router"
import { useEffect } from "react"
import { checkSession } from "../utils/storage"

const StyledView = styled(View)
const StyledText = styled(Text)

const { width, height } = Dimensions.get("window")

export default function Home() {
  const { t, i18n } = useTranslation()


  const handlePress = async () => {
    const hasSession = await checkSession()
    router.push(hasSession ? "/(app)/home" : "/auth/login")
  }

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la pantalla
    checkSession().then((hasSession) => {
      if (hasSession) {
        router.replace("/(app)/home")
      }
    })
  }, [])

  return (
    <TouchableOpacity onPress={handlePress} style={{ flex: 1 }}>
      <Image
        source={require("../assets/Index.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />
      <StyledView className="flex-1 items-center justify-center">
        {/* Texto traducido */}
        <StyledText className="text-lg text-white/60 absolute bottom-8">{t("tapAnywhere")}</StyledText>
      </StyledView>
    </TouchableOpacity>
  )
}

