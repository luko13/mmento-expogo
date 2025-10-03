// components/home/UserProfile.tsx
"use client";

import { useEffect, useRef } from "react";
import { View, Image, TouchableOpacity, Text, Animated } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";
import { useLibraryData } from "../../context/LibraryDataContext";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);

interface UserProfileProps {
  onProfilePress?: () => void;
  isSearchVisible?: boolean;
  onCloseSearch?: () => void;
  onNotificationsPress?: () => void;
}

export default function UserProfile({
  onProfilePress,
  isSearchVisible = false,
  onCloseSearch,
  onNotificationsPress,
}: UserProfileProps) {
  const { t, i18n } = useTranslation();
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Leer datos del Context (ya están cargados)
  const { userName, avatarUrl } = useLibraryData();

  // Determinar saludo según idioma
  const currentLang = i18n.language || "en";
  const greeting = currentLang.startsWith("es") ? t("hola") : t("hello");

  // Animación botón cerrar búsqueda
  useEffect(() => {
    Animated.timing(buttonOpacity, {
      toValue: isSearchVisible ? 1 : 0,
      duration: isSearchVisible ? 200 : 150,
      useNativeDriver: true,
    }).start();
  }, [isSearchVisible, buttonOpacity]);

  const handleClosePress = () => {
    Animated.timing(buttonOpacity, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }).start(() => {
      onCloseSearch?.();
    });
  };

  return (
    <StyledView className="flex-row items-center justify-between">
      <StyledTouchableOpacity
        className="flex-row items-center mb-2 flex-1"
        onPress={onProfilePress}
      >
        <StyledView className="w-12 h-12 rounded-full overflow-hidden bg-emerald-600 justify-center items-center mr-3">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 48, height: 48 }}
              resizeMode="cover"
            />
          ) : (
            <FontAwesome name="user" size={24} color="white" />
          )}
        </StyledView>

        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontFamily: fontNames.light,
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
        >
          {greeting}, {userName}
        </Text>
      </StyledTouchableOpacity>

      {isSearchVisible && onCloseSearch ? (
        <StyledAnimatedView
          style={{
            opacity: buttonOpacity,
            transform: [{ scale: buttonOpacity }],
          }}
        >
          <StyledTouchableOpacity
            onPress={handleClosePress}
            className="w-10 h-10 rounded-full justify-center items-center ml-4"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </StyledTouchableOpacity>
        </StyledAnimatedView>
      ) : (
        onNotificationsPress && (
          <StyledTouchableOpacity
            onPress={onNotificationsPress}
            className="w-10 h-10 rounded-full justify-center items-center ml-4"
          >
            <Ionicons name="notifications-outline" size={22} color="white" />
          </StyledTouchableOpacity>
        )
      )}
    </StyledView>
  );
}
