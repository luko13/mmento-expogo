"use client";

import { View, TouchableOpacity, Dimensions } from "react-native";
import { styled } from "nativewind";
import { Slot, useRouter, usePathname } from "expo-router";
import {
  Ionicons,
  FontAwesome,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledBlurView = styled(BlurView);
const { width, height } = Dimensions.get("window");

export default function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Verificar si estamos en rutas que no deben mostrar navbar
  const isAddMagicRoute = pathname.includes("/add-magic");
  const isAddTechniqueRoute = pathname.includes("/add-technique");
  const isAddGimmickRoute = pathname.includes("/add-gimmick");
  const isAddQuickMagicRoute = pathname.includes("/add-quick-magic");
  const isAddScriptRoute = pathname.includes("/add-script");
  const isTrickViewRoute =
    pathname.includes("/trick/") || pathname.includes("/tricks/");
  const isTechniqueViewRoute =
    pathname.includes("/technique/") || pathname.includes("/techniques/");
  const isGimmickViewRoute =
    pathname.includes("/gimmick/") || pathname.includes("/gimmicks/");

  const shouldHideNavbar =
    isAddMagicRoute ||
    isAddTechniqueRoute ||
    isAddQuickMagicRoute ||
    isTrickViewRoute ||
    isTechniqueViewRoute ||
    isGimmickViewRoute;

  // Determinar ruta activa
  const getActiveRoute = () => {
    if (pathname.includes("/home")) return "home";
    if (pathname.includes("/notifications")) return "notifications";
    if (pathname.includes("/add-magic")) return "add";
    if (pathname.includes("/videos")) return "video";
    if (pathname.includes("/ai")) return "ai";
    return "home";
  };

  const navItems = [
    {
      id: "home",
      icon: "home",
      route: "/(app)/home",
      library: "antdesign",
      size: 30,
    },
    {
      id: "notifications",
      icon: "notifications-outline",
      route: "/(app)/notifications",
      library: "ionicons",
      size: 30,
    },
    {
      id: "add",
      icon: "magic",
      route: "/(app)/add-magic",
      special: true,
      library: "fontawesome",
      size: 30,
    },
    {
      id: "video",
      icon: "play-circle-outline",
      route: "/(app)/videos",
      library: "ionicons",
      size: 30,
    },
    {
      id: "ai",
      icon: "robot-angry-outline",
      route: "/(app)/ai",
      library: "materialcommunity",
      size: 30,
    },
  ];

  return (
    <StyledView className="flex-1">
      {/* Contenido principal */}
      <Slot />

      {/* Glass morphism navbar */}
      {!shouldHideNavbar && (
        <StyledView className="absolute bottom-0 left-0 right-0">
          <StyledBlurView
            intensity={40}
            tint="dark"
            className="overflow-hidden"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.2)",
              paddingBottom: insets.bottom,
            }}
          >
            <StyledView className="flex-row justify-evenly items-center py-3">
              {navItems.map((item) => (
                <StyledTouchableOpacity
                  key={item.id}
                  onPress={() => router.push(item.route)}
                  className="p-3"
                  style={{
                    opacity: getActiveRoute() === item.id ? 1 : 0.6,
                    ...(item.special
                      ? {
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          borderRadius: 12,
                        }
                      : {}),
                  }}
                >
                  {item.library === "antdesign" ? (
                    <AntDesign
                      name={item.icon as any}
                      size={item.size}
                      color="#FFFFFF"
                    />
                  ) : item.library === "fontawesome" ? (
                    <FontAwesome
                      name={item.icon as any}
                      size={item.size}
                      color="#FFFFFF"
                    />
                  ) : item.library === "materialcommunity" ? (
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={item.size}
                      color="#FFFFFF"
                    />
                  ) : (
                    <Ionicons
                      name={item.icon as any}
                      size={item.size}
                      color="#FFFFFF"
                    />
                  )}
                </StyledTouchableOpacity>
              ))}
            </StyledView>
          </StyledBlurView>
        </StyledView>
      )}
    </StyledView>
  );
}
