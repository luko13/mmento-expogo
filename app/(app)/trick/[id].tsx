// app/(app)/trick/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { useState, useEffect, useMemo } from "react";
import TrickViewScreen from "../../../components/TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { fontNames } from "../../_layout";

interface CategoryData {
  category_id: string;
  user_categories:
    | {
        name: string;
      }
    | {
        name: string;
      }[];
}

export default function TrickViewRoute() {
  const params = useLocalSearchParams();
  const [trick, setTrick] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🔴 [TrickViewRoute] Rendered");

  // Memoizar el trickData parseado del cache
  const cachedTrickData = useMemo(() => {
    if (params.trick) {
      try {
        const parsed = JSON.parse(params.trick as string);
        console.log("🔴 [TrickViewRoute] FASE 1: Datos del cache parseados");
        return parsed;
      } catch (e) {
        console.error("🔴 [TrickViewRoute] Error parsing trick data:", e);
        return null;
      }
    }
    return null;
  }, [params.trick]);

  const trickId = params.id as string;

  useEffect(() => {
    const initialize = async () => {
      // FASE 1: Mostrar datos del cache inmediatamente
      if (cachedTrickData) {
        console.log(
          "🔴 [TrickViewRoute] FASE 1: Mostrando cache (instantáneo)"
        );
        setTrick(cachedTrickData);
        setLoading(false);

        // FASE 2 & 3: Cargar datos adicionales en background
        await loadAdditionalData(trickId, cachedTrickData);
      }
      // Fallback: Si no hay cache, cargar todo desde Supabase
      else if (trickId) {
        console.log("🔴 [TrickViewRoute] Sin cache, cargando desde Supabase");
        await loadFullTrick(trickId);
      }
    };

    initialize();
  }, [trickId, cachedTrickData]);

  // FASE 2 & 3: Cargar fotos adicionales y script
  const loadAdditionalData = async (trickId: string, baseTrick: any) => {
    try {
      console.log("🔴 [TrickViewRoute] FASE 2: Cargando fotos adicionales");

      // FASE 2: Cargar fotos adicionales
      const { data: photosData } = await supabase
        .from("trick_photos")
        .select("photo_url")
        .eq("trick_id", trickId);

      const photos = photosData?.map((p) => p.photo_url) || [];

      if (photos.length > 0) {
        console.log(
          `🔴 [TrickViewRoute] FASE 2: ${photos.length} fotos cargadas`
        );
        setTrick((prev: any) => ({
          ...prev,
          photos,
        }));
      }

      console.log("🔴 [TrickViewRoute] FASE 3: Cargando script");

      // FASE 3: Cargar script
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("id, title, content")
        .eq("trick_id", trickId)
        .maybeSingle();

      if (scriptData) {
        console.log("🔴 [TrickViewRoute] FASE 3: Script cargado");
        setTrick((prev: any) => ({
          ...prev,
          script: scriptData.content || "",
          scriptId: scriptData.id,
        }));
      } else {
        console.log("🔴 [TrickViewRoute] FASE 3: No hay script");
      }
    } catch (err) {
      console.error(
        "🔴 [TrickViewRoute] Error cargando datos adicionales:",
        err
      );
      // No mostramos error al usuario, solo en logs
    }
  };

  // Fallback: Cargar todo desde Supabase si no hay cache
  const loadFullTrick = async (trickId: string) => {
    try {
      console.log("🔴 [TrickViewRoute] Cargando truco completo desde Supabase");
      setLoading(true);

      const { data: trickData, error: trickError } = await supabase
        .from("magic_tricks")
        .select(
          `
          *,
          trick_categories(category_id),
          scripts(id, title, content)
        `
        )
        .eq("id", trickId)
        .single();

      if (trickError) throw trickError;

      let categoryName = "General";

      if (trickData.trick_categories && trickData.trick_categories.length > 0) {
        const categoryId = trickData.trick_categories[0].category_id;
        const { data: cat } = await supabase
          .from("user_categories")
          .select("name")
          .eq("id", categoryId)
          .single();
        if (cat) categoryName = cat.name;
      }

      const { data: photosData } = await supabase
        .from("trick_photos")
        .select("photo_url")
        .eq("trick_id", trickId);

      const formattedTrick = {
        ...trickData,
        category: categoryName,
        photos: photosData?.map((p) => p.photo_url) || [],
        script: trickData.scripts?.[0]?.content || "",
        scriptId: trickData.scripts?.[0]?.id || null,
      };

      console.log("🔴 [TrickViewRoute] Truco completo cargado");
      setTrick(formattedTrick);
    } catch (err) {
      console.error("🔴 [TrickViewRoute] Error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#15322C",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#5BB9A3" />
        <Text
          style={{
            color: "white",
            marginTop: 16,
            fontFamily: fontNames.light,
            fontSize: 16,
          }}
        >
          Loading trick...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#15322C",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontFamily: fontNames.light,
            fontSize: 16,
          }}
        >
          Error loading trick
        </Text>
      </View>
    );
  }

  if (!trick) {
    return <View style={{ flex: 1, backgroundColor: "#15322C" }} />;
  }

  return (
    <SafeAreaProvider>
      <TrickViewScreen trick={trick} />
    </SafeAreaProvider>
  );
}
