// components/MessageBubble.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface MessageBubbleProps {
  message: {
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    audio_url?: string;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(message.content);
    // Aquí podrías mostrar un toast de confirmación
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Función para formatear el contenido con saltos de línea y listas
  const formatContent = (content: string) => {
    // Dividir por líneas y procesar cada una
    const lines = content.split("\n");

    return lines.map((line, index) => {
      // Detectar si es un elemento de lista
      const isBulletPoint =
        line.trim().startsWith("•") ||
        line.trim().startsWith("-") ||
        line.trim().match(/^\d+\./);

      // Detectar si es un título (línea que termina con :)
      const isTitle = line.trim().endsWith(":") && !line.includes("•");

      return (
        <StyledText
          key={index}
          className={`${isUser ? "text-white" : "text-white/90"} ${
            isBulletPoint ? "ml-2" : ""
          }`}
          style={{
            fontFamily: isTitle ? fontNames.semiBold : fontNames.regular,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: index < lines.length - 1 ? 4 : 0,
          }}
        >
          {line}
        </StyledText>
      );
    });
  };

  return (
    <StyledView className={`px-4 py-2 ${isUser ? "items-end" : "items-start"}`}>
      <StyledView
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-emerald-600 rounded-tr-sm" : "bg-white/10 rounded-tl-sm"
        }`}
      >
        {message.audio_url && (
          <StyledView className="flex-row items-center mb-2">
            <Ionicons
              name="mic"
              size={16}
              color={isUser ? "white" : "rgba(255,255,255,0.6)"}
            />
            <StyledText
              className={`ml-1 text-xs ${
                isUser ? "text-white/80" : "text-white/60"
              }`}
              style={{ fontFamily: fontNames.regular }}
            >
              {t("voiceMessage")}
            </StyledText>
          </StyledView>
        )}

        <StyledView>{formatContent(message.content)}</StyledView>

        <StyledView className="flex-row items-center justify-between mt-2">
          <StyledText
            className={`text-xs ${isUser ? "text-white/60" : "text-white/40"}`}
            style={{ fontFamily: fontNames.light }}
          >
            {formatTime(message.created_at)}
          </StyledText>

          {!isUser && (
            <StyledTouchableOpacity
              onPress={copyToClipboard}
              className="ml-3 p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="copy-outline"
                size={14}
                color="rgba(255,255,255,0.4)"
              />
            </StyledTouchableOpacity>
          )}
        </StyledView>
      </StyledView>
    </StyledView>
  );
}
