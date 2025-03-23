"use client"
import { View, TouchableOpacity, Image, Dimensions, Alert } from "react-native"
import { styled } from "nativewind"
import { useRouter } from "expo-router"
import AddMagicWizard from "../../../components/add-magic/AddMagicWizard"

const StyledView = styled(View)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width, height } = Dimensions.get("window")


export default function AddMagicScreen() {
  const router = useRouter()

  const handleComplete = (trickId: string) => {
    Alert.alert("Success", "Your magic trick has been saved successfully!", [
      {
        text: "OK",
        onPress: () => router.replace("/(app)/home"),
      },
    ])
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
      <AddMagicWizard onComplete={handleComplete} onCancel={handleCancel} />
    </StyledView>
  )
}

