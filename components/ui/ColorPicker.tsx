import React from "react";
import { View, TouchableOpacity } from "react-native";
import { styled } from "nativewind";
import { PICKER_COLORS } from "../../utils/colorUtils";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorSelect }) => {
  return (
    <StyledView className="flex-row flex-wrap justify-center -mx-3">
      {PICKER_COLORS.map((color, index) => (
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