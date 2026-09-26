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
          50: '#155a6b',
          100: '#3d8d9c',
          200: '#db8062ff',
          300: '#ecb64bff',
        },
        
        // Custom app-specific colors
        background: {
          light: '#...',
          dark: '#...',
        },
        text: {
          primary: '#...',
          secondary: '#...',
          muted: '#...',
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
        // Custom font sizes if needed
        'display': ['...', { lineHeight: '...', letterSpacing: '...' }],
        'h1': ['...', { lineHeight: '...', letterSpacing: '...' }],
        'h2': ['...', { lineHeight: '...', letterSpacing: '...' }],
        'h3': ['...', { lineHeight: '...', letterSpacing: '...' }],
        'body-lg': ['...', { lineHeight: '...' }],
        'body': ['...', { lineHeight: '...' }],
        'body-sm': ['...', { lineHeight: '...' }],
      },
      spacing: {
        // Custom spacing values if needed
      },
      borderRadius: {
        // Custom border radius values
        'card': '...',
        'button': '...',
      },
      boxShadow: {
        // Custom shadows
        'card': '...',
        'button': '...',
      },
    },
  },
  plugins: [],
}
