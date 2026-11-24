/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Built around the logo color (#505CF3); white text passes AA on 500 and up.
        brand: {
          50: '#EEF0FE', 100: '#E0E3FD', 200: '#C6CBFB', 300: '#A3AAF8', 400: '#7B84F5',
          500: '#505CF3', 600: '#3F48DE', 700: '#333BB8', 800: '#2B3194', 900: '#272C75',
        },
      },
    },
  },
  plugins: [],
}