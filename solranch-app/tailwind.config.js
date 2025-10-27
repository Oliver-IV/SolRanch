/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'solana-purple': '#9945FF',
        'solana-cyan': '#14F195',
        'solana-purple-dark': '#7a37cc',
        'solana-cyan-dark': '#0dbf7f',
        'brand-background': '#f8f9fa',
        'brand-text': '#2c3e50',
        'brand-text-light': '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}