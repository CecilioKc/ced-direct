import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pvamu: {
          purple: '#4F2D7F',
          'purple-dark': '#3a1f60',
          'purple-light': '#6b42a8',
          gold: '#FFB81C',
          'gold-dark': '#e6a100',
          'gold-light': '#ffd166',
        },
      },
    },
  },
  plugins: [],
}

export default config
