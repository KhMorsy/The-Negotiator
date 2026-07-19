import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: "#FAF5EE",
        terracotta: { DEFAULT: "#C46740", dark: "#A9532F" },
        pine: "#2F4B43",
        apricot: { DEFAULT: "#F2B279", soft: "#FBE8D3" },
        sage: "#DDE8E0",
        ink: "#33291F",
        "muted-warm": "#7A6E60",
        linen: "#F1E8DC",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
