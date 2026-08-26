/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-dark': '#0B1F44',
        'accent-blue': '#A8D8F0',
      }
    },
  },
  plugins: [],
}