// tailwind.config.ts — Tailwind CSS configuration for AI+NFT Studio
// Custom theme with purple/cyan gradient palette matching the AI+NFT aesthetic.

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary purple palette
        purple: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        // Accent cyan palette
        cyan: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        // Brand colors
        brand: {
          purple: "#9333ea",
          cyan: "#06b6d4",
          dark: "#0f0f1a",
          card: "#1a1a2e",
          border: "#2d2d4e",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #9333ea 0%, #06b6d4 100%)",
        "gradient-dark": "linear-gradient(180deg, #0f0f1a 0%, #1a0533 100%)",
        "gradient-card": "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        "gradient-hero": "radial-gradient(ellipse at top, #1a0533 0%, #0f0f1a 60%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "gradient-x": "gradient-x 4s ease infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          from: { "box-shadow": "0 0 10px #9333ea, 0 0 20px #9333ea" },
          to: { "box-shadow": "0 0 20px #06b6d4, 0 0 40px #06b6d4" },
        },
      },
      boxShadow: {
        "neon-purple": "0 0 15px rgba(147, 51, 234, 0.5)",
        "neon-cyan": "0 0 15px rgba(6, 182, 212, 0.5)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
