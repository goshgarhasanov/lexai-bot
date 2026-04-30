export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af",
        accent:  "#3b82f6",
      },
      keyframes: {
        "slide-in": { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
