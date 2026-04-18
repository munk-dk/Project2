import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(222.2 47.4% 11.2%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 47.4% 11.2%)",
        muted: {
          DEFAULT: "hsl(210 40% 96.1%)",
          foreground: "hsl(215.4 16.3% 46.9%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        // Danish party colors
        party: {
          S: "#A82721",     // Socialdemokratiet
          V: "#254F85",     // Venstre
          SF: "#E07EA8",    // SF
          EL: "#9C1F2E",    // Enhedslisten
          RV: "#733280",    // Radikale Venstre
          KF: "#12683C",    // Konservative
          DF: "#EAC73E",    // Dansk Folkeparti
          LA: "#3C5FA8",    // Liberal Alliance
          M: "#8BB8E8",     // Moderaterne
          DD: "#C95A0B",    // Danmarksdemokraterne
          ALT: "#2B8738",   // Alternativet
          default: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
