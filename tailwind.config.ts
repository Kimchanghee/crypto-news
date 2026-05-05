import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Claude / Anthropic brand
        ink: '#141413',
        paper: '#faf9f5',
        muted: '#b0aea5',
        soft: '#e8e6dc',
        accent: {
          orange: '#d97757',
          blue: '#6a9bcc',
          green: '#788c5d'
        }
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'Arial', 'sans-serif'],
        body: ['Lora', 'Georgia', 'serif']
      },
      maxWidth: {
        prose: '68ch'
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#141413',
            a: { color: '#d97757' }
          }
        }
      }
    }
  },
  plugins: []
};

export default config;
