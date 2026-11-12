/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#0F766E',
          hover: '#0D9488',
          dark: '#115E59',
          light: '#F0FDFA',
          muted: '#CCFBF1',
        },
        ink: '#0F172A',
        body: '#334155',
        muted: '#64748B',
        canvas: '#F4F7F6',
        surface: '#FFFFFF',
        line: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.06), 0 8px 24px rgb(15 23 42 / 0.04)',
        pop: '0 16px 40px rgb(15 23 42 / 0.12)',
      },
      borderRadius: {
        card: '12px',
        control: '10px',
      },
    },
  },
  plugins: [],
}
