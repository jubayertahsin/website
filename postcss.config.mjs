/**
 * Tailwind v4 is a PostCSS plugin and needs no tailwind.config.js: the theme is
 * declared in CSS with @theme, in src/styles/globals.css. That is why there is
 * no config file in this project, and it is not an omission.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
