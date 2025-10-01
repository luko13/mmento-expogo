// lib/localOverrides.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const NS = 'mmento:v1';

function ovKey(userId: string) {
  return `${NS}:overrides:magic_tricks:${userId}`;
}

export type TrickOverride = Record<string, any>;

export async function getTrickOverrides(userId: string): Promise<Record<string, TrickOverride>> {
  try {
    const raw = await AsyncStorage.getItem(ovKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function setTrickOverride(userId: string, trickId: string, patch: TrickOverride) {
  const all = await getTrickOverrides(userId);
  all[trickId] = { ...(all[trickId] || {}), ...patch };
  await AsyncStorage.setItem(ovKey(userId), JSON.stringify(all));
}

export async function removeTrickOverride(userId: string, trickId: string) {
  const all = await getTrickOverrides(userId);
  delete all[trickId];
  await AsyncStorage.setItem(ovKey(userId), JSON.stringify(all));
}

export async function clearTrickOverrides(userId: string) {
  await AsyncStorage.removeItem(ovKey(userId));
}
