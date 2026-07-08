# To'Latino — Auditoría & verificación (playbook)

> Por qué existe este doc: hubo un desfase entre "el código está construido" y "funciona
> en producción". La causa raíz casi siempre es la misma — **la base de datos no tiene
> todas las migraciones que el código espera** (ej. `notify_user`/0054, `0051/0052`), o el
> **frontend desplegado no es el último**. Este playbook encuentra y arregla esos huecos de
> forma sistemática y barata (la mayoría sin gastar créditos de IA).

## La regla de oro
El sistema tiene **3 capas** que deben estar sincronizadas. Un bug casi siempre es una de
estas tres desalineada, no "código malo":
1. **Código** en el repo (rama de trabajo).
2. **Deploy** — la rama que Vercel publica en `tolatino.vercel.app` (rama por defecto
   `claude/tolatino-repo-setup-1efdil`).
3. **Base de datos** — qué migraciones de `supabase/migrations/` están realmente aplicadas.

---

## Paso 1 — Paridad de BASE DE DATOS (lo más importante; arregla la mayoría de bugs)

### 1a. Query de auto-diagnóstico (pégala en el Supabase SQL Editor)
Devuelve cada objeto que el app necesita con `existe = true/false`. Los que salgan
`false` (arriba) son el problema.

```sql
with expected(kind, name) as (values
  -- funciones (RPCs) que el frontend llama
  ('function','notify_user'),
  ('function','create_business'),
  ('function','businesses_v2'), ('function','business_by_slug'), ('function','search_businesses'),
  ('function','business_photos_by_slug'), ('function','business_menu_by_slug'),
  ('function','business_services_by_slug'), ('function','business_products_by_slug'),
  ('function','business_rentals_by_slug'), ('function','booking_load_by_service'),
  ('function','rental_busy_by_item'), ('function','reviews_by_slug'), ('function','post_review'),
  ('function','posts_near'),
  ('function','events_near'), ('function','event_by_slug'), ('function','search_events'),
  ('function','events_by_owner'), ('function','create_event_full'),
  ('function','buy_event_tickets'), ('function','buy_event_tickets_multi'),
  ('function','checkin_ticket'), ('function','validate_promo'),
  ('function','join_waitlist'), ('function','leave_waitlist'), ('function','notify_waitlist'),
  ('function','owner_events_summary'), ('function','cancel_event'),
  -- tablas
  ('table','profiles'), ('table','businesses'), ('table','business_items'),
  ('table','business_orders'), ('table','business_bookings'), ('table','business_rentals'),
  ('table','reviews'), ('table','posts'), ('table','notifications'),
  ('table','events'), ('table','event_tiers'), ('table','event_tickets'),
  ('table','event_attendance'), ('table','event_waitlist'), ('table','event_promo_codes')
)
select e.kind, e.name,
  case when e.kind='function'
       then exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                   where n.nspname='public' and p.proname=e.name)
       else exists(select 1 from information_schema.tables t
                   where t.table_schema='public' and t.table_name=e.name)
  end as existe
from expected e
order by existe asc, e.kind, e.name;
```

### 1b. Columnas críticas que las migraciones agregan (revísalas también)
```sql
with expected(t, c) as (values
  ('events','status'), ('events','ends_at'), ('events','cover_url'), ('events','search_tsv'),
  ('event_tiers','visible'),
  ('event_tickets','tier_id'), ('event_tickets','unit_price'), ('event_tickets','used_at'),
  ('event_tickets','admitted'), ('event_tickets','promo_code'),
  ('reviews','photos'), ('businesses','search_tsv')
)
select e.t as tabla, e.c as columna,
  exists(select 1 from information_schema.columns col
         where col.table_schema='public' and col.table_name=e.t and col.column_name=e.c) as existe
from expected e order by existe asc, e.t, e.c;
```

### 1c. El arreglo — re-correr las migraciones que falten
Cada archivo en `supabase/migrations/NNNN_*.sql` es **idempotente** (se puede correr de
nuevo sin dañar nada: usa `create ... if not exists`, `create or replace`, `drop ... if
exists`). Para cada objeto que salió `false`:
- Abre el archivo de migración que lo crea (el número está en el nombre; ej. `notify_user`
  → `0054_notifications.sql`) desde GitHub → pégalo completo en el SQL Editor → Run.

**Opción definitiva (recomendada una vez):** re-corre **TODAS** las migraciones en orden
`0001 → 0067`, una por una. Son idempotentes, así que re-correrlas garantiza que la BD
quede 100% alineada con el código. Si alguna da error, anota cuál y ese es el único punto a
revisar. (Es tedioso pero es gratis y definitivo — no gasta créditos de IA.)

