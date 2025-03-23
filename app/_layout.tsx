import { Stack } from "expo-router"
import { I18nextProvider } from "react-i18next"
import { View, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import i18n from "../i18n"
import { SafeAreaProvider } from "react-native-safe-area-context"

const StyledView = styled(View)
const { width, height } = Dimensions.get("window")

export default function AuthLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <StyledView className="flex-1">
          <Image
            source={require("../assets/Background.png")}
            style={{
              width: width,
              height: height,
              position: "absolute",
            }}
            resizeMode="cover"
          />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="index" />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </StyledView>
      </I18nextProvider>
    </SafeAreaProvider>
  )
}

