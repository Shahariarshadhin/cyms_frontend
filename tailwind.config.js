/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf4",
          100: "#d7f9e3",
          200: "#b1f1cb",
          300: "#7ce4ac",
          400: "#42cf87",
          500: "#1db56b",
          600: "#129256",
          700: "#127548",
          800: "#135c3b",
          900: "#124c32",
        },
      },
    },
  },
  plugins: [],
};
