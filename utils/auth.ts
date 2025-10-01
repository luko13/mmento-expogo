// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

let mmkvAvailable = false;
let mmkv: any;

try {
  // Carga dinámica para evitar romper web/tests y capturar errores de JSI o arquitectura
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require("react-native-mmkv");
  // El constructor puede lanzar si no hay JSI (debug remoto) o si la arch. nueva no está activa.
  mmkv = new MMKV({ id: "mmento-storage" });
  // Pequeña sonda para verificar que realmente podemos usarlo
  mmkv.set("mmkv_probe", "1");
  mmkvAvailable = mmkv.getString("mmkv_probe") === "1";
  if (mmkvAvailable) mmkv.delete("mmkv_probe");
} catch (_e) {
  mmkvAvailable = false;
}

// --- API de bajo nivel (clave/valor) ---
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

// --- Helpers específicos que ya usa tu auth.ts ---
const AUTH_TOKEN_KEY = "authToken";

export const getAuthToken = async (): Promise<string | null> => {
  return storage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = async (token: string): Promise<void> => {
  await storage.setItem(AUTH_TOKEN_KEY, token);
};

export const removeAuthToken = async (): Promise<void> => {
  await storage.removeItem(AUTH_TOKEN_KEY);
};
