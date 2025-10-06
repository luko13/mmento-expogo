// context/OfflineSyncContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { networkMonitorService, type NetworkStatus } from "../services/NetworkMonitorService";
import { offlineQueueService, type QueueOperation } from "../lib/offlineQueue";
import { startQueueWatcher, stopQueueWatcher } from "../lib/offlineQueue";

// ============================================================================
// TIPOS
// ============================================================================

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number | null;
  syncError: string | null;
}

interface OfflineSyncContextType extends OfflineSyncState {
  syncNow: () => Promise<void>;
  getPendingOperations: () => Promise<QueueOperation[]>;
  clearSyncError: () => void;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const queueUnsubscribe = useRef<(() => void) | null>(null);

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    console.log("[OfflineSync] Initializing...");

    // Initialize network monitor
    networkMonitorService.initialize();

    // Get current user
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        startQueueWatcher(user.id);
        await updatePendingCount(user.id);
      }
    })();

    // Subscribe to network changes
    networkUnsubscribe.current = networkMonitorService.subscribe((status: NetworkStatus) => {
      const wasOffline = !isOnline;
      const isNowOnline = status.isConnected;

      setIsOnline(isNowOnline);

      // Trigger sync when coming back online
      if (wasOffline && isNowOnline && currentUserId) {
        console.log("[OfflineSync] Network restored, triggering sync...");
        performSync(currentUserId);
      }
    });

    // Subscribe to queue changes
    queueUnsubscribe.current = offlineQueueService.subscribe((operations) => {
      setPendingOperations(operations.filter((op) => op.status === "pending" || op.status === "failed").length);
    });

    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      stopQueueWatcher();
      networkMonitorService.destroy();
      if (networkUnsubscribe.current) networkUnsubscribe.current();
      if (queueUnsubscribe.current) queueUnsubscribe.current();
      appStateSubscription.remove();
    };
  }, []);

  // --------------------------------------------------------------------------
  // APP STATE HANDLING
  // --------------------------------------------------------------------------

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      // When app comes to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("[OfflineSync] App came to foreground");

        // Check network status
        const status = networkMonitorService.getStatus();
        setIsOnline(status.isConnected);

        // Sync if online and have pending operations
        if (status.isConnected && currentUserId) {
          const pending = await offlineQueueService.getPendingOperations(currentUserId);
          if (pending.length > 0) {
            console.log(`[OfflineSync] Found ${pending.length} pending operations, syncing...`);
            performSync(currentUserId);
          }
        }
      }

      appState.current = nextAppState;
    },
    [currentUserId]
  );

  // --------------------------------------------------------------------------
  // SYNC OPERATIONS
  // --------------------------------------------------------------------------

  const performSync = useCallback(async (userId: string) => {
    if (isSyncing) {
      console.log("[OfflineSync] Sync already in progress");
      return;
    }

    if (!networkMonitorService.isOnline()) {
      console.log("[OfflineSync] Cannot sync: offline");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log("[OfflineSync] Starting sync...");
      const result = await offlineQueueService.sync(userId);

      console.log(`[OfflineSync] Sync completed: ${result.success} success, ${result.failed} failed`);

      if (result.failed > 0) {
        setSyncError(`${result.failed} operaciones fallaron`);
      }

      setLastSyncTime(Date.now());
      await updatePendingCount(userId);
    } catch (error: any) {
      console.error("[OfflineSync] Sync error:", error);
      setSyncError(error.message || "Error de sincronización");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const syncNow = useCallback(async () => {
    if (!currentUserId) {
      console.warn("[OfflineSync] No user ID, cannot sync");
      return;
    }

    await performSync(currentUserId);
  }, [currentUserId, performSync]);

  const getPendingOperations = useCallback(async (): Promise<QueueOperation[]> => {
    if (!currentUserId) return [];
    return offlineQueueService.getPendingOperations(currentUserId);
  }, [currentUserId]);

  const updatePendingCount = async (userId: string) => {
    const pending = await offlineQueueService.getPendingOperations(userId);
    setPendingOperations(pending.length);
  };

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const value: OfflineSyncContextType = {
    isOnline,
    isSyncing,
    pendingOperations,
    lastSyncTime,
    syncError,
    syncNow,
    getPendingOperations,
    clearSyncError,
  };

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return context;
}
