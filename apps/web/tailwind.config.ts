import type { Config } from 'tailwindcss';

// To'Latino design tokens — from docs/design-system/HANDOFF.md → "Design Tokens".
// Components must consume these named tokens; never raw hex in JSX.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B61FF', // brand purple — CTAs, active states, accents
          dark: '#6D4DF6', // hover / text on lilac
          press: '#6743E2', // pressed / text on white-over-purple
          soft: '#9B85FF', // lighter purple — logo/text on the dark admin sidebar
        },
        ink: {
          DEFAULT: '#1E1B2E', // headlines, strong text, dark buttons
          2: '#6E6A85', // secondary text
          3: '#5A5570', // paragraphs
          body: '#3A3650', // post body text
          soft: '#4A4660', // mid-tone labels
        },
        muted: {
          DEFAULT: '#8A86A0', // metadata, placeholders
          2: '#9A96AE',
          faint: '#B7B3C6', // disabled, counters
          faint2: '#B0ACC0',
        },
        amber: { DEFAULT: '#F4B740', ink: '#9A6A12', bg: '#FCEFD6' }, // brand diamond, stars, price/soon badges
        green: { DEFAULT: '#1F9D57', dark: '#1F8A4C', bg: '#E3F5EA' }, // open, verified, success
        pink: { DEFAULT: '#F0466E', dark: '#D6336C', bg: '#FDE7EF' }, // like, notif badge, logout
        blue: { DEFAULT: '#2F6FED', bg: '#E5EFFB' }, // "Mi barrio", info links
        lilac: { DEFAULT: '#EFEBFF', 2: '#F1EFFA', 3: '#F3F0FF', line: '#E7E3F4', ring: '#DCD4FA' }, // chips, avatars, soft bg
        app: '#F4F2F9', // app viewport background
        dash: '#E7E5EC', // dashboard background
        teal: { DEFAULT: '#0E9384', bg: '#D6F3EF' }, // poll tag
        // ── Landing pública v3 (handoff "ToLatino Home", variante B, 2026-07-29) ──
        // Superficies oscuras e inmersivas que antes no existían en el sistema.
        night: {
          DEFAULT: '#120F20', // fondo del hero y del pie
          band: '#151124',    // banda oscura de eventos
        },
        // Morados para leer SOBRE oscuro (los de `primary` no contrastan ahí).
        'primary-on-dark': '#A48CFF', // wordmark sobre fondo oscuro
        'primary-pale': '#C9B6FF',    // inicio del degradado del titular, iconos en oscuro
        rose: { DEFAULT: '#D6336C', deep: '#B0357E' }, // restaurantes, fecha, fin del degradado
        page: '#FBFAFE',   // fondo de la landing (más claro que `app`)
        mint: '#7BE0A8',   // ticks y precios "Gratis" sobre oscuro
        sky: '#8FC5F5',    // icono bilingüe del hero
      },
      borderColor: {
        hair: 'rgba(30,27,46,.08)', // subtle card borders / dividers
        'hair-strong': 'rgba(30,27,46,.12)',
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '12px',
        'btn-lg': '14px',
        card: '20px',
        'card-sm': '18px',
        panel: '24px',
        tile: '14px',
        field: '11px',
      },
      boxShadow: {
        card: '0 6px 20px rgba(60,50,110,.06)',
        'card-lg': '0 8px 26px rgba(60,50,110,.07)',
        cta: '0 14px 28px rgba(123,97,255,.4)',
        'cta-sm': '0 6px 14px rgba(123,97,255,.3)',
        modal: '0 30px 70px rgba(30,27,46,.35)',
        sheet: '0 -20px 50px rgba(30,27,46,.3)',
        pop: '0 20px 50px rgba(30,27,46,.22)',
        band: '0 18px 44px rgba(95,67,214,.26)',
      },
      screens: {
        // Handoff breakpoints: móvil ≤767, tablet 768–1023, escritorio ≥1024
        md: '768px',
        lg: '1024px',
      },
    },
  },
  plugins: [],
};

export default config;
