import React from "react";
import { View, TouchableOpacity } from "react-native";
import { styled } from "nativewind";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const COLORS = [
  // Primera fila
  "#C8E6C9", // Verde claro
  "#BBDEFB", // Azul claro
  "#FFE0B2", // Naranja claro
  "#E1BEE7", // Morado claro
  "#FFCDD2", // Rojo claro
  // Segunda fila
  "#4CAF50", // Verde medio
  "#2196F3", // Azul medio
  "#FF9800", // Naranja medio
  "#9C27B0", // Morado medio
  "#F44336", // Rojo medio
  // Tercera fila
  "#1B5E20", // Verde oscuro
  "#0D47A1", // Azul oscuro
  "#E65100", // Naranja oscuro
  "#4A148C", // Morado oscuro
  "#B71C1C", // Rojo oscuro
  // Cuarta fila - grises
  "#F5F5F5", // Gris muy claro
  "#9E9E9E", // Gris medio
  "#424242", // Gris oscuro
];

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorSelect }) => {
  return (
    <StyledView className="flex-row flex-wrap justify-center -mx-3">
      {COLORS.map((color, index) => (
        <StyledTouchableOpacity
          key={index}
          onPress={() => onColorSelect(color)}
          className="my-1 mx-0.5"
          style={{
            width: 70,
            height: 40,
            backgroundColor: color,
            borderRadius: 10,
            borderWidth: selectedColor === color ? 3 : 0,
            borderColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: selectedColor === color ? 5 : 2,
          }}
        />
      ))}
    </StyledView>
  );
};

export default ColorPicker;