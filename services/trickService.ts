// services/trickService.ts
import { supabase } from "../lib/supabase";
import type { MagicTrick } from "../types/magicTrick";
import { networkMonitorService } from "./NetworkMonitorService";
import { offlineQueueService } from "../lib/offlineQueue";
import { localDataService } from "./LocalDataService";

export const trickService = {
  async getCompleteTrick(trickId: string): Promise<MagicTrick | null> {
    try {
      const { data: trick, error: trickError } = await supabase
        .from("magic_tricks")
        .select("*")
        .eq("id", trickId)
        .single();
      if (trickError) throw trickError;
      if (!trick) return null;

      const { data: categoryData } = await supabase
        .from("trick_categories")
        .select("category_id")
        .eq("trick_id", trickId)
        .single();

      const { data: tagsData } = await supabase
        .from("trick_tags")
        .select("tag_id")
        .eq("trick_id", trickId);

      const { data: techniquesData } = await supabase
        .from("trick_techniques")
        .select("technique_id")
        .eq("trick_id", trickId);

      const { data: gimmicksData } = await supabase
        .from("trick_gimmicks")
        .select("gimmick_id")
        .eq("trick_id", trickId);

      const { data: scriptData } = await supabase
        .from("scripts")
        .select("id, content")
        .eq("trick_id", trickId)
        .single();

      const completeTrick: MagicTrick = {
        id: trick.id,
        user_id: trick.user_id,
        title: trick.title || "",
        categories: [],
        tags: tagsData?.map((t) => t.tag_id) || [],
        selectedCategoryId: categoryData?.category_id || null,
        effect: trick.effect || "",
        effect_video_url: trick.effect_video_url,
        angles: trick.angles || [],
        duration: trick.duration,
        reset: trick.reset,
        difficulty: trick.difficulty,
        secret: trick.secret || "",
        secret_video_url: trick.secret_video_url,
        special_materials: trick.special_materials || [],
        notes: trick.notes || "",
        script: scriptData?.content || "",
        scriptId: scriptData?.id,
        photo_url: trick.photo_url,
        techniqueIds: techniquesData?.map((t) => t.technique_id) || [],
        gimmickIds: gimmicksData?.map((g) => g.gimmick_id) || [],
        is_public: trick.is_public,
        status: trick.status,
        price: trick.price,
        created_at: trick.created_at,
        updated_at: trick.updated_at,
        views_count: trick.views_count,
        likes_count: trick.likes_count,
        dislikes_count: trick.dislikes_count,
        version: trick.version,
        parent_trick_id: trick.parent_trick_id,
      };

      return completeTrick;
    } catch (error) {
      console.error("Error fetching complete trick:", error);
      return null;
    }
  },

  async updateIsPublic(trickId: string, isPublic: boolean): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Actualizar localmente primero
    localDataService.updateTrick(
      user.id,
      trickId,
      { is_public: isPublic },
      !networkMonitorService.isOnline()
    );

    // Si estamos offline, encolar y retornar
    if (!networkMonitorService.isOnline()) {
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "update_trick",
        payload: { trickId, data: { is_public: isPublic } },
      });
      console.log("[TrickService] Offline: is_public change enqueued");
      return true;
    }

    // Si estamos online, actualizar en servidor
    try {
      const { error } = await supabase
        .from("magic_tricks")
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq("id", trickId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating is_public:", error);
      // Encolar para retry
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "update_trick",
        payload: { trickId, data: { is_public: isPublic } },
      });
      return false;
    }
  },

  async deleteTrick(trickId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("[TrickService] No user found");
      return false;
    }

    console.log("[TrickService] Starting deletion for trick:", trickId);
    console.log("[TrickService] Network status:", {
      isOnline: networkMonitorService.isOnline(),
      status: networkMonitorService.getStatus()
    });

    // SIEMPRE intentar eliminar del servidor primero, independientemente del estado de red
    // Si falla, entonces encolaremos
    try {
      console.log("[TrickService] Fetching trick data...");
      // 1. PRIMERO: Obtener el truco para acceder a las URLs de archivos
      const { data: trick, error: fetchError } = await supabase
        .from("magic_tricks")
        .select("effect_video_url, secret_video_url, photo_url")
        .eq("id", trickId)
        .single();

      if (fetchError) {
        console.error("[TrickService] Error fetching trick:", fetchError);
        throw fetchError;
      }

      console.log("[TrickService] Trick data fetched:", trick);

      // 2. Eliminar archivos multimedia (videos y foto principal)
      if (trick) {
        const { deleteFileFromStorage } = await import("./fileUploadService");

        if (trick.effect_video_url) {
          console.log("🗑️ Eliminando video de efecto:", trick.effect_video_url);
          await deleteFileFromStorage(trick.effect_video_url);
        }

        if (trick.secret_video_url) {
          console.log("🗑️ Eliminando video de secreto:", trick.secret_video_url);
          await deleteFileFromStorage(trick.secret_video_url);
        }

        if (trick.photo_url) {
          console.log("🗑️ Eliminando foto principal:", trick.photo_url);
          await deleteFileFromStorage(trick.photo_url);
        }

        // 2b. Eliminar fotos adicionales de la tabla trick_photos
        console.log("[TrickService] Fetching additional photos...");
        const { data: photos, error: photosError } = await supabase
          .from("trick_photos")
          .select("photo_url")
          .eq("trick_id", trickId);

        if (photosError) {
          console.error("[TrickService] Error fetching photos:", photosError);
        }

        if (photos && photos.length > 0) {
          console.log(`🗑️ Eliminando ${photos.length} fotos adicionales...`);
          for (const photo of photos) {
            if (photo.photo_url) {
              await deleteFileFromStorage(photo.photo_url);
            }
          }
        }
      }

      // 3. Eliminar relaciones en tablas auxiliares
      console.log("[TrickService] Deleting user_favorites...");
      const { error: favError } = await supabase
        .from("user_favorites")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic");
      if (favError) console.error("[TrickService] Error deleting favorites:", favError);

      console.log("[TrickService] Deleting trick_tags...");
      const { error: tagsError } = await supabase
        .from("trick_tags")
        .delete()
        .eq("trick_id", trickId);
      if (tagsError) console.error("[TrickService] Error deleting tags:", tagsError);

      console.log("[TrickService] Deleting trick_categories...");
      const { error: catError } = await supabase
        .from("trick_categories")
        .delete()
        .eq("trick_id", trickId);
      if (catError) console.error("[TrickService] Error deleting categories:", catError);

      console.log("[TrickService] Deleting trick_techniques...");
      const { error: techError } = await supabase
        .from("trick_techniques")
        .delete()
        .eq("trick_id", trickId);
      if (techError) console.error("[TrickService] Error deleting techniques:", techError);

      console.log("[TrickService] Deleting trick_gimmicks...");
      const { error: gimError } = await supabase
        .from("trick_gimmicks")
        .delete()
        .eq("trick_id", trickId);
      if (gimError) console.error("[TrickService] Error deleting gimmicks:", gimError);

      console.log("[TrickService] Deleting trick_photos...");
      const { error: photosDelError } = await supabase
        .from("trick_photos")
        .delete()
        .eq("trick_id", trickId);
      if (photosDelError) console.error("[TrickService] Error deleting photos:", photosDelError);

      console.log("[TrickService] Deleting scripts...");
      const { error: scriptError } = await supabase
        .from("scripts")
        .delete()
        .eq("trick_id", trickId);
      if (scriptError) console.error("[TrickService] Error deleting scripts:", scriptError);

      console.log("[TrickService] Deleting shared_content...");
      const { error: sharedError } = await supabase
        .from("shared_content")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic_trick");
      if (sharedError) console.error("[TrickService] Error deleting shared content:", sharedError);

      // 4. Finalmente, eliminar el registro del truco
      console.log("[TrickService] Deleting main trick record...");
      const { error: deleteError } = await supabase
        .from("magic_tricks")
        .delete()
        .eq("id", trickId);

      if (deleteError) {
        console.error("[TrickService] Error deleting trick record:", deleteError);
        throw deleteError;
      }

      console.log("✅ [TrickService] Truco eliminado completamente del servidor");

      // Solo ahora eliminar del caché local
      localDataService.deleteTrick(user.id, trickId);
      console.log("✅ [TrickService] Truco eliminado del caché local");

      return true;
    } catch (error: any) {
      console.error("❌ [TrickService] Error deleting trick:", error);
      console.error("❌ [TrickService] Error details:", JSON.stringify(error, null, 2));

      // Verificar si es un error de red real vs error de permisos/datos
      const isNetworkError =
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('fetch') ||
        !navigator.onLine;

      if (isNetworkError) {
        console.log("[TrickService] Network error detected, enqueuing for retry");
        // Solo encolar si es error de red
        await offlineQueueService.enqueue({
          userId: user.id,
          type: "delete_trick",
          payload: { trickId },
        });
        // Eliminar del caché local para feedback inmediato
        localDataService.deleteTrick(user.id, trickId);
        return true; // Retornar true para que la UI se actualice
      } else {
        console.error("[TrickService] Non-network error, not enqueuing");
        // Si no es error de red, no encolar y retornar false
        return false;
      }
    }
  },

  async updateTrick(
    trickId: string,
    trickData: Partial<MagicTrick>
  ): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Actualizar localmente primero
    const localUpdates: any = {};
    if (trickData.title !== undefined) localUpdates.title = trickData.title;
    if (trickData.effect !== undefined) localUpdates.effect = trickData.effect;
    if (trickData.secret !== undefined) localUpdates.secret = trickData.secret;
    if (trickData.duration !== undefined) localUpdates.duration = trickData.duration;
    if (trickData.reset !== undefined) localUpdates.reset = trickData.reset;
    if (trickData.difficulty !== undefined) localUpdates.difficulty = trickData.difficulty;
    if (trickData.angles !== undefined) localUpdates.angles = trickData.angles;
    if (trickData.notes !== undefined) localUpdates.notes = trickData.notes;
    if (trickData.photo_url !== undefined) localUpdates.photo_url = trickData.photo_url;
    if (trickData.effect_video_url !== undefined) localUpdates.effect_video_url = trickData.effect_video_url;
    if (trickData.secret_video_url !== undefined) localUpdates.secret_video_url = trickData.secret_video_url;

    localDataService.updateTrick(
      user.id,
      trickId,
      localUpdates,
      !networkMonitorService.isOnline()
    );

    // Si estamos offline, encolar y retornar
    if (!networkMonitorService.isOnline()) {
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "update_trick",
        payload: { trickId, data: trickData },
      });
      console.log("[TrickService] Offline: trick update enqueued");
      return true;
    }

    // Si estamos online, actualizar en servidor
    try {
      const { error: updateError } = await supabase
        .from("magic_tricks")
        .update({
          title: trickData.title,
          effect: trickData.effect,
          secret: trickData.secret,
          duration: trickData.duration,
          angles: trickData.angles,
          notes: trickData.notes,
          special_materials: trickData.special_materials,
          is_public: trickData.is_public,
          status: trickData.status,
          price: trickData.price,
          photo_url: trickData.photo_url,
          effect_video_url: trickData.effect_video_url,
          secret_video_url: trickData.secret_video_url,
          reset: trickData.reset,
          difficulty: trickData.difficulty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trickId);
      if (updateError) throw updateError;

      if (trickData.selectedCategoryId !== undefined) {
        await supabase
          .from("trick_categories")
          .delete()
          .eq("trick_id", trickId);
        if (trickData.selectedCategoryId) {
          await supabase.from("trick_categories").insert({
            trick_id: trickId,
            category_id: trickData.selectedCategoryId,
          });
        }
      }

      if (trickData.tags) {
        await supabase.from("trick_tags").delete().eq("trick_id", trickId);
        if (trickData.tags.length > 0) {
          const tagInserts = trickData.tags.map((tagId) => ({
            trick_id: trickId,
            tag_id: tagId,
          }));
          await supabase.from("trick_tags").insert(tagInserts);
        }
      }

      if (trickData.techniqueIds) {
        await supabase
          .from("trick_techniques")
          .delete()
          .eq("trick_id", trickId);
        if (trickData.techniqueIds.length > 0) {
          const techniqueInserts = trickData.techniqueIds.map(
            (techniqueId) => ({ trick_id: trickId, technique_id: techniqueId })
          );
          await supabase.from("trick_techniques").insert(techniqueInserts);
        }
      }

      if (trickData.gimmickIds) {
        await supabase.from("trick_gimmicks").delete().eq("trick_id", trickId);
        if (trickData.gimmickIds.length > 0) {
          const gimmickInserts = trickData.gimmickIds.map((gimmickId) => ({
            trick_id: trickId,
            gimmick_id: gimmickId,
          }));
          await supabase.from("trick_gimmicks").insert(gimmickInserts);
        }
      }

      if (trickData.script !== undefined && trickData.scriptId) {
        await supabase
          .from("scripts")
          .update({
            content: trickData.script,
            updated_at: new Date().toISOString(),
          })
          .eq("id", trickData.scriptId);
      }

      return true;
    } catch (error) {
      console.error("Error updating trick:", error);
      // Encolar para retry
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "update_trick",
        payload: { trickId, data: trickData },
      });
      return false;
    }
  },
};
