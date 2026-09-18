/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mesma paleta do app mobile (src/app/(tabs)/index.tsx e afins) —
        // ver comentário em globals.css.
        background: "#0B0B0E",
        card: "#161520",
        border: "#232230",
        pink: "#E1306C",
        purple: "#7E57C2",
        safe: "#4CAF7D",
        gold: "#FFD54F",
      },
    },
  },
  plugins: [],
};
