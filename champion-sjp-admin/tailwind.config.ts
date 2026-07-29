import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#d81f26", dark: "#a3161b", soft: "#fdecec" },
        ink: "#16181d",
        mut: "#6b7280",
        line: "#e8eaee",
        ok: "#16a34a",
        warn: "#f59e0b",
        bad: "#dc2626",
        info: "#2563eb",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
