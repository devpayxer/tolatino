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

### 4.1 — Crear el proyecto Supabase de PRODUCCIÓN
En **supabase.com/dashboard → New project**:
- Nombre: `tolatino-prod` (el actual pásalo a `tolatino-staging` en Settings).
- **Región:** la más cercana a tus usuarios (US East si el arranque es la costa
  este / Hazleton).
- **Guarda la contraseña de la base** que te da al crear (la necesitas para
  backups/`pg_dump`).
- Activa **PostGIS** (Database → Extensions → `postgis`) — el proyecto lo usa para
  "cerca de mí" / radios.

### 4.2 — Construir el esquema: correr las 129 migraciones en orden
Aquí es donde un proyecto vacío se vuelve idéntico al actual, pero sin datos.
**Claude lo hace por ti** apuntando `scripts/sbsql.mjs` al ref del proyecto nuevo:
```bash
# (Claude, en la sesión, con SUPABASE_ACCESS_TOKEN del token de prod)
for f in supabase/migrations/*.sql; do
  echo ">> $f"; SUPABASE_PROJECT_REF=<ref-de-prod> node scripts/sbsql.mjs --file "$f" || break
done
# verificar el ledger:
SUPABASE_PROJECT_REF=<ref-de-prod> node scripts/sbsql.mjs "select count(*) from public.schema_migrations;"
```
> **NO se corre `supabase/seed.sql` ni los `scripts/seed-*.mjs` en producción** —
> esos siembran negocios/pedidos de prueba (El Sabor, Bodega La Bendición,
> Barbería D' Primera, etc.). Van SOLO a staging.

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

### 4.4 — Vercel: separar Production de Preview
En **Vercel → Project → Settings → Environment Variables**, define cada variable
para **dos ámbitos** distintos:
- **Production** (rama `claude/tolatino-repo-setup-1efdil`) → apunta al Supabase
  **de prod**:
  ```
  NEXT_PUBLIC_SUPABASE_URL          = https://<ref-de-prod>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY     = <anon key de prod>
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= pk_live_...        # LIVE
  NEXT_PUBLIC_VAPID_PUBLIC_KEY      = <vapid public de prod>
  ```
- **Preview** (las ramas de sesión) → apunta al Supabase **de staging** (los mismos
  nombres, con los valores de staging + `pk_test_...`).

Así, cada `git push` a una rama de sesión genera un **Preview URL que pega a
staging** (probar sin tocar prod), y el ff-merge a la rama de deploy publica a
**producción con datos limpios**. Estos `NEXT_PUBLIC_*` se **hornean en el build**,
por eso deben vivir en Vercel por ámbito (el `apps/web/.env.production` del repo es
solo el respaldo/base y no debe llevar valores de prod secretos — no lo son, pero
que Vercel sea la fuente por ámbito).

**Dominio:** Vercel → Settings → Domains → agrega tu dominio final y apúntalo a la
rama de Production. (Nota: `CLAUDE.md` fija **Cloudflare Pages** como host objetivo;
si migras allá, el patrón Production/Preview es equivalente.)

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

## 6. La única decisión para arrancar el montaje

**¿Qué proyecto es el prod limpio?**

- **Opción A (recomendada):** el proyecto de hoy (con todos los datos de prueba)
  se vuelve **staging**; se crea un **proyecto nuevo** que Claude deja como **prod
  prístino** corriendo las 129 migraciones. → **Cero riesgo** de datos falsos en
  producción; separación limpia desde el día uno.
- **Opción B:** el de hoy se queda como prod y se le **borran** los datos de
  prueba. → Más rápido de "declarar", pero más riesgo de que quede un negocio/
  pedido de prueba escondido frente a usuarios reales.

Elegida la opción, el resto (§4) lo ejecuta Claude salvo los pasos que solo tú
puedes hacer en los dashboards (crear el proyecto Supabase, pegar las llaves LIVE
de Stripe, configurar el dominio) — esos te los dejo listos para copy-paste.

---

## 7. Checklist de cutover a producción

- [ ] Decidida la opción A/B (§6).
- [ ] Proyecto Supabase de prod creado (§4.1); PostGIS activo; contraseña guardada.
- [ ] Las 129 migraciones corridas en prod; `schema_migrations` cuadra (§4.2).
- [ ] Buckets de Storage recreados con políticas públicas de lectura (§4.3).
- [ ] Las 10 Edge Functions desplegadas a prod (§4.3).
- [ ] Secretos de prod cargados (Stripe LIVE, VAPID, PUSH_HOOK_SECRET, push_config,
      FRED) (§4.3).
- [ ] Vercel: variables **Production** → Supabase de prod + `pk_live`; **Preview** →
      staging + `pk_test` (§4.4).
- [ ] Dominio final apuntado a Production (§4.4).
- [ ] Stripe en Live: llaves, webhook (ambos eventos), Connect (§4.5).
- [ ] Verificación E2E en vivo: build correcto, pago real chico, push al teléfono
      (§4.6).
- [ ] Registrado el cierre de estos ítems en `docs/LAUNCH-CHECKLIST.md` § 0.
