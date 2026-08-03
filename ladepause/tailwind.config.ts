import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tesla-røde / neutrale toner til et roligt, læsbart udtryk
        brand: {
          DEFAULT: "#0f766e",
          soft: "#ccfbf1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
