import './utils/globalInit';

import { useEffect, useState } from "react"
import { I18nextProvider } from "react-i18next"
import { useColorScheme, NativeModules, Platform, View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { ExpoRoot } from "expo-router"
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native"
import * as Font from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { SafeAreaProvider } from "react-native-safe-area-context"
import i18n from "./i18n"

// Mantener la pantalla de splash visible mientras se cargan las fuentes
SplashScreen.preventAutoHideAsync()

/**
 * Componente principal de la aplicación
 * Gestiona:
 * - Carga de fuentes personalizadas
 * - Inicialización de servicios criptográficos
 * - Configuración de idioma según el dispositivo
 * - Tema de la aplicación (claro/oscuro)
 */
export default function App() {
  const colorScheme = useColorScheme()
  
  // Estados para gestionar la carga de recursos
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [fontError, setFontError] = useState<string | null>(null)
  const [fontInfo, setFontInfo] = useState<string[]>([])
  
  // Estados para gestionar la inicialización criptográfica
  const [cryptoInitialized, setCryptoInitialized] = useState(false)
  const [cryptoError, setCryptoError] = useState<string | null>(null)

  /**
   * Inicializa los servicios criptográficos al montar el componente
   */
  useEffect(() => {
    initializeCrypto();
  }, []);

  /**
   * Inicializa y configura los servicios criptográficos de la aplicación
   * Esta función es crítica para el funcionamiento del cifrado end-to-end
   */
  const initializeCrypto = async () => {
    try {
      setFontInfo((prev) => [...prev, "🔐 Inicializando servicios de criptografía..."]);
      
      // Paso 1: Inicializar variables globales y polyfills
      const { initializeGlobals } = await import('./utils/globalInit');
      const globalsOk = await initializeGlobals();
      
      if (!globalsOk) {
        throw new Error("No se pudieron inicializar los globals correctamente");
      }
      
      setFontInfo((prev) => [...prev, "✅ Globals inicializados correctamente"]);

      // Paso 2: Importar y probar el servicio de criptografía
      const { CryptoService } = await import("./utils/cryptoService");
      const cryptoService = CryptoService.getInstance();
      
      // Verificar que el servicio funcione correctamente
      const isWorking = await cryptoService.testCryptoService();
      if (!isWorking) {
        throw new Error("El test del CryptoService falló");
      }

      setFontInfo((prev) => [...prev, "✅ CryptoService inicializado correctamente"]);
      setCryptoInitialized(true);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Error inicializando crypto:", errorMsg);
      setCryptoError(errorMsg);
      setFontInfo((prev) => [...prev, `❌ Error crypto: ${errorMsg}`]);
      
      // Mostrar alerta al usuario sobre el error
      Alert.alert(
        "Error de Inicialización",
        `Problema con el sistema de cifrado:\n${errorMsg}\n\nLa app funcionará con funcionalidad limitada.`,
        [{ text: "Continuar", onPress: () => setCryptoInitialized(true) }]
      );
    }
  };

  /**
   * Carga las fuentes personalizadas de la aplicación
   */
  useEffect(() => {
    async function loadFonts() {
      try {
        setFontInfo((prev) => [...prev, "📝 Cargando fuentes..."]);

        // Método 1: Intentar cargar fuentes desde assets locales
        try {
          await Font.loadAsync({
            "Outfit-Regular": require("./assets/fonts/Outfit-Regular.ttf"),
            "Outfit-Bold": require("./assets/fonts/Outfit-Bold.ttf"),
          })
          
          setFontInfo((prev) => [...prev, "✅ Fuentes cargadas desde assets locales"]);
        } catch (error) {
          console.error("Error cargando fuentes desde assets:", error)
          setFontInfo((prev) => [
            ...prev,
            `❌ Error cargando desde assets: ${error instanceof Error ? error.message : String(error)}`,
          ])

          // Método 2: Fallback a @expo-google-fonts si falla el método 1
          try {
            const Outfit = require("@expo-google-fonts/outfit")
            await Font.loadAsync({
              "Outfit-Regular": Outfit.Outfit_400Regular,
              "Outfit-Bold": Outfit.Outfit_700Bold,
            })
            
            setFontInfo((prev) => [...prev, "✅ Fuentes cargadas desde @expo-google-fonts"]);
          } catch (error) {
            console.error("Error cargando fuentes desde @expo-google-fonts:", error)
            setFontInfo((prev) => [
              ...prev,
              `❌ Error con @expo-google-fonts: ${error instanceof Error ? error.message : String(error)}`,
            ])
            throw error
          }
        }

        // Verificar que las fuentes estén disponibles
        const fontNames = await Font.getLoadedFonts()
        setFontInfo((prev) => [...prev, `📚 Fuentes disponibles: ${fontNames.join(", ")}`]);

        setFontsLoaded(true)
      } catch (error) {
        console.error("Error cargando fuentes:", error)
        setFontError(error instanceof Error ? error.message : String(error))
        setFontInfo((prev) => [...prev, `❌ Error final: ${error instanceof Error ? error.message : String(error)}`])
      }
    }

    loadFonts()
  }, [])

  /**
   * Configura el idioma de la aplicación según el idioma del dispositivo
   */
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

    // Ocultar splash screen cuando todo esté listo
    if (fontsLoaded && cryptoInitialized) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, cryptoInitialized])

  /**
   * Renderizado condicional según el estado de carga
   */
  
  // Mostrar error si las fuentes no se pudieron cargar
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

  // Mostrar pantalla de carga mientras se inicializan los recursos
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

  /**
   * Configuración del tema de la aplicación
   */
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

  /**
   * Renderizado principal de la aplicación
   */
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

/**
 * Estilos de la aplicación
 */
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