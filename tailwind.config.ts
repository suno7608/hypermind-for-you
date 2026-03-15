import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        omega: "#6c5ce7",
        psi: "#e17055",
        arbiter: "#0984e3",
        delta: "#00b894",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
