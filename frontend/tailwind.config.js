export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d8eeff",
          200: "#b3dcff",
          300: "#80c3ff",
          400: "#4ea5ff",
          500: "#2687ff",
          600: "#1668db",
          700: "#1453ad",
          800: "#17488f",
          900: "#193f77"
        }
      },
      boxShadow: {
        glass: "0 24px 60px rgba(15, 25, 45, 0.25)",
        soft: "0 14px 36px rgba(22, 30, 58, 0.14)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.8s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};