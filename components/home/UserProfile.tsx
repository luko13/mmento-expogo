"use client"

import { useEffect, useState, useRef } from "react"
import { View, Image, TouchableOpacity, Text as RNText, Animated } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { FontAwesome, Ionicons } from "@expo/vector-icons"
import { supabase } from "../../lib/supabase"
import { useRouter } from "expo-router"

const StyledView = styled(View)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledAnimatedView = styled(Animated.View)

interface UserProfileProps {
  onProfilePress?: () => void
  isSearchVisible?: boolean
  onCloseSearch?: () => void
}

export default function UserProfile({ onProfilePress, isSearchVisible = false, onCloseSearch }: UserProfileProps) {
  const { t, i18n } = useTranslation()
  const [userName, setUserName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [greeting, setGreeting] = useState("")
  const router = useRouter()
  const buttonOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Set greeting based on current language
    const currentLanguage = i18n.language || "en"

    if (currentLanguage.startsWith("es")) {
      setGreeting(t("hola"))
    } else {
      setGreeting(t("hello"))
    }

    // Fetch user data
    const getUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Get user profile
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("username, email")
          .eq("id", user.id)
          .single()

        if (userData) {
          setUserName(userData.username || userData.email?.split("@")[0] || "Usuario")
        }

        if (userError) {
          console.error("Error fetching user data:", userError)
        }
      }
    }

    getUserInfo()
  }, [t, i18n.language])

  // Animar el botón cuando cambie isSearchVisible
  useEffect(() => {
    if (isSearchVisible) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 150, // Fadeout más rápido
        useNativeDriver: true,
      }).start()
    }
  }, [isSearchVisible])

  // Botón para ir a la pantalla de prueba de fuentes
  const goToFontTest = () => {
    router.push("/(app)/font-test")
  }

  const handleClosePress = () => {
    // Fadeout rápido al presionar
    Animated.timing(buttonOpacity, {
      toValue: 0,
      duration: 3000, // Velocidad del fadeout
      useNativeDriver: true,
    }).start(() => {
      // Llamar a onCloseSearch después del fadeout
      if (onCloseSearch) {
        onCloseSearch()
      }
    })
  }

  return (
    <StyledView className="flex-row items-center justify-between">
      {/* User info section */}
      <StyledTouchableOpacity className="flex-row items-center mb-2 flex-1" onPress={onProfilePress}>
        <StyledView className="w-12 h-12 rounded-full overflow-hidden bg-emerald-600 justify-center items-center mr-3">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48 }} resizeMode="cover" />
          ) : (
            <FontAwesome name="user" size={24} color="white" />
          )}
        </StyledView>

        {/* Usar RNText directamente para garantizar que se muestre correctamente */}
        <RNText style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
          {greeting}, {userName}
        </RNText>
      </StyledTouchableOpacity>

      {/* Close search button - only visible when search is active */}
      {isSearchVisible && onCloseSearch && (
        <StyledAnimatedView
          style={{
            opacity: buttonOpacity,
            transform: [{ scale: buttonOpacity }], // También escala para un efecto más suave
          }}
        >
          <StyledTouchableOpacity 
            onPress={handleClosePress}
            className="w-10 h-10 rounded-full justify-center items-center ml-4"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </StyledTouchableOpacity>
        </StyledAnimatedView>
      )}

      {/* Botón para ir a la pantalla de prueba de fuentes */}
      {/* <StyledTouchableOpacity className="bg-emerald-700 py-2 px-4 rounded-lg mb-4 self-start" onPress={goToFontTest}>
        <RNText style={{ color: "white" }}>Probar Fuentes</RNText>
      </StyledTouchableOpacity> */}
    </StyledView>
  )
}