import type React from "react"
import { Text as RNText, type TextProps, StyleSheet } from "react-native"
import { styled } from "nativewind"

// Definimos todas las variantes posibles de texto
export type TextVariant = "regular" | "bold" | "heading" | "subheading" | "caption" | "small" | "tiny"

export interface TextComponentProps extends TextProps {
  variant?: TextVariant
  children: React.ReactNode
}

// Componente base sin styled() aplicado
const TextBase: React.FC<TextComponentProps> = ({ variant = "regular", style, children, ...props }) => {
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
    fontFamily: "Outfit-Regular", // Nombre simplificado
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontFamily: "Outfit-Bold", // Nombre simplificado
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontFamily: "Outfit-Bold", // Nombre simplificado
    fontSize: 24,
    lineHeight: 32,
  },
  subheading: {
    fontFamily: "Outfit-Bold", // Nombre simplificado
    fontSize: 18,
    lineHeight: 24,
  },
  caption: {
    fontFamily: "Outfit-Regular", // Nombre simplificado
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: "Outfit-Regular", // Nombre simplificado
    fontSize: 12,
    lineHeight: 16,
  },
  tiny: {
    fontFamily: "Outfit-Regular", // Nombre simplificado
    fontSize: 10,
    lineHeight: 14,
  },
})

// Aplicar styled() al componente base para compatibilidad con NativeWind
export const Text = styled(TextBase)
export default Text
