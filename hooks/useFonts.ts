// hooks/useFonts.ts
import { useEffect, useState } from 'react'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

// Prevenir que la splash screen se oculte automáticamente
SplashScreen.preventAutoHideAsync()

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
          'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
          'Outfit-ExtraBold': require('../assets/fonts/Outfit-ExtraBold.ttf'),
          'Outfit-Light': require('../assets/fonts/Outfit-Light.ttf'),
          'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
          'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
          'Outfit-Thin': require('../assets/fonts/Outfit-Thin.ttf'),
          'Outfit-ExtraLight': require('../assets/fonts/Outfit-ExtraLight.ttf'),
          'Outfit-Black': require('../assets/fonts/Outfit-Black.ttf'),
        })
        setFontsLoaded(true)
      } catch (error) {
        console.error('Error loading fonts:', error)
      } finally {
        // Ocultar splash screen cuando las fuentes estén cargadas
        await SplashScreen.hideAsync()
      }
    }

    loadFonts()
  }, [])

  return fontsLoaded
}

// Exportar nombres de fuentes para uso consistente
export const fontNames = {
  regular: 'Outfit-Regular',
  bold: 'Outfit-Bold',
  extraBold: 'Outfit-ExtraBold',
  light: 'Outfit-Light',
  medium: 'Outfit-Medium',
  semiBold: 'Outfit-SemiBold',
  thin: 'Outfit-Thin',
  extraLight: 'Outfit-ExtraLight',
  black: 'Outfit-Black',
}