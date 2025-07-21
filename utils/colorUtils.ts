// colorUtils.ts - Archivo de utilidades para manejar colores de tags

export const TAG_COLORS = {
  // Colores claros (primera fila del ColorPicker)
  LIGHT_GREEN: "#C8E6C9",
  LIGHT_BLUE: "#BBDEFB",
  LIGHT_ORANGE: "#FFE0B2",
  LIGHT_PURPLE: "#E1BEE7",
  LIGHT_RED: "#FFCDD2",
  
  // Colores medios (segunda fila)
  MEDIUM_GREEN: "#4CAF50",
  MEDIUM_BLUE: "#2196F3",
  MEDIUM_ORANGE: "#FF9800",
  MEDIUM_PURPLE: "#9C27B0",
  MEDIUM_RED: "#F44336",
  
  // Colores oscuros (tercera fila)
  DARK_GREEN: "#1B5E20",
  DARK_BLUE: "#0D47A1",
  DARK_ORANGE: "#E65100",
  DARK_PURPLE: "#4A148C",
  DARK_RED: "#B71C1C",
  
  // Grises (cuarta fila)
  LIGHT_GRAY: "#F5F5F5",
  MEDIUM_GRAY: "#9E9E9E",
  DARK_GRAY: "#424242",
};

// Mapeo completo de colores para texto con buen contraste
export const COLOR_TEXT_MAPPINGS: { [key: string]: string } = {
  // Verde - los claros usan oscuro, los oscuros/medios usan claro
  "#C8E6C9": "#1B5E20", // claro -> oscuro
  "#4CAF50": "#C8E6C9", // medio -> claro
  "#1B5E20": "#C8E6C9", // oscuro -> claro
  
  // Azul
  "#BBDEFB": "#0D47A1", // claro -> oscuro
  "#2196F3": "#BBDEFB", // medio -> claro
  "#0D47A1": "#BBDEFB", // oscuro -> claro
  
  // Naranja
  "#FFE0B2": "#E65100", // claro -> oscuro
  "#FF9800": "#FFE0B2", // medio -> claro
  "#E65100": "#FFE0B2", // oscuro -> claro
  
  // Morado
  "#E1BEE7": "#4A148C", // claro -> oscuro
  "#9C27B0": "#E1BEE7", // medio -> claro
  "#4A148C": "#E1BEE7", // oscuro -> claro
  
  // Rojo
  "#FFCDD2": "#B71C1C", // claro -> oscuro
  "#F44336": "#FFCDD2", // medio -> claro
  "#B71C1C": "#FFCDD2", // oscuro -> claro
  
  // Grises
  "#F5F5F5": "#424242", // claro -> oscuro
  "#9E9E9E": "#F5F5F5", // medio -> claro
  "#424242": "#F5F5F5", // oscuro -> claro
};

// Función helper para obtener el color de texto correcto
export const getContrastTextColor = (backgroundColor: string): string => {
  return COLOR_TEXT_MAPPINGS[backgroundColor] || "#FFFFFF";
};

// Función para obtener el estilo de la píldora de tag
export const getTagPillStyle = (backgroundColor: string, isSelected: boolean = false) => {
  const textColor = getContrastTextColor(backgroundColor);
  const opacity = isSelected ? "30" : "15";
  
  return {
    backgroundColor: backgroundColor + opacity,
    borderWidth: 1,
    borderColor: isSelected ? textColor + "80" : backgroundColor + "60",
    borderRadius: 20,
  };
};

// Función para obtener el estilo del texto de la tag
export const getTagTextStyle = (backgroundColor: string, isSelected: boolean = false) => {
  const textColor = getContrastTextColor(backgroundColor);
  
  return {
    color: isSelected ? textColor : backgroundColor,
    opacity: isSelected ? 1 : 0.9,
  };
};

// ColorPicker actualizado con los colores organizados
export const PICKER_COLORS = [
  // Primera fila - Colores claros
  TAG_COLORS.LIGHT_GREEN,
  TAG_COLORS.LIGHT_BLUE,
  TAG_COLORS.LIGHT_ORANGE,
  TAG_COLORS.LIGHT_PURPLE,
  TAG_COLORS.LIGHT_RED,
  
  // Segunda fila - Colores medios
  TAG_COLORS.MEDIUM_GREEN,
  TAG_COLORS.MEDIUM_BLUE,
  TAG_COLORS.MEDIUM_ORANGE,
  TAG_COLORS.MEDIUM_PURPLE,
  TAG_COLORS.MEDIUM_RED,
  
  // Tercera fila - Colores oscuros
  TAG_COLORS.DARK_GREEN,
  TAG_COLORS.DARK_BLUE,
  TAG_COLORS.DARK_ORANGE,
  TAG_COLORS.DARK_PURPLE,
  TAG_COLORS.DARK_RED,
  
  // Cuarta fila - Grises
  TAG_COLORS.LIGHT_GRAY,
  TAG_COLORS.MEDIUM_GRAY,
  TAG_COLORS.DARK_GRAY,
];