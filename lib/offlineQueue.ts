// lib/offlineQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../lib/supabase";
import type { MagicTrick } from "../types/magicTrick";

const NS = "mmento:v1";
function qKey(userId: string) {
  return `${NS}:queue:${userId}`;
}

// ============================================================================
// TIPOS
// ============================================================================

export type OperationType =
  | "create_trick"
  | "update_trick"
  | "delete_trick"
  | "toggle_favorite"
  | "create_category"
  | "update_category"
  | "delete_category";

export interface QueueOperation {
  id: string; // uuid único de la operación
  userId: string;
  timestamp: number; // momento de creación
  type: OperationType;
  status: "pending" | "syncing" | "failed" | "completed";
  retryCount: number;
  payload: any;
  error?: string;
  localId?: string; // ID temporal para operaciones de creación
}

export interface CreateTrickPayload {
  trick: MagicTrick;
  categoryId?: string;
  tags?: string[];
}

export interface UpdateTrickPayload {
  trickId: string;
  data: Partial<MagicTrick>;
}

export interface DeleteTrickPayload {
  trickId: string;
}

export interface ToggleFavoritePayload {
  trickId: string;
  isFavorite: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  categoryId: string;
  name: string;
  description?: string;
}

export interface DeleteCategoryPayload {
  categoryId: string;
}

