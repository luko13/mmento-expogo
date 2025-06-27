// components/ui/KeyboardDismissWrapper.tsx
import React from "react";
import {
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";

interface KeyboardDismissWrapperProps {
  children: React.ReactNode;
  style?: any;
  avoidKeyboard?: boolean;
}

export default function KeyboardDismissWrapper({
  children,
  style,
  avoidKeyboard = true,
}: KeyboardDismissWrapperProps) {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const content = (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );

  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
