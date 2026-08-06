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
        green: { DEFAULT: '#1F9D57', dark: '#1F8A4C', bg: '#E3F5EA', bg2: '#EAF6EF', ink: '#176B3A' }, // open, verified, success
        pink: { DEFAULT: '#F0466E', dark: '#D6336C', bg: '#FDE7EF' }, // like, notif badge, logout
        blue: { DEFAULT: '#2F6FED', bg: '#E5EFFB' }, // "Mi barrio", info links
        lilac: { DEFAULT: '#EFEBFF', 2: '#F1EFFA', 3: '#F3F0FF', line: '#E7E3F4', ring: '#DCD4FA' }, // chips, avatars, soft bg
        // ⚠️ `app` NO es el fondo de la app, por mucho que lo diga el nombre.
        // Se midió (2026-08-06): de sus 165 usos, solo 7 eran el lienzo de la
        // página; 104 son el RELLENO de campos de texto y pozos DENTRO de
        // tarjetas y hojas blancas (buscador, «Escribe tu ciudad…», el editor
        // de horario, los formularios de publicar). Por eso «poner el fondo
        // blanco» no es tocar este token: hacerlo borra 104 campos para
        // arreglar 7 fondos. El lienzo vive en `canvas`, aquí abajo.
        app: '#F4F2F9', // relleno de campos y pozos sobre blanco (nombre heredado)
        // EL FONDO de la app. Blanco por decisión del fundador (2026-08-06):
        // «ese gris no me gusta, no se combina bien». En blanco puro una tarjeta
        // blanca ya no se distingue por su relleno, así que la delimita el
        // BORDE (`border-line`, abajo) — el patrón de Yelp y Google Business.
        canvas: '#FFFFFF',
        dash: '#FFFFFF', // el panel comparte lienzo con la app (antes #E7E5EC)
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
        rose: { DEFAULT: '#D6336C', deep: '#B0357E', ink: '#A81E4D' }, // restaurantes, fecha, fin del degradado
        page: '#FBFAFE',   // fondo de la landing (más claro que `app`)
        mint: '#7BE0A8',   // ticks y precios "Gratis" sobre oscuro
        sky: '#8FC5F5',    // icono bilingüe del hero
        // ── Home OFICIAL (handoff "To'Latino — Official Home Page", 2026-08-02) ──
        // Reemplaza los handoffs anteriores de la portada. Estos tonos son los de
        // su tabla de color; los que ya existían arriba no se tocan.
        home: {
          deep: '#5B3FD6',      // inicio del degradado morado de la banda de negocios
          ink: '#56506E',       // subtítulo del hero
          mute: '#7E7A92',       // texto apagado (fila de cuenta, notas)
          ph: '#A9A4BD',        // marcador de posición del buscador
          idx: '#B7B0CE',       // índices 01–06 y marquesina
          badge: '#4A3B8A',     // texto de la insignia "Nuevo · Llegando a…"
          line: '#E2DEF4',      // borde del botón de negocio
          line2: '#E9E5F5',     // borde de la pastilla ES/EN
          tint: '#F5F2FE',      // fondo al pasar el ratón sobre Entrar/Regístrate
        },
        clay: { DEFAULT: '#C26A1A', bg: '#FCE9D6' }, // renta / eventos con boletos
        ocean: { DEFAULT: '#2A6CB0', bg: '#E4EEFB' }, // idioma / "vende"
        jade: '#0E9488',   // comunidad (fila 03)
        slate: '#5B5570',  // avatares neutros del feed
        // ── Alta de usuario (handoff "Onboarding & Auth Flow", 2026-08-02) ──
        auth: {
          panel: '#2A2440',   // degradado del panel de marca (inicio)
          panel2: '#171426',  // degradado del panel de marca (medio)
          line: '#E6E2F2',    // borde de campos y tarjetas
          line2: '#C9C2E6',   // borde al pasar el ratón
          line3: '#D8D2EC',   // punto de radio apagado
          track: '#ECE8F4',   // carril de la barra de progreso
          off: '#CFC7EC',     // botón principal deshabilitado
          soft: '#8B6BFF',    // "Latino" sobre el panel oscuro
          pale: '#B9A6FF',    // iconos sobre el panel oscuro
        },
      },
      borderColor: {
        // DOS papeles distintos, dos tokens — misma lección que `canvas`/`app`:
        //  · `line`  delimita una SUPERFICIE (tarjeta, chip, campo) contra el
        //    lienzo. Con el lienzo en blanco es lo ÚNICO que separa una tarjeta
        //    blanca del fondo, así que tiene que verse: .13 es la zona en la que
        //    trabajan Yelp (~.15) y Google Business (#DADCE0 ≈ .14).
        //  · `hair`  separa filas DENTRO de una superficie. Ahí no hay que
        //    delimitar nada, solo respirar: subirlo llenaría la app de rayas.
        line: 'rgba(30,27,46,.13)', // contorno de tarjetas y superficies
        hair: 'rgba(30,27,46,.08)', // divisores internos
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
