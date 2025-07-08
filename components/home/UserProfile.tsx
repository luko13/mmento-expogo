//components/home/UserProfile.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { View, Image, TouchableOpacity, Text, Animated } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
// Importar los nombres de fuentes desde _layout.tsx
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);

interface UserProfileProps {
  onProfilePress?: () => void;
  isSearchVisible?: boolean;
  onCloseSearch?: () => void;
}

// Cache de datos de usuario
let userCache: {
  userName: string;
  avatarUrl: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default function UserProfile({
  onProfilePress,
  isSearchVisible = false,
  onCloseSearch,
}: UserProfileProps) {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const router = useRouter();
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Saludo dependiendo del idioma actual
    const currentLanguage = i18n.language || "en";
    setGreeting(currentLanguage.startsWith("es") ? t("hola") : t("hello"));
  }, [t, i18n.language]);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        // Verificar cache primero
        if (userCache && Date.now() - userCache.timestamp < CACHE_DURATION) {
          setUserName(userCache.userName);
          setAvatarUrl(userCache.avatarUrl);
          return;
        }

        // Obtener el usuario autenticado
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("Error getting auth user:", authError);
          return;
        }

        // Única consulta optimizada a la base de datos
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, email, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          // Usar email como fallback
          const fallbackName = user.email?.split("@")[0] || "Usuario";
          setUserName(fallbackName);
          return;
        }

        const displayName =
          profile.username || profile.email?.split("@")[0] || "Usuario";

        // Actualizar estado
        setUserName(displayName);
        setAvatarUrl(profile.avatar_url);

        // Guardar en cache
        userCache = {
          userName: displayName,
          avatarUrl: profile.avatar_url,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error("Unexpected error fetching user info:", error);
        setUserName("Usuario");
      }
    };

    getUserInfo();
  }, []);

  // Animar el botón cuando cambie isSearchVisible
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

      {isSearchVisible && onCloseSearch && (
        <StyledAnimatedView
          style={{
            opacity: buttonOpacity,
            transform: [{ scale: buttonOpacity }],
          }}
        >
          <StyledTouchableOpacity
            onPress={handleClosePress}
            className="w-10 h-10 rounded-full justify-center items-center ml-4"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </StyledTouchableOpacity>
        </StyledAnimatedView>
      )}
    </StyledView>
  );
}

// Función para limpiar el cache cuando el usuario cierra sesión
export const clearUserCache = () => {
  userCache = null;
};