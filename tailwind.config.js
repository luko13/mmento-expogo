/** @type {import('tailwindcss').Config} */
module.exports = {
  // Cambia 'class' por 'media' - React Native no soporta dark mode basado en clases
  darkMode: ["media"],
  
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}",
    // Simplifica este patrón - no necesitas mdx en RN
    "./*.{js,ts,jsx,tsx}"
  ],
  
  theme: {
    extend: {
      // Las variables CSS no funcionan en React Native
      // Usa valores directos en su lugar
      colors: {
        border: "#e5e7eb",
        input: "#f3f4f6",
        ring: "#3b82f6",
        background: "#ffffff",
        foreground: "#111827",
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f3f4f6",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#f3f4f6",
          foreground: "#111827",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
      },
      borderRadius: {
        // React Native no soporta calc() ni var()
        lg: 12,
        md: 8,
        sm: 4,
      },
      fontFamily: {
        // Cambia los nombres de las fuentes para que coincidan con cómo las registras en Expo
        sans: ["Outfit_400Regular"],
        outfit: ["Outfit_400Regular"],
        "outfit-bold": ["Outfit_700Bold"],
      },
    },
  },
  plugins: [],
}