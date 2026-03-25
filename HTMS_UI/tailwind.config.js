/** @type {import('tailwindcss').Config} */
export default {
  // Kích hoạt Dark Mode dựa trên class .dark ở thẻ html
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kết nối với biến CSS trong index.css
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Bảng màu Primary Teal của bạn
        primary: {
          DEFAULT: "#0D9488",
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
      },
      fontFamily: {
        sans:  ["Be Vietnam Pro", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["DM Serif Display", "ui-serif", "Georgia", "serif"],
        mono:  ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        orbFloat: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%":     { transform: "translate(20px,-20px)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp .4s ease-out both",
        "orb-float":     "orbFloat 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};