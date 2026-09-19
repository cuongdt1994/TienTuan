import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171716",
        paper: "#ffffff",
        fog: "#e8e6e0",
        line: "#d9d7d0",
        muted: "#77756f",
      },
      fontFamily: {
        sans: ["Times New Roman", "Times", "serif"],
        display: ["Times New Roman", "Times", "serif"],
      },
      letterSpacing: {
        editorial: "0.16em",
      },
      animation: {
        "fade-up": "fadeUp 700ms cubic-bezier(.22,.61,.36,1) both",
        "fade-in": "fadeIn 700ms ease both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
