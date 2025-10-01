// App.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";
import Constants from "expo-constants";
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

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setBarStyle("light-content");
      NavigationBar.setBackgroundColorAsync("#00000001");
      NavigationBar.setButtonStyleAsync("light");
    }
  }, []);

  // 👇 Check seguro y con tipos para Hermes / entorno
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isHermes = (global as any).HermesInternal != null;
    console.log("MMKV sanity", {
      appOwnership: Constants.appOwnership, // 'guest' (dev build), 'standalone' (prod) o 'expo' (Expo Go)
      isHermes, // true = on-device sin debug remoto
    });
  }, []);

  const theme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
    },
  };

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
