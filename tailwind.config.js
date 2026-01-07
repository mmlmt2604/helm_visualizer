/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'helm-bg': '#0d1117',
        'helm-surface': '#161b22',
        'helm-border': '#30363d',
        'helm-text': '#c9d1d9',
        'helm-accent': '#58a6ff',
        'helm-green': '#3fb950',
        'helm-purple': '#a371f7',
        'helm-orange': '#d29922',
        'helm-red': '#f85149',
        'helm-cyan': '#39c5cf',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

