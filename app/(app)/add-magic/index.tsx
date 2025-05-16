"use client"
import { View, StatusBar } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AddMagicWizard from "../../../components/add-magic/AddMagicWizard"

const StyledView = styled(View)

export default function AddMagicScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleComplete = (trickId: string) => {
    router.replace("/(app)/home")
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <StyledView className="flex-1">
      {/* StatusBar configuration */}
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      
      {/* Full screen gradient background */}
      <LinearGradient
        colors={['#064e3b', '#065f46']}
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
      
      {/* Wizard content */}
      <AddMagicWizard onComplete={handleComplete} onCancel={handleCancel} />
    </StyledView>
  )
}