// ============================================================================
// OFFLINE QUEUE SERVICE
// ============================================================================

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private syncInProgress = false;
  private listeners: Set<(operations: QueueOperation[]) => void> = new Set();

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  // --------------------------------------------------------------------------
  // QUEUE OPERATIONS
  // --------------------------------------------------------------------------

  async enqueue(operation: Omit<QueueOperation, "id" | "timestamp" | "status" | "retryCount">): Promise<string> {
    const operationId = this.generateId();
    const fullOperation: QueueOperation = {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      status: "pending",
      retryCount: 0,
    };

    const queue = await this.getQueue(operation.userId);
    queue.push(fullOperation);
    await this.saveQueue(operation.userId, queue);

    console.log(`[OfflineQueue] Enqueued operation:`, fullOperation.type);
    this.notifyListeners(operation.userId);

    return operationId;
  }

  async getQueue(userId: string): Promise<QueueOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(qKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("[OfflineQueue] Error reading queue:", error);
      return [];
    }
  }

  async getPendingOperations(userId: string): Promise<QueueOperation[]> {
    const queue = await this.getQueue(userId);
    return queue.filter((op) => op.status === "pending" || op.status === "failed");
  }

  async clearQueue(userId: string): Promise<void> {
    await AsyncStorage.removeItem(qKey(userId));
    this.notifyListeners(userId);
  }

  private async saveQueue(userId: string, queue: QueueOperation[]): Promise<void> {
    await AsyncStorage.setItem(qKey(userId), JSON.stringify(queue));
  }

  private async updateOperation(
    userId: string,
    operationId: string,
    updates: Partial<QueueOperation>
  ): Promise<void> {
    const queue = await this.getQueue(userId);
    const index = queue.findIndex((op) => op.id === operationId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await this.saveQueue(userId, queue);
      this.notifyListeners(userId);
    }
  }

  private async removeOperation(userId: string, operationId: string): Promise<void> {
    const queue = await this.getQueue(userId);
    const filtered = queue.filter((op) => op.id !== operationId);
    await this.saveQueue(userId, filtered);
    this.notifyListeners(userId);
  }

  // --------------------------------------------------------------------------
  // SYNC OPERATIONS
  // --------------------------------------------------------------------------

  async sync(userId: string): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log("[OfflineQueue] Sync already in progress");
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const queue = await this.getQueue(userId);
      const pending = queue.filter((op) => op.status === "pending" || op.status === "failed");

      console.log(`[OfflineQueue] Syncing ${pending.length} operations`);

      for (const operation of pending) {
        try {
          await this.updateOperation(userId, operation.id, { status: "syncing" });

          const success = await this.executeOperation(operation);

          if (success) {
            await this.removeOperation(userId, operation.id);
            successCount++;
            console.log(`[OfflineQueue] ✓ Synced: ${operation.type}`);
          } else {
            throw new Error("Operation execution failed");
          }
        } catch (error: any) {
          console.error(`[OfflineQueue] ✗ Failed: ${operation.type}`, error);
          failedCount++;

          const retryCount = operation.retryCount + 1;
          const maxRetries = 3;

          if (retryCount >= maxRetries) {
            await this.updateOperation(userId, operation.id, {
              status: "failed",
              retryCount,
              error: error.message || "Unknown error",
            });
          } else {
            await this.updateOperation(userId, operation.id, {
              status: "pending",
              retryCount,
              error: error.message || "Unknown error",
            });
          }
        }
      }

      console.log(`[OfflineQueue] Sync completed: ${successCount} success, ${failedCount} failed`);
    } finally {
      this.syncInProgress = false;
    }

    return { success: successCount, failed: failedCount };
  }

  private async executeOperation(operation: QueueOperation): Promise<boolean> {
    switch (operation.type) {
      case "create_trick":
        return this.executeCreateTrick(operation.payload);
      case "update_trick":
        return this.executeUpdateTrick(operation.payload);
      case "delete_trick":
        return this.executeDeleteTrick(operation.payload);
      case "toggle_favorite":
        return this.executeToggleFavorite(operation.payload);
      case "create_category":
        return this.executeCreateCategory(operation.payload);
      case "update_category":
        return this.executeUpdateCategory(operation.payload);
      case "delete_category":
        return this.executeDeleteCategory(operation.payload);
      default:
        console.error("[OfflineQueue] Unknown operation type:", operation.type);
        return false;
    }
  }

  // --------------------------------------------------------------------------
  // EXECUTE OPERATIONS
  // --------------------------------------------------------------------------

  private async executeCreateTrick(payload: CreateTrickPayload): Promise<boolean> {
    const { trick, categoryId, tags } = payload;

    const { data, error } = await supabase
      .from("magic_tricks")
      .insert({
        user_id: trick.user_id,
        title: trick.title,
        effect: trick.effect,
        secret: trick.secret,
        duration: trick.duration,
        reset: trick.reset,
        difficulty: trick.difficulty,
        angles: trick.angles,
        notes: trick.notes,
        special_materials: trick.special_materials,
        is_public: trick.is_public,
        status: trick.status,
        price: trick.price,
        photo_url: trick.photo_url,
        effect_video_url: trick.effect_video_url,
        secret_video_url: trick.secret_video_url,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) return false;

    // Insert category relationship
    if (categoryId) {
      await supabase.from("trick_categories").insert({
        trick_id: data.id,
        category_id: categoryId,
      });
    }

    // Insert tags
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId) => ({
        trick_id: data.id,
        tag_id: tagId,
      }));
      await supabase.from("trick_tags").insert(tagInserts);
    }

    return true;
  }

  private async executeUpdateTrick(payload: UpdateTrickPayload): Promise<boolean> {
    const { trickId, data } = payload;

    const { error } = await supabase
      .from("magic_tricks")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trickId);

    if (error) throw error;

    // Handle relationships if present in data
    if (data.selectedCategoryId !== undefined) {
      await supabase.from("trick_categories").delete().eq("trick_id", trickId);
      if (data.selectedCategoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: data.selectedCategoryId,
        });
      }
    }

    if (data.tags !== undefined) {
      await supabase.from("trick_tags").delete().eq("trick_id", trickId);
      if (data.tags.length > 0) {
        const tagInserts = data.tags.map((tagId) => ({
          trick_id: trickId,
          tag_id: tagId,
        }));
        await supabase.from("trick_tags").insert(tagInserts);
      }
    }

    return true;
  }

  private async executeDeleteTrick(payload: DeleteTrickPayload): Promise<boolean> {
    const { trickId } = payload;

    // Delete all relationships
    await supabase.from("user_favorites").delete().eq("content_id", trickId).eq("content_type", "magic");
    await supabase.from("trick_tags").delete().eq("trick_id", trickId);
    await supabase.from("trick_categories").delete().eq("trick_id", trickId);
    await supabase.from("trick_techniques").delete().eq("trick_id", trickId);
    await supabase.from("trick_gimmicks").delete().eq("trick_id", trickId);
    await supabase.from("trick_photos").delete().eq("trick_id", trickId);
    await supabase.from("scripts").delete().eq("trick_id", trickId);
    await supabase.from("shared_content").delete().eq("content_id", trickId).eq("content_type", "magic_trick");

    // Delete trick
    const { error } = await supabase.from("magic_tricks").delete().eq("id", trickId);
    if (error) throw error;

    return true;
  }

  private async executeToggleFavorite(payload: ToggleFavoritePayload): Promise<boolean> {
    const { trickId, isFavorite } = payload;

    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("content_id", trickId)
        .eq("content_type", "magic");
      if (error) throw error;
    } else {
      // Add to favorites
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("user_favorites").insert({
        user_id: user.id,
        content_id: trickId,
        content_type: "magic",
      });
      if (error) throw error;
    }

    return true;
  }

  private async executeCreateCategory(payload: CreateCategoryPayload): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.from("user_categories").insert({
      user_id: user.id,
      name: payload.name,
      description: payload.description,
    });

    if (error) throw error;
    return true;
  }

  private async executeUpdateCategory(payload: UpdateCategoryPayload): Promise<boolean> {
    const { categoryId, name, description } = payload;

    const { error } = await supabase
      .from("user_categories")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId);

    if (error) throw error;
    return true;
  }

  private async executeDeleteCategory(payload: DeleteCategoryPayload): Promise<boolean> {
    const { categoryId } = payload;

    // Delete category relationships
    await supabase.from("trick_categories").delete().eq("category_id", categoryId);

    // Delete category
    const { error } = await supabase.from("user_categories").delete().eq("id", categoryId);
    if (error) throw error;

    return true;
  }

  // --------------------------------------------------------------------------
  // LISTENERS
  // --------------------------------------------------------------------------

  subscribe(callback: (operations: QueueOperation[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private async notifyListeners(userId: string): Promise<void> {
    const queue = await this.getQueue(userId);
    this.listeners.forEach((callback) => callback(queue));
  }

  // --------------------------------------------------------------------------
  // UTILS
  // --------------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const offlineQueueService = OfflineQueueService.getInstance();

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

export async function enqueue(userId: string, item: any) {
  return offlineQueueService.enqueue({
    userId,
    type: item.op,
    payload: item.payload,
  });
}

export async function flushQueue(userId: string) {
  return offlineQueueService.sync(userId);
}

// Network watcher
let networkSubscription: any;
export function startQueueWatcher(userId: string) {
  stopQueueWatcher();
  networkSubscription = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      console.log("[OfflineQueue] Network connected, syncing...");
      await offlineQueueService.sync(userId);
    }
  });
}

export function stopQueueWatcher() {
  if (networkSubscription) {
    networkSubscription();
    networkSubscription = null;
  }
}
