// components/home/UserProfile.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { View, Image, TouchableOpacity, Text, Animated } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import { fontNames } from "../../app/_layout";
import { cacheAuth, cacheProfile } from "../../lib/localCache";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledAnimatedView = styled(Animated.View);

interface UserProfileProps {
  onProfilePress?: () => void;
  isSearchVisible?: boolean;
  onCloseSearch?: () => void;
}

export default function UserProfile({
  onProfilePress,
  isSearchVisible = false,
  onCloseSearch,
}: UserProfileProps) {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState("...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Pintar saludo según idioma
  useEffect(() => {
    const currentLang = i18n.language || "en";
    setGreeting(currentLang.startsWith("es") ? t("hola") : t("hello"));
  }, [t, i18n.language]);

  // Hidratar al instante desde MMKV + actualizar en background desde Supabase
  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1) Hydration instantánea por si ya tenemos snapshot
      const lastUserId = cacheAuth.getLastUserId();
      if (lastUserId) {
        const snap = cacheProfile.get(lastUserId);
        if (snap && mounted) {
          setUserName(snap.userName);
          setAvatarUrl(snap.avatarUrl);
          // no devolvemos aquí; después refrescamos igualmente desde supabase
        }
      }

      // 2) Obtener usuario actual y refrescar
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      cacheAuth.setLastUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email, avatar_url")
        .eq("id", user.id)
        .single();

      const computedName =
        profile?.username || profile?.email?.split("@")[0] || "Usuario";

      if (!mounted) return;
      setUserName(computedName);
      setAvatarUrl(profile?.avatar_url || null);

      // Guardar snapshot de perfil para hidratación futura
      cacheProfile.set(user.id, {
        userName: computedName,
        avatarUrl: profile?.avatar_url || null,
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
