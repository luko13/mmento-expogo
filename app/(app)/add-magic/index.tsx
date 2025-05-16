"use client"
import { View, TouchableOpacity, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AddMagicWizard from "../../../components/add-magic/AddMagicWizard"
import { Ionicons } from "@expo/vector-icons"

const StyledView = styled(View)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width, height } = Dimensions.get("window")

export default function AddMagicScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleComplete = (trickId: string) => {
    // Implementa la lógica para manejar la finalización
    router.replace("/(app)/home")
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <StyledView className="flex-1">
      {/* Background que ocupa toda la pantalla */}
      <Image
        source={require("../../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />
      
      {/* Botón de cerrar que respeta safe area */}
      {/* <StyledView 
        className="absolute left-4 z-20"
        style={{ top: 0 }}
      >
        <StyledTouchableOpacity onPress={handleCancel} className="p-2 bg-emerald-800 rounded-full">
          <Ionicons name="chevron-back" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView> */}
      
      {/* El wizard maneja sus propias safe areas */}
      <AddMagicWizard onComplete={handleComplete} onCancel={handleCancel} />
    </StyledView>
  )
}