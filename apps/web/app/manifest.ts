import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

// PWA install manifest (Next generates /manifest.webmanifest at build). Makes the
// app installable to the home screen — and on iOS is the prerequisite for Web Push
// (0089) to reach iPhone users at all. Spanish-first, brand-colored, standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "To'Latino — Tu gente, tu barrio, tu idioma",
    short_name: "To'Latino",
    description:
      'Descubre negocios, eventos y vecinos de confianza cerca de ti — todo en español. De latinos para latinos.',
    lang: 'es-US',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F4FF', // = token `canvas`; la pantalla de arranque de
                                 // la PWA tiene que ser el fondo de la app, o se
                                 // ve un salto de gris a casi blanco al abrir.
    theme_color: '#FF2D6F', // = token `primary` del sistema nuevo (2026-08-20)
    categories: ['shopping', 'food', 'lifestyle', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
