// constants/fonts.ts
import { TextStyle } from "react-native";

// Nombres de las fuentes Outfit
export const FONT_NAMES = {
  thin: "Outfit-Thin",
  extraLight: "Outfit-ExtraLight",
  light: "Outfit-Light",
  regular: "Outfit-Regular",
  medium: "Outfit-Medium",
  semiBold: "Outfit-SemiBold",
  bold: "Outfit-Bold",
  extraBold: "Outfit-ExtraBold",
  black: "Outfit-Black",
} as const;

// Estilos de texto predefinidos
export const TEXT_STYLES = {
  // Títulos
  h1: {
    fontFamily: FONT_NAMES.bold,
    fontSize: 32,
    lineHeight: 40,
    includeFontPadding: false,
  } as TextStyle,

  h2: {
    fontFamily: FONT_NAMES.bold,
    fontSize: 24,
    lineHeight: 32,
    includeFontPadding: false,
  } as TextStyle,

  h3: {
    fontFamily: FONT_NAMES.semiBold,
    fontSize: 20,
    lineHeight: 28,
    includeFontPadding: false,
  } as TextStyle,

  // Cuerpo de texto
  body: {
    fontFamily: FONT_NAMES.regular,
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
  } as TextStyle,

  bodyBold: {
    fontFamily: FONT_NAMES.bold,
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
  } as TextStyle,

  bodyMedium: {
    fontFamily: FONT_NAMES.medium,
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
  } as TextStyle,

  // Subtítulos y captions
  subtitle: {
    fontFamily: FONT_NAMES.medium,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  } as TextStyle,

  caption: {
    fontFamily: FONT_NAMES.regular,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  } as TextStyle,

  captionBold: {
    fontFamily: FONT_NAMES.semiBold,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  } as TextStyle,

  // Texto pequeño
  small: {
    fontFamily: FONT_NAMES.regular,
    fontSize: 10,
    lineHeight: 14,
    includeFontPadding: false,
  } as TextStyle,

  // Botones
  button: {
    fontFamily: FONT_NAMES.semiBold,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
  } as TextStyle,

  buttonSmall: {
    fontFamily: FONT_NAMES.medium,
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  } as TextStyle,
};

// Utilidad para aplicar fuente con peso específico
export const getFontStyle = (weight: keyof typeof FONT_NAMES): TextStyle => ({
  fontFamily: FONT_NAMES[weight],
  includeFontPadding: false,
});

// Utilidad para combinar estilos de texto
export const combineTextStyles = (
  ...styles: (TextStyle | undefined)[]
): TextStyle => {
  return Object.assign({}, ...styles.filter(Boolean));
};
