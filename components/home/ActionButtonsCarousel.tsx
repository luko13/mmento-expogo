"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, FlatList, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { AntDesign, FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { useRouter } from "expo-router"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width } = Dimensions.get("window")
const BUTTON_SIZE = width * 0.28
const BUTTON_MARGIN = 10
const ITEM_WIDTH = BUTTON_SIZE + BUTTON_MARGIN * 2
const VISIBLE_BUTTONS = 3

interface ActionButtonProps {
  icon: React.ReactNode
  title: string
  onPress?: () => void
}

const ActionButton = ({ icon, title, onPress }: ActionButtonProps) => (
  <StyledTouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      marginHorizontal: BUTTON_MARGIN,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.5)",
      overflow: "hidden",
    }}
  >
    <BlurView intensity={10} tint="light" style={{ flex: 1 }}>
      <StyledView className="flex-1 justify-center items-center p-2">
        {icon}
        <StyledText className="text-white text-center mt-2 text-sm">{title}</StyledText>
      </StyledView>
    </BlurView>
  </StyledTouchableOpacity>
)

export default function ActionButtonsCarousel() {
  const { t } = useTranslation()
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const [isTouching, setIsTouching] = useState(false)
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null)

  const buttons = [
    {
      id: "1",
      icon: <AntDesign name="plus" size={36} color="white" />,
      title: t("addMagic"),
      onPress: () => router.push("/(app)/add-magic"),
    },
    {
      id: "2",
      icon: <FontAwesome name="star" size={36} color="white" />,
      title: t("quickMagic"),
      onPress: () => router.push("/(app)/add-quick-magic"),
    },
    {
      id: "3",
      icon: <Ionicons name="flash" size={36} color="white" />,
      title: t("addTechnique"),
      onPress: () => router.push("/(app)/add-technique"),
    },
    {
      id: "4",
      icon: <MaterialCommunityIcons name="wrench" size={36} color="white" />,
      title: t("addGimmick"),
      onPress: () => console.log("Add Gimmick pressed"),
    },
  ]

  // Creamos una lista extendida para el efecto de scrolling infinito
  const extendedButtons = [
    ...buttons.map((item) => ({ ...item, id: `pre-${item.id}` })),
    ...buttons,
    ...buttons.map((item) => ({ ...item, id: `post-${item.id}` })),
  ]

  // Inicializar en el punto medio para permitir scroll en ambas direcciones
  useEffect(() => {
    // Pequeño retraso para asegurar que FlatList se ha renderizado correctamente
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: buttons.length,
        animated: false,
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const startAutoScroll = () => {
    if (!isAutoScrolling || isTouching) return

    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current)
    }

    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = ((currentIndex + 1) % buttons.length) + buttons.length

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      })

      startAutoScroll()
    }, 5000)
  }

  useEffect(() => {
    // Iniciar el auto scroll después de un breve retraso inicial
    const initialTimer = setTimeout(() => {
      startAutoScroll()
    }, 2000)

    return () => {
      clearTimeout(initialTimer)
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current)
      }
    }
  }, [currentIndex, isAutoScrolling, isTouching])

  const handleScroll = (event: any) => {
    // Calcular el índice actual basado en la posición del scroll
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const newIndex = Math.round(contentOffsetX / ITEM_WIDTH)

    // Ajustar el índice para el conjunto central de botones
    const adjustedIndex = newIndex % buttons.length

    if (adjustedIndex !== currentIndex % buttons.length) {
      setCurrentIndex(newIndex)
    }
  }

  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const totalWidth = ITEM_WIDTH * (buttons.length * 3)

    // Si llegamos al principio o al final, saltamos al conjunto del medio
    if (offsetX < ITEM_WIDTH * buttons.length) {
      // Si estamos en el primer conjunto, saltamos al segundo
      flatListRef.current?.scrollToIndex({
        index: offsetX / ITEM_WIDTH + buttons.length,
        animated: false,
      })
    } else if (offsetX >= ITEM_WIDTH * (buttons.length * 2)) {
      // Si estamos en el tercer conjunto, saltamos al segundo
      flatListRef.current?.scrollToIndex({
        index: offsetX / ITEM_WIDTH - buttons.length,
        animated: false,
      })
    }

    // Reanudar auto scroll después de que el usuario termine de interactuar
    setIsTouching(false)
  }

  return (
    <StyledView className="mb-6">
      <FlatList
        ref={flatListRef}
        data={extendedButtons}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="center"
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          setIsTouching(true)
          setIsAutoScrolling(false)
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={() => {
          setIsAutoScrolling(true)
        }}
        contentContainerStyle={{ paddingHorizontal: BUTTON_MARGIN }}
        keyExtractor={(item) => item.id}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => <ActionButton icon={item.icon} title={item.title} onPress={item.onPress} />}
      />
    </StyledView>
  )
}
