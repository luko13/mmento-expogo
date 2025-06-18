"use client"

// CRÍTICO: Este import DEBE ser el primero de todos
import 'react-native-get-random-values';

import { useEffect, useState } from "react"
import { I18nextProvider } from "react-i18next"
import { useColorScheme, NativeModules, Platform, View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native"
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
  const [cryptoInitialized, setCryptoInitialized] = useState(false)
  const [cryptoError, setCryptoError] = useState<string | null>(null)

  // Initialize crypto early
  useEffect(() => {
    initializeCrypto();
  }, []);

  const initializeCrypto = async () => {
    try {
      setFontInfo((prev) => [...prev, "🔐 Inicializando servicios de criptografía..."]);
      
      // Test that react-native-get-random-values is working
      if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
        throw new Error("react-native-get-random-values no está funcionando correctamente");
      }

      // Test random generation
      const testArray = new Uint8Array(16);
      crypto.getRandomValues(testArray);
      
      if (testArray.every(byte => byte === 0)) {
        throw new Error("El generador de números aleatorios no está produciendo valores válidos");
      }

      setFontInfo((prev) => [...prev, "✅ Generador de números aleatorios OK"]);

      // Test crypto service
      const { CryptoService } = await import("./utils/cryptoService");
      const cryptoService = CryptoService.getInstance();
      
      const isWorking = await cryptoService.testCryptoService();
      if (!isWorking) {
        throw new Error("CryptoService test failed");
      }

      setFontInfo((prev) => [...prev, "✅ CryptoService inicializado correctamente"]);
      setCryptoInitialized(true);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Error inicializando crypto:", errorMsg);
      setCryptoError(errorMsg);
      setFontInfo((prev) => [...prev, `❌ Error crypto: ${errorMsg}`]);
      
      // Show alert for crypto errors
      Alert.alert(
        "Error de Inicialización",
        `Problema con el sistema de cifrado:\n${errorMsg}\n\nLa app funcionará con funcionalidad limitada.`,
        [{ text: "Continuar", onPress: () => setCryptoInitialized(true) }]
      );
    }
  };

  // Load fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        setFontInfo((prev) => [...prev, "📝 Cargando fuentes..."]);

        // Method 1: Load fonts directly from assets
        try {
          await Font.loadAsync({
            "Outfit-Regular": require("./assets/fonts/Outfit-Regular.ttf"),
            "Outfit-Bold": require("./assets/fonts/Outfit-Bold.ttf"),
          })
          
          setFontInfo((prev) => [...prev, "✅ Fuentes cargadas desde assets locales"]);
        } catch (error) {
          console.error("Error loading fonts from assets:", error)
          setFontInfo((prev) => [
            ...prev,
            `❌ Error cargando desde assets: ${error instanceof Error ? error.message : String(error)}`,
          ])

          // Method 2: Try with @expo-google-fonts
          try {
            const Outfit = require("@expo-google-fonts/outfit")
            await Font.loadAsync({
              "Outfit-Regular": Outfit.Outfit_400Regular,
              "Outfit-Bold": Outfit.Outfit_700Bold,
            })
            
            setFontInfo((prev) => [...prev, "✅ Fuentes cargadas desde @expo-google-fonts"]);
          } catch (error) {
            console.error("Error loading fonts from @expo-google-fonts:", error)
            setFontInfo((prev) => [
              ...prev,
              `❌ Error con @expo-google-fonts: ${error instanceof Error ? error.message : String(error)}`,
            ])
            throw error
          }
        }

        // Verify fonts are available
        const fontNames = await Font.getLoadedFonts()
        setFontInfo((prev) => [...prev, `📚 Fuentes disponibles: ${fontNames.join(", ")}`]);

        setFontsLoaded(true)
      } catch (error) {
        console.error("Error loading fonts:", error)
        setFontError(error instanceof Error ? error.message : String(error))
        setFontInfo((prev) => [...prev, `❌ Error final: ${error instanceof Error ? error.message : String(error)}`])
      }
    }

    loadFonts()
  }, [])

  useEffect(() => {
    const getDeviceLanguage = () => {
      const deviceLanguage =
        Platform.OS === "ios"
          ? NativeModules.SettingsManager?.settings?.AppleLocale ||
            NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
          : NativeModules.I18nManager?.localeIdentifier

      return deviceLanguage?.split("_")[0] || "en"
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

    // Hide splash screen when both fonts and crypto are ready
    if (fontsLoaded && cryptoInitialized) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, cryptoInitialized])

  // Show error if fonts failed to load
  if (fontError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error cargando fuentes</Text>
          <Text style={styles.errorText}>{fontError}</Text>
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Log de carga:</Text>
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

  // Show loading while initializing
  if (!fontsLoaded || !cryptoInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            {!cryptoInitialized ? "Inicializando cifrado..." : "Cargando fuentes..."}
          </Text>
          {cryptoError && (
            <Text style={styles.errorText}>
              ⚠️ Problema con cifrado: {cryptoError}
            </Text>
          )}
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
    textAlign: "center",
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