import { supabase } from '../lib/supabase';

export const favoritesService = {
  // Add to favorites
  async addToFavorites(
    userId: string,
    contentId: string,
    contentType: 'magic' | 'gimmick' | 'technique' | 'script'
  ) {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return { success: false, error };
    }
  },

  // Remove from favorites
  async removeFromFavorites(
    userId: string,
    contentId: string,
    contentType: string
  ) {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return { success: false, error };
    }
  },

  // Check if item is favorite
  async isFavorite(
    userId: string,
    contentId: string,
    contentType: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  },

  // Get all favorites for a user
  async getUserFavorites(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
  },

  // Get favorites category ID for user
  async getFavoritesCategoryId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Favoritos')
        .single();

      if (error) {
        // Create favorites category if it doesn't exist
        const { data: newCategory, error: createError } = await supabase
          .from('user_categories')
          .insert({
            user_id: userId,
            name: 'Favoritos',
            description: 'Tus trucos favoritos'
          })
          .select()
          .single();

        if (createError) throw createError;
        return newCategory?.id || null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error getting favorites category:', error);
      return null;
    }
  }
};