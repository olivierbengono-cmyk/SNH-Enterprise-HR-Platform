/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        snh: {
          green: {
            DEFAULT: '#008856',
            light: '#00A868',
            dark: '#006644',
          },
          red: {
            DEFAULT: '#EF4123',
            light: '#F25539',
            dark: '#D6321A',
          },
          gold: {
            DEFAULT: '#F4C430',
            light: '#F7D358',
            dark: '#E0B020',
          },
        },
      },
    },
  },
  plugins: [],
};
