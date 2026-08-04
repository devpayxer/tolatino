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

## `permisos-anon.js` — el visitante sin cuenta no choca con ningún permiso

No mide layout: mide **permisos**. Recorre el sitio SIN sesión (portada, las
cinco secciones, la ficha de un negocio entrando por «Ver perfil» y pinchando sus
pestañas, y una búsqueda) y **falla si cualquier llamada a Supabase devuelve
`401`/`403` o un cuerpo con «permission denied»**.

Existe por la migración `0148`, que le quita a `anon` el permiso de ejecutar 150
funciones. La comprobación de mesa —«esas ya devolvían *auth required*»— prueba
lo que YO creo que llama la app; esto prueba lo que la app llama de verdad.
Córrelo después de **cualquier** cambio de `grant`/`revoke` o de políticas.

Además se planta a sí mismo dos trampas, porque las dos ya han hecho pasar una
prueba en vacío: aborta si la ficha del negocio no llegó a abrirse, y aborta si
no pudo pinchar al menos dos pestañas. Corrida limpia: `25 RPC distintas, 0
denegadas`.

## `reset-contrasena.js` — «olvidé mi contraseña», de punta a punta

La contraseña es la **puerta de servicio** de To'Latino: el camino normal es el
código al correo. Una puerta de servicio sin llave de repuesto no sirve de nada,
y este flujo tiene que funcionar justo el día que el correo del código falle —
que es el único día que alguien lo va a usar. No se puede comprobar a ojo: hace
falta un enlace real de Supabase.

Crea un **usuario desechable** (nunca una cuenta real), le pide a Supabase un
enlace de recuperación de verdad, aterriza con él en la pantalla, comprueba que
**dos contraseñas distintas dan error**, guarda la buena, y por último verifica
contra el servidor que **se puede entrar con la nueva y NO con la vieja** — una
pantalla verde por sí sola no demuestra nada. Al terminar borra el usuario.

Va contra `localhost:3000` **y ese puerto importa**: es el que está en la lista
de redirecciones permitidas de la base de pruebas. En 4173 Supabase ignora el
destino y manda al `site_url`.

```bash
cd apps/web/out && python3 -m http.server 3000 --bind 127.0.0.1 &
cd tools/mobile-audit && KEYS_JSON=<archivo-de-claves> node reset-contrasena.js
```
`KEYS_JSON` es la respuesta de `/v1/projects/<ref>/api-keys?reveal=true`. Se pasa
por **archivo** a propósito: la clave de servicio no se escribe en el repo ni en
la línea de comandos.

## Uso
```bash
pnpm --filter @tolatino/web build
cd apps/web/out && python3 -m http.server 4173 &   # sirve el export estático
cd tools/mobile-audit && npm i                      # una vez — instala Playwright local
node audit.js                                       # dashboard  → "0 violation state(s)"
node publish.js                                     # publicar   → "0 violation state(s)"
node permisos-anon.js                               # permisos   → "0 denegadas"
```
En el entorno de Claude Code el Chromium vive en `/opt/pw-browsers/chromium`
(ya referenciado en los scripts); este tool es independiente del workspace pnpm
(usa `npm` local). Corre ambos después de cualquier cambio de UI que toquen.
El contador solo cuenta **violaciones**; una corrida limpia imprime
`0 violation state(s)`.
