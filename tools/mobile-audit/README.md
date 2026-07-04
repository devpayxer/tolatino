# Mobile layout audit (screen-by-screen)

Recorre el **business dashboard** a ancho de teléfono (392px) con Playwright y
certifica que nada se sale del layout:

1. Visita cada sección del panel (16 tabs vía el drawer).
2. Hace click en **cada sub-tab / filtro / modo** (filas de chips) y re-mide
   después de cada click.
3. Abre **popups y wizards** (Agregar platillo/servicio/producto/artículo,
   Gestionar evento, Rentar, Publicar vacante, sheets de plan…) y avanza los
   pasos habilitados, midiendo **dentro de cada overlay**.
4. En cada estado detecta: desborde horizontal de página, elementos fuera del
   viewport (ignorando decoraciones recortadas por `overflow-hidden` y filas
   con scroll interno), y scroll horizontal dentro de sheets. Cada violación
   se registra y se captura en `img/audit/FAIL-*.png`.

## Uso
```bash
pnpm --filter @tolatino/web build
cd apps/web/out && python3 -m http.server 4173 &   # sirve el export estático
cd tools/mobile-audit && npm i playwright          # una vez (usa el Chromium local)
node audit.js                                       # espera "0 violation state(s)"
```
En el entorno de Claude Code el Chromium vive en `/opt/pw-browsers/chromium`
(ya referenciado en el script). Última corrida: **121 estados · 0 violaciones**.
Correlo después de cualquier cambio de UI del dashboard.
