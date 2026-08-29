/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2ff",
          100: "#fbe5ff",
          400: "#e14bff",
          500: "#c026f5",
          600: "#9d1cd1",
        },
      },
    },
  },
  plugins: [],
};
