// services/NetworkMonitorService.ts
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

// ============================================================================
// NETWORK MONITOR SERVICE
// ============================================================================

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

type NetworkListener = (status: NetworkStatus) => void;

class NetworkMonitorService {
  private static instance: NetworkMonitorService;
  private listeners: Set<NetworkListener> = new Set();
  private currentStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };
  private unsubscribe: (() => void) | null = null;

  static getInstance(): NetworkMonitorService {
    if (!NetworkMonitorService.instance) {
      NetworkMonitorService.instance = new NetworkMonitorService();
    }
    return NetworkMonitorService.instance;
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    

    // Get initial state
    const state = await NetInfo.fetch();
    this.updateStatus(state);

    // Subscribe to network changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this.updateStatus(state);
    });

    
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    
  }

  // --------------------------------------------------------------------------
  // STATUS MANAGEMENT
  // --------------------------------------------------------------------------

  private updateStatus(state: NetInfoState): void {
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };

    const wasConnected = this.currentStatus.isConnected;
    const isNowConnected = newStatus.isConnected;

    this.currentStatus = newStatus;

    // Log connection changes
    if (wasConnected !== isNowConnected) {
      console.log(
        `[NetworkMonitor] Connection changed: ${wasConnected ? "ONLINE" : "OFFLINE"} → ${
          isNowConnected ? "ONLINE" : "OFFLINE"
        }`
      );
    }

    // Notify listeners
    this.notifyListeners();
  }

  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  isOnline(): boolean {
    return this.currentStatus.isConnected;
  }

  isOffline(): boolean {
    return !this.currentStatus.isConnected;
  }

  // --------------------------------------------------------------------------
  // LISTENERS
  // --------------------------------------------------------------------------

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("[NetworkMonitor] Error in listener:", error);
      }
    });
  }

  // --------------------------------------------------------------------------
  // UTILS
  // --------------------------------------------------------------------------

  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.subscribe((status) => {
        if (status.isConnected) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

export const networkMonitorService = NetworkMonitorService.getInstance();
