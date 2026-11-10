/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        "primary": "rgb(var(--primary) / <alpha-value>)",
        "on-primary": "rgb(var(--on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--on-primary-container) / <alpha-value>)",
        "primary-fixed": "rgb(var(--primary) / <alpha-value>)",
        "secondary": "rgb(var(--secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--on-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--on-secondary-container) / <alpha-value>)",
        "secondary-fixed": "rgb(var(--secondary) / <alpha-value>)",
        "tertiary": "rgb(var(--tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--tertiary-container) / <alpha-value>)",
        "tertiary-fixed-dim": "rgb(var(--tertiary-fixed-dim) / <alpha-value>)",
        "surface": "rgb(var(--surface) / <alpha-value>)",
        "surface-container": "rgb(var(--surface-container) / <alpha-value>)",
        "surface-container-low": "rgb(var(--surface-container-low) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--surface-container-lowest) / <alpha-value>)",
        "surface-container-high": "rgb(var(--surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--surface-container-highest) / <alpha-value>)",
        "surface-bright": "rgb(var(--surface-bright) / <alpha-value>)",
        "surface-variant": "rgb(var(--surface-variant) / <alpha-value>)",
        "on-surface": "rgb(var(--on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--on-surface-variant) / <alpha-value>)",
        "outline": "rgb(var(--outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--outline-variant) / <alpha-value>)",
        "error": "rgb(var(--error) / <alpha-value>)",
        "error-container": "rgb(var(--error-container) / <alpha-value>)",
        "on-error": "rgb(var(--on-error) / <alpha-value>)"
      },
      fontFamily: {
        "headline-sm": ["Inter"],
        "headline-md": ["Inter"],
        "label-sm": ["Inter"],
        "label-mono": ["JetBrains Mono"],
        "label-md": ["Inter"],
        "headline-lg": ["Inter"],
        "body-md": ["Inter"],
        "body-lg": ["Inter"],
        "body-sm": ["Inter"]
      }
    }
  },
  plugins: []
};
