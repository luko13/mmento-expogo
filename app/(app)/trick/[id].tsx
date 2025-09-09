// app/(app)/trick/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { useState, useEffect, useMemo } from "react";
import TrickViewScreen from "../../../components/TrickViewScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { fontNames } from "../../_layout";

// Definir tipos para la respuesta de categoría
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

  // Memoizar el trickData parseado para evitar que se recree en cada render
  const trickData = useMemo(() => {
    if (params.trick) {
      try {
        return JSON.parse(params.trick as string);
      } catch (e) {
        console.error("Error parsing trick data:", e);
        return null;
      }
    }
    return null;
  }, [params.trick]);

  const trickId = params.id as string;

  // CORRECCIÓN: Remover trickData de las dependencias ya que ahora está memoizado
  useEffect(() => {
    // Si ya tenemos los datos del truco, no necesitamos cargarlos
    if (trickData) {
      setTrick(trickData);
      setLoading(false);
      return;
    }

    // Si solo tenemos el ID, cargar el truco desde la BD
    if (trickId) {
      loadTrick();
    }
  }, [trickId]); // Solo trickId como dependencia

  const loadTrick = async () => {
    try {
      setLoading(true);

      // Primero, cargar el truco
      const { data: trickData, error: trickError } = await supabase
        .from("magic_tricks")
        .select("*")
        .eq("id", trickId)
        .single();

      if (trickError) throw trickError;

      // Luego, cargar la categoría si existe
      let categoryName = "General";

      const { data: categoryData, error: categoryError } = await supabase
        .from("trick_categories")
        .select(
          `
          category_id,
          user_categories!inner(
            name
          )
        `
        )
        .eq("trick_id", trickId)
        .single();

      if (categoryData && !categoryError) {
        // Tipar correctamente categoryData
        const typedCategoryData = categoryData as CategoryData;

        // user_categories podría ser un array o un objeto
        if (Array.isArray(typedCategoryData.user_categories)) {
          categoryName =
            typedCategoryData.user_categories[0]?.name || "General";
        } else if (typedCategoryData.user_categories) {
          categoryName = typedCategoryData.user_categories.name || "General";
        }
      }

      // Formatear los datos para que coincidan con lo que espera TrickViewScreen
      const formattedTrick = {
        ...trickData,
        category: categoryName,
      };

      setTrick(formattedTrick);
    } catch (err) {
      console.error("Error loading trick:", err);
      // Manejar el error correctamente según su tipo
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