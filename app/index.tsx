"use client"

import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { router } from "expo-router"
import { useEffect, useState, useRef } from "react"
import { checkSession } from "../utils/storage"
import { LinearGradient } from 'expo-linear-gradient'

const StyledView = styled(View)
const StyledText = styled(Text)

const { width, height } = Dimensions.get("window")

// Función para precargar datos de la homepage
const precacheHomeData = async () => {
  try {
    // Aquí puedes añadir llamadas para precargar cualquier dato necesario para la homepage:
    // - Perfil de usuario
    // - Datos para ActionButtonsCarousel
    // - Datos para LibrariesSection
    // - Cualquier otro dato que necesite la homepage
    
    // Ejemplo (debes adaptar esto a tus funciones reales de carga de datos):
    const promises = [
      // Ejemplos de llamadas que podrías necesitar:
      // fetchUserProfile(),
      // fetchCarouselActions(),
      // fetchLibraries(),
      
      // Simulación de carga (reemplaza con tus llamadas reales)
      new Promise(resolve => setTimeout(resolve, 300)), // Simula una carga rápida
    ]
    
    await Promise.all(promises)
    
    console.log('Datos de la homepage precargados con éxito')
    return true
  } catch (error) {
    console.error('Error al precargar datos de la homepage:', error)
    return false
  }
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const [transition, setTransition] = useState<"normal" | "auth" | "hidden">("normal")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [precacheStarted, setPrecacheStarted] = useState(false)
  const [precacheCompleted, setPrecacheCompleted] = useState(false)
  const isMounted = useRef(true)

  // Verificar la sesión al cargar la pantalla (pero sin redirigir)
  useEffect(() => {
    isMounted.current = true
    
    // Verificar el estado de autenticación
    checkSession().then((hasSession) => {
      if (!isMounted.current) return
      
      setIsAuthenticated(hasSession)
      
      // Si el usuario está autenticado, comenzar la precarga de datos
      if (hasSession && !precacheStarted) {
        setPrecacheStarted(true)
        
        // Iniciar precarga de datos para la homepage
        precacheHomeData().then((success) => {
          if (!isMounted.current) return
          setPrecacheCompleted(success)
        })
      }
    })
    
    return () => {
      isMounted.current = false
    }
  }, [])

  const handlePress = async () => {
    // Primero mostramos el fondo de auth
    setTransition("auth")
    
    // Si ya sabemos que el usuario está autenticado, no necesitamos verificar de nuevo
    const hasSession = isAuthenticated !== null ? isAuthenticated : await checkSession()
    
    // Damos más tiempo para que el cambio visual sea completo antes de navegar
    setTimeout(() => {
      // Justo antes de navegar, ocultamos todo
      setTransition("hidden")
      
      // Un pequeño delay adicional para asegurar que todo está oculto
      setTimeout(() => {
        router.replace(hasSession ? "/(app)/home" : "/auth/login")
      }, 50)
    }, 100)
  }

  // Si estamos en fase de transición a auth, mostramos un fondo transparente
  if (transition === "auth") {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />
  }
  
  // Si estamos en la fase final de transición, también usamos un fondo transparente
  if (transition === "hidden") {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />
  }

  // Pantalla normal
  return (
    <TouchableOpacity onPress={handlePress} style={{ flex: 1 }}>
      <Image
        source={require("../assets/Index.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />
      <StyledView className="flex-1 items-center justify-center">
        {/* Indicador de precarga (opcional) - puedes quitar esto si prefieres no mostrar ningún indicador */}
        {isAuthenticated && precacheStarted && !precacheCompleted && (
          <StyledView 
            className="absolute top-10 right-10 bg-black/20 rounded-full p-2"
            style={{ opacity: 0.6 }}
          >
            {/* Puedes añadir un indicador de carga aquí si lo deseas */}
          </StyledView>
        )}
        
        {/* Texto traducido */}
        <StyledText className="text-lg text-white/60 absolute bottom-8">{t("tapAnywhere")}</StyledText>
      </StyledView>
    </TouchableOpacity>
  )
}