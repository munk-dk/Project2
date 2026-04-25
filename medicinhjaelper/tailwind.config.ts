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
        // Medicinhjælper paletten — grøn for sundhed og opsparing
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        ink: {
          DEFAULT: "#0F172A",
          muted: "#475569",
          subtle: "#64748B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F8FAFC",
          warm: "#FFFBEB",
        },
        line: "#E2E8F0",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // Større som default — målgruppe inkluderer ældre
        base: ["1.0625rem", { lineHeight: "1.6" }],
        lg: ["1.1875rem", { lineHeight: "1.6" }],
        xl: ["1.375rem", { lineHeight: "1.5" }],
        "2xl": ["1.625rem", { lineHeight: "1.4" }],
        "3xl": ["2rem", { lineHeight: "1.3" }],
        "4xl": ["2.5rem", { lineHeight: "1.2" }],
        "5xl": ["3.25rem", { lineHeight: "1.1" }],
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.05)",
        lift: "0 4px 16px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
