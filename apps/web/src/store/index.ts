import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: "vdf-theme" }
  )
);

interface AuthStore {
  token: string | null;
  user: { id: string; name: string; role: string } | null;
  setAuth: (token: string, user: AuthStore["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem("vdf_token", token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem("vdf_token");
        set({ token: null, user: null });
      },
    }),
    { name: "vdf-auth" }
  )
);
