"use client"

import { useEffect, useState } from "react"
import { I18nextProvider } from "react-i18next"
import 'react-native-get-random-values'; // Must be first import
import { useColorScheme, NativeModules, Platform, View, Text, StyleSheet, ActivityIndicator } from "react-native"
import { ExpoRoot } from "expo-router"
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native"
import * as Font from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { SafeAreaProvider } from "react-native-safe-area-context"
import i18n from "./i18n"

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync()

export default function App() {
  const colorScheme = useColorScheme()
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [fontError, setFontError] = useState<string | null>(null)
  const [fontInfo, setFontInfo] = useState<string[]>([])

  // Load fonts manually
  useEffect(() => {
    async function loadFonts() {
      try {
        console.log("Starting font loading...")
        setFontInfo((prev) => [...prev, "Starting font loading..."])

        // Method 1: Load fonts directly from assets
        try {
          await Font.loadAsync({
            "Outfit-Regular": require("./assets/fonts/Outfit-Regular.ttf"),
            "Outfit-Bold": require("./assets/fonts/Outfit-Bold.ttf"),
          })
          console.log("Fonts loaded from local assets")
          setFontInfo((prev) => [...prev, "✓ Fonts loaded from local assets"])
        } catch (error) {
          console.error("Error loading fonts from assets:", error)
          setFontInfo((prev) => [
            ...prev,
            `✗ Error loading from assets: ${error instanceof Error ? error.message : String(error)}`,
          ])

          // Method 2: Try with @expo-google-fonts
          try {
            const Outfit = require("@expo-google-fonts/outfit")
            await Font.loadAsync({
              "Outfit-Regular": Outfit.Outfit_400Regular,
              "Outfit-Bold": Outfit.Outfit_700Bold,
            })
            console.log("Fonts loaded from @expo-google-fonts")
            setFontInfo((prev) => [...prev, "✓ Fonts loaded from @expo-google-fonts"])
          } catch (error) {
            console.error("Error loading fonts from @expo-google-fonts:", error)
            setFontInfo((prev) => [
              ...prev,
              `✗ Error with @expo-google-fonts: ${error instanceof Error ? error.message : String(error)}`,
            ])
            throw error
          }
        }

        // Verify fonts are available
        const fontNames = await Font.getLoadedFonts()
        console.log("Available fonts:", fontNames)
        setFontInfo((prev) => [...prev, `Available fonts: ${fontNames.join(", ")}`])

        setFontsLoaded(true)
      } catch (error) {
        console.error("Error loading fonts:", error)
        setFontError(error instanceof Error ? error.message : String(error))
        setFontInfo((prev) => [...prev, `Final error: ${error instanceof Error ? error.message : String(error)}`])
      }
    }

    loadFonts()
  }, [])

  useEffect(() => {
    const getDeviceLanguage = () => {
      const deviceLanguage =
        Platform.OS === "ios"
          ? NativeModules.SettingsManager.settings.AppleLocale ||
            NativeModules.SettingsManager.settings.AppleLanguages[0]
          : NativeModules.I18nManager.localeIdentifier

      return deviceLanguage.split("_")[0]
    }

    const setAppLanguage = () => {
      const deviceLang = getDeviceLanguage()
      const supportedLanguages = ["en", "es"]

      if (supportedLanguages.includes(deviceLang)) {
        i18n.changeLanguage(deviceLang)
      } else {
        i18n.changeLanguage("en")
      }
    }

    setAppLanguage()

    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (fontError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Font loading error</Text>
          <Text style={styles.errorText}>{fontError}</Text>
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Loading log:</Text>
            {fontInfo.map((info, index) => (
              <Text key={index} style={styles.logText}>
                {info}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaProvider>
    )
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading fonts...</Text>
          <View style={styles.logContainer}>
            {fontInfo.map((info, index) => (
              <Text key={index} style={styles.logText}>
                {info}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaProvider>
    )
  }

  const theme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
    },
    fonts: {
      regular: {
        fontFamily: "Outfit-Regular",
        fontWeight: "normal" as const,
      },
      medium: {
        fontFamily: "Outfit-Regular",
        fontWeight: "500" as const,
      },
      bold: {
        fontFamily: "Outfit-Bold",
        fontWeight: "bold" as const,
      },
      heavy: {
        fontFamily: "Outfit-Bold",
        fontWeight: "900" as const,
      },
    },
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider value={theme}>
          <ExpoRoot context={require("./app")} />
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8d7da",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#721c24",
    marginBottom: 10,
  },
  errorText: {
    color: "#721c24",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0A0E11",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 10,
  },
  logContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 5,
    width: "100%",
    maxHeight: 300,
  },
  logTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#721c24",
  },
  logText: {
    fontSize: 12,
    color: "#721c24",
    marginBottom: 3,
  },
})