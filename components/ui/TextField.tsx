// components/ui/TextField.tsx
import React, { forwardRef } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { styled } from "nativewind";
import { fontNames } from "../../app/_layout";

const StyledTextInput = styled(RNTextInput);

type Variant = "single" | "multi";

interface Props extends TextInputProps {
  variant?: Variant;
  height?: number;     // single: 48 por defecto, multi: 120
  fontSize?: number;   // 16 por defecto
  lineHeight?: number; // si no se pasa: fontSize + 6
}

const TextField = forwardRef<RNTextInput, Props>(
  (
    {
      variant = "single",
      height,
      fontSize = 16,
      lineHeight,
      style,
      ...rest
    },
    ref
  ) => {
    const resolvedHeight = height ?? (variant === "single" ? 48 : 120);
    const resolvedLineHeight = lineHeight ?? fontSize + 6;

    const baseStyle: TextStyle = {
      fontFamily: fontNames.light,
      fontSize,
      lineHeight: resolvedLineHeight,
      includeFontPadding: false,         // Android: quita padding fantasma
      color: "rgba(255,255,255,0.70)",
    };

    const behaviorStyle: TextStyle =
      variant === "single"
        ? {
            height: resolvedHeight,
            paddingVertical: 0,
            paddingHorizontal: 12,
            ...(Platform.OS === "android"
              ? { textAlignVertical: "center" as any }
              : { paddingTop: 1 }),       // iOS baseline fino
          }
        : {
            height: resolvedHeight,
            paddingTop: 10,
            paddingBottom: 10,
            paddingHorizontal: 12,
            textAlignVertical: "top" as any,
          };

    const multiProps =
      variant === "multi"
        ? ({ multiline: true, scrollEnabled: true } as TextInputProps)
        : ({ multiline: false } as TextInputProps);

    return (
      <StyledTextInput
        ref={ref}
        allowFontScaling={false}
        placeholderTextColor="rgba(255,255,255,0.50)"
        {...multiProps}
        {...rest}
        style={[baseStyle, behaviorStyle, style as ViewStyle]}
      />
    );
  }
);

export default TextField;
