import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { Order } from "@varun/shared";

interface AuthStore {
  token: string | null;
  user: { id: string; name: string; phone: string; role: string; customerId?: string; staffId?: string } | null;
  setAuth: (token: string, user: AuthStore["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  token: null,
  user: null,
  setAuth: async (token, user) => {
    await SecureStore.setItemAsync("vdf_token", token);
    set({ token, user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("vdf_token");
    set({ token: null, user: null });
  },
}));

interface DeliveryStore {
  currentOrderId: string | null;
  route: Order[];
  summary: { total: number; done: number; pending: number; totalCollection: number } | null;
  setRoute: (orders: Order[], summary: DeliveryStore["summary"]) => void;
  markDelivered: (orderId: string) => void;
  setCurrentOrder: (id: string | null) => void;
}

export const useDeliveryStore = create<DeliveryStore>()((set) => ({
  currentOrderId: null,
  route: [],
  summary: null,
  setRoute: (orders, summary) => set({ route: orders, summary }),
  markDelivered: (orderId) =>
    set((s) => ({
      route: s.route.map((o) => o.id === orderId ? { ...o, status: "delivered" } : o),
      summary: s.summary ? {
        ...s.summary,
        done: s.summary.done + 1,
        pending: Math.max(0, s.summary.pending - 1),
      } : null,
    })),
  setCurrentOrder: (id) => set({ currentOrderId: id }),
}));

interface CustomerStore {
  walletBalance: number;
  setWalletBalance: (b: number) => void;
}

export const useCustomerStore = create<CustomerStore>()((set) => ({
  walletBalance: 0,
  setWalletBalance: (walletBalance) => set({ walletBalance }),
}));
