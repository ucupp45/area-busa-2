/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Trebuchet MS"', '"Lucida Sans Unicode"', '"Lucida Grande"', '"Lucida Sans"', 'Arial', 'sans-serif'],
      },
      colors: {
        'navy-dark': '#0B1F44',
        'accent-blue': '#A8D8F0',
      }
    },
  },
  plugins: [],
}