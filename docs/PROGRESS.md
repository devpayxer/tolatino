# To'Latino v2 — Dónde estamos / cómo retomar

_Actualizado: 5 nov 2026._

## Ramas (léelo antes de nada)
- **`main`** = la rama de trabajo de la v2 y la que debe ser **rama por defecto** del
  repo (toda sesión nueva arranca de ahí). Si una sesión arranca y ve código de
  Next.js + Supabase de la v1 (`apps/web`, `supabase/migrations/0157…`), está en
  la rama equivocada: hacer `git checkout main` y seguir.
- **`pruebas`** = lo que corre en el sandbox; debe apuntar al mismo contenido que
  `main` (más `infra/pruebas/deploy.sh` cuando exista).
- **`produccion`** = no existe todavía (fase 9).
- `archivo/v1-*` = el código viejo, solo referencia. `archivo/v1-pruebas-sesion-5nov`
  = lo que una sesión hizo por error sobre la v1 el 5 nov (descartado).
- **Incidente 5 nov:** una sesión nueva arrancó desde la rama por defecto vieja
  (`claude/tolatino-repo-setup-1efdil` = v1), leyó el `CLAUDE.md` de la v1 e hizo
  una «Fase 0» de la v1 sobre `pruebas`. Causa: no se había cambiado la rama por
  defecto a la v2. Corregido el 5 nov: `main` creada y puesta como rama por defecto por el
  fundador; `pruebas` borrada y recreada desde `main` (5a47a56). Las ramas
  `claude/*` viejas siguen existiendo pero no se usan.

## Estado
- **Plan APROBADO (5 nov 2026). Sigue: Fase 0 — Cimientos.** Todas las decisiones
  (A–Z) están en `docs/DECISIONES.md`; `docs/PLAN.md` v2 y `CLAUDE.md` las integran.
  No hay código de la app todavía.
- **Fase 0 · bloque 1 HECHO (5 nov):** monorepo pnpm + Turborepo; `apps/web` (Next.js 15,
  App Router, Tailwind v4, `output: standalone`, fuentes self-hosted con next/font);
  `packages/ui` (tokens.css 1:1 del sistema + `Wordmark`); `/api/salud` (app + PostGIS +
  commit); `guardianes/run.mjs` (secretos · tokens · semilla · idioma; probados al revés);
  CI en GitHub Actions; `infra/pruebas/` (Dockerfile multi-etapa, compose con web + Postgres/
  PostGIS 16 + MinIO, `deploy.sh` idempotente, nginx con `/` → app y `/estado/`,
  `tolatino-sync` v2 con `flock`). Captura `capturas/fase0-bloque1-iphone15.png`
  (fondo Paper, Sora/Manrope/Mono comprobados por `getComputedStyle`).
  **Lección:** para probar el standalone en local hay que copiar `.next/static` y `public`
  dentro de `.next/standalone/apps/web/` (el Dockerfile ya lo hace).
- **Sigue · bloque 2:** puerto del sistema de diseño (132 componentes de
  `docs/diseno/design-system/components-web/` → `packages/ui/src/**`, TSX con tokens, sin hex),
  página `/sistema` con el catálogo, captura por componente, guardián visual.
- **Cómo arrancar la Fase 0 (plan original; sesión nueva, `/model opus`, `/effort high`):**
  1. Leer `CLAUDE.md`, este archivo y `docs/PLAN.md` §3, §5 y la fila «Fase 0» de §6.
  2. Primer bloque: monorepo (pnpm + Turborepo, Next.js, `packages/ui`), rama
     `pruebas` nueva con `infra/pruebas/deploy.sh` (que además reemplaza
     `tolatino-sync` con `flock`), compose del sandbox (Postgres+PostGIS, MinIO,
     tiempo real, observabilidad), tubería CI, primeros guardianes.
  3. Segundo bloque: puerto del sistema de diseño desde
     `docs/diseno/design-system/components-web/` + tokens → `packages/ui`, página de
     catálogo de componentes, **primera captura en el teléfono** para el OK.
  4. Después: cuenta (teléfono una vez + passkeys), ciudad (5 ciudades), taxonomía,
     Super Admin esqueleto, `docs/ayuda/` inicial.
- El fundador trabaja desde el teléfono y solo da el OK (decisión U).
- El fundador trabaja desde el teléfono y solo da el OK (decisión U).

## Infraestructura de PRUEBAS (sandbox) — creada el 5 nov
- Hetzner Cloud, proyecto `tolatino-pruebas`, servidor **`tolatino-pruebas-1`**
  (id 174559637), tipo `cx33` (4 núcleos / 8 GB / 80 GB), Falkenstein (DE),
  Ubuntu 24.04. IP `2.31.196.167`. Respaldos automáticos activos. Firewall
  `tolatino-pruebas-web` (id 11974241): solo 80/443 + ICMP de entrada.
- **Cómo se administra (sin SSH, regla U):** el servidor **se sincroniza solo** con
  la rama **`pruebas`** del repo (público) cada 60 s (`/usr/local/bin/tolatino-sync`,
  timer systemd). Si hay un commit nuevo, hace `git reset --hard origin/pruebas` y
  ejecuta `infra/pruebas/deploy.sh` si existe. Log en `/var/log/tolatino-sync.log`.
  Página de estado en `http://2.31.196.167/` (commit, hora, últimas líneas del log).
- Instalado por cloud-init: git, nginx, docker + compose, fail2ban,
  actualizaciones automáticas (reinicio 04:30 si hace falta). Usuario `deploy`.
- Emergencia: se reconstruye desde la API de Hetzner con el mismo cloud-init
  (`rebuild`), sin tocar nada a mano. La llave SSH de arranque
  (`tolatino-bootstrap`, id 132214722) existe en Hetzner pero su parte privada no se
  conserva: el acceso es por el repo y por la API.
- El token de la API vive en los secretos del entorno de Claude Code (solo pruebas).

## Pendiente inmediato
1. ~~Verificado por el fundador (5 nov 00:08 EST): la página de estado carga, sync en commit 430e46a.~~ **Defecto conocido:** en el primer arranque `tolatino-sync` corrió dos veces a la vez (runcmd + timer) y chocó el clone; se autocorrigió al minuto. **Corregir en Fase 0:** `deploy.sh` reemplaza `/usr/local/bin/tolatino-sync` con una versión con `flock`.
2. ~~OK del fundador al plan~~ dado el 5 nov.
3. ~~Pexels~~ hecho (5 nov): clave nueva en los secretos del entorno, probada (HTTP 200).
4. Crear la rama `pruebas` nueva (hoy apunta al código v1) con `infra/pruebas/deploy.sh`
   cuando empiece la Fase 0.
