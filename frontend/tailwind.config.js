/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf9",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#0ea57a", // Primary brand green/teal
          600: "#0d946e",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        risk: {
          low: {
            bg: "#ecfdf5",
            text: "#065f46",
            border: "#a7f3d0",
            badge: "#10b981",
          },
          moderate: {
            bg: "#fffbeb",
            text: "#92400e",
            border: "#fde68a",
            badge: "#f59e0b",
          },
          high: {
            bg: "#fff1f2",
            text: "#9f1239",
            border: "#fecdd3",
            badge: "#f43f5e",
          },
          critical: {
            bg: "#450a0a",
            text: "#fecaca",
            border: "#b91c1c",
            badge: "#dc2626",
          }
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      }
    },
  },
  plugins: [],
}
