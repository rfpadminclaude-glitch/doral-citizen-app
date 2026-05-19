import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        // Doral brand anchors (raw hex — use sparingly, prefer semantic tokens)
        doral: {
          blue: '#0066CC',
          'blue-dark': '#003F7D',
          teal: '#0E7C86',
          'teal-light': '#34B7C1',
          gold: '#C8A24B',
          'gold-light': '#E0BC6A',
          ink: '#0F172A'
        },
        // Semantic tokens (driven by CSS variables → automatic dark mode)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          2: 'hsl(var(--surface-2))',
          elevated: 'hsl(var(--surface-elevated))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          foreground: 'hsl(var(--gold-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        sentiment: {
          positive: 'hsl(var(--sentiment-positive))',
          neutral: 'hsl(var(--sentiment-neutral))',
          negative: 'hsl(var(--sentiment-negative))',
          frustrated: 'hsl(var(--sentiment-frustrated))',
          urgent: 'hsl(var(--sentiment-urgent))'
        }
      },
      borderRadius: {
        '2xl': 'var(--radius)',
        xl: 'calc(var(--radius) - 0.25rem)',
        lg: 'calc(var(--radius) - 0.5rem)',
        md: 'calc(var(--radius) - 0.75rem)',
        sm: 'calc(var(--radius) - 0.875rem)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        soft: '0 4px 20px -6px hsl(var(--primary) / 0.18)',
        glass: '0 8px 32px -12px hsl(220 50% 10% / 0.18)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'typing-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-3px)', opacity: '1' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.06)' }
        },
        twinkle: {
          '0%, 100%': { opacity: '0.18' },
          '50%': { opacity: '1' }
        },
        wave: {
          '0%, 60%, 100%': { transform: 'rotate(0deg)' },
          '10%, 30%': { transform: 'rotate(14deg)' },
          '20%, 40%': { transform: 'rotate(-8deg)' }
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.015)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'typing-bounce': 'typing-bounce 1.2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
        wave: 'wave 1.6s ease-in-out 1',
        shimmer: 'shimmer 2.4s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
