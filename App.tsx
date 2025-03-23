"use client"

import { useEffect } from "react"
import { I18nextProvider } from "react-i18next"
import { useColorScheme } from "react-native"
import { ThemeProvider, DarkTheme, DefaultTheme, Theme } from "@react-navigation/native"
import { useFonts, Outfit_400Regular, Outfit_700Bold } from "@expo-google-fonts/outfit"
import * as SplashScreen from "expo-splash-screen"
import i18n from "./i18n"
import { Slot } from "expo-router"

// Mantén la pantalla de splash visible mientras cargamos las fuentes
SplashScreen.preventAutoHideAsync()

export default function App() {
  const colorScheme = useColorScheme()
  
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
  })
  
  useEffect(() => {
    // Simplemente espera a que las fuentes se carguen
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded])
  
  if (!fontsLoaded) {
    return null;
  }
  
  // Tema básico
  const theme: Theme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    dark: colorScheme === "dark",
  };
  
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={theme}>
        <Slot />
      </ThemeProvider>
    </I18nextProvider>
  );
}