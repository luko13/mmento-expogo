"use client"
import { View, TouchableOpacity, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import AddMagicWizard from "../../../components/add-magic/AddMagicWizard"
import { Ionicons } from "@expo/vector-icons"

const StyledView = styled(View)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width, height } = Dimensions.get("window")

export default function AddMagicScreen() {
  const router = useRouter()

  const handleComplete = (trickId: string) => {
    // Implementa la lógica para manejar la finalización
    router.replace("/(app)/home")
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <StyledView className="flex-1">
      <Image
        source={require("../../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />
      <StyledView className="absolute top-12 left-4 z-10">
        <StyledTouchableOpacity onPress={handleCancel} className="p-2 bg-emerald-700 rounded-full">
          <Ionicons name="chevron-back" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>
      <AddMagicWizard onComplete={handleComplete} onCancel={handleCancel} />
    </StyledView>
  )
}
