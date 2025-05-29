// app/index.tsx - Complete version with legacy check and precache
"use client";

import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { checkSession } from "../utils/storage";
import { supabase } from "../lib/supabase";
import { CryptoService } from "../utils/cryptoService";
import { getAllUserContent, getUserCategories } from "../utils/categoryService";
import { SafeAreaView } from "react-native-safe-area-context";

const StyledView = styled(View);
const StyledText = styled(Text);

const { width, height } = Dimensions.get("window");

// Función para precargar datos de la homepage
const precacheHomeData = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const promises = [
      // Cargar perfil del usuario
      supabase.from("profiles").select("*").eq("id", user.id).single(),

      // Cargar todo el contenido del usuario
      getAllUserContent(user.id),

      // Cargar categorías
      getUserCategories(user.id),

      // Cargar tags predefinidos
      supabase
        .from("predefined_tags")
        .select("*")
        .order("usage_count", { ascending: false }),
    ];

    await Promise.all(promises);

    return true;
  } catch (error) {
    console.error("Error al precargar datos de la homepage:", error);
    return false;
  }
};

// Check if user needs encryption migration
const checkNeedsEncryptionMigration = async (): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("public_key, encrypted_private_key, encryption_initialized_at")
      .eq("id", user.id)
      .single();

    // Check if user has local private key stored
    const hasLocalPrivateKey = await CryptoService.getInstance().getPrivateKey(
      user.id
    );

    // Legacy user: has public key but no encrypted private key in cloud
    // AND no local private key (hasn't generated keys yet)
    return !!(
      profile?.public_key &&
      !profile.encrypted_private_key &&
      !hasLocalPrivateKey
    );
  } catch (error) {
    console.error("Error checking encryption status:", error);
    return false;
  }
};

export default function Home() {
  const { t } = useTranslation();
  const [transition, setTransition] = useState<"normal" | "auth" | "hidden">(
    "normal"
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [precacheStarted, setPrecacheStarted] = useState(false);
  const [precacheCompleted, setPrecacheCompleted] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    checkSession().then(async (hasSession) => {
      if (!isMounted.current) return;

      setIsAuthenticated(hasSession);

      if (hasSession) {
        // Check if legacy user needs migration
        const migrationNeeded = await checkNeedsEncryptionMigration();
        if (!isMounted.current) return;
        setNeedsMigration(migrationNeeded);

        // Start precaching if not a legacy user
        if (!migrationNeeded && !precacheStarted) {
          setPrecacheStarted(true);

          precacheHomeData().then((success) => {
            if (!isMounted.current) return;
            setPrecacheCompleted(success);
          });
        }
      }
    });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handlePress = async () => {
    setTransition("auth");

    const hasSession =
      isAuthenticated !== null ? isAuthenticated : await checkSession();

    setTimeout(() => {
      setTransition("hidden");

      setTimeout(() => {
        if (hasSession && needsMigration) {
          // Forzar a reloguearse a los usariso que necesitan generar claves de cifrado
          supabase.auth.signOut().then(() => {
            router.replace("/auth/login?legacy=true");
          });
        } else {
          router.replace(hasSession ? "/(app)/home" : "/auth/login");
        }
      }, 50);
    }, 100);
  };

  if (transition === "auth" || transition === "hidden") {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  return (
    <SafeAreaView  style={{ flex: 1 }}> 
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
          {isAuthenticated && precacheStarted && !precacheCompleted && (
            <StyledView
              className="absolute top-10 right-10 bg-black/20 rounded-full p-2"
              style={{ opacity: 0.6 }}
            >
              {/* Indicador de carga silencioso */}
            </StyledView>
          )}

          <StyledText className="text-lg text-white/60 absolute bottom-8">
            {t("tapAnywhere")}
          </StyledText>
        </StyledView>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
