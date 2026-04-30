/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        smart: {
          ink: "#17211a",
          leaf: "#c9ef6f",
          cream: "#fffdf5",
          moss: "#596452",
        },
      },
      fontFamily: {
        serif: ['Cambria', 'Georgia', '"Times New Roman"', "serif"],
      },
    },
  },
  plugins: [],
};
