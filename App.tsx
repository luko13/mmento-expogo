// App.tsx
import { useEffect, useState } from "react";
import { useColorScheme, NativeModules, Platform } from "react-native";
import { ExpoRoot } from "expo-router";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import i18n from "./i18n";

export default function App() {
  const colorScheme = useColorScheme();

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
  }, []);

  /**
   * Configuración del tema de la aplicación
   */
  const theme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
    },
  };

  /**
   * Renderizado principal de la aplicación
   * Las fuentes ahora se cargan en app/_layout.tsx
   */
  return (
    <ThemeProvider value={theme}>
      <ExpoRoot context={require("./app")} />
    </ThemeProvider>
  );
}
