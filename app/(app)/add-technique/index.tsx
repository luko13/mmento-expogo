"use client"
import { View, StatusBar } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AddTechniqueWizardEncrypted from "../../../components/add-technique/AddTechniqueWizard"


const StyledView = styled(View)

export default function AddTechniqueScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleComplete = (techniqueId: string) => {
    router.replace("/(app)/home")
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <StyledView className="flex-1">
      {/* StatusBar configuration */}
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      
      {/* Full screen gradient background */}
      <LinearGradient
        colors={['#15322C', '#15322C']}
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
      
      {/* Wizard content */}
      <AddTechniqueWizardEncrypted  onComplete={handleComplete} onCancel={handleCancel} />
    </StyledView>
  )
}