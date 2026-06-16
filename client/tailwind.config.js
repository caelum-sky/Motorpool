/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // BukSU brand: maroon primary, gold accent
        buksu: {
          maroon: "#7B1C1C",
          "maroon-dark": "#5A1313",
          "maroon-light": "#A52828",
          gold: "#C9A227",
          "gold-light": "#E8C255",
          cream: "#FDF6E3",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
