import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  useColorScheme,
  NativeModules,
  Platform,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ExpoRoot } from "expo-router";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import i18n from "./i18n";

// Mantener la pantalla de splash visible mientras se cargan las fuentes
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

/**
 * Componente principal de la aplicación
 * Gestiona:
 * - Carga de fuentes personalizadas
 * - Configuración de idioma según el dispositivo
 * - Tema de la aplicación (claro/oscuro)
 */
export default function App() {
  const colorScheme = useColorScheme();

  // Estados para gestionar la carga de recursos
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontInfo, setFontInfo] = useState<string[]>([]);

  /**
   * Carga las fuentes personalizadas de la aplicación
   */
  useEffect(() => {
    async function loadFonts() {
      try {
        setFontInfo((prev) => [...prev, "📝 Cargando fuentes Outfit..."]);

        // Cargar todas las variantes de Outfit
        await Font.loadAsync({
          "Outfit-Thin": require("./assets/fonts/Outfit-Thin.ttf"),
          "Outfit-ExtraLight": require("./assets/fonts/Outfit-ExtraLight.ttf"),
          "Outfit-Light": require("./assets/fonts/Outfit-Light.ttf"),
          "Outfit-Regular": require("./assets/fonts/Outfit-Regular.ttf"),
          "Outfit-Medium": require("./assets/fonts/Outfit-Medium.ttf"),
          "Outfit-SemiBold": require("./assets/fonts/Outfit-SemiBold.ttf"),
          "Outfit-Bold": require("./assets/fonts/Outfit-Bold.ttf"),
          "Outfit-ExtraBold": require("./assets/fonts/Outfit-ExtraBold.ttf"),
          "Outfit-Black": require("./assets/fonts/Outfit-Black.ttf"),
        });

        setFontInfo((prev) => [
          ...prev,
          "✅ Todas las fuentes Outfit cargadas correctamente",
        ]);

        // Verificar que las fuentes estén disponibles
        const fontNames = await Font.getLoadedFonts();
        setFontInfo((prev) => [
          ...prev,
          `📚 Fuentes disponibles: ${fontNames.join(", ")}`,
        ]);

        setFontsLoaded(true);
      } catch (error) {
        console.error("Error cargando fuentes:", error);
        setFontError(error instanceof Error ? error.message : String(error));
        setFontInfo((prev) => [
          ...prev,
          `❌ Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ]);
      }
    }

    loadFonts();
  }, []);

  /**
   * Configura el idioma de la aplicación según el idioma del dispositivo
   */
  useEffect(() => {
    const getDeviceLanguage = () => {
      const deviceLanguage =
        Platform.OS === "ios"
          ? NativeModules.SettingsManager?.settings?.AppleLocale ||
            NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
          : NativeModules.I18nManager?.localeIdentifier;

      return deviceLanguage?.split("_")[0] || "en";
    };

    const setAppLanguage = () => {
      const deviceLang = getDeviceLanguage();
      const supportedLanguages = ["en", "es"];

      if (supportedLanguages.includes(deviceLang)) {
        i18n.changeLanguage(deviceLang);
      } else {
        i18n.changeLanguage("en");
      }
    };

    setAppLanguage();

    // Ocultar splash screen cuando las fuentes estén listas
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
    );
  }

  // Mostrar pantalla de carga mientras se inicializan los recursos
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Cargando fuentes...</Text>
          <View style={styles.logContainer}>
            {fontInfo.map((info, index) => (
              <Text key={index} style={styles.logText}>
                {info}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaProvider>
    );
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
        fontFamily: fontNames.regular,
        fontWeight: "normal" as const,
      },
      medium: {
        fontFamily: fontNames.medium,
        fontWeight: "500" as const,
      },
      bold: {
        fontFamily: fontNames.bold,
        fontWeight: "bold" as const,
      },
      heavy: {
        fontFamily: fontNames.black,
        fontWeight: "900" as const,
      },
    },
  };

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
  );
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
});