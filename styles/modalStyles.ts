import { StyleSheet, Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

export const modalStyles = StyleSheet.create({
  // Contenedor principal del modal (glass morphism) - TODOS usan el mismo estilo
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.30)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  // Contenedor alternativo para modales de acción (usa el mismo estilo base)
  actionModalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.30)", // Mismo color que modalContainer
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  // Footer con botones de acción
  footerContainer: {
    height: 56,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.4)",
  },

  // Footer más compacto
  footerContainerCompact: {
    height: 52,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderColor: "rgba(200, 200, 200, 0.4)",
  },

  // Botón izquierdo en footer
  buttonLeft: {
    borderRightWidth: 0.5,
    borderColor: "rgba(200, 200, 200, 0.4)",
    backgroundColor: "transparent",
  },

  // Botón derecho en footer
  buttonRight: {
    backgroundColor: "transparent",
  },

  // Botón único de ancho completo
  buttonFull: {
    backgroundColor: "transparent",
  },

  // Separador horizontal
  divider: {
    height: 0.5,
    backgroundColor: "rgba(200, 200, 200, 0.3)",
  },

  // Botón de acción con borde inferior
  actionButton: {
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(200, 200, 200, 0.3)",
  },

  // Contenedor de contenido principal
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  // Contenedor de contenido con más padding
  contentContainerLarge: {
    padding: 24,
  },

  // Píldora editable (para nombres/tags)
  pillContainer: {
    backgroundColor: "rgba(104, 104, 104, 0.027)",
    borderColor: "rgba(255, 255, 255, 0.568)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Input dentro de píldora
  pillInput: {
    color: "#ffffff",
    fontWeight: "500",
    minWidth: 80,
    textAlign: "center",
  },

  // Texto dentro de píldora
  pillText: {
    color: "#ffffff",
  },

  // Fondo transparente con blur para botones - ELIMINAR, no queremos fondos adicionales
  transparentButtonBackground: {
    backgroundColor: "transparent", // Cambiar a transparente para no añadir capas
  },
});

// Configuraciones de BlurView reutilizables
export const blurConfig = {
  // Fondo general del modal (igual que CategoryModal)
  backgroundBlur: {
    intensity: 10,
    tint: "light" as const,
  },

  // Blur alternativo oscuro para fondos
  backgroundBlurDark: {
    intensity: 100, 
    tint: "dark" as const,
  },

  // Contenedor principal con efecto glass (igual que CategoryModal)
  containerBlur: {
    intensity: 40,
    tint: "dark" as const,
  },

  // Blur más intenso para contenedores - NO SE USA, mantenemos el mismo que containerBlur
  containerBlurIntense: {
    intensity: 40, // Mismo que containerBlur
    tint: "dark" as const, // Mismo que containerBlur
  },
};

// Clases de NativeWind reutilizables
export const modalClasses = {
  // Clase para el BlurView de fondo
  backgroundBlur: "flex-1 justify-center items-center",
  
  // Clase para el contenedor de vista principal
  mainContainer: "flex-1 justify-center items-center px-6",
  
  // Clase para el contenedor de vista principal con padding vertical
  mainContainerWithPadding: "flex-1 justify-center items-center px-3 py-6",
  
  // Clase para BlurView del contenedor
  containerBlur: "overflow-hidden",
  
  // Clase para flex row
  flexRow: "flex-row",
  
  // Clase para centrar contenido
  centerContent: "flex-1 justify-center items-center",
  
  // Clases de texto
  titleText: "text-white text-2xl font-light",
  titleTextCentered: "text-white text-2xl font-light text-center",
  titleTextWithOpacity: "text-white/90 text-2xl font-light text-center",
  
  subtitleText: "text-white/60 text-base text-center",
  subtitleTextSmall: "text-white/60 text-sm text-center",
  
  buttonText: "text-white text-base font-medium",
  buttonTextLight: "text-white/60 text-base font-light",
  buttonTextBold: "text-white text-base font-bold",
  
  cancelButtonText: "text-white/60 text-base font-light",
  deleteButtonText: "text-red-500 text-base font-medium",
  deleteButtonTextLight: "text-red-400 text-base font-light",
  successButtonText: "text-[#10b981] text-base font-medium",
};

// Utilidad para obtener el estilo de un tag pill con color personalizado
export const getTagPillStyle = (color: string, colorMapping?: string) => ({
  backgroundColor: color + "30",
  borderColor: colorMapping || color,
  borderWidth: 1,
});

// Utilidad para obtener el estilo de texto de un tag pill
export const getTagPillTextStyle = (color: string, colorMapping?: string) => ({
  color: colorMapping || color,
  fontWeight: "500" as const,
  minWidth: 80,
  textAlign: "center" as const,
});