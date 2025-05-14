"use client"

import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import Text from "../../components/ui/Text"
import * as Font from "expo-font"
import { useState, useEffect } from "react"

const StyledView = styled(View)
const StyledScrollView = styled(ScrollView)
const StyledTouchableOpacity = styled(TouchableOpacity)

export default function FontTestScreen() {
  const router = useRouter()
  const [availableFonts, setAvailableFonts] = useState<string[]>([])

  useEffect(() => {
    async function checkFonts() {
      try {
        const fonts = await Font.getLoadedFonts()
        setAvailableFonts(fonts)
      } catch (error) {
        console.error("Error obteniendo fuentes:", error)
        setAvailableFonts(["Error obteniendo fuentes"])
      }
    }

    checkFonts()
  }, [])

  return (
    <StyledView className="flex-1 bg-black">
      <StyledView className="absolute top-12 left-4 z-10">
        <StyledTouchableOpacity onPress={() => router.back()} className="p-2 bg-emerald-700 rounded-full">
          <Ionicons name="chevron-back" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 pt-24 px-4">
        <RNText style={styles.header}>Diagnóstico de Fuentes</RNText>

        <StyledView className="bg-gray-800/80 rounded-xl p-4 mb-4">
          <RNText style={styles.sectionTitle}>Fuentes Disponibles</RNText>
          {availableFonts.length > 0 ? (
            availableFonts.map((font, index) => (
              <RNText key={index} style={styles.fontItem}>
                • {font}
              </RNText>
            ))
          ) : (
            <RNText style={styles.fontItem}>Cargando fuentes...</RNText>
          )}
        </StyledView>

        <StyledView className="bg-gray-800/80 rounded-xl p-4 mb-4">
          <RNText style={styles.sectionTitle}>1. React Native Text Directo</RNText>

          <RNText style={styles.systemFont}>Fuente del sistema (sin fontFamily)</RNText>

          <RNText style={styles.regularDirect}>Outfit-Regular - fontFamily: "Outfit-Regular"</RNText>

          <RNText style={styles.boldDirect}>Outfit-Bold - fontFamily: "Outfit-Bold"</RNText>
        </StyledView>

        <StyledView className="bg-gray-800/80 rounded-xl p-4 mb-4">
          <RNText style={styles.sectionTitle}>2. Componente Text Personalizado</RNText>

          <Text variant="regular" style={styles.test}>
            Variant "regular" - debería ser Outfit Regular
          </Text>

          <Text variant="bold" style={styles.test}>
            Variant "bold" - debería ser Outfit Bold
          </Text>
        </StyledView>

        <StyledView className="bg-gray-800/80 rounded-xl p-4 mb-4">
          <RNText style={styles.sectionTitle}>3. Clases Tailwind</RNText>

          <Text className="font-outfit text-base text-white">className="font-outfit" - debería ser Outfit Regular</Text>

          <Text className="font-outfit-bold text-base text-white mt-2">
            className="font-outfit-bold" - debería ser Outfit Bold
          </Text>
        </StyledView>

        <StyledView className="bg-gray-800/80 rounded-xl p-4 mb-20">
          <RNText style={styles.sectionTitle}>Solución para Development Build</RNText>
          <RNText style={styles.instructions}>
            Si ninguna fuente se muestra correctamente, la mejor solución es crear un Development Build con Expo:
            {"\n\n"}
            1. Instala las fuentes en la carpeta assets/fonts/{"\n"}
            2. Ejecuta: npx expo prebuild{"\n"}
            3. Ejecuta: npx expo run:ios (o run:android){"\n\n"}
            Esto creará una build nativa que incluirá las fuentes directamente en la aplicación.
          </RNText>
        </StyledView>
      </StyledScrollView>
    </StyledView>
  )
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "white",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#10b981",
  },
  systemFont: {
    fontSize: 16,
    marginVertical: 8,
    color: "white",
  },
  regularDirect: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    marginVertical: 8,
    color: "white",
  },
  boldDirect: {
    fontFamily: "Outfit-Bold",
    fontSize: 16,
    marginVertical: 8,
    color: "white",
  },
  test: {
    marginVertical: 8,
    color: "white",
  },
  instructions: {
    color: "white",
    lineHeight: 22,
  },
  fontItem: {
    color: "white",
    marginBottom: 4,
  },
})
