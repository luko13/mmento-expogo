import { Stack } from "expo-router"
import { I18nextProvider } from "react-i18next"
import { View, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import i18n from "../i18n"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledSafeAreaView = styled(SafeAreaView)
const { width, height } = Dimensions.get("window")

export default function AuthLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <StyledSafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
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
              headerTitleStyle: {
                fontFamily: "Outfit_400Regular",
              },
              headerLargeTitleStyle: {
                fontFamily: "Outfit_700Bold",
              },
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="index" />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </StyledSafeAreaView>
      </I18nextProvider>
    </SafeAreaProvider>
  )
}