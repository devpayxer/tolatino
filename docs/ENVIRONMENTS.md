# To'Latino — Entornos y publicación a producción

> **Para qué es este documento.** La estructura **real** de cómo un cambio nace,
> se prueba y llega al sitio en vivo — y el plan paso a paso para **separar
> producción de pruebas** (hoy corre todo contra UN solo entorno). Es la fuente
> de verdad del flujo dev → staging → prod. Léelo antes de tocar el deploy o de
> montar el entorno de producción.
>
> Complementa a `docs/PROGRESS.md` (§ "How this project ships", el flujo de
> ramas de hoy) y a `docs/DB-ACCESS.md` (cómo el agente aplica migraciones).
> Última actualización: 2026-07-28.

## Estado del cutover (2026-07-28)

Decisión del fundador: **Opción A** (proyecto de hoy → staging; proyecto nuevo →
prod prístino) · dominio final **`tolatino.com`** (ya comprado).

| Pieza | Proyecto Supabase | Ref | Estado |
|---|---|---|---|
| **Staging** (pruebas, con datos sembrados) | `tolatino` | `zpkaxojonufdwgahiqjh` | En uso (era el único entorno) |
| **Producción** (limpio) | `tolatino-prod` | `vurqsebgsacickxsxfeh` | ✅ creado · 129 migraciones · **6 978** ciudades · **17** categorías canónicas · **0** negocios/eventos/posts/amenidades |

**URL de prod:** `https://vurqsebgsacickxsxfeh.supabase.co` (la anon key —pública por
diseño— se configura en Vercel, ver §4.4).

> **Verificado (2026-07-28):** las 17 categorías de prod == la taxonomía CamelCase
> del frontend (`FoodDrinks`, `CarDealer`, `RealEstate`…). **Ojo con el instinto de
> "copiar de staging":** staging está **contaminado con datos demo** (`seed.sql`
> metió ~16 categorías extra en minúscula — `food`, `beauty` — y 19 amenidades que
> NO son canónicas). **Prod, hecho solo de migraciones, es la verdad limpia** — no
> sincronizar categorías/amenidades desde staging. La tabla `amenities` es catálogo
> del **admin** (ninguna migración la siembra); vacía es el estado correcto y el
> fundador la curará desde `/admin` si quiere.

