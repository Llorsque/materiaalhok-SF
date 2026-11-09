// v2: 'accent' volgt de branding-kleur uit Instellingen (CSS-variabele
// --accent, gezet in App.jsx). Zo past de hele app zich aan één kleur aan.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}
