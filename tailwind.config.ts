import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: { soft: "#dcecf5" },
        cream: { DEFAULT: "#fbf5e3", deep: "#f3e9cc" },
        ivory: "#fffaf0",
        sage: { DEFAULT: "#8fa886", dark: "#6b8663", light: "#c9d8bf" },
        olive: "#7a8450",
        leaf: "#a9c48a",
        cocoa: { DEFAULT: "#4a3426", soft: "#7a5f4c" },
        gold: "#b8964f",
      },
      fontFamily: {
        display: ['"Nunito"', '"Quicksand"', "ui-rounded", "system-ui", "sans-serif"],
        body: ['"Nunito"', "ui-rounded", "system-ui", "sans-serif"],
      },
      borderRadius: { blob: "2rem" },
      boxShadow: {
        soft: "0 6px 18px rgba(74, 52, 38, 0.10)",
        card: "0 10px 28px rgba(74, 52, 38, 0.12)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { floaty: "floaty 4s ease-in-out infinite", fadeUp: "fadeUp .5s ease both" },
    },
  },
  plugins: [],
};
export default config;