El viejo proyecto `latinoplatform` (inactivo desde mayo, pre-To'Latino) se **borró**
para liberar el cupo del plan Free. La contraseña de la BD de prod está en el
scratchpad de la sesión — **resetéala** en el dashboard (Settings → Database →
Reset database password) para que solo tú la conozcas (las migraciones usan el
Personal Access Token, no la contraseña, así que resetearla no rompe nada).

**Falta para quedar 100% en vivo** (pasos que solo tú puedes hacer en dashboards —
ver §4.3–4.6 y el checklist §7): desplegar las Edge Functions + secretos a prod,
configurar Vercel (Production→prod / Preview→staging), pasar Stripe a LIVE, y
apuntar `tolatino.com`.

---

## 1. La idea base: cada cambio tiene DOS mitades que viajan juntas

Casi todo cambio toca dos cosas a la vez, y **las dos** tienen que llegar al
sitio en vivo o queda roto:

| Mitad | Qué es | Dónde vive | Cómo llega a producción |
|---|---|---|---|
| **Código** | Frontend (Next.js) + Edge Functions | **git** | push → **Vercel** construye y publica |
| **Base de datos / backend** | Tablas, RPCs, políticas de seguridad (RLS), triggers | **Supabase** | correr la **migración SQL numerada** en el proyecto |

La segunda es la que la gente rompe. Regla de oro del proyecto: **la base nunca
se toca a mano.** Todo cambio de base es una migración numerada
(`supabase/migrations/NNNN_*.sql` — hoy vamos en la **0129**). Correr la misma
lista de migraciones en dos lugares garantiza que queden **idénticos**. Esa es la
propiedad que hace posible tener un entorno de pruebas y otro de producción sin
que se desincronicen.

> **Por qué las migraciones son la clave:** una base de datos no se "copia y
> pega". Se **construye** corriendo su lista de migraciones en orden. Un proyecto
> Supabase nuevo + correr las 129 migraciones en orden = una base **idéntica** a
> la de hoy, pero **prístina, sin un solo dato de prueba**. Ahí está la magia que
> hace fácil montar producción limpia.

---

## 2. Los 3 entornos

```
   DESARROLLO                 STAGING (pruebas)            PRODUCCIÓN (en vivo)
   donde trabaja Claude   →   donde pruebas TÚ         →   lo que ven los usuarios
   ─────────────────          ───────────────────          ─────────────────────
   rama de sesión git +       Supabase "staging"           Supabase "prod"
   sandbox del agente         Vercel Preview URL           tu dominio final
   datos de prueba OK         datos de prueba OK           CERO datos falsos
```

- **Desarrollo** — Claude crea el cambio en una rama de git y lo verifica
  (`tsc` + `build` + auditoría móvil / screenshots). Es donde se equivoca y
  corrige sin que nadie lo vea.
- **Staging** — una copia **real** con su propia base y su propia URL, donde
  **tú** pruebas como si fuera el sitio real, **sin miedo a romper nada** de los
  usuarios. Aquí sí puede haber negocios y pedidos de prueba.
- **Producción** — solo llega lo aprobado. Nada de datos inventados.

### Mapa a lo que existe HOY (importante)

Hoy el proyecto tiene **un solo entorno mezclado**. En términos de la tabla de
arriba, lo que hay es:

| Pieza | Hoy | Falta para tener prod de verdad |
|---|---|---|
| Rama de desarrollo | rama de sesión (esta: `claude/new-prompt-xkubrd`) | — ya existe |
| Rama que despliega | `claude/tolatino-repo-setup-1efdil` (Vercel la auto-despliega) | renombrar el rol a "prod" mentalmente; opcional pasar a `main` |
| Base de datos | **1 solo proyecto Supabase** con datos de prueba | **crear un 2º proyecto** para separar staging de prod |
| Hosting | Vercel → `tolatino.vercel.app` | separar **Production** vs **Preview** con variables distintas + dominio propio |
| Pagos | Stripe en modo **TEST** | pasar a llaves **LIVE** en el proyecto de prod |

El resto de este documento es exactamente **cómo cerrar esa columna de la
derecha**.

---

## 3. El procedimiento de UN cambio (la receta, siempre igual)

1. **Claude crea** el cambio en la rama de sesión + escribe la migración SQL si
   toca la base.
2. **Verifica** contra staging: `tsc` + `build` pasan, corre la migración en
   **staging**, screenshots en navegador real.
3. **Tú apruebas** viendo el Preview de Vercel o los screenshots.
4. **Se publica a producción** — son **3 gestos coordinados, el mismo turno**:
   - **Código:** ff-merge a la rama de producción → Vercel despliega.
     ```bash
     git add -A && git commit -m "…"
     git push -u origin <rama-de-sesion>
     git checkout claude/tolatino-repo-setup-1efdil     # la rama que Vercel despliega
     git merge --ff-only <rama-de-sesion>
     git push -u origin claude/tolatino-repo-setup-1efdil
     git checkout <rama-de-sesion>
     ```
   - **Base de datos:** correr la migración numerada en el proyecto **de prod**
     (Claude puede hacerlo con `scripts/sbsql.mjs`, o te paso el SQL para pegar en
     el SQL Editor de Supabase).
   - **Edge Functions** (si el cambio tocó `supabase/functions/*`): desplegarlas al
     proyecto de prod.
5. **Verificar en vivo** y listo.

> ⚠️ **El ff-merge a la rama de deploy es PARTE de cada arreglo, el mismo turno —
> no un paso "para después".** Olvidarlo ya quemó al fundador dos veces (el fix
> quedaba "listo" en la rama de sesión mientras el sitio en vivo seguía sirviendo
> el build viejo). Un cambio NO está publicado hasta que está en
> `claude/tolatino-repo-setup-1efdil` **y** su migración corrió en prod.

---

## 4. Cómo se monta producción (paso a paso)

Objetivo: pasar de 1 entorno mezclado → **staging** (pruebas) + **prod** (limpio).
Recomendación: el proyecto de HOY (con todos los datos sembrados) se vuelve
**staging** — ahí los datos de prueba son útiles — y creas un **proyecto nuevo**
que queda como **prod prístino** corriendo las 129 migraciones. Cero riesgo de que
un dato falso aparezca frente a un usuario real.

### 4.1 — Crear el proyecto Supabase de PRODUCCIÓN — ✅ HECHO (2026-07-28)
Creado por Claude vía la **Management API** (mismo PAT de `SUPABASE_ACCESS_TOKEN`):
`tolatino-prod`, región `us-east-1` (igual que staging). Ref `vurqsebgsacickxsxfeh`.
PostGIS + pg_net + pg_trgm quedan activos por las migraciones (no hay que
prenderlos a mano). **Contraseña de la BD** generada y guardada en el scratchpad de
la sesión → **resetéala** en Settings → Database (las migraciones usan el PAT, no
la contraseña).
> Reproducir a mano (si algún día hace falta): `POST /v1/projects` con
> `organization_id`, `name`, `region`, `db_pass`. O en el dashboard → New project.

### 4.2 — Construir el esquema: 129 migraciones + dato de referencia — ✅ HECHO
**Migraciones (esquema):** las 129 corridas EN ORDEN, de corrido, una sola vez:
```bash
# (con SUPABASE_ACCESS_TOKEN; correr en SEGUNDO PLANO — tardan ~4–5 min)
for f in $(ls supabase/migrations/*.sql | sort); do
  SUPABASE_PROJECT_REF=<ref-de-prod> node scripts/sbsql.mjs --file "$f" || break
done
```
> ⚠️ **Correrlas de una sola vez, completas.** Si un intento se corta a la mitad y
> re-corres desde 0001 sobre un esquema parcial, revientan por ambigüedad
> (`search_businesses is not unique`, etc. — mismo peligro de PROGRESS.md: no
> re-aplicar migraciones viejas sobre un esquema más nuevo). Si se corta: borra el
> proyecto y recréalo limpio, no "resumas".

**Dato de referencia (NO es dato de prueba — la app lo necesita):**
- **Categorías y amenidades** las siembran las **migraciones** (0013 / 0117 / 0119)
  → quedan solas al correr el esquema.
- **Ciudades** (gazetteer de ~7k US) vienen de `supabase/data/us_cities.csv`. No hay
  loader SQL en el repo (en staging se importó por el Table Editor). Para prod,
  Claude generó los `INSERT` desde el CSV y los aplicó por la Management API.

> 🚩 **Trampa: `supabase/seed_cities.sql` está MAL nombrado** — NO carga ciudades;
> siembra **negocios/eventos/posts de PRUEBA** de 3 ciudades. **Jamás correrlo en
> prod.** Igual que `supabase/seed.sql`, `supabase/seed-test/*` y `scripts/seed-*.mjs`
> (El Sabor, Bodega La Bendición, Barbería D' Primera, etc.): **todo eso es solo
> para staging.** Si algo de eso entra a prod, la vía limpia es recrear el proyecto,
> no borrar fila por fila (hay filas hijas por ~20 tablas).

### 4.3 — Storage (imágenes) y Edge Functions
El esquema no incluye ni los buckets de Storage ni el código de las funciones —
se recrean aparte en el proyecto de prod:
- **Buckets de Storage:** crear los mismos buckets que usa la app (fotos de
  negocios/productos/novedades) con las mismas políticas públicas de lectura.
- **Edge Functions** (hay 10): `connect-onboard`, `connect-status`, `fred-rates`,
  `marketplace-checkout`, `refund-purchase`, `rental-deposit`, `send-push`,
  `stripe-checkout`, `stripe-portal`, `stripe-webhook`. Desplegarlas al proyecto
  de prod (Dashboard → Edge Functions, o CLI de Supabase).
- **Secretos de las funciones** (Dashboard → Edge Functions → Secrets) — recrear
  con los valores **de producción**:
  - Stripe: `STRIPE_SECRET_KEY` (**LIVE**, ver 4.5), `STRIPE_WEBHOOK_SECRET` (del
    endpoint LIVE), `STRIPE_CONNECT_*` según aplique.
  - Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
    `PUSH_HOOK_SECRET`.
  - Fila `private.push_config` con la URL de la función `send-push` de prod + su
    secreto (la crea una migración/insert — replicar el valor).
  - Cualquier otra API key que usen las funciones (p. ej. FRED para `fred-rates`).

### 4.4 — Config del frontend: vive en `apps/web/.env.production` (¡NO en Vercel!)

> **Hallazgo crítico (2026-07-28).** La app es **export estático** (`output:
> 'export'`, build = `next build`). Las variables `NEXT_PUBLIC_*` se **hornean en
> el build desde el archivo COMMITEADO `apps/web/.env.production`**. **Verificado en
> el JS del sitio en vivo:** tiene horneada `zpkaxojonufdwgahiqjh` (staging),
> exactamente el valor del archivo — **no** el que había en la pantalla de Vercel.
> Es decir, para este sitio la pantalla **Environment Variables de Vercel estaba
> siendo ignorada** por el build actual (las llaves de servidor tipo
> `STRIPE_SECRET_KEY`/`SUPABASE_SECRET_KEY` en Vercel tampoco corren: no hay
> runtime de servidor en un export estático — los secretos reales viven en los
> **Edge Functions de Supabase**).
>
> ⚠️ **Landmine encontrado:** el Vercel del proyecto tenía
> `NEXT_PUBLIC_SUPABASE_URL = https://ujvzpfygaqywcdlnplie.supabase.co` — el ref de
> un proyecto viejo (`latinoplatform`) que se **borró**. Hoy no afecta (el build usa
> el archivo), pero **si un futuro build llegara a tomar la var de Vercel, apuntaría
> a una base inexistente y rompería el sitio**. No se pudo confirmar la precedencia
> Vercel-vs-archivo sin desplegar. **Regla:** mantener el valor de Vercel
> **consistente** con `.env.production` (o borrarlo), nunca apuntando a un proyecto
> muerto.

**Cómo cambiar de base, entonces:** editar `apps/web/.env.production` (lo hace
Claude), commit → ff-merge a la rama de deploy → Vercel reconstruye. **Verificar
SIEMPRE** qué base quedó horneada en el sitio en vivo (no asumir):
```bash
# encuentra el chunk JS que trae la URL y confirma el ref esperado
node scripts/sbsql.mjs "select (select array_agg(distinct m[1]) from
  regexp_matches((extensions.http_get('https://tolatino.vercel.app/_next/static/chunks/<chunk>.js')).content,
  'https://([a-z0-9]+)\.supabase\.co','g') as m);"
```
Valores de PROD para `.env.production` en el cutover:
```
NEXT_PUBLIC_SUPABASE_URL=https://vurqsebgsacickxsxfeh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_… de prod>   # la app lee ESTE nombre; el valor es la llave "publishable" nueva
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…               # en el cutover a LIVE
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid public de prod>
```

**Preview vs Production:** con export estático + `.env.production` commiteado, TODO
build (incl. previews) hornea el mismo archivo → **no hay split automático
staging/preview por env-file**. En la práctica el fundador no usa las Preview URLs y
Claude desarrolla/verifica contra **staging** vía la Management API
(`SUPABASE_PROJECT_REF=zpkaxojonufdwgahiqjh`), no vía previews. Si algún día se
quiere el split real, hay que confirmar por experimento si las vars de Vercel
sobre-escriben el archivo y, de ser así, scoparlas por ambiente; hasta entonces,
tratar `.env.production` como "la base de PRODUCCIÓN activa" y ser disciplinado.

**Dominio:** Vercel → Settings → Domains → agrega **`tolatino.com`** y apúntalo a la
rama de Production (DNS del registrador → Vercel). `CLAUDE.md` fija Cloudflare Pages
como host objetivo a futuro; el patrón es equivalente.

### 4.5 — Stripe: de TEST a LIVE
Hoy los pagos corren en **modo prueba** (`pk_test`/`sk_test`). Para cobrar de
verdad:
- Activa la cuenta Stripe (datos del negocio) y cambia a **modo Live**.
- Copia `pk_live_...` (a Vercel Production, 4.4) y `sk_live_...` (a los secretos de
  la función de prod, 4.3).
- **Webhook LIVE:** en Stripe → Developers → Webhooks crea el endpoint apuntando a
  la función `stripe-webhook` **de prod**, y **suscribe los eventos**
  `checkout.session.completed` **y** `payment_intent.succeeded` (los dos — sin el
  segundo, los pedidos del checkout propio no se crean tras pagar). Copia el
  **signing secret** a `STRIPE_WEBHOOK_SECRET` de prod.
- Stripe **Connect** (los cobros van al negocio con comisión de To'Latino): repite
  el onboarding en Live; los negocios reales tendrán que re-conectar su cuenta en
  Live (las conexiones de test no sirven en Live).

### 4.6 — Verificar producción de punta a punta
- Sitio sirve el build correcto (el sandbox no alcanza Vercel; se verifica vía
  Postgres `http_get` — ver `docs/PROGRESS.md` § How this project ships).
- Un pago real de prueba pequeño con tarjeta LIVE → llega el webhook → el pedido se
  crea → el push llega al teléfono (requiere HTTPS + permiso; iOS necesita "Agregar
  a pantalla de inicio").
- `schema_migrations` en prod = misma cuenta que staging.

---

## 5. Reglas de oro (no romper)

1. **La base nunca se toca a mano.** Todo cambio de esquema es una migración
   numerada, idempotente, versionada en git. Se corre en staging → luego en prod.
2. **Nunca correr seeds de prueba en prod.** `seed.sql` y `scripts/seed-*.mjs` son
   solo para staging.
3. **Publicar es atómico por turno:** código (ff-merge a la rama de deploy) +
   migración en prod + Edge Functions, juntos. No dejar la base atrás del código
   ni al revés (ese desajuste frontend↔DB fue la causa #1 de bugs en este
   proyecto).
4. **Secretos por entorno.** Las llaves de staging (Stripe test, VAPID de
   pruebas) **jamás** en prod, y viceversa. Los `NEXT_PUBLIC_*` viven en Vercel por
   ámbito (Production vs Preview).
5. **Prueba en staging, no en prod.** Si necesitas un dato para probar, créalo en
   staging.
6. **Todo lo pegable, pegado.** Cualquier SQL/comando/valor que el fundador deba
   correr se pega **completo en el chat** (regla #6 del proyecto), nunca solo la
   ruta del archivo.

---

## 6. La decisión (ya tomada)

**Elegida la Opción A** (2026-07-28): el proyecto de hoy (`tolatino`,
`zpkaxojonufdwgahiqjh`) es **staging**; el nuevo (`tolatino-prod`,
`vurqsebgsacickxsxfeh`) es **prod prístino** con las 129 migraciones + dato de
referencia y **cero datos de prueba**. Dominio final: **`tolatino.com`**.

Lo que faltaba de §4 lo ejecuta Claude salvo los pasos que solo tú puedes hacer en
los dashboards (Edge Functions + secretos, Vercel Production/Preview, Stripe LIVE,
DNS de `tolatino.com`) — esos te los dejo listos para copy-paste.

---

## 7. Checklist de cutover a producción

- [x] Decidida la opción A/B (§6). → **Opción A** + dominio `tolatino.com`.
- [x] Proyecto Supabase de prod creado (§4.1) `vurqsebgsacickxsxfeh`; PostGIS activo.
- [x] Las 129 migraciones corridas en prod; dato de referencia (categorías/ciudades)
      cargado; **0 negocios/pedidos/posts** (§4.2).
- [ ] Resetear la contraseña de la BD de prod en el dashboard (§4.1).
- [x] Storage: bucket `post-photos` (público, 10 MB) + 3 políticas replicadas (§4.3).
- [x] Las 10 Edge Functions desplegadas a prod vía Management API (mismo `verify_jwt`
      que staging) (§4.3).
- [x] Secretos NO-Stripe cargados en prod: `VAPID_*` (par nuevo generado),
      `PUSH_HOOK_SECRET`, `SITE_ORIGIN=https://tolatino.vercel.app`; `push_config`
      insertado (fn_url send-push + hook_secret + anon). VAPID public de prod
      guardado para `.env.production` en el cutover.
- [x] Secretos Stripe en prod **en MODO PRUEBA** (2026-07-29): `STRIPE_SECRET_KEY`
      (`sk_test`, misma cuenta que staging) + `STRIPE_WEBHOOK_SECRET` del webhook de
      prueba que el fundador creó apuntando a `…/functions/v1/stripe-webhook` con los
      eventos `checkout.session.completed` + `payment_intent.succeeded`. `pk_test`
      confirmada (la misma del `.env.production`). `FRED_API_KEY` pendiente/opcional.
      **Para LANZAR con dinero real:** repetir con `sk_live`/`pk_live` + un webhook
      **Live** (nuevo `whsec`), y activar Stripe Connect en Live.
- [x] **Cambiado `apps/web/.env.production` → PROD (2026-07-29, cutover paso 1).**
      `NEXT_PUBLIC_SUPABASE_URL` = `https://vurqsebgsacickxsxfeh.supabase.co` y la
      `sb_publishable` de prod (verificada con un GET real a `/rest/v1/categories`
      → HTTP 200 antes de compilar). **VAPID:** la pública de prod NO había quedado
      guardada en el repo, así que se generó un **par nuevo** y se cargó
      `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en los secretos de prod (rotación
      segura: prod tenía **0** filas en `push_subscriptions`). Stripe se queda en
      `pk_test` a propósito para el ensayo. **Build verificado:** el JS compilado
      hornea solo `vurqsebgsacickxsxfeh` (3 ocurrencias) y **cero** rastros de
      `zpkaxojonufdwgahiqjh`.
- [x] **Desplegado y VERIFICADO en el sitio en vivo (2026-07-29, cutover paso 3).**
      ff-merge de `claude/new-prompt-xkubrd` → `claude/tolatino-repo-setup-1efdil`
      (fast-forward limpio) → Vercel reconstruyó. **Comprobado sobre el JS servido**
      (no asumido): los chunks de `/negocios/` contienen `vurqsebgsacickxsxfeh` en 3
      de ellos y **0** ocurrencias de `zpkaxojonufdwgahiqjh`. Nota de método: la
      landing (`/`) NO trae el cliente de Supabase, así que verificar ahí da falso
      negativo — hay que pedir los chunks de una ruta que consulte datos
      (`/negocios/`). El sandbox no alcanza internet (proxy 403), así que la
      comprobación se hizo con `extensions.http_get` desde Postgres.
      Estado de prod al desplegar: 6 978 ciudades, 17 categorías, **0** negocios /
      publicaciones / eventos / usuarios → el sitio se ve VACÍO a propósito.
- [x] **Landmine de Vercel resuelto (2026-07-29):** el fundador confirmó por captura
      que **Environment Variables del proyecto está VACÍO** ("No Environment Variables
      Added", pestaña Project, filtros en All). Ya no existe la var que apuntaba al
      proyecto borrado `ujvzpfygaqywcdlnplie`. Estado ideal: el build depende solo del
      `.env.production` commiteado. **Regla a futuro:** no volver a crear
      `NEXT_PUBLIC_*` en Vercel para este proyecto — se ignoran y solo pueden
      desincronizarse del archivo.
- [ ] Dominio `tolatino.com` apuntado a Production (DNS → Vercel) (§4.4).
- [ ] Stripe en Live: llaves, webhook (ambos eventos), Connect (§4.5).
- [ ] Verificación E2E en vivo: build correcto, pago real chico, push al teléfono
      (§4.6).
- [ ] Registrado el cierre de estos ítems en `docs/LAUNCH-CHECKLIST.md` § 0.
