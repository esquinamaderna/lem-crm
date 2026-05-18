import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#c9a227',
          dim: '#8a6d15',
          bg: 'rgba(201,162,39,0.08)',
        },
        surface: '#171717',
        card: '#1e1e1e',
        card2: '#242424',
        lem: {
          vacuno: '#c0392b',
          cerdo: '#e07a2b',
          pollo: '#c9a227',
          papas: '#4caf7d',
          jumbalay: '#9b72d4',
          packs: '#5b9bd5',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        mono: ['"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
