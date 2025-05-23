import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Neutrals
        "neutral-white": "#FFFFFF",
        "neutral-lightest": "#F2F2F2",
        "neutral-lighter": "#D8D8D8",
        "neutral-light": "#B2B2B2",
        neutral: "#7F7F7F",
        "neutral-dark": "#4C4C4C",
        "neutral-darker": "#191919",
        "neutral-darkest": "#000000",

        // Blue Ribbon
        "blue-ribbon-lightest": "#E9EBFE",
        "blue-ribbon-lighter": "#D3D7FD",
        "blue-ribbon-light": "#6574F8",
        "blue-ribbon": "#2339F6",
        "blue-ribbon-dark": "#1C2DC4",
        "blue-ribbon-darker": "#0E1662",
        "blue-ribbon-darkest": "#0A1149",

        // Tree Poppy
        "tree-poppy-lightest": "#FFF4E8",
        "tree-poppy-lighter": "#FFE9D1",
        "tree-poppy-light": "#FFB260",
        "tree-poppy": "#FF921D",
        "tree-poppy-dark": "#CC7417",
        "tree-poppy-darker": "#663A0B",
        "tree-poppy-darkest": "#4C2B08",

        // Semantic colors
        success: "#4CAF50",
        warning: "#FFB260",
        error: "#FF5757",

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
