// App.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";
import { useEffect } from "react";
import {
  useColorScheme,
  NativeModules,
  Platform,
  StatusBar,
} from "react-native";
import { ExpoRoot } from "expo-router";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DragPortalProvider } from "./components/DragPortal";
import i18n from "./i18n";
import * as NavigationBar from "expo-navigation-bar";

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
   * Configurar StatusBar y NavigationBar para Android
   */
  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setBarStyle("light-content");

      // Hacer la barra de navegación transparente
      NavigationBar.setBackgroundColorAsync("#00000001");
      NavigationBar.setButtonStyleAsync("light");
    }
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
   */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DragPortalProvider>
        <ThemeProvider value={theme}>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle="light-content"
          />
          <ExpoRoot context={require("./app")} />
        </ThemeProvider>
      </DragPortalProvider>
    </GestureHandlerRootView>
  );
}
