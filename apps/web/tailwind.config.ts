import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal do BarberPro
        brand: {
          50:  '#fff8f0',
          100: '#ffecd3',
          200: '#ffd4a0',
          300: '#ffb563',
          400: '#ff8c20',
          500: '#f97316', // laranja principal
          600: '#ea6c0a',
          700: '#c2530a',
          800: '#9a4210',
          900: '#7c3810',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
