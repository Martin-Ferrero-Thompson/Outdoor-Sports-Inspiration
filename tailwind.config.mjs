/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Chakra Petch", "sans-serif"],
        body: ["Sora", "sans-serif"]
      },
      colors: {
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        surface: "var(--color-surface)",
        bg: "var(--color-bg)",
        accent1: "var(--color-accent-1)",
        accent2: "var(--color-accent-2)",
        ring: "var(--color-ring)"
      },
      boxShadow: {
        panel: "0 20px 40px -30px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};
