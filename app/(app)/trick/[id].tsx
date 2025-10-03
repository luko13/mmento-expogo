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

  console.log("🔴 [TrickViewRoute] Component rendered with params:", {
    hasParams: !!params,
    id: params.id,
    hasTrick: !!params.trick,
    allParams: Object.keys(params),
  });

  // Memoizar el trickData parseado
  const trickData = useMemo(() => {
    if (params.trick) {
      try {
        const parsed = JSON.parse(params.trick as string);
        console.log("🔴 [TrickViewRoute] Parsed trick data:", {
          id: parsed.id,
          title: parsed.title,
          hasEffect: !!parsed.effect,
          hasSecret: !!parsed.secret,
        });
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
    console.log("🔴 [TrickViewRoute] useEffect triggered");

    // Si ya tenemos los datos del truco desde cache, usarlos directamente
    if (trickData) {
      console.log(
        "🔴 [TrickViewRoute] Using cached trick data, no Supabase call needed"
      );
      setTrick(trickData);
      setLoading(false);
      return;
    }

    // Solo si NO tenemos datos en cache, cargar desde Supabase
    if (trickId && !trickData) {
      console.log(
        "🔴 [TrickViewRoute] No cached data, loading from Supabase..."
      );
      loadTrick();
    }
  }, [trickId, trickData]);

  const loadTrick = async () => {
    try {
      console.log("🔴 [TrickViewRoute] loadTrick() started");
      setLoading(true);

      const { data: trickData, error: trickError } = await supabase
        .from("magic_tricks")
        .select("*")
        .eq("id", trickId)
        .single();

      if (trickError) throw trickError;

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
        const typedCategoryData = categoryData as CategoryData;

        if (Array.isArray(typedCategoryData.user_categories)) {
          categoryName =
            typedCategoryData.user_categories[0]?.name || "General";
        } else if (typedCategoryData.user_categories) {
          categoryName = typedCategoryData.user_categories.name || "General";
        }
      }

      const formattedTrick = {
        ...trickData,
        category: categoryName,
      };

      console.log(
        "🔴 [TrickViewRoute] Trick loaded from Supabase:",
        formattedTrick.id
      );
      setTrick(formattedTrick);
    } catch (err) {
      console.error("🔴 [TrickViewRoute] Error loading trick:", err);
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
    console.log("🔴 [TrickViewRoute] No trick data available");
    return <View style={{ flex: 1, backgroundColor: "#15322C" }} />;
  }

  console.log("🔴 [TrickViewRoute] Rendering TrickViewScreen");
  return (
    <SafeAreaProvider>
      <TrickViewScreen trick={trick} />
    </SafeAreaProvider>
  );
}
