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
    if (!user) return false;

    // Eliminar localmente primero
    localDataService.deleteTrick(user.id, trickId);

    // Si estamos offline, encolar y retornar
    if (!networkMonitorService.isOnline()) {
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "delete_trick",
        payload: { trickId },
      });
      console.log("[TrickService] Offline: trick deletion enqueued");
      return true;
    }

    // Si estamos online, eliminar del servidor
    try {
      // 1. PRIMERO: Obtener el truco para acceder a las URLs de archivos
      const { data: trick } = await supabase
        .from("magic_tricks")
        .select("effect_video_url, secret_video_url, photo_url")
        .eq("id", trickId)
        .single();

      // 2. Eliminar archivos multimedia (videos y foto principal)
      if (trick) {
        const { deleteFileFromStorage } = await import("./fileUploadService");

        if (trick.effect_video_url) {
          console.log("🗑️ Eliminando video de efecto...");
          await deleteFileFromStorage(trick.effect_video_url);
        }

        if (trick.secret_video_url) {
          console.log("🗑️ Eliminando video de secreto...");
          await deleteFileFromStorage(trick.secret_video_url);
        }

        if (trick.photo_url) {
          console.log("🗑️ Eliminando foto principal...");
          await deleteFileFromStorage(trick.photo_url);
        }

        // 2b. Eliminar fotos adicionales de la tabla trick_photos
        const { data: photos } = await supabase
          .from("trick_photos")
          .select("photo_url")
          .eq("trick_id", trickId);

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
      await supabase
        .from("user_favorites")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic");
      await supabase.from("trick_tags").delete().eq("trick_id", trickId);
      await supabase.from("trick_categories").delete().eq("trick_id", trickId);
      await supabase.from("trick_techniques").delete().eq("trick_id", trickId);
      await supabase.from("trick_gimmicks").delete().eq("trick_id", trickId);
      await supabase.from("trick_photos").delete().eq("trick_id", trickId);
      await supabase.from("scripts").delete().eq("trick_id", trickId);
      await supabase
        .from("shared_content")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic_trick");

      // 4. Finalmente, eliminar el registro del truco
      const { error } = await supabase
        .from("magic_tricks")
        .delete()
        .eq("id", trickId);
      if (error) throw error;

      console.log("✅ Truco y archivos eliminados completamente");
      return true;
    } catch (error) {
      console.error("Error deleting trick:", error);
      // Encolar para retry
      await offlineQueueService.enqueue({
        userId: user.id,
        type: "delete_trick",
        payload: { trickId },
      });
      return false;
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
