import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f5fb',
          100: '#dce8f5',
          200: '#bcd3ea',
          300: '#8fb4d9',
          400: '#5b8cc4',
          500: '#3a6daa',
          600: '#2d568e',
          700: '#284773',
          800: '#1d3557',
          900: '#16294a',
          950: '#0d1b33',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcddff',
          300: '#8ec6ff',
          400: '#59a8ff',
          500: '#3187fb',
          600: '#1b67ef',
          700: '#1452d4',
          800: '#1744ab',
          900: '#183c87',
          950: '#13264f',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(13 27 51 / 0.06), 0 1px 2px -1px rgb(13 27 51 / 0.06)',
        'card-hover':
          '0 4px 12px 0 rgb(13 27 51 / 0.10), 0 2px 4px -1px rgb(13 27 51 / 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
