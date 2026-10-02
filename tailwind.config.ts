import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0A1B29",
        lime: { DEFAULT: "#BEF91B", hover: "#D4FF5E" },
        gold: { DEFAULT: "#E8C547", label: "#C8A94A" },
        danger: { DEFAULT: "#FF6B6B", light: "#FFC9C9" },
        ink: "#000E19",
        t2: "#A8BAC7",
        t3: "#8DA0B3",
        t4: "#6F8496",
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
