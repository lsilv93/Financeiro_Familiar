import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fg: "var(--fg)",
        lime: { DEFAULT: "var(--accent)", hover: "var(--accent-hover)" },
        gold: { DEFAULT: "var(--gold)", label: "var(--gold-label)" },
        danger: { DEFAULT: "var(--danger)", light: "var(--danger-light)" },
        ink: "#000E19",
        t2: "var(--t2)",
        t3: "var(--t3)",
        t4: "var(--t4)",
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
