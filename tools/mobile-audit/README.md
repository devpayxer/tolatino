# Mobile layout audit (screen-by-screen)

Dos auditorías Playwright a ancho de teléfono (392px) que certifican que nada se
sale del layout:

- **`audit.js`** — el **business dashboard** (`/negocio`).
- **`publish.js`** — el flujo **Publicar negocio** del consumidor (FAB → "Publicar
  mi negocio"): campos, picker de **Características** y editor semanal de
  **Horario** (franjas, día cerrado, aplicar-a-semana, cambio de hora).

`audit.js` recorre el dashboard así:

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

Cada estado detecta: desborde horizontal de página, elementos fuera del viewport
(ignorando decoraciones recortadas por `overflow-hidden` y filas con scroll
interno), y scroll horizontal dentro de sheets. Cada violación se registra y se
captura en `img/audit/FAIL-*.png` (carpeta gitignored).

## Uso
```bash
pnpm --filter @tolatino/web build
cd apps/web/out && python3 -m http.server 4173 &   # sirve el export estático
cd tools/mobile-audit && npm i                      # una vez — instala Playwright local
node audit.js                                       # dashboard  → "0 violation state(s)"
node publish.js                                     # publicar   → "0 violation state(s)"
```
En el entorno de Claude Code el Chromium vive en `/opt/pw-browsers/chromium`
(ya referenciado en los scripts); este tool es independiente del workspace pnpm
(usa `npm` local). Corre ambos después de cualquier cambio de UI que toquen.
El contador solo cuenta **violaciones**; una corrida limpia imprime
`0 violation state(s)`.
