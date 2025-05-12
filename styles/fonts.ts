// Exportación centralizada de fuentes para la aplicación
import { StyleSheet } from "react-native"

// Nombres de las fuentes para usar en fontFamily
export const fontNames = {
  outfitRegular: "Outfit_400Regular",
  outfitBold: "Outfit_700Bold",
}

// Estilos de tipografía predefinidos
export const typography = StyleSheet.create({
  // Estilos base
  regular: {
    fontFamily: fontNames.outfitRegular,
  },
  bold: {
    fontFamily: fontNames.outfitBold,
  },

  // Variantes de texto
  h1: {
    fontFamily: fontNames.outfitBold,
    fontSize: 28,
    lineHeight: 36,
  },
  h2: {
    fontFamily: fontNames.outfitBold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: fontNames.outfitBold,
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontNames.outfitRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: fontNames.outfitBold,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontNames.outfitRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  captionBold: {
    fontFamily: fontNames.outfitBold,
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: fontNames.outfitRegular,
    fontSize: 12,
    lineHeight: 16,
  },
})

// Función de utilidad para combinar estilos de texto
export const combineTextStyles = (...styles: any[]) => {
  return StyleSheet.flatten(styles)
}

export default typography

