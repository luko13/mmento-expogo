// services/trickService.ts
import { supabase } from "../lib/supabase";
import type { MagicTrick } from "../types/magicTrick";

export const trickService = {
  // Obtener datos completos del truco
  async getCompleteTrick(trickId: string): Promise<MagicTrick | null> {
    try {
      // Obtener datos básicos del truco
      const { data: trick, error: trickError } = await supabase
        .from("magic_tricks")
        .select("*")
        .eq("id", trickId)
        .single();

      if (trickError) throw trickError;
      if (!trick) return null;

      // Obtener categoría
      const { data: categoryData } = await supabase
        .from("trick_categories")
        .select("category_id")
        .eq("trick_id", trickId)
        .single();

      // Obtener tags
      const { data: tagsData } = await supabase
        .from("trick_tags")
        .select("tag_id")
        .eq("trick_id", trickId);

      // Obtener técnicas
      const { data: techniquesData } = await supabase
        .from("trick_techniques")
        .select("technique_id")
        .eq("trick_id", trickId);

      // Obtener gimmicks
      const { data: gimmicksData } = await supabase
        .from("trick_gimmicks")
        .select("gimmick_id")
        .eq("trick_id", trickId);

      // Obtener script
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("id, content")
        .eq("trick_id", trickId)
        .single();

      // Construir objeto MagicTrick
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

  // Actualizar is_public
  async updateIsPublic(trickId: string, isPublic: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("magic_tricks")
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq("id", trickId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating is_public:", error);
      return false;
    }
  },

  // Eliminar truco completo
  async deleteTrick(trickId: string): Promise<boolean> {
    try {
      // Eliminar en orden por las foreign keys

      // 1. Eliminar favoritos
      await supabase
        .from("user_favorites")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic");

      // 2. Eliminar tags
      await supabase.from("trick_tags").delete().eq("trick_id", trickId);

      // 3. Eliminar categorías
      await supabase.from("trick_categories").delete().eq("trick_id", trickId);

      // 4. Eliminar técnicas
      await supabase.from("trick_techniques").delete().eq("trick_id", trickId);

      // 5. Eliminar gimmicks
      await supabase.from("trick_gimmicks").delete().eq("trick_id", trickId);

      // 6. Eliminar scripts
      await supabase.from("scripts").delete().eq("trick_id", trickId);

      // 7. Eliminar contenido compartido
      await supabase
        .from("shared_content")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic_trick");

      // 8. Finalmente eliminar el truco
      const { error } = await supabase
        .from("magic_tricks")
        .delete()
        .eq("id", trickId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting trick:", error);
      return false;
    }
  },

  // Actualizar truco completo
  async updateTrick(
    trickId: string,
    trickData: Partial<MagicTrick>
  ): Promise<boolean> {
    try {
      // Actualizar datos principales
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

      // Actualizar categoría
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

      // Actualizar tags
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

      // Actualizar técnicas
      if (trickData.techniqueIds) {
        await supabase
          .from("trick_techniques")
          .delete()
          .eq("trick_id", trickId);

        if (trickData.techniqueIds.length > 0) {
          const techniqueInserts = trickData.techniqueIds.map(
            (techniqueId) => ({
              trick_id: trickId,
              technique_id: techniqueId,
            })
          );
          await supabase.from("trick_techniques").insert(techniqueInserts);
        }
      }

      // Actualizar gimmicks
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

      // Actualizar script
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
      return false;
    }
  },
};
