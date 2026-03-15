import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './game/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // SNES-inspired retro gaming color palette
      colors: {
        // Deep blues (main background)
        retro: {
          dark: '#0d0d1a',
          darker: '#080810',
          navy: '#1a1a2e',
          blue: '#16213e',
        },
        // Bomberman character colors
        bomber: {
          white: '#f8f8f8',
          black: '#2d2d2d',
          red: '#e6194b',
          blue: '#0082c8',
          green: '#3cb44b',
          yellow: '#ffe119',
          pink: '#f032e6',
          orange: '#f58231',
          purple: '#911eb4',
          cyan: '#46f0f0',
        },
        // UI accent colors
        accent: {
          gold: '#ffd700',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
          fire: '#ff4500',
          electric: '#00ff88',
        },
        // Game elements
        game: {
          wall: '#4a4a6a',
          block: '#8b6914',
          ground: '#2a2a3a',
          bomb: '#1a1a1a',
          explosion: '#ff6600',
          powerup: '#00ffcc',
        },
      },
      // Pixel-perfect font families
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        retro: ['"VT323"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
      },
      // Retro-style animations
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-pixel': 'bounce-pixel 0.5s steps(4) infinite',
        'flash': 'flash 0.3s steps(2) infinite',
        'shake': 'shake 0.3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'bounce-pixel': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px #ffd700, 0 0 10px #ffd700' },
          '100%': { boxShadow: '0 0 20px #ffd700, 0 0 30px #ffd700' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      // Pixel-perfect spacing
      spacing: {
        'tile': '32px',
        'tile-sm': '16px',
        'tile-lg': '64px',
      },
      // Retro border radius (minimal for pixel look)
      borderRadius: {
        'pixel': '2px',
        'pixel-lg': '4px',
      },
      // Game board dimensions
      width: {
        'board': '480px', // 15 tiles * 32px
      },
      height: {
        'board': '416px', // 13 tiles * 32px
      },
      // Drop shadows with pixel aesthetic
      dropShadow: {
        'pixel': '2px 2px 0 rgba(0, 0, 0, 0.8)',
        'pixel-lg': '4px 4px 0 rgba(0, 0, 0, 0.8)',
        'glow-gold': '0 0 10px rgba(255, 215, 0, 0.5)',
        'glow-fire': '0 0 10px rgba(255, 69, 0, 0.5)',
      },
      // Retro box shadows
      boxShadow: {
        'pixel': '2px 2px 0 0 rgba(0, 0, 0, 0.8)',
        'pixel-lg': '4px 4px 0 0 rgba(0, 0, 0, 0.8)',
        'pixel-inset': 'inset 2px 2px 0 0 rgba(255, 255, 255, 0.1), inset -2px -2px 0 0 rgba(0, 0, 0, 0.3)',
        'retro-button': '4px 4px 0 0 rgba(0, 0, 0, 0.8), inset 2px 2px 0 0 rgba(255, 255, 255, 0.2)',
        'retro-card': '0 0 0 2px #1a1a2e, 4px 4px 0 0 rgba(0, 0, 0, 0.5)',
      },
      // Background images for retro patterns
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'scanlines': 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
    },
  },
  plugins: [],
};

export default config;
