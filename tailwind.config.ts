import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f5f0",
        paper: "#fffefa",
        ink: "#242321",
        muted: "#77736c",
        line: "#e9e4da",
        brand: {
          orange: "#d9912f",
          orange2: "#f2c879",
          green: "#648b73",
          red: "#bd765e",
          blue: "#71899a",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
