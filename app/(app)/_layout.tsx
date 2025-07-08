"use client";

import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
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
import { SvgXml } from "react-native-svg";
const mmentoAISvg = `<svg id="Capa_1" data-name="Capa 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1506.39 1526.95"><title>mmento_AI_black</title><path fill="white" d="M1521.46,1081.43c-.27,49.19-3.31,98.2-12.07,146.68-10.35,57.29-29.4,111.29-61.82,160.08-41.63,62.64-96.78,109-166.45,137.74-44.22,18.26-90.36,28.87-137.87,33.16-26,2.35-52.16,4.32-78.23,4.12a631.1,631.1,0,0,1-126.84-14.31c-51.27-10.91-99.62-30.19-147.95-49.74-74.82-30.26-149.44-61-222.72-94.87-80.32-37.14-158.76-77.8-233.65-125.06-58.11-36.67-114.24-76.12-165.85-121.65-45.64-40.27-85.81-85.2-115.6-138.68-18.4-33-31-68.14-35.3-105.91A247.82,247.82,0,0,1,35.7,785.46c15.89-37.26,39.78-69,66.31-99.24,26-29.61,56.35-54.15,86.44-79.21,31-25.78,61.14-52.55,90.88-79.73C303.05,505.6,326,483,348.59,460.17c51.15-51.59,100-105.32,147.92-159.92,20.76-23.66,41.17-47.66,62.57-70.73C609.41,175.27,666.2,129.19,732,94.71A529.2,529.2,0,0,1,863.24,46.25a476.32,476.32,0,0,1,54.26-8.32,257.07,257.07,0,0,1,43.32-1.22c58.62,3.84,110.15,25.1,154.17,64.34,27.75,24.73,49.72,54.09,70.32,84.74,42.12,62.64,82.57,126.32,119.85,192,52,91.67,97.48,186.43,132.82,285.86a1382.25,1382.25,0,0,1,49.9,175.68c9.9,46.63,17.27,93.66,23.56,140.89,3.31,24.93,7,49.82,9.86,74.8C1522.3,1063.69,1521.46,1072.61,1521.46,1081.43ZM946.07,1481.66c2.32,0,4.65,0,7,0,48.4-.69,95.45-8.54,140.45-26.88,52.79-21.51,96.54-54.68,129.61-101.43,34.35-48.56,50.87-103.29,55.46-162,2.1-26.88,3.46-53.82,5-80.75,1-17.11,2.39-34.24,2.41-51.36,0-21.46-.75-43-2-64.39-2.15-38.39-4.2-76.81-7.49-115.11-4.92-57.27-12.78-114.19-22.91-170.79-8.55-47.73-18.78-95.08-31-142-21.49-82.43-48.86-162.94-80.13-242.12-21-53.11-46.23-104-79.25-150.89-19-27-40.3-51.86-68.48-69.85C960.72,82.34,924.1,75.05,884.46,85,855.93,92.1,831,106.2,808.37,124.49c-37.47,30.29-72.88,62.93-107.14,96.75-28,27.61-55.51,55.7-82.32,84.43A1382.35,1382.35,0,0,0,480,480.33c-64.46,96.4-113.74,199.78-143.42,312.15-13.5,51.11-21.35,102.94-20.43,156a436.18,436.18,0,0,0,11.31,93c14.47,61.42,42.59,116,82.05,165,33.18,41.18,72.85,75.44,114.58,107.45q126.06,96.67,277.56,144.73C848.65,1473.48,896.7,1481.77,946.07,1481.66Z" transform="translate(-15.4 -36.27)"/></svg>`;

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
  const isEditTrickRoute = pathname.includes("/edit-trick");
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
    isEditTrickRoute ||
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
      size: 24,
    },
    {
      id: "notifications",
      icon: "notifications-outline",
      route: "/(app)/notifications",
      library: "ionicons",
      size: 24,
    },
    {
      id: "add",
      icon: "magic",
      route: "/(app)/add-magic",
      special: true,
      library: "fontawesome",
      size: 24,
    },
    {
      id: "video",
      icon: "play-circle-outline",
      route: "/(app)/videos",
      library: "ionicons",
      size: 24,
    },
    {
      id: "ai",
      icon: "robot-angry-outline",
      route: "/(app)/mmento-ai",
      library: "materialcommunity",
      size: 24,
    },
  ];
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBehaviorAsync("overlay-swipe");
      NavigationBar.setVisibilityAsync("hidden");
    }
  }, []);
  return (
    <StyledView className="flex-1">
      {/* Contenido principal */}
      <Slot />

      {/* Glass morphism navbar */}
      {!shouldHideNavbar && (
        <StyledView
          className="absolute bottom-0 left-0 right-0"
          style={{ bottom: -4 }}
        >
          <StyledBlurView
            intensity={40}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            className="overflow-hidden"
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.2)",
              // Siempre reserva el inset inferior…
              paddingBottom: insets.bottom,
              //espacio arriba SOLO en Android
              paddingTop: Platform.OS === "android" ? 0 : 0,
              // altura fija mínima
              minHeight: Platform.OS === "android" ? 80 : undefined,
            }}
          >
            <StyledView
              className="flex-row justify-evenly items-center"
              // Ajusta un poco también el padding vertical de los iconos
              style={{
                paddingVertical: Platform.OS === "android" ? 16 : 8,
              }}
            >
              {navItems.map((item) => (
                <StyledTouchableOpacity
                  key={item.id}
                  onPress={() => router.push(item.route)}
                  className="px-3 py-1"
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
                    item.id === "ai" ? (
                      <SvgXml
                        xml={mmentoAISvg}
                        width={24}
                        height={24}
                        fill="#FFFFFF"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={item.size}
                        color="#FFFFFF"
                      />
                    )
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
