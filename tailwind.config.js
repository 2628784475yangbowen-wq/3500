/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './frontend/src/**/*.{html,ts}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#16211f',
        paper: '#f8f3e8',
        moss: '#526b4f',
        tide: '#1f766d',
        clay: '#c66b3d',
        wheat: '#ead9ae'
      },
      boxShadow: {
        calm: '0 18px 60px rgba(22, 33, 31, 0.13)'
      }
    }
  },
  plugins: []
};
