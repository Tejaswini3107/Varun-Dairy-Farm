import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Subscribe to realtime events from the orders table
export function subscribeToOrders(
  onUpdate: (payload: unknown) => void
) {
  return supabase
    .channel("orders-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "Order" }, onUpdate)
    .subscribe();
}

export function subscribeToInventory(onUpdate: (payload: unknown) => void) {
  return supabase
    .channel("inventory-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "Inventory" }, onUpdate)
    .subscribe();
}
