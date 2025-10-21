// app/_layout.tsx
import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { View, Image, Dimensions, ActivityIndicator, Text } from "react-native";
import { styled } from "nativewind";
import { usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import i18n from "../i18n";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

const StyledView = styled(View);
const { width, height } = Dimensions.get("window");

// Prevenir que la splash screen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

// Exportar nombres de fuentes para uso global
export const fontNames = {
  thin: "Outfit-Thin",
  extraLight: "Outfit-ExtraLight",
  light: "Outfit-Light",
  regular: "Outfit-Regular",
  medium: "Outfit-Medium",
  semiBold: "Outfit-SemiBold",
  bold: "Outfit-Bold",
  extraBold: "Outfit-ExtraBold",
  black: "Outfit-Black",
};

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          "Outfit-Thin": require("../assets/fonts/Outfit-Thin.ttf"),
          "Outfit-ExtraLight": require("../assets/fonts/Outfit-ExtraLight.ttf"),
          "Outfit-Light": require("../assets/fonts/Outfit-Light.ttf"),
          "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
          "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
          "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
          "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
          "Outfit-ExtraBold": require("../assets/fonts/Outfit-ExtraBold.ttf"),
          "Outfit-Black": require("../assets/fonts/Outfit-Black.ttf"),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error("❌ Error cargando fuentes en _layout.tsx:", error);
        setFontsLoaded(true); // Continuar aunque falle
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();
  }, []);

  // Mostrar loading mientras cargan las fuentes
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0A0E11",
          }}
        >
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={{ color: "white", marginTop: 10 }}>
            Cargando fuentes...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Verificar si estamos en la ruta de add-magic
  const isAddMagicRoute = pathname.includes("/add-magic");
  const isAddTechniqueRoute = pathname.includes("/add-technique");
  const isAddQuickMagicRoute = pathname.includes("/add-quick-magic");
  const isEditTrickRoute = pathname.includes("/edit-trick");
  const isAuthRoute = pathname.includes("/auth");
  const isTrickViewRoute =
    pathname.includes("/trick/") || pathname.includes("/tricks/");
  const isTechniqueViewRoute =
    pathname.includes("/technique/") || pathname.includes("/techniques/");
  const isGimmickViewRoute =
    pathname.includes("/gimmick/") || pathname.includes("/gimmicks/");

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
      <StatusBar translucent backgroundColor="transparent" style="light" />
        <StyledView className="flex-1">
          {/* Background condicional en el layout principal */}
          {isAddMagicRoute ||
          isAddTechniqueRoute ||
          isAddQuickMagicRoute ||
          isTrickViewRoute ||
          isTechniqueViewRoute ||
          isEditTrickRoute ||
          isGimmickViewRoute ? (
            // Gradiente verde para add-magic que cubre TODA la pantalla
            <LinearGradient
              colors={["#15322C", "#15322C"]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
              }}
            />
          ) : isAuthRoute ? (
            // Imagen de fondo específica para rutas de autenticación
            <Image
              source={require("../assets/BG_Auth.png")}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
              }}
              resizeMode="cover"
            />
          ) : (
            // Imagen de fondo para otras rutas que cubre TODA la pantalla
            <Image
              source={require("../assets/Background.png")}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
              }}
              resizeMode="cover"
              fadeDuration={0}
            />
          )}

          {/* NO SafeAreaView wrapper - let individual screens handle their own safe areas */}
          <View style={{ flex: 1, zIndex: 1 }}>
            <Stack
              initialRouteName="index"
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: "transparent",
                },
                // Sin animación para evitar flashes
                animation: "none",
                animationTypeForReplace: "push",
                presentation: "card",
                gestureEnabled: false,
                headerTitleStyle: {
                  fontFamily: fontNames.regular,
                },
                headerLargeTitleStyle: {
                  fontFamily: fontNames.bold,
                },
                // Color de fondo durante transiciones
                cardStyle: {
                  backgroundColor: "transparent",
                },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/register" />
              <Stack.Screen name="auth/password-recover" />
              <Stack.Screen
                name="(app)"
                options={{
                  animation: "none",
                }}
              />
            </Stack>
          </View>
        </StyledView>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
