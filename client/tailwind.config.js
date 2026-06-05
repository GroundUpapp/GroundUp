/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette: dark amber + off-white
        ground: {
          // Warm near-black backgrounds
          950: '#140f0a',
          900: '#1b140d',
          800: '#241a11',
          700: '#2f2317',
        },
        amber: {
          // Amber accent ramp (overrides default amber for brand consistency)
          50: '#fff8eb',
          100: '#fdedc8',
          200: '#fad98c',
          300: '#f7c14f',
          400: '#f4a826',
          500: '#e8900d',
          600: '#cc7708',
          700: '#a85b0a',
          800: '#89480f',
          900: '#713c10',
        },
        cream: {
          // Off-white text / surfaces
          50: '#fbf8f1',
          100: '#f6efe1',
          200: '#ede0c9',
          300: '#dcc9a6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,144,13,0.15), 0 8px 24px -8px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
