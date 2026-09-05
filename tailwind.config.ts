import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // Tablet range (iPad / Android tablet) — phones are below, desktops above.
        tablet: { min: "768px", max: "1279px" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float-up": {
          "0%": {
            transform: "translateY(0) scale(1)",
            opacity: "0.7",
          },
          "50%": {
            opacity: "1",
          },
          "100%": {
            transform: "translateY(-300px) scale(0.3)",
            opacity: "0",
          },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px hsl(var(--primary) / 0.4), 0 0 18px -4px hsl(var(--primary) / 0.4)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px hsl(var(--primary) / 0.65), 0 0 28px 2px hsl(var(--primary) / 0.55)",
          },
        },
        // Fuchsia variant for the multiplayer battle invite banner — no CSS
        // var exists for fuchsia, so rgb values (fuchsia-500) are inlined.
        "glow-pulse-fuchsia": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgb(217 70 239 / 0.4), 0 0 18px -4px rgb(217 70 239 / 0.4)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px rgb(217 70 239 / 0.65), 0 0 28px 2px rgb(217 70 239 / 0.55)",
          },
        },
        // ── Game juice animations (spelling/grammar games) ─────────────────
        // One-shot pop for point badges / banners.
        "pop-in": {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "70%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Horizontal shake for wrong answers.
        "shake-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        // One-shot rise + fade for floating point popups.
        "float-fade": {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "15%": { transform: "translateY(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "translateY(-26px)", opacity: "0" },
        },
        // Escalating pulse for high-streak flames.
        "flame-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
        },
        // Urgency pulse for the timer in its final seconds.
        "urgent-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.12)", opacity: "0.75" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-up": "float-up 3s ease-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-pulse-fuchsia": "glow-pulse-fuchsia 2s ease-in-out infinite",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "shake-x": "shake-x 0.4s ease-in-out",
        "float-fade": "float-fade 1.4s ease-out forwards",
        "flame-pulse": "flame-pulse 1s ease-in-out infinite",
        "urgent-pulse": "urgent-pulse 0.8s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config;
