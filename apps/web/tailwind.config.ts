import type { Config } from "tailwindcss";

/**
 * ToLatino design tokens (from the design-system handoff).
 * Use the NAMED tokens in markup (bg-primary, text-ink, rounded-card, shadow-card),
 * never raw hex. Add new tokens here rather than inlining values.
 * Source of truth: docs/design-system/DESIGN_SYSTEM.md
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand purple
        primary: {
          DEFAULT: "#7B61FF", // primary actions, brand accent
          600: "#6D4DF6",
          700: "#6743E2",
          800: "#5B3FD6", // deepest, gradient end / pressed
        },
        ink: "#1E1B2E", // primary text + dark surfaces (e.g. ticket pass, insights header)
        gold: "#F4B740", // secondary brand accent (Latino wordmark option, premium)
        // Semantic
        success: { DEFAULT: "#1F9D57", soft: "#E3F5EA" },
        warn: { DEFAULT: "#9A6A12", soft: "#FCEFD6" },
        rose: { DEFAULT: "#D6336C", soft: "#FDE7EF" }, // live/active, alerts
        // Text
        muted: { DEFAULT: "#8A86A0", soft: "#9A96AE" },
        // Surfaces
        surface: "#FFFFFF",
        canvas: "#F4F2F9", // app background behind cards
        // Hairlines / dividers (in `colors` so border-hair, border-line AND bg-line resolve)
        hair: "rgba(30,27,46,0.06)", // hairline card border
        line: "rgba(30,27,46,0.10)", // input / divider border
      },
      borderRadius: {
        tile: "12px",
        card: "18px",
        sheet: "22px",
        phone: "42px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(30,27,46,0.06)",
        sheet: "0 -8px 40px rgba(30,27,46,0.16)",
        glow: "0 8px 24px rgba(123,97,255,0.30)",
      },
      fontFamily: {
        // Wired to next/font (Plus Jakarta Sans) via the CSS variable set in app/layout.tsx
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        phone: "392px", // mobile frame width = source of truth
        content: "1320px", // desktop content cap
      },
    },
  },
  plugins: [],
} satisfies Config;
