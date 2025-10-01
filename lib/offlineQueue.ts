// lib/offlineQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../lib/supabase";

const NS = "mmento:v1";
function qKey(userId: string) {
  return `${NS}:queue:${userId}`;
}

type MutationItem = {
  id: string; // uuid
  at: number;
  table: "magic_tricks";
  op: "update" | "delete" | "update_is_public";
  payload: any; // { trickId, data? }
};

export async function enqueue(userId: string, item: MutationItem) {
  const raw = await AsyncStorage.getItem(qKey(userId));
  const list: MutationItem[] = raw ? JSON.parse(raw) : [];
  list.push(item);
  await AsyncStorage.setItem(qKey(userId), JSON.stringify(list));
}

export async function flushQueue(userId: string) {
  const raw = await AsyncStorage.getItem(qKey(userId));
  const list: MutationItem[] = raw ? JSON.parse(raw) : [];
  if (!list.length) return;

  const remaining: MutationItem[] = [];
  for (const m of list) {
    try {
      if (m.table === "magic_tricks") {
        if (m.op === "delete") {
          const { error } = await supabase
            .from("magic_tricks")
            .delete()
            .eq("id", m.payload.trickId);
          if (error) throw error;
        } else if (m.op === "update_is_public") {
          const { error } = await supabase
            .from("magic_tricks")
            .update({
              is_public: m.payload.isPublic,
              updated_at: new Date().toISOString(),
            })
            .eq("id", m.payload.trickId);
          if (error) throw error;
        } else if (m.op === "update") {
          const { trickId, data } = m.payload;
          const { error } = await supabase
            .from("magic_tricks")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", trickId);
          if (error) throw error;

          // Relaciones: si hace falta, reprocesa (tags, cat, etc.) con más llamadas aquí
        }
      }
    } catch {
      remaining.push(m); // aún falla → mantener en cola
    }
  }
  await AsyncStorage.setItem(qKey(userId), JSON.stringify(remaining));
}

// Observa la red y dispara flush
let sub: any;
export function startQueueWatcher(userId: string) {
  stopQueueWatcher();
  sub = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await flushQueue(userId);
    }
  });
}
export function stopQueueWatcher() {
  if (sub) sub();
  sub = null;
}
