// utils/orderService.ts
import { supabase } from '../lib/supabase';

export interface CategoryOrder {
  user_id: string;
  category_id: string;
  position: number;
}

export interface TrickOrder {
  user_id: string;
  category_id: string;
  trick_id: string;
  position: number;
}

class OrderService {
  private updateTimeout: NodeJS.Timeout | null = null;
  private pendingCategoryUpdates: Map<string, CategoryOrder> = new Map();
  private pendingTrickUpdates: Map<string, TrickOrder> = new Map();

  // Obtener el orden de categorías del usuario
  async getUserCategoryOrder(userId: string): Promise<CategoryOrder[]> {
    const { data, error } = await supabase
      .from('user_category_order')
      .select('*')
      .eq('user_id', userId)
      .order('position');

    if (error) {
      console.error('Error fetching category order:', error);
      return [];
    }

    return data || [];
  }

  // Obtener el orden de trucos para una categoría
  async getUserTrickOrder(userId: string, categoryId: string): Promise<TrickOrder[]> {
    const { data, error } = await supabase
      .from('user_trick_order')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('position');

    if (error) {
      console.error('Error fetching trick order:', error);
      return [];
    }

    return data || [];
  }

  // Obtener todos los órdenes de trucos del usuario
  async getAllUserTrickOrders(userId: string): Promise<TrickOrder[]> {
    const { data, error } = await supabase
      .from('user_trick_order')
      .select('*')
      .eq('user_id', userId)
      .order('category_id, position');

    if (error) {
      console.error('Error fetching all trick orders:', error);
      return [];
    }

    return data || [];
  }

  // Actualizar orden de categorías con debounce
  updateCategoryOrder(userId: string, categoryId: string, newPosition: number) {
    const key = `${userId}-${categoryId}`;
    this.pendingCategoryUpdates.set(key, {
      user_id: userId,
      category_id: categoryId,
      position: newPosition
    });

    this.scheduleUpdate();
  }

  // Actualizar orden de trucos con debounce
  updateTrickOrder(userId: string, categoryId: string, trickId: string, newPosition: number) {
    const key = `${userId}-${categoryId}-${trickId}`;
    this.pendingTrickUpdates.set(key, {
      user_id: userId,
      category_id: categoryId,
      trick_id: trickId,
      position: newPosition
    });

    this.scheduleUpdate();
  }

  // Mover un truco de una categoría a otra
  async moveTrickToCategory(
    userId: string,
    trickId: string,
    fromCategoryId: string,
    toCategoryId: string,
    newPosition: number
  ) {
    try {
      // Si es favoritos, no cambiamos la categoría del truco
      const isFavoritesCategory = await this.isFavoritesCategory(toCategoryId);
      
      if (!isFavoritesCategory) {
        // Actualizar la categoría del truco en trick_categories
        await supabase
          .from('trick_categories')
          .update({ category_id: toCategoryId })
          .eq('trick_id', trickId);
      }

      // Si movemos desde favoritos, eliminar de favoritos
      if (await this.isFavoritesCategory(fromCategoryId)) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('content_id', trickId)
          .eq('content_type', 'magic');
      }

      // Si movemos hacia favoritos, añadir a favoritos
      if (isFavoritesCategory) {
        await supabase
          .from('user_favorites')
          .upsert({
            user_id: userId,
            content_id: trickId,
            content_type: 'magic'
          }, {
            onConflict: 'user_id,content_id,content_type'
          });
      }

      // Eliminar del orden anterior
      await supabase
        .from('user_trick_order')
        .delete()
        .eq('user_id', userId)
        .eq('category_id', fromCategoryId)
        .eq('trick_id', trickId);

      // Añadir al nuevo orden
      this.updateTrickOrder(userId, toCategoryId, trickId, newPosition);

      // Reordenar los trucos restantes en la categoría origen
      await this.reorderTricksInCategory(userId, fromCategoryId);

    } catch (error) {
      console.error('Error moving trick to category:', error);
      throw error;
    }
  }

  // Comprobar si una categoría es "Favoritos"
  private async isFavoritesCategory(categoryId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    if (!data) return false;

    const favoritesNames = ['favoritos', 'favorites', 'favourites', 'favorito', 'favorite', 'favourite'];
    return favoritesNames.includes(data.name.toLowerCase().trim());
  }

  // Reordenar trucos después de eliminar uno
  private async reorderTricksInCategory(userId: string, categoryId: string) {
    const tricks = await this.getUserTrickOrder(userId, categoryId);
    
    // Reordenar con posiciones consecutivas
    const updates = tricks.map((trick, index) => ({
      ...trick,
      position: index
    }));

    // Actualizar en batch
    for (const update of updates) {
      this.pendingTrickUpdates.set(
        `${update.user_id}-${update.category_id}-${update.trick_id}`,
        update
      );
    }

    this.scheduleUpdate();
  }

  // Programar actualización con debounce
  private scheduleUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.flushUpdates();
    }, 1500); // 1.5 segundos de debounce
  }

  // Ejecutar todas las actualizaciones pendientes
  private async flushUpdates() {
    const categoryUpdates = Array.from(this.pendingCategoryUpdates.values());
    const trickUpdates = Array.from(this.pendingTrickUpdates.values());

    this.pendingCategoryUpdates.clear();
    this.pendingTrickUpdates.clear();

    // Actualizar categorías
    if (categoryUpdates.length > 0) {
      const { error } = await supabase
        .from('user_category_order')
        .upsert(categoryUpdates, {
          onConflict: 'user_id,category_id'
        });

      if (error) {
        console.error('Error updating category order:', error);
      }
    }

    // Actualizar trucos
    if (trickUpdates.length > 0) {
      const { error } = await supabase
        .from('user_trick_order')
        .upsert(trickUpdates, {
          onConflict: 'user_id,category_id,trick_id'
        });

      if (error) {
        console.error('Error updating trick order:', error);
      }
    }
  }

  // Inicializar orden para nuevas categorías
  async initializeCategoryOrder(userId: string, categoryId: string) {
    const existingOrder = await this.getUserCategoryOrder(userId);
    const maxPosition = Math.max(...existingOrder.map(o => o.position), -1);

    await supabase
      .from('user_category_order')
      .upsert({
        user_id: userId,
        category_id: categoryId,
        position: maxPosition + 1
      }, {
        onConflict: 'user_id,category_id'
      });
  }

  // Inicializar orden para nuevos trucos (se añaden al principio)
  async initializeTrickOrder(userId: string, categoryId: string, trickId: string) {
    const existingOrder = await this.getUserTrickOrder(userId, categoryId);
    
    // Incrementar posiciones existentes
    for (const order of existingOrder) {
      this.updateTrickOrder(userId, categoryId, order.trick_id, order.position + 1);
    }

    // Añadir el nuevo truco en posición 0
    this.updateTrickOrder(userId, categoryId, trickId, 0);
    
    // Forzar actualización inmediata
    await this.flushUpdates();
  }

  // Limpiar órdenes al eliminar una categoría
  async cleanupCategoryOrder(userId: string, categoryId: string) {
    await supabase
      .from('user_category_order')
      .delete()
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    await supabase
      .from('user_trick_order')
      .delete()
      .eq('user_id', userId)
      .eq('category_id', categoryId);
  }
}

export const orderService = new OrderService();