/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        accent: {
          blue: '#2563eb',
          'blue-dark': '#1d4ed8',
          green: '#059669',
          'green-dark': '#047857',
        },
        // Monarch-inspired report dashboard design tokens.
        monarch: {
          canvas: '#F5F5F3',
          card: '#FFFFFF',
          border: '#E4E3E0',
          'border-strong': '#CFCEC9',
          fill: '#EFEEEB',
          ink: '#171717',
          body: '#404040',
          sub: '#525252',
          muted: '#57534E',
          accent: '#FF5A1F',
        },
        // Strong semantic grade colors (used for the grade underline).
        grade: {
          a: '#16A34A',
          b: '#2563EB',
          c: '#F59E0B',
          d: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
