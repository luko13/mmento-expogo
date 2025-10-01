// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Detección de JSI (si no hay JSI, NO intentamos cargar MMKV) ---
const hasJSI =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).nativeCallSyncHook === "function";

let mmkvAvailable = false;
let mmkv: any;

// Intento de carga de MMKV SOLO si hay JSI
if (hasJSI) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require("react-native-mmkv");
    mmkv = new MMKV({ id: "mmento-storage" });
    // Sonda para verificar que realmente funciona
    mmkv.set("__mmkv_probe", "1");
    mmkvAvailable = mmkv.getString("__mmkv_probe") === "1";
    if (mmkvAvailable) mmkv.delete("__mmkv_probe");
  } catch {
    mmkvAvailable = false;
  }
}

// ---------------- Claves estándar ----------------
const FIRST_TIME_KEY = "isFirstTime";
const AUTH_TOKEN_KEY = "authToken";
const SESSION_KEY = "session";

// ---------------- API base key/value ----------------
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (mmkvAvailable) {
      const v = mmkv.getString(key);
      return v ?? null;
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (mmkvAvailable) {
      mmkv.set(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (mmkvAvailable) {
      mmkv.delete(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },

  async getJSON<T = any>(key: string, fallback: T): Promise<T> {
    const raw = await this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON(key: string, value: any): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  },
};

// ---------------- Helpers que usa tu app ----------------
export const setFirstTimeUser = async (isFirstTime: boolean) => {
  try {
    await storage.setJSON(FIRST_TIME_KEY, isFirstTime);
  } catch (error) {
    console.error("Error setting first time user:", error);
  }
};

export const isFirstTimeUser = async (): Promise<boolean> => {
  try {
    // Si nunca existe la clave, asumimos primera vez = true
    return storage.getJSON<boolean>(FIRST_TIME_KEY, true);
  } catch (error) {
    console.error("Error checking if first time user:", error);
    return true;
  }
};

export const setAuthToken = async (token: string) => {
  try {
    await storage.setItem(AUTH_TOKEN_KEY, token);
    // Marcamos sesión activa
    await storage.setItem(SESSION_KEY, "true");
    return true;
  } catch (error) {
    console.error("Error setting auth token:", error);
    return false;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return storage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

export const removeAuthToken = async () => {
  try {
    await storage.removeItem(AUTH_TOKEN_KEY);
    await storage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Error removing auth token:", error);
  }
};

export const checkSession = async (): Promise<boolean> => {
  try {
    const session = await storage.getItem(SESSION_KEY);
    return session === "true";
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
};
