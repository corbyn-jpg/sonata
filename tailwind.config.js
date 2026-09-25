/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      backgroundColor: {
        canvas: '#08050d',
        surface: '#110521',
        'surface-raised': '#291F35',
      },
      textColor: {
        primary: '#f3ebfa',
        secondary: '#c2bfd6',
        muted: '#9f9ead',
      },
      borderColor: {
        DEFAULT: '#493461',
      },
      colors: {
        violet: { 200: '#C9BFFB', 500: '#8B5CF6', 700: '#5B34B8' },
        teal: { 300: '#7EE4CE', 700: '#0B7A6E' },
      },
      fontSize: {
        caption: ['13px', '21px'],
        body: ['16px', '26px'],
        h4: ['20px', '26px'],
        h3: ['25px', '33px'],
        h2: ['31px', '40px'],
        h1: ['39px', '51px'],
      },
      borderRadius: {
        card: '16px',
        pill: '28px',
      },
    },
  },
  plugins: [],
};