> Mapa rápido migración → qué crea (las más importantes):
> `0054` notificaciones + `notify_user` · `0055` búsqueda negocios · `0056/0057/0058` reseñas
> · `0059` capacidad de reservas · `0060` realtime Mi cuenta · `0061` boletos/tiers/check-in
> · `0062` wizard de eventos · `0063` descubrimiento de eventos · `0064` compra atómica +
> búsqueda de eventos · `0065` admisiones/lista de espera/promo · `0066` foto en tarjetas ·
> `0067` fix de compra (notify_user + code ambiguo).

---

## Paso 2 — Paridad de DEPLOY
`tolatino.vercel.app` publica la rama **`claude/tolatino-repo-setup-1efdil`**. Cada sesión de
Claude en la web crea su **propia rama**, así que el trabajo nuevo hay que llevarlo a esa
rama de producción. Verifica que producción tenga el último commit:
- En GitHub → rama `claude/tolatino-repo-setup-1efdil` → mira el último commit. Debe ser el
  más reciente del trabajo. Si no, hay que hacer merge/fast-forward de la rama de la sesión.
- Regla para sesiones futuras: **al terminar cada bloque, empujar a la rama de producción**
  (fast-forward) y **avisar** que se desplegó.

---

## Paso 3 — Smoke test por feature (encuentra los bugs de UI/lógica)
Prueba en el sitio real, **firmado con tu cuenta**, en el teléfono. Para CADA fila: si falla,
toma captura del error (dejé el error mostrando el motivo técnico real, ⚠), y anota el paso.

### Eventos (lo del arco reciente)
- [ ] Crear evento con foto de portada → aparece en el listado **con la foto en la tarjeta**.
- [ ] Comprar boleto **gratis** (Entrada general) → éxito + aparece en Mi cuenta → Mis boletos con **QR**.
- [ ] Comprar boleto **de pago** (VIP) → éxito.
- [ ] Aplicar **código de descuento** → precio baja → comprar → éxito.
- [ ] Crear un **nivel oculto** + un **código de acceso** que lo desbloquea → el código revela el nivel.
- [ ] En un nivel **agotado** → botón **"Avísame"** (lista de espera) → aparece en el panel del organizador.
- [ ] **Check-in**: en el panel del negocio → Check-in → escribir el código del boleto → "Admitido".
- [ ] Boleto de grupo (qty 2+) → admitir **1**, luego los **restantes** (admisiones individuales).
- [ ] **Escáner de cámara** (solo Android/Chrome) → escanear el QR de Mi cuenta → admite.
- [ ] **Mapa** embebido en el detalle + tocar el **organizador** → sus otros eventos.
- [ ] **Cancelar** un evento (panel → Ajustes) → el cliente ve "Cancelado" y no puede comprar.

### El resto del app (arco anterior — verificar que sigue bien)
- [ ] **Negocios**: buscar (búsqueda por relevancia), abrir un listado, ver reseñas + fotos.
- [ ] **Reseña**: dejar una reseña con foto → aparece; el dueño puede responder.
- [ ] **Reserva de servicio** (Servicios) → elegir horario → reservar → aparece en Mi cuenta y en el panel.
- [ ] **Renta** → periodo/cantidad/fecha → rentar → aparece en ambos lados.
- [ ] **Pedido de menú/productos** (con variantes/stock) → ordenar → aparece.
- [ ] **Mi cuenta**: pedidos/reservas/rentas/boletos con estado en vivo (realtime) + cancelar.
- [ ] **Alertas** (campanita): al comprar/reservar, al dueño le llega la notificación.
- [ ] **Comunidad**: publicar un post → aparece en el feed.

---

## Paso 4 — El ciclo de arreglo (barato en créditos)
Cuando tengas la lista de fallas del Paso 3, cada una se arregla rápido si me das el
**error exacto** (no "no funciona"). Lo más eficiente:
1. El mensaje ⚠ que ahora muestra el motivo técnico (ya está en producción).
2. Para páginas: abre la consola del navegador (o mándame el texto rojo que aparezca).
3. Una captura por bug.

Con eso, cada arreglo es 1 migración chiquita o 1 cambio de frontend — sin adivinar, sin
quemar créditos en diagnóstico.

## Reglas para que NO vuelva a pasar
- **Siempre re-verificar la paridad de BD** (Paso 1) antes de dar algo por "listo".
- **Siempre desplegar a la rama de producción** al terminar (Paso 2).
- **Un smoke test real** por feature antes de marcar "hecho" (Paso 3), no solo "compila".
- Nunca asumir que una migración de otra sesión ya se aplicó — **confirmarlo con el Paso 1a**.
