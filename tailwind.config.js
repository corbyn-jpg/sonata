const c = require('./src/theme/colours');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      backgroundColor: { canvas: c.canvas, surface: c.surface, 'surface-raised': c.surfaceRaised },
      textColor: { primary: c.textPrimary, secondary: c.textSecondary, muted: c.textMuted },
      borderColor: { DEFAULT: c.border },
      colors: { violet: c.violet, teal: c.teal },
      fontFamily: {
        mono: ['DMMono_400Regular'],
        'mono-medium': ['DMMono_500Medium'],
        sans: ['Roboto_400Regular'],
        'sans-medium': ['Roboto_500Medium'],
        'sans-bold': ['Roboto_700Bold'],
      },
      fontSize: {
        caption: ['13px', '21px'],
        body: ['16px', '26px'],
        h4: ['20px', '26px'],
        h3: ['25px', '33px'],
        h2: ['31px', '40px'],
        h1: ['39px', '51px'],
      },
      borderRadius: { card: '16px', pill: '28px' },
    },
  },
  plugins: [],
};