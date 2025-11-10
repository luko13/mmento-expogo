// components/ui/FullScreenTextModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { fontNames } from "../../app/_layout";
import { LinearGradient } from "expo-linear-gradient";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface FullScreenTextModalProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSave: (text: string) => void;
  title: string;
  placeholder?: string;
}

const { height: screenHeight } = Dimensions.get("window");

export const FullScreenTextModal: React.FC<FullScreenTextModalProps> = ({
  visible,
  onClose,
  value,
  onSave,
  title,
  placeholder = "",
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(value);

  // Sincronizar con el valor externo cuando cambie
  useEffect(() => {
    setText(value);
  }, [value]);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleCancel = () => {
    setText(value); // Revertir cambios
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <StyledView className="px-4 pt-12 pb-4">
            <StyledView className="flex-row items-center justify-between">
              <StyledTouchableOpacity onPress={handleCancel} className="p-2">
                <Feather name="x" size={24} color="white" />
              </StyledTouchableOpacity>

              <StyledText
                className="text-white text-lg font-semibold"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {title}
              </StyledText>

              <StyledTouchableOpacity onPress={handleSave} className="p-2">
                <Feather name="check" size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Text Input Area */}
          <StyledView className="flex-1 px-4 pb-4">
            <StyledTextInput
              className="flex-1 text-white text-base bg-[#D4D4D4]/10 rounded-lg p-4 border border-[#eafffb]/40"
              style={{
                fontFamily: fontNames.light,
                fontSize: 16,
                includeFontPadding: false,
                textAlignVertical: "top",
              }}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={text}
              onChangeText={setText}
              maxLength={3000}
              multiline
              autoFocus
            />
          </StyledView>

          {/* Character count */}
          <StyledView className="px-4 pb-4">
            <StyledText
              className="text-white/50 text-xs text-right"
              style={{
                fontFamily: fontNames.light,
                fontSize: 12,
                includeFontPadding: false,
              }}
            >
              {text.length} {t("characters", "characters")}
            </StyledText>
          </StyledView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
};
