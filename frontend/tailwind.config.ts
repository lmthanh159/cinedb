import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#10212b',
          gold: '#e9b949',
          coral: '#ec6f5e',
          mist: '#d8e4ec',
          pine: '#1c5d56',
        },
      },
      boxShadow: {
        panel: '0 24px 60px rgba(16, 33, 43, 0.14)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at top left, rgba(233,185,73,0.28), transparent 35%), radial-gradient(circle at bottom right, rgba(28,93,86,0.2), transparent 35%)',
      },
    },
  },
  plugins: [],
};

export default config;

