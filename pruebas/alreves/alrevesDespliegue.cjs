// Prueba al revés de la tanda 5 de la revisión del CI (22 nov): el despliegue del sandbox, más rápido y sin que pueda quedarse caído. Cada caso rompe a
// propósito un script o una configuración del despliegue y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se restaura y
// los guardianes quedan limpios:
//   sandboxSeArreglaSolo · tolatino-sync se reinstala con un install directo, sin bash -n o sin cambio atómico; tolatino-sync deja de comprobar un
//   script que deploy.sh carga, o corre deploy.sh aunque no pase; la prueba de infra que lo demuestra deja de correr.
//   migracionConTransaccion · una migración nueva sin begin/commit, o con «index concurrently» dentro; el encabezado de migrar.sh vuelve a decir que
//   todas traen begin/commit.
//   migrarUnaLectura · migrar.sh vuelve a preguntar archivo por archivo; aplica sin anotar en la misma sesión o sin comprobar que quedó anotada; la
//   prueba contra Postgres 16 deja de correr.
//   imagenSoloLoQueUsa · el .dockerignore deja fuera algo que el build lee (LAUNCH, que fallaría en silencio; un JSON de apps/mobile; un import nuevo
//   a scripts/) o deja entrar algo que nadie lee; sin «*», sin excluir node_modules; el commit vuelve a entrar al build; la prueba con BuildKit no corre.
//   imagenSoloSiCambia · se salta el build solo con la huella (sin el Id de la imagen); la huella deja de mirar lo que no está versionado; la prueba no corre;
//   (tanda 5b) vuelve «| grep -q» a huella_imagen; web.build con «target:» o con «args:» que no son el commit.
//   despliegueSinCorte · la app se cambia antes de migrar, vuelve «up --build», un build que falla se reintenta o no sale; barrido sin init o con 10 s
//   de gracia; nginx sin la página de mantenimiento o con server_tokens; una configuración de nginx que no pasa nginx -t se queda; las pruebas no corren;
//   (tanda 5b) vuelve «.anterior» sin «nginx -t»; la semilla, el mapa o la recarga de nginx cortan entre migrar y cambiar; el «up» sin esperar «healthy»;
//   no se mira el commit que sirve /api/salud; umask 077 suelto; la carpeta de mantenimiento sin 755.
//   despliegueConTramos · sin la línea de tramos al salir, un tramo que falta o fuera de su sitio, /estado/ sin el enlace, la prueba sin el caso del fallo.
//   migracionReversible (tanda 5b) · columna NOT NULL sin default o «set not null» en una tabla con INSERT; cambio de tipo en una cláusula que no es la
//   primera; una función con otra firma.
//   pruebasInfraAisladas (tanda 5b) · «aislado» sin red aparte o sin tapar /opt; una prueba que vuelve a «unshare» suelto; la del tolatino-sync sin
//   aislar_exige; correr.sh corre las que despliegan aunque el aislamiento no pase.
//   despliegueCorto (23 nov) · la imagen sin la caché de pnpm o de .next, «COPY . .» antes de instalar, sin la llave estable (o sin renovarla), la llave
//   escrita en la receta o en el repo, deploy.sh con --no-cache, tolatino-sync de vuelta a 60 s (en la máquina viva o en el cloud-init).
//   vistaPreviaRetirada (24 nov) · vuelve la carpeta del sitio de vista previa, su puerto (8081), el de su servidor (3010) o un «next dev» en la
//   infraestructura, algo que la nombra fuera del paso de limpieza; el paso de limpieza sin el contenedor, la imagen, una ruta o «drop owned by», con un
//   «drop»/«rm -rf» de más, con exit, sin comprobar que el usuario existe, llamado sin «|| log» o después de nginx.
// «crear» (el texto a cambiar es null): se crea el archivo, se corre el guardián y se quita.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'infra/pruebas/deploy.sh', S = 'infra/pruebas/tolatino-sync', L = 'infra/comun/lib.sh', C = 'pruebas/infra/correr.sh', M = 'packages/db/migrar.sh';
const NUEVA = 'packages/db/migrations/0999_alreves_despliegue.sql';
const N = 'infra/pruebas/nginx-pruebas.conf', O = 'pruebas/infra/orden-despliegue.test.sh';
const AI = 'pruebas/infra/aislar.sh', SP = 'pruebas/infra/sync-pruebas.test.sh';
const I = '.dockerignore', DF = 'infra/pruebas/Dockerfile', Y = 'infra/pruebas/docker-compose.yml', AN = 'apps/web/lib/app-nativa-comun.ts';
const casos = [
  ['sandboxSeArreglaSolo', D, 'SYNC_R=0; instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync || SYNC_R=$?',
    'SYNC_R=0; install -m 0755 "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync || SYNC_R=$?', 'nunca con un install directo'],
  ['sandboxSeArreglaSolo', L, '; se queda el anterior"\n  return 2\n', '; se queda el anterior"\n  return 1\n', 'separa «no es bash válido» (1) de «no se pudo instalar»'],
  ['sandboxSeArreglaSolo', D, '  *) echo "tolatino-sync: el del commit $COMMIT no se pudo instalar (¿disco lleno?); sigue el anterior', '  *) echo "tolatino-sync: el del commit $COMMIT NO es bash válido; sigue el anterior', 'separa «no es bash válido» (1) de «no se pudo instalar»'],
  ['sandboxSeArreglaSolo', L, '  if ! err=$(bash -n "$src" 2>&1); then', '  if ! err=$(true 2>&1); then', 'bash -n primero'],
  ['sandboxSeArreglaSolo', L, '  if install -m "$modo" "$src" "$tmp" && mv -f "$tmp" "$dst"; then return 0; fi', '  if install -m "$modo" "$src" "$dst"; then return 0; fi', 'cambio atómico'],
  ['sandboxSeArreglaSolo', S, ' infra/pruebas/medios.sh packages/db/migrar.sh"', ' infra/pruebas/medios.sh"', 'no comprueba con bash -n packages/db/migrar.sh'],
  ['sandboxSeArreglaSolo', S, '  elif [ -f infra/pruebas/deploy.sh ]; then', '  fi\n  if [ -f infra/pruebas/deploy.sh ]; then', 'tolatino-sync NO lo corre'],
  ['sandboxSeArreglaSolo', C, '  seccion "el sandbox se arregla solo (su tolatino-sync)"; bash pruebas/infra/sync-pruebas.test.sh || mal=1\n', '', 'no corren pruebas/infra/sync-pruebas.test.sh'],
  ['migracionConTransaccion', NUEVA, null, 'create table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, '-- al revés\nbegin;\ncreate table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, 'begin;\ncreate index concurrently alreves_i on cities (id);\ncommit;\n', '«index concurrently» no puede ir dentro de begin/commit'],
  ['migracionConTransaccion', M, 'SALVO 16 viejas que no lo traen', 'como todas (los .sql traen begin/commit)', 'el encabezado de migrar.sh dice la verdad'],
  ['migrarUnaLectura', M, '  prev=${HECHAS[$n]:-}\n  if [ -z "$prev" ]; then', '  prev=$(psql -c "select sha256 from schema_migrations where name = \'$n\'")\n  if [ -z "$prev" ]; then', 'archivo por archivo'],
  ['migrarUnaLectura', M, '\nleer schema_migrations\nnuevas=0\n', '\nnuevas=0\n', 'lee schema_migrations y schema_seeds una vez'],
  ['migrarUnaLectura', M, '  { cat "$f"; printf \'\\n;\\n%s\\n\' "$sql"; } | psql -v', '  psql < "$f"\n  printf \'%s\\n\' "$sql" | psql -v', 'en la misma sesión de psql'],
  ['migrarUnaLectura', M, "where name = :'tl_m_nombre' and sha256 = :'tl_m_huella';\")\" != 1 ]", "where false;\")\" != 0 ]", 'se comprueba que quedó anotada'],
  ['migrarUnaLectura', C, '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then seccion "migraciones en una lectura (migrar.sh contra Postgres 16)"; bash pruebas/infra/migrar.test.sh || mal=1\n',
    '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then :\n', 'no corren pruebas/infra/migrar.test.sh'],
  ['imagenSoloLoQueUsa', I, '!docs/LAUNCH-CHECKLIST.md\n', '', 'docs/LAUNCH-CHECKLIST.md se lee al construir o al servir la imagen y el .dockerignore lo deja fuera'],
  ['imagenSoloLoQueUsa', I, '!apps/mobile/apps.json\n', '', 'apps/mobile/apps.json se lee al construir o al servir la imagen y el .dockerignore lo deja fuera'],
  ['imagenSoloLoQueUsa', AN, 'import APPS from "../../mobile/apps.json";', 'import APPS from "../../mobile/apps.json";\nimport "../../../scripts/ci/alcance.mjs";', 'scripts/ci/alcance.mjs se lee al construir'],
  // Tanda 5b · las lecturas del disco que el guardián no veía (relativas a process.cwd() sin ../, o por segmentos), en lista cerrada.
  ['imagenSoloLoQueUsa', 'apps/web/lib/zz-alreves-lee.ts', null, 'import { readFileSync } from "fs";\nimport path from "path";\nexport const t = () => readFileSync(path.join(process.cwd(), "docs/legal/us/terminos.md"), "utf8");\n', 'no está en la lista cerrada de lecturas'],
  ['imagenSoloLoQueUsa', 'apps/web/lib/zz-alreves-lee.ts', null, 'import { readFile } from "fs/promises";\nimport path from "path";\nexport const t = () => readFile(path.join(process.cwd(), "..", "..", "scripts", "legal", "indexar.mjs"), "utf8");\n', 'no está en la lista cerrada de lecturas'],
  ['imagenSoloLoQueUsa', 'apps/web/lib/ciudades/launch.ts', '  const f = CANDIDATOS().find((x) => existsSync(x));', '  const f = CANDIDATOS().find((x) => existsSync(x)) ?? (existsSync("/x") ? "/x" : undefined);', 'cambió el número de lecturas del disco'],
  ['imagenSoloLoQueUsa', I, '!docs/LAUNCH-CHECKLIST.md\n', '!docs/LAUNCH-CHECKLIST.md\n!infra/pruebas\n', '«!infra/pruebas» no lo lee el build'],
  ['imagenSoloLoQueUsa', I, '\n*\n!package.json', '\n!package.json', 'empieza con «*»'],
  ['imagenSoloLoQueUsa', I, '**/node_modules\n', '', 'no deja fuera **/node_modules'],
  ['imagenSoloLoQueUsa', DF, 'FROM deps AS build\n', 'FROM deps AS build\nARG TOLATINO_COMMIT=desconocido\n', 'el commit no entra al build'],
  ['imagenSoloLoQueUsa', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      args:\n        TOLATINO_COMMIT: ${TOLATINO_COMMIT:-desconocido}\n', 'no pasa el commit al build'],
  ['imagenSoloLoQueUsa', C, 'seccion "la imagen de la app: lo que BuildKit de verdad manda (contexto-imagen.test.sh)"; bash pruebas/infra/contexto-imagen.test.sh || mal=1\n', '', 'no corren pruebas/infra/contexto-imagen.test.sh'],
  ['imagenSoloSiCambia', D, '[ -n "$HUELLA" ] && [ -n "$IMAGEN_ANTES" ] && [ "$(cat /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA $IMAGEN_ANTES" ]',
    '[ -n "$HUELLA" ] && [ "$(cut -d" " -f1 /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA" ]', 'la huella Y el Id de la imagen'],
  ['imagenSoloSiCambia', L, '  estado=$(git status --porcelain --ignored -- .dockerignore infra/pruebas/Dockerfile "${rutas[@]}" 2>/dev/null) || return 0', '  estado=""', 'sin versionar o cambiado'],
  ['imagenSoloSiCambia', L, '  [ -n "$sucio" ] && return 0\n', '  printf \'%s\\n\' "$sucio" | grep -q . && return 0\n', 'sin «| grep -q»'],
  ['imagenSoloSiCambia', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      target: build\n', 'solo lleva «context: ../..» y «dockerfile'],
  ['imagenSoloSiCambia', Y, '      dockerfile: infra/pruebas/Dockerfile\n', '      dockerfile: infra/pruebas/Dockerfile\n      args:\n        NODE_ENV: production\n', 'solo lleva «context: ../..» y «dockerfile'],
  ['imagenSoloSiCambia', C, 'seccion "la imagen de la app: su huella (huella-imagen.test.sh)"; bash pruebas/infra/huella-imagen.test.sh || mal=1\n', '', 'no corren pruebas/infra/huella-imagen.test.sh'],
  ['despliegueSinCorte', D, '\n# 3c) Base de datos: migraciones pendientes, en orden, una sola vez cada una (con la app vieja sirviendo). Si una falla, se detiene aquí.\nbash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"\n',
    '\n', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '  if ! "${COMPOSE[@]}" build web; then', '  if ! "${COMPOSE[@]}" up -d --build --remove-orphans; then', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '    log "la imagen no se pudo construir: la app sigue con lo de antes"\n    exit 1\n', '    log "la imagen no se pudo construir: se reintenta"\n    "${COMPOSE[@]}" build web || exit 1\n', 'el orden es base → construir'],
  ['despliegueSinCorte', D, '"${COMPOSE[@]}" up -d db medios ||', '"${COMPOSE[@]}" up -d --build db medios ||', 'ningún «up -d --build»'],
  ['despliegueSinCorte', Y, 'como mucho.\n    init: true\n', 'como mucho.\n    init: false\n', '«barrido» para en el acto'],
  ['despliegueSinCorte', Y, '  push:\n    image: tolatino/web:pruebas\n', '  push:\n    stop_grace_period: 10s\n    image: tolatino/web:pruebas\n', '«push» para en el acto'],
  ['despliegueSinCorte', N, '    error_page 502 504 =503 /mantenimiento.html;\n', '', 'la página de mantenimiento (503)'],
  ['despliegueSinCorte', N, '    server_tokens off;\n', '', 'server_tokens off'],
  ['despliegueSinCorte', D, 'install -m 0644 "$REPO/infra/comun/mantenimiento/index.html" /var/www/mantenimiento/index.html || aviso', ': || aviso', 'instala la página de mantenimiento'],
  ['despliegueSinCorte', D, '  if [ -f "$NGINX_SITIO.buena" ]; then\n    cp -p "$NGINX_SITIO.buena" "$NGINX_SITIO"', '  if false; then\n    cp -p "$NGINX_SITIO.buena" "$NGINX_SITIO"', 'vuelve la última buena'],
  ['despliegueSinCorte', D, 'NGINX_SITIO=/etc/nginx/sites-available/tolatino-pruebas\n', 'NGINX_SITIO=/etc/nginx/sites-available/tolatino-pruebas\ncp -p "$NGINX_SITIO" "$NGINX_SITIO.anterior" || true\n', 'vuelve la última buena'],
  ['despliegueSinCorte', D, ' "${COMPOSE[@]}" \\\n  || aviso "la semilla de pruebas falló', ' "${COMPOSE[@]}"\ntrue \\\n  || aviso "la semilla de pruebas falló', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '"${COMPOSE_MAPA[@]}" up -d mapa || log "teselas', '"${COMPOSE_MAPA[@]}" up -d mapa; true || log "teselas', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '  nginx_recargar\nelse\n', '  systemctl reload nginx\nelse\n', 'ningún paso accesorio corta'],
  ['despliegueSinCorte', D, '\nbase_sana 60 10 || log "la base no quedó', '\nbase_lista 60 10 || log "la base no quedó', 'se espera a que Docker dé la base por «healthy»'],
  ['despliegueSinCorte', D, '  base_sana 60 10 || true\n', '  base_lista 60 10 || true\n', 'se espera a que Docker dé la base por «healthy»'],
  ['despliegueSinCorte', D, '  if [ "$SERVIDO" != "$COMMIT" ]; then', '  if false; then', 'el commit que dice /api/salud tiene que ser el desplegado'],
  ['despliegueSinCorte', D, '  ( umask 077\n', '  umask 077\n  (\n', 'el umask 077 solo en un subshell'],
  ['despliegueSinCorte', D, 'install -d -m 0755 /var/www/mantenimiento\n', 'mkdir -p /var/www/mantenimiento\n', 'carpeta de mantenimiento 755'],
  ['despliegueSinCorte', C, '  seccion "el orden del despliegue del sandbox: construir → migrar → cambiar (orden-despliegue.test.sh)"; bash pruebas/infra/orden-despliegue.test.sh || mal=1\n', '', 'orden-despliegue.test.sh'],
  ['despliegueSinCorte', C, 'seccion "la página de mantenimiento con el nginx del sandbox (mantenimiento-nginx.test.sh)"; bash pruebas/infra/mantenimiento-nginx.test.sh || mal=1\n', '', 'mantenimiento-nginx.test.sh'],
  ['despliegueConTramos', D, "\ntrap 'fin_tramos $?' EXIT\n", '\n', 'deja su línea de tramos en el registro y en /estado/tramos.txt'],
  ['despliegueConTramos', D, '\ntramo migraciones\n', '\n', 'falta «tramo migraciones» en su sitio'],
  ['despliegueConTramos', D, '\ntramo recrear\n', '\n', 'falta «tramo recrear» en su sitio'],
  ['despliegueConTramos', S, " · <a href='/estado/tramos.txt'>Tramos</a>", '', '/estado/ enlaza tramos.txt'],
  ['despliegueConTramos', O, "tramos (fallo en imagen, commit", "tramos (fallo, commit", 'la prueba del orden comprueba la línea de tramos'],
  // Tanda 5b · migracionReversible: lo que rompe las escrituras de la app vieja mientras se migra (construir → migrar → cambiar).
  ['migracionReversible', NUEVA, null, 'begin;\nalter table audit_entries add column alreves_x text not null;\ncommit;\n', 'NOT NULL sin valor por omisión en «audit_entries»'],
  ['migracionReversible', NUEVA, null, 'begin;\nalter table audit_entries alter column alreves_y set not null;\ncommit;\n', '«set not null» de «audit_entries.alreves_y»'],
  ['migracionReversible', NUEVA, null, 'begin;\nalter table operations add column alreves_z int, alter column city_id type bigint;\ncommit;\n', 'cambio de tipo de «operations.city_id»'],
  ['migracionReversible', NUEVA, null, 'begin;\ncreate or replace function patrocinio_devolucion(x integer) returns integer language sql as $$ select x $$;\ncommit;\n', 'otra firma de la función «patrocinio_devolucion»'],
  ['pruebasInfraAisladas', AI, 'unshare -m -n --propagation private', 'unshare -m --propagation private', 'montajes Y red aparte'],
  ['pruebasInfraAisladas', AI, 'AISLAR_RUTAS="/opt /etc/tolatino', 'AISLAR_RUTAS="/etc/tolatino', 'faltan: /opt'],
  ['pruebasInfraAisladas', SP, 'aislar_exige "$T/trabajo/infra/pruebas/tolatino-sync" TOLATINO_SYNC_REPO TOLATINO_SYNC_DIR || exit 1\n', '', 'aislar_exige comprueba que lee TOLATINO_SYNC_REPO'],
  ['pruebasInfraAisladas', O, 'AISLAR_VISIBLES="$T" aislado \'', 'unshare -m --propagation private bash -c \'', 'nada de «unshare» suelto'],
  ['pruebasInfraAisladas', C, 'if [ "$AISLADO" = 1 ]; then', 'if [ "$(id -u)" = 0 ]; then', 'aislar.test.sh primero'],
  // 23 nov · despliegueCorto: la imagen pierde una de sus cachés (o la llave estable que hace servir la de webpack), la llave queda escrita, deploy.sh
  // construye sin caché, tolatino-sync vuelve a 60 s.
  ['despliegueCorto', DF, 'RUN --mount=type=cache,id=tolatino-pnpm,target=/pnpm/store,sharing=locked \\\n    pnpm install --frozen-lockfile --store-dir /pnpm/store\n', 'RUN pnpm install --frozen-lockfile\n', 'la capa de dependencias copia solo los manifiestos'],
  ['despliegueCorto', DF, 'FROM base AS deps\n', 'FROM base AS deps\nCOPY . .\n', 'la capa de dependencias copia solo los manifiestos'],
  ['despliegueCorto', DF, 'RUN --mount=type=cache,id=tolatino-next,target=/repo/apps/web/.next/cache,sharing=locked \\\n', 'RUN ', 'usa la caché de BuildKit en /repo/apps/web/.next/cache'],
  ['despliegueCorto', DF, 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat "$K")" pnpm', 'pnpm', 'la llave de las acciones del servidor, estable'],
  ['despliegueCorto', DF, '-mtime +13', '-mtime +9999', 'la llave de las acciones del servidor, estable'],
  ['despliegueCorto', DF, 'ENV NEXT_TELEMETRY_DISABLED=1\nCOPY . .', 'ENV NEXT_TELEMETRY_DISABLED=1\nENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=abcdefghijklmnop\nCOPY . .', 'nunca va escrita en la receta'],
  ['despliegueCorto', 'infra/pruebas/zz-alreves.env', null, 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz012345\n', 'escrita en el repo'],
  ['despliegueCorto', D, '  if ! "${COMPOSE[@]}" build web; then', '  if ! "${COMPOSE[@]}" build web --no-cache; then', 'sin --no-cache'],
  ['despliegueCorto', D, 'OnUnitActiveSec=20\\nAccuracySec=1s', 'OnUnitActiveSec=60', 'cada 20 s con AccuracySec=1s'],
  ['despliegueCorto', 'infra/pruebas/cloud-init.yml', '      OnUnitActiveSec=20\n      AccuracySec=1s\n', '      OnUnitActiveSec=60\n', 'el cloud-init del sandbox nace'],
  // 24 nov · vistaPreviaRetirada: la vista previa vuelve por la puerta de atrás o el paso de limpieza de deploy.sh deja de limpiar, toca de más o corta.
  ['vistaPreviaRetirada', 'infra/pruebas/vista-previa', null, 'VISTA_ENCENDIDA=1\n', 'su carpeta no vuelve'],
  ['vistaPreviaRetirada', N, '    listen 80 default_server;\n', '    listen 80 default_server;\n    listen 8081;\n', 'ni su puerto (8081)'],
  ['vistaPreviaRetirada', 'infra/pruebas/zz-alreves-dev.sh', null, 'pnpm --filter @tolatino/web exec next dev -p 3000\n', 'ni un «next dev»'],
  ['vistaPreviaRetirada', 'infra/pruebas/zz-alreves-puerto.yml', null, 'ports: ["127.0.0.1:3010:3010"]\n', 'ni el de su servidor (3010)'],
  ['vistaPreviaRetirada', 'infra/produccion/zz-alreves.yml', null, 'image: tolatino/vista-previa:pruebas\n', 'solo la nombra el paso de limpieza'],
  ['vistaPreviaRetirada', D, '\ntramo nginx\n', '\ntramo nginx\ndocker stop tolatino-pruebas-vista-previa-1 || true\n', 'solo la nombra el paso de limpieza'],
  ['vistaPreviaRetirada', D, 'docker rm -f "$c"', 'docker stop "$c"', 'docker rm -f del contenedor'],
  ['vistaPreviaRetirada', D, ' do quedaba=1; docker image rm -f "$i" >/dev/null 2>&1 || true; done', ' do quedaba=1; done', 'la imagen tolatino/vista-previa'],
  ['vistaPreviaRetirada', D, ' /var/www/vista /etc/tolatino/vista.env; do', ' /etc/tolatino/vista.env; do', 'las tres rutas'],
  ['vistaPreviaRetirada', D, '  case "$r" in existia*)', '  rm -rf /var/lib/tolatino\n  case "$r" in existia*)', 'solo borra sus tres rutas'],
  ['vistaPreviaRetirada', D, "  if exists (select 1 from pg_roles where rolname = 'tolatino_vista') then\n", '  if true then\n', 'solo si existe'],
  ['vistaPreviaRetirada', D, '    drop owned by tolatino_vista;\n', '', '«drop owned by» y «drop role»'],
  ['vistaPreviaRetirada', D, '    drop role tolatino_vista;\n', '    drop role tolatino_vista;\n    drop role tolatino;\n', 'solo toca a tolatino_vista'],
  ['vistaPreviaRetirada', D, '  ) || return 1\n', '  ) || exit 1\n', 'nunca corta el despliegue'],
  ['vistaPreviaRetirada', D, '\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n', '\nretirar_vista_previa\n', 'se llama una sola vez y con «|| log …»'],
  ['vistaPreviaRetirada', D, '\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n\ntramo nginx\n', '\n\ntramo nginx\nretirar_vista_previa || log "vista previa: no se pudo retirar todo (se reintenta en el próximo despliegue; la app no se entera)"\n', 'antes de nginx'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (g, que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián NO falló'}`);
  if (l) bien++;
};
for (const [g, f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  if (a === null) {
    if (fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: ${f} ya existe (el caso lo crea)`); continue; }
    fs.writeFileSync(ruta, b);
    try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.rmSync(ruta, { force: true }); }
    continue;
  }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
