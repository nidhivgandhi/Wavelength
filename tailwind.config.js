/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: '#d9c0f3',
          100: '#684ea6',
          200: '#fffbd6',
          300: '#daaaca',
          400: '#9a6789ff',
        },
        // Secondary/accent colors
        secondary: {
          50: '#1f6475ff',
          100: '#3d8d9c',
          200: '#db8062ff',
          300: '#ecb64bff',
        },
        
        // Custom app-specific colors
        background: {
          light: '#d9c0f3',
          dark: '#684ea6',
        },
        text: {
          primary: '#daaaca',
          secondary: '#fffbd6',
          muted: '#9a6789ff',
        },
      },
      fontFamily: {
        // Heading fonts - Libre Baskerville (elegant serif)
        heading: ['"Libre Baskerville"', 'Georgia', 'serif'],
        // Body text fonts - Lato (warm, professional sans-serif)
        body: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        // Alternative serif for body if needed
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
        // Sans-serif alternative
        sans: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Mobile-optimized font sizes
        'display': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }], // 40px
        'h1': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }], // 32px
        'h2': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0' }], // 24px
        'h3': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0' }], // 20px
        'body-lg': ['1.125rem', { lineHeight: '1.6' }], // 18px
        'body': ['1rem', { lineHeight: '1.5' }], // 16px (base)
        'body-sm': ['0.875rem', { lineHeight: '1.5' }], // 14px
        'caption': ['0.75rem', { lineHeight: '1.4' }], // 12px
      },
      spacing: {
        // Mobile-friendly touch targets and spacing
        '18': '4.5rem', // 72px - good for touch targets
        '22': '5.5rem', // 88px
      },
      borderRadius: {
        // Mobile app-friendly rounded corners
        'card': '1rem', // 16px - cards
        'button': '0.75rem', // 12px - buttons
        'input': '0.5rem', // 8px - input fields
        'full': '9999px', // pills/badges
      },
      boxShadow: {
        // Subtle, mobile-appropriate shadows
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'button-hover': '0 2px 6px rgba(0, 0, 0, 0.15)',
        'input-focus': '0 0 0 3px rgba(154, 103, 137, 0.2)', // using your primary-400 color
        'modal': '0 8px 32px rgba(0, 0, 0, 0.16), 0 4px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
