"use client"

import { useEffect, useState } from "react"
import { View, Text, Image, TouchableOpacity } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { User } from "lucide-react-native"
import { supabase } from "../../lib/supabase"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface UserProfileProps {
  onProfilePress?: () => void
}

export default function UserProfile({ onProfilePress }: UserProfileProps) {
  const { t, i18n } = useTranslation()
  const [userName, setUserName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [greeting, setGreeting] = useState("")

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

  return (
    <StyledTouchableOpacity className="flex-row items-center mb-6" onPress={onProfilePress}>
      <StyledView className="w-12 h-12 rounded-full overflow-hidden bg-emerald-600 justify-center items-center mr-3">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48 }} resizeMode="cover" />
        ) : (
          <User size={24} color="white" />
        )}
      </StyledView>

      <StyledText className="text-white text-xl">
        {greeting}, {userName}
      </StyledText>
    </StyledTouchableOpacity>
  )
}

