//styles/typography.ts
import { StyleSheet } from "react-native"

export const typography = StyleSheet.create({
  regular: {
    fontFamily: "Outfit_400Regular",
  },
  bold: {
    fontFamily: "Outfit_700Bold",
  },
  // Variantes de tamaño
  h1: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
  },
  h2: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
  },
  body: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
  },
  small: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
  },
})

