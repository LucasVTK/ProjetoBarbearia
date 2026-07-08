import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // A escala zinc aponta para variáveis CSS (definidas em index.css):
        // o tema claro é só uma reatribuição de variáveis via [data-theme],
        // sem precisar de prefixo dark: em cada classe do app.
        // O formato "rgb(var / <alpha-value>)" preserva os modificadores
        // de opacidade (ex: bg-zinc-800/50).
        zinc: {
          50:  'rgb(var(--z-50) / <alpha-value>)',
          100: 'rgb(var(--z-100) / <alpha-value>)',
          200: 'rgb(var(--z-200) / <alpha-value>)',
          300: 'rgb(var(--z-300) / <alpha-value>)',
          400: 'rgb(var(--z-400) / <alpha-value>)',
          500: 'rgb(var(--z-500) / <alpha-value>)',
          600: 'rgb(var(--z-600) / <alpha-value>)',
          700: 'rgb(var(--z-700) / <alpha-value>)',
          800: 'rgb(var(--z-800) / <alpha-value>)',
          900: 'rgb(var(--z-900) / <alpha-value>)',
          950: 'rgb(var(--z-950) / <alpha-value>)',
        },
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
