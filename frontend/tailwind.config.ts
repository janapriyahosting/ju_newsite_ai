import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf8ee',
          100: '#faefd4',
          200: '#f4dca3',
          300: '#eec368',
          400: '#e8a83c',
          500: '#e2911f',
          600: '#c97216',
          700: '#a75415',
          800: '#884218',
          900: '#703718',
          950: '#3d1b09',
        },
        brand: {
          gold:  '#C9A84C',
          dark:  '#1a1a2e',
          light: '#f8f5f0',
        },
      },
      fontFamily: {
        sans:  ['Lato', 'sans-serif'],
        serif: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
