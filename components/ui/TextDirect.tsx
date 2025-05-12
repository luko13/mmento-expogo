import type React from "react"
import { Text as RNText, type TextProps, StyleSheet } from "react-native"

// Definimos todas las variantes posibles de texto
export type TextVariant = "regular" | "bold" | "heading" | "subheading" | "caption" | "small" | "tiny"

export interface TextDirectProps extends TextProps {
  variant?: TextVariant
  children: React.ReactNode
}

// Versión sin NativeWind para pruebas
export default function TextDirect({ variant = "regular", style, children, ...props }: TextDirectProps) {
  // Seleccionar el estilo basado en la variante
  const variantStyle = styles[variant] || styles.regular

  return (
    <RNText {...props} style={[variantStyle, style]}>
      {children}
    </RNText>
  )
}

// Estilos para las diferentes variantes de texto
const styles = StyleSheet.create({
  regular: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    lineHeight: 32,
  },
  subheading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  caption: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  tiny: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
})
