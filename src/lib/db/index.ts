import { memoryStore } from "./memory";
import { supabaseAvailable, supabaseStore } from "./supabase";
import type { Store } from "./types";

export function store(): Store {
  return supabaseAvailable() ? supabaseStore : memoryStore;
}

export * from "./types";
