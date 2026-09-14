/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Deep zinc/obsidian
        surface: {
          DEFAULT: '#18181b',
          subtle: '#121215',
          border: '#27272a',
          hover: '#27272a'
        },
        accent: {
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
