import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { View, Image, Dimensions } from "react-native";
import { styled } from "nativewind";
import { usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import i18n from "../i18n";
import { SafeAreaProvider } from "react-native-safe-area-context";

const StyledView = styled(View);
const { width, height } = Dimensions.get("window");

export default function AuthLayout() {
  const pathname = usePathname();

  // Verificar si estamos en la ruta de add-magic
  const isAddMagicRoute = pathname.includes("/add-magic");
  const isAddTechniqueRoute = pathname.includes("/add-technique");
  const isAddQuickMagicRoute = pathname.includes("/add-quick-magic");
  const isAddGimmickRoute = pathname.includes("/add-gimmick");
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
        <StyledView className="flex-1">
          {/* Background condicional en el layout principal */}
          {isAddMagicRoute ||
          isAddTechniqueRoute ||
          isAddQuickMagicRoute ||
          isTrickViewRoute ||
          isTechniqueViewRoute ||
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
            <View
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
            >
              <Image
                source={require("../assets/Background.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  flex: 1,
                }}
                resizeMode="cover"
              />
            </View>
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
                // Animación estándar pero con duración reducida
                animation: "slide_from_right",
                animationDuration: 150,
                animationTypeForReplace: "push",
                presentation: "card",
                gestureEnabled: false,
                headerTitleStyle: {
                  fontFamily: "Outfit_400Regular",
                },
                headerLargeTitleStyle: {
                  fontFamily: "Outfit_700Bold",
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
                  animation: "slide_from_right",
                  animationDuration: 300,
                }}
              />
            </Stack>
          </View>
        </StyledView>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}