/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f5f7f4",
        ink: "#142a28",
        muted: "#5f716d",
        line: "#dfe7e2",
        brand: {
          50: "#eef8f6",
          100: "#d8efeb",
          200: "#b3ded7",
          300: "#82c7bc",
          400: "#4da99d",
          500: "#2f8d80",
          600: "#1f7167",
          700: "#1b5a53",
          800: "#194944",
          900: "#173d39",
        },
        gold: {
          50: "#fbf6ed",
          100: "#f4e7cf",
          500: "#b98a4a",
          600: "#9d7038",
        },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', "Georgia", "serif"],
        sans: ['"Inter"', '"Segoe UI"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 42, 40, 0.06)",
        lift: "0 18px 45px rgba(20, 42, 40, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
