/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { 
        'sans': ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        'ibm-plex': ['IBM Plex Sans', 'sans-serif'] 
      },
      colors: { brandbg: '#F7F0E0' },
    },
  },
  plugins: [],
};

