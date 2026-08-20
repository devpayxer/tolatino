import type { Config } from 'tailwindcss';

// To'Latino design tokens.
//
// ════════════════════════════════════════════════════════════════════════════
// PASO 1 DE LA MIGRACIÓN AL «Sistema To'Latino» (handoff 2026-08-20).
// ════════════════════════════════════════════════════════════════════════════
// El fundador trajo un sistema de diseño nuevo hecho en Claude Design
// (`design_handoff_tolatino/`: DESIGN_SYSTEM.md + tokens.css + 9 láminas). Su
// orden de migración es: TOKENS → primitivas → chrome → iconos → pantallas.
// Este archivo es el paso 1 entero.
//
// POR QUÉ ESTE PASO SOLO MUEVE ESTE ARCHIVO: se midieron 6.700 usos de clases
// con token (`text-ink`, `bg-primary`, `border-line`…) en 90 archivos. Todos
// son tokens NOMBRADOS, no hex — así que reapuntar los tokens aquí cambia la
// app entera sin tocar una sola pantalla. Eso es lo que hace viable la
// migración: el trabajo ya estaba hecho por haber prohibido el hex en JSX.
//
// LO QUE ESTE PASO **NO** ARREGLA, y se ve: quedan 965 hex crudos dentro de
// componentes (80 × #7B61FF, 61 × #6D4DF6, 60 × #EFEBFF…) que un cambio de
// token no alcanza — colores de avatar, iconos de aviso, degradados de la
// portada, series de gráficas. Ésos son el PASO 2. Hasta entonces convive
// morado viejo con rosa nuevo en algunos sitios; es esperado, no un fallo.
//
// TRES DECISIONES DEL FUNDADOR SIGUEN PENDIENTES y están marcadas abajo con
// «DECISIÓN PENDIENTE»: el color del lienzo, la anatomía de la tarjeta de
// negocio y los slots de la barra inferior.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Acentos POR MÓDULO (sistema nuevo) ──────────────────────────────
        // El cambio conceptual más grande: el color ya no es del botón, es de
        // la SECCIÓN. Un CTA en Comunidad es rosa; el mismo CTA en Negocios es
        // naranja. Hoy nadie los consume todavía — se cablean en el paso 3,
        // cuando las primitivas reciban el módulo por contexto. Se declaran ya
        // para que las pantallas nuevas no inventen su propio color.
        mod: {
          comunidad: '#FF2D6F',
          negocios: '#FF7A1A',
          eventos: '#7C3AED',
          transporte: '#0EA5E9',
          bienes: '#00C48C',
          autos: '#FFB020',
          trabajos: '#4F46E5',
        },
        // Superficies teñidas del sistema (fondos suaves de chips, tarjetas
        // de estado, tiles). Máximo 1–2 por pantalla, dice el handoff.
        tint: {
          pink: '#FFECF2',
          orange: '#FFF1E5',
          purple: '#F3EEFF',
          blue: '#E8F5FF',
          green: '#E6FAF3',
          indigo: '#EEEDFC',
          lilac: '#F1EEFA',
          white: '#FCFBFF',
        },
        // El lienzo del sistema nuevo. DECIDIDO por el fundador el 2026-08-20:
        // «lienzo como el handoff nuevo». Sustituye al #FAFAFA que él mismo
        // había elegido el 08-06 — aquella decisión queda anulada por ésta.
        // `canvas`, `dash` y `page` apuntan aquí abajo al mismo valor.
        paper: '#F6F4FF',
        surface: '#FFFFFF',

        // ── Acento principal ────────────────────────────────────────────────
        // El sistema nuevo NO tiene un morado único: el botón principal es el
        // degradado «Calor» (`bg-calor`, abajo) y el acento sale del módulo.
        // Mientras las primitivas no sepan en qué módulo están (paso 3),
        // `primary` apunta al color que encabeza la marca: el rosa del
        // apóstrofo del logotipo y de la sombra del CTA.
        primary: {
          // MEDIDO, no elegido a ojo. El rosa del handoff (#FF2D6F) con texto
          // BLANCO encima da **3.59** de contraste, por debajo del 4.5 que
          // exige AA — y es el relleno de casi todos los botones de la app
          // («Ver perfil», «Pedir», «Escribir reseña», los chips activos, la
          // barra inferior). El arnés `sistema-paso1.js` lo encontró midiendo
          // lo pintado, no leyendo clases.
          //
          // Éste es EL MISMO rosa con el mismo tono y la misma saturación en
          // OKLCH, un 6% menos claro: 4.54, cumple. La marca no cambia de
          // color, cambia de intensidad — y todas las etiquetas blancas pasan
          // a leerse. El literal del handoff sigue vivo en `mod.comunidad`,
          // para lo que NO lleva texto encima (iconos, puntos, tintes).
          DEFAULT: '#E9005E', // rellenos y acentos
          // Ojo: #FF2D6F sobre blanco da contraste 3.6 — vale para un relleno,
          // NO para texto (`text-primary-dark` se usa 574 veces como texto de
          // acento). Estos dos son las versiones que sí cumplen AA.
          dark: '#C4144C', // 5.9 sobre blanco — texto de acento
          press: '#A80F40', // pulsado
          soft: '#FF7A9E', // acento sobre superficies oscuras
        },
        // ── Tintas ──────────────────────────────────────────────────────────
        // El handoff trae 3 escalones (#16112E · #625B7D · #9A93B3); la app
        // tiene 8 en uso. Los intermedios se interpolan DENTRO de esa familia
        // (violeta-gris) para que todo el texto se lea como un solo sistema en
        // vez de como dos grises distintos conviviendo.
        ink: {
          DEFAULT: '#16112E', // titulares, texto fuerte, botones oscuros
          2: '#625B7D', // texto secundario (valor del handoff)
          3: '#4B4565', // párrafos
          body: '#342F4E', // cuerpo de publicación
          soft: '#403A5A', // etiquetas de tono medio
        },
        muted: {
          // Los dos primeros escalones son TEXTO y los dos cumplen AA sobre
          // blanco (5.2 y 4.6). `muted` sigue siendo el más oscuro de los dos,
          // como siempre — el orden de la escala no se rompe.
          DEFAULT: '#6F6889', // metadatos, marcadores de posición
          // DIVERGENCIA DEL HANDOFF, medida y deliberada: su `ink-3` es
          // #9A93B3, que sobre blanco da 3.0 de contraste. Este token se usa
          // 720 veces como TEXTO (contadores de reseñas, etiquetas del menú
          // inferior, subtítulos), y a 10–12px eso no se lee. Se oscurece hasta
          // 4.6, el mínimo AA. El valor literal del handoff queda en `3`, para
          // iconos y decoración, donde el umbral es otro.
          // 5.2 sobre blanco y 4.55 sobre los tintes. Queda a un punto de
          // `muted`: la franja de gris que se lee de verdad es estrecha, y no
          // se va a fingir una jerarquía con dos grises casi iguales — quien
          // marca jerarquía en esta app es el tamaño y el grosor, no el tono.
          2: '#706987',
          3: '#9A93B3', // (valor del handoff) iconos y decoración, nunca texto
          faint: '#B3ADC7', // deshabilitado, contadores
          faint2: '#ADA7C2',
        },
        // ── Estado (tabla «Status» del handoff), con sus nombres propios ────
        // Los alias viejos (green/amber/blue/pink/rose) siguen justo debajo
        // porque los consumen ~500 clases, pero lo NUEVO se escribe con estos.
        // `verified` importa especialmente: en el sistema el sello de
        // verificado es MORADO, no el acento de marca. Al reapuntar `primary`
        // a rosa, todo lo que decía «verificado» con el morado viejo salió
        // rosa — se corrige en el paso 3 cambiando esas clases a `verified`.
        success: { DEFAULT: '#00A878', bg: '#E6FAF3' },
        warning: { DEFAULT: '#E08A00', bg: '#FFF6E3' },
        error: { DEFAULT: '#E11D48', bg: '#FFECEF' },
        info: { DEFAULT: '#0284C7', bg: '#E8F5FF' },
        verified: { DEFAULT: '#7C3AED', bg: '#F3EEFF' },

        amber: { DEFAULT: '#FFB020', ink: '#8A5A00', bg: '#FFF6E3' }, // estrellas, aviso, "pronto"
        green: { DEFAULT: '#00A878', dark: '#00805E', bg: '#E6FAF3', bg2: '#EFFCF7', ink: '#007A57' }, // abierto, verificado, éxito
        pink: { DEFAULT: '#FF2D6F', dark: '#C4144C', bg: '#FFECF2' }, // me gusta, insignia de avisos
        // `DEFAULT` es para rellenos e iconos (4.1 sobre blanco, insuficiente
        // para texto pequeño); `ink` es el que va en TEXTO.
        blue: { DEFAULT: '#0284C7', ink: '#0369A1', bg: '#E8F5FF' }, // "Mi barrio", información
        // `lilac` es el neutro suave de la app (chips, avatares, pozos): 638
        // usos. Se reapunta a los tintes NEUTROS del sistema, no a los de
        // color — si no, la app se ahoga en rosa.
        lilac: { DEFAULT: '#EEEDFC', 2: '#F1EEFA', 3: '#F3EEFF', line: '#EAE6F5', ring: '#E4DFF2' },
        // ⚠️ `app` NO es el fondo de la app, por mucho que lo diga el nombre.
        // Se midió (2026-08-06): de sus 165 usos, solo 7 eran el lienzo de la
        // página; 104 son el RELLENO de campos de texto y pozos DENTRO de
        // tarjetas y hojas blancas (buscador, «Escribe tu ciudad…», el editor
        // de horario, los formularios de publicar). Por eso «poner el fondo
        // blanco» no es tocar este token: hacerlo borra 104 campos para
        // arreglar 7 fondos. El lienzo vive en `canvas`, aquí abajo.
        app: '#F1EEFA', // relleno de campos y pozos sobre blanco (= `tint.lilac` del sistema)
        // EL FONDO de la app = `paper` del sistema nuevo (fundador, 2026-08-20:
        // «lienzo como el handoff nuevo»). Blanco con tinte lila, no neutro.
        // Historial, porque se pidió cuatro veces: gris lila → casi blanco →
        // blanco puro → blanco cálido (#FCF8F8) → neutro (#FAFAFA) → ESTE.
        //
        // La tarjeta blanca se separa del lienzo por el BORDE (`border-line`),
        // no por el relleno: 29 puntos de luminancia sobre este tono, y el
        // guardián de verify-build lo vigila. Los recuadros siguen SIN sombra
        // (decisión del 08-06); el handoff sí se la pone, y eso se revisa en el
        // paso 3 junto con las primitivas.
        canvas: '#F6F4FF',
        dash: '#F6F4FF', // el panel comparte lienzo con la app
        teal: { DEFAULT: '#00C48C', bg: '#E6FAF3' }, // etiqueta de encuesta (→ acento de Bienes raíces)
        // ── Landing pública v3 (handoff "ToLatino Home", variante B, 2026-07-29) ──
        // Superficies oscuras e inmersivas que antes no existían en el sistema.
        night: {
          DEFAULT: '#120F20', // fondo del hero y del pie
          band: '#151124',    // banda oscura de eventos
        },
        // Morados para leer SOBRE oscuro (los de `primary` no contrastan ahí).
        'primary-on-dark': '#A48CFF', // wordmark sobre fondo oscuro
        'primary-pale': '#C9B6FF',    // inicio del degradado del titular, iconos en oscuro
        rose: { DEFAULT: '#E11D48', deep: '#C4144C', ink: '#A80F40' }, // restaurantes, fecha, error
        // Fondo de la portada. Era #FBFAFE, un blanco FRÍO, y se dejó anotado
        // el 08-06 que al pasar de la portada a la app se notaba un salto de
        // tono. Con el lienzo ahora en `paper` el salto desaparece igualando
        // los dos: la portada y la app son el mismo papel.
        page: '#F6F4FF',
        mint: '#7BE0A8',   // ticks y precios "Gratis" sobre oscuro
        sky: '#8FC5F5',    // icono bilingüe del hero
        // ── Home OFICIAL (handoff "To'Latino — Official Home Page", 2026-08-02) ──
        // Reemplaza los handoffs anteriores de la portada. Estos tonos son los de
        // su tabla de color; los que ya existían arriba no se tocan.
        home: {
          deep: '#5B3FD6',      // inicio del degradado morado de la banda de negocios
          ink: '#56506E',       // subtítulo del hero
          mute: '#6F6889',       // texto apagado (fila de cuenta, notas) — AA 5.2
          ph: '#A9A4BD',        // marcador de posición del buscador
          idx: '#B7B0CE',       // índices 01–06 y marquesina
          badge: '#4A3B8A',     // texto de la insignia "Nuevo · Llegando a…"
          line: '#E2DEF4',      // borde del botón de negocio
          line2: '#E9E5F5',     // borde de la pastilla ES/EN
          tint: '#F5F2FE',      // fondo al pasar el ratón sobre Entrar/Regístrate
        },
        clay: { DEFAULT: '#FF7A1A', bg: '#FFF1E5' }, // renta / boletos (→ acento de Negocios)
        ocean: { DEFAULT: '#0284C7', bg: '#E8F5FF' }, // idioma / "vende"
        jade: '#00C48C',   // comunidad (fila 03)
        slate: '#625B7D',  // avatares neutros del feed
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
        //
        // MIGRACIÓN — DIVERGENCIA DELIBERADA DEL HANDOFF, anotada para no
        // «arreglarla» sin querer: el sistema nuevo trae `line: #EAE6F5`, que
        // sobre nuestro lienzo salta solo 17 puntos de luminancia (el guardián
        // exige 22). Funciona en SU maqueta porque allí las tarjetas SÍ llevan
        // sombra (`shadow-card`, abajo) y el fundador las quitó aquí el
        // 2026-08-06. Se conserva el alfa que sí delimita y se adopta la TINTA
        // nueva (22,17,46). Cuando el paso 3 devuelva la sombra a las tarjetas,
        // se puede bajar a #EAE6F5 — y el guardián lo permitirá entonces.
        line: 'rgba(22,17,46,.13)', // contorno de tarjetas y superficies
        hair: 'rgba(22,17,46,.08)', // divisores internos
        'hair-strong': 'rgba(22,17,46,.12)',
        // Valores literales del handoff, para lo que sí quepa usarlos ya.
        'sys-line': '#EAE6F5',
        'sys-line-strong': '#E4DFF2',
      },
      fontFamily: {
        // Tres familias, tres papeles (regla dura del handoff):
        //  · `font-sans`    Onest — TODA la interfaz: cuerpo, formularios,
        //                   botones, etiquetas. Es la que hereda el `body`.
        //  · `font-display` Bricolage Grotesque — SOLO titulares, precios
        //                   grandes y cifras de héroe. 700–800, tracking −.03em.
        //  · `font-mono`    Space Mono — SOLO metadatos: códigos, IDs, horas,
        //                   antetítulos en versalitas. Es el acento «sci-fi».
        // El handoff prohíbe explícitamente Inter / Roboto / Arial, así que la
        // cadena de reserva va a `system-ui` y no a una de ésas.
        sans: ["'Onest'", 'system-ui', 'sans-serif'],
        display: ["'Bricolage Grotesque'", "'Onest'", 'system-ui', 'sans-serif'],
        mono: ["'Space Mono'", 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Escala del handoff: 12 / 18 / 26 / 999, entradas 14, tarjetas 20–22,
        // planchas 34. Los nombres de la app se conservan (los consumen ~1.500
        // clases) y se reapuntan a esa escala.
        btn: '16px', // botón principal del sistema
        'btn-lg': '18px',
        card: '22px',
        'card-sm': '18px',
        panel: '26px',
        tile: '14px',
        field: '14px', // entradas
        plate: '34px', // planchas / hojas grandes
        fab: '20px', // FAB 60px
        icon: '16px', // botón de icono 48px
      },
      boxShadow: {
        // Los RECUADROS ya no llevan sombra (fundador, 2026-08-06): con el
        // tinte del lienzo y `border-line` se distinguen solos, y la app se ve
        // más limpia. `card` se conserva SOLO porque `card-lg` lo acompaña en el
        // realce al pasar el ratón; ningún recuadro lo usa en reposo.
        // Valores del handoff (dos capas: un pelo de contacto + una difusa).
        card: '0 1px 3px rgba(22,17,46,.04), 0 10px 24px -16px rgba(22,17,46,.2)',
        'card-lg': '0 2px 5px rgba(22,17,46,.05), 0 16px 32px -18px rgba(22,17,46,.24)', // solo `hover:`
        plate: '0 2px 4px rgba(22,17,46,.04), 0 24px 56px -28px rgba(22,17,46,.18)',
        // Lo que SÍ conserva sombra: los controles e insignias que flotan SOBRE
        // UNA FOTO (volver en el hero, flechas de galería, quitar imagen, la
        // fecha sobre la portada de un evento). Ahí la sombra no decora: es lo
        // que los hace legibles sobre una imagen cualquiera.
        float: '0 6px 20px rgba(22,17,46,.10)',
        // La sombra del CTA lleva el COLOR del acento, no gris — es lo que da
        // el aire de app cara. Se tiñe al módulo cuando el paso 3 lo cablee.
        cta: '0 10px 24px -8px rgba(255,45,111,.62)',
        'cta-sm': '0 6px 14px -6px rgba(255,45,111,.55)',
        modal: '0 30px 70px rgba(22,17,46,.35)',
        sheet: '0 -20px 50px rgba(22,17,46,.3)',
        pop: '0 20px 50px rgba(22,17,46,.22)',
        band: '0 18px 44px rgba(255,122,26,.26)',
      },
      backgroundImage: {
        // Los dos degradados de marca. Solo héroe / splash / CTA — el handoff
        // prohíbe usarlos como fondo de página.
        // Arranca en el rosa AA (ver `primary`): el botón principal lleva texto
        // blanco encima, y en un degradado 6 puntos de luminosidad no se ven.
        calor: 'linear-gradient(112deg, #E9005E, #FF7A1A, #FFB020)', // marca
        senal: 'linear-gradient(112deg, #7C3AED, #0EA5E9, #00C48C)', // sistema
      },
      letterSpacing: {
        display: '-.03em',
        'display-lg': '-.045em',
        eyebrow: '.18em', // antetítulos en Space Mono, versalitas
      },
      keyframes: {
        // Esqueletos de carga del sistema.
        tlShine: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
      animation: { shine: 'tlShine 1.4s linear infinite' },
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
