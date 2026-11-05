/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0910',
        charcoal: '#14121E',
        graphite: '#1E1B2E',
        slate: '#2D2842',
        cream: '#F5F2EB',
        paper: '#FAF8F4',
        sand: '#E6E0D4',
        stone: '#9E99AC',
        portrait: {
          amber: '#F1B39C',
          orchid: '#B86BD4',
          plum: '#643179',
          slate: '#5C4577',
          sky: '#7CA6E8',
          indigo: '#344975',
          deep: '#17121F',
        },
        gold: {
          DEFAULT: '#E5A48B',
          light: '#F1B39C',
          dark: '#5C4577',
          muted: 'rgba(241, 179, 156, 0.16)',
        },
      },
      fontFamily: {
        script: ['"Kaushan Script"', '"Dancing Script"', 'cursive'],
        hero: ['"Archivo Black"', '"Anton"', '"Sora"', 'sans-serif'],
        impact: ['"Anton"', '"Archivo Black"', '"Sora"', 'sans-serif'],
        display: ['"Sora"', '"Space Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"Space Grotesk"', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        editorial: '0.2em',
        widest: '0.26em',
      },
      boxShadow: {
        gold: '0 20px 60px -15px rgba(184, 107, 212, 0.28)',
        studio: '0 30px 90px -20px rgba(8, 6, 16, 0.78)',
        editorial: '0 25px 70px -15px rgba(23, 18, 31, 0.14)',
      },
    },
  },
  plugins: [],
};
