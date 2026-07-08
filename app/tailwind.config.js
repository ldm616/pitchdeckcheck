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
          canvas: '#F7F6F4',
          card: '#FFFFFF',
          border: '#E8E5E1',
          fill: '#F2EFED',
          ink: '#171717',
          body: '#3F3A36',
          sub: '#6F6B67',
          muted: '#8C8780',
          accent: '#FF5A1F',
        },
        grade: {
          a: '#2FA66A',
          'a-ink': '#1E7A4B',
          'a-bg': '#E6F4EC',
          'a-border': '#CFE9DB',
          b: '#64748B',
          'b-ink': '#475569',
          'b-bg': '#EEF1F5',
          'b-border': '#DBE1E8',
          c: '#F5A623',
          'c-ink': '#B26A00',
          'c-bg': '#FDF0D9',
          'c-border': '#F5D9A6',
          d: '#E5484D',
          'd-ink': '#C13438',
          'd-bg': '#FBE4E5',
          'd-border': '#F3C6C8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
