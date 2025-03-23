"use client"
import { useRef, useState } from "react"
import { View, Image, Dimensions, Animated, PanResponder, Text, TouchableOpacity, Platform } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { useRouter } from "expo-router"
import { ChevronDown } from "lucide-react-native"
import UserProfile from "../../../components/home/UserProfile"
import ActionButtonsCarousel from "../../../components/home/ActionButtonsCarousel"
import LibrariesSection from "../../../components/home/LibrariesSection"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledAnimatedView = styled(Animated.View)

const { width, height } = Dimensions.get("window")

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 60
const BOTTOM_SPACING = Platform.OS === "ios" ? 20 : 10

export default function Home() {
  const { t } = useTranslation()
  const router = useRouter()
  const scrollY = useRef(new Animated.Value(0)).current
  const [librariesVisible, setLibrariesVisible] = useState(false)

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward swipes to reveal libraries
        if (gestureState.dy > 0 && !librariesVisible) {
          // Map gesture movement to animation value (0-100)
          const newValue = Math.min(100, gestureState.dy)
          scrollY.setValue(newValue)
        } else if (gestureState.dy < 0 && librariesVisible) {
          // Allow upward swipes to hide libraries
          const newValue = Math.max(0, 100 + gestureState.dy)
          scrollY.setValue(newValue)
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down enough, show libraries
        if (gestureState.dy > 50 && !librariesVisible) {
          Animated.spring(scrollY, {
            toValue: 100,
            useNativeDriver: true,
          }).start(() => setLibrariesVisible(true))
        }
        // If swiped up enough, hide libraries
        else if (gestureState.dy < -50 && librariesVisible) {
          Animated.spring(scrollY, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => setLibrariesVisible(false))
        }
        // Otherwise, snap back to original position
        else {
          Animated.spring(scrollY, {
            toValue: librariesVisible ? 100 : 0,
            useNativeDriver: true,
          }).start()
        }
      },
    }),
  ).current

  // Animation values
  const swipeIndicatorOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  })

  // Animation for action buttons
  const actionButtonsTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -200], // Move up and out of view
    extrapolate: "clamp",
  })

  const actionButtonsOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  })

  // Animation for user profile
  const userProfileTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -100], // Move up less than action buttons
    extrapolate: "clamp",
  })

  // Animation for libraries section
  const librariesTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [300, 0], // Move from below into view
    extrapolate: "clamp",
  })

  // Handle swipe up to show action buttons again
  const handleSwipeUp = () => {
    Animated.spring(scrollY, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setLibrariesVisible(false))
  }

  return (
    <StyledView className="flex-1" {...panResponder.panHandlers}>
      <Image
        source={require("../../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />

      <StyledView className="flex-1 p-6">
        {/* User Profile - stays visible but moves up */}
        <StyledAnimatedView
          style={{
            transform: [{ translateY: userProfileTranslateY }],
            zIndex: 10,
          }}
        >
          <UserProfile onProfilePress={() => router.push("/(app)/profile")} />
        </StyledAnimatedView>

        {/* Action Buttons Carousel - disappears when swiping down */}
        <StyledAnimatedView
          style={{
            transform: [{ translateY: actionButtonsTranslateY }],
            opacity: actionButtonsOpacity,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <ActionButtonsCarousel />
        </StyledAnimatedView>

        {/* Swipe Indicator (only visible when libraries are hidden) */}
        <StyledAnimatedView
          className="items-center mb-4"
          style={{
            opacity: swipeIndicatorOpacity,
            overflow: "hidden",
          }}
        >
          <StyledView className="flex-row items-center bg-white/10 px-4 py-2 rounded-full">
            <ChevronDown size={20} color="white" />
            <StyledText className="text-white ml-2">{t("swipeDown")}</StyledText>
          </StyledView>
        </StyledAnimatedView>

        {/* Libraries Section - fills the screen when visible */}
        <StyledAnimatedView
          className="flex-1"
          style={{
            transform: [{ translateY: librariesTranslateY }],
            position: librariesVisible ? "absolute" : "relative",
            top: librariesVisible ? 80 : 0, // Position below user profile when visible
            left: 0,
            right: 0,
            bottom: NAVBAR_HEIGHT + BOTTOM_SPACING, // Add bottom spacing for navigation bar
            paddingHorizontal: 24,
            zIndex: librariesVisible ? 5 : 1,
          }}
        >
          <LibrariesSection scrollY={scrollY} onSwipeUp={handleSwipeUp} />
        </StyledAnimatedView>
      </StyledView>
    </StyledView>
  )
}

