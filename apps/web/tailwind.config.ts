import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        border: "var(--border)",
        blue: {
          DEFAULT: "var(--blue)",
          bright: "var(--blue-bright)",
          soft: "var(--blue-soft)",
          ink: "var(--blue-ink)",
        },
        green: {
          DEFAULT: "var(--green)",
          soft: "var(--green-soft)",
          ink: "var(--green-ink)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
          ink: "var(--amber-ink)",
        },
        red: {
          DEFAULT: "var(--red)",
          soft: "var(--red-soft)",
          ink: "var(--red-ink)",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        sm: "var(--shadow)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
} satisfies Config;
