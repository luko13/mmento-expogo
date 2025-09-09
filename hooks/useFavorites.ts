// hooks/useFavorites.ts
import { useState, useEffect, useCallback } from "react";
import { favoritesService } from "../utils/favoritesService";
import { supabase } from "../lib/supabase";

type ContentType = "magic" | "gimmick" | "technique" | "script";

export const useFavorites = (contentId: string, contentType: ContentType) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  // SOLUCIÓN: Memoizar checkFavoriteStatus con useCallback
  const checkFavoriteStatus = useCallback(async () => {
    // No hacer nada si no hay contentId
    if (!contentId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const status = await favoritesService.isFavorite(
        user.id,
        contentId,
        contentType
      );
      setIsFavorite(status);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  }, [contentId, contentType]); // Dependencias correctas

  // useEffect con la función memoizada
  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]); // Ahora checkFavoriteStatus es estable

  const toggleFavorite = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (isFavorite) {
        await favoritesService.removeFromFavorites(
          user.id,
          contentId,
          contentType
        );
      } else {
        await favoritesService.addToFavorites(user.id, contentId, contentType);
      }

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setLoading(false);
    }
  };

  return { isFavorite, toggleFavorite, loading };
};
