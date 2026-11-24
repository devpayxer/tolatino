#!/bin/bash
# 23 nov · El bucle del sitio de vista previa del sandbox (SOLO pruebas; guardián vistaPreviaAcotada). El fundador trabaja desde el teléfono y va
# descubriendo ajustes de diseño uno a uno: quiere verlos en 1-2 minutos, no en lo que tarda un despliegue (construir la imagen). Aquí la web corre en
# modo desarrollo (next dev) sobre una copia APARTE que sigue UNA rama (VISTA_RAMA, de infra/pruebas/vista-previa/vista.conf): un cambio de pantalla
# empujado a esa rama se ve en segundos, sin construir nada.
# Corre dentro del contenedor «vista-previa» (perfil «vista» del compose; usuario sin privilegios, memoria y CPU acotadas). Este archivo se monta de
# solo lectura desde la copia de «pruebas» (/opt/tolatino), NUNCA desde la rama que sigue: la rama de trabajo no puede cambiar sus propias reglas.
# Reglas (las vigila el guardián; prueba: pruebas/infra/vista-previa.test.sh):
#   · NUNCA migra ni siembra: de la base solo LEE qué migraciones tiene (un «select» a schema_migrations), y su usuario de la base (tolatino_vista) solo
#     puede leer y escribir filas (infra/pruebas/vista-previa/encender.sh): ni crear ni cambiar tablas.
#   · Si la rama trae una migración que la base no tiene (o con otra huella), se detiene ANTES de tocar la copia (no se sirve código que espera una base
#     que no existe): para next dev, deja el aviso «pausa» y nginx muestra la página de pausa hasta que la base la tenga (cuando «pruebas» la despliegue).
#   · Cada ~12 s: git fetch de ESA rama y reset --hard de ESTA copia solamente; pnpm install solo si cambió el pnpm-lock.yaml.
#   · next dev con webpack, no con Turbopack: medido el 23 nov en esta app, Turbopack se quedó más de 7 min compilando con 5 GB; webpack sirvió la
#     portada en 20 s con 1,7 GB.
#   · Si next dev se cae, se vuelve a arrancar (con espera creciente); si este bucle muere, el contenedor se reinicia como mucho 5 veces y no toca «web».
# Variables solo de la prueba (el contenedor no las tiene): VISTA_REPO_URL, VISTA_DIR, VISTA_UNA_VUELTA, VISTA_APLICADAS_CMD, VISTA_INSTALAR, VISTA_ARRANCAR.
set -u
export LC_ALL=C
RAMA=${VISTA_RAMA:-}
URL=${VISTA_REPO_URL:-https://github.com/devpayxer/tolatino.git}
BASE=${VISTA_DIR:-/vista}
INTERVALO=${VISTA_INTERVALO:-12}
PUERTO=${VISTA_PUERTO:-3010}
REPO="$BASE/repo"; CONTROL="$BASE/control"
PAUSA="$CONTROL/pausa"; PID_F="$CONTROL/dev.pid"; COMMIT_F="$CONTROL/commit"; INSTALADO_F="$CONTROL/instalado"
mkdir -p "$CONTROL" || exit 1

log() {
  local l
  l="$(date -Is) $*"
  echo "[vista] $l"
  echo "$l" >> "$CONTROL/registro.txt"
  if [ "$(wc -l < "$CONTROL/registro.txt")" -gt 400 ]; then tail -n 200 "$CONTROL/registro.txt" > "$CONTROL/registro.nuevo" && mv -f "$CONTROL/registro.nuevo" "$CONTROL/registro.txt"; fi
}

# Una sola rama, la de vista.conf. Nunca «produccion» ni un nombre raro (la rama va a git como argumento).
case "$RAMA" in
  ''|produccion|-*|*..*) log "VISTA_RAMA no válida («$RAMA»): no se sigue nada"; exit 64 ;;
esac
if ! [[ "$RAMA" =~ ^[A-Za-z0-9._/-]+$ ]]; then log "VISTA_RAMA no válida («$RAMA»): no se sigue nada"; exit 64; fi

dev_vivo() { [ -f "$PID_F" ] && kill -0 "$(cat "$PID_F")" 2>/dev/null; }
parar_dev() {
  dev_vivo || { rm -f "$PID_F"; return 0; }
  local p i
  p=$(cat "$PID_F")
  kill -TERM -- "-$p" 2>/dev/null || kill -TERM "$p" 2>/dev/null
  for _ in $(seq 1 20); do kill -0 "$p" 2>/dev/null || break; sleep 0.5; done
  kill -KILL -- "-$p" 2>/dev/null || kill -KILL "$p" 2>/dev/null
  rm -f "$PID_F"
  log "next dev parado"
}
CAIDAS=0; ULTIMO_ARRANQUE=0
arrancar_dev() {
  # Si se cae enseguida una y otra vez (un error de la rama), se espera más entre arranques (hasta 2 min); nunca tumba el contenedor.
  if [ "$ULTIMO_ARRANQUE" -gt 0 ] && [ $((SECONDS - ULTIMO_ARRANQUE)) -lt 60 ]; then CAIDAS=$((CAIDAS + 1)); else CAIDAS=0; fi
  if [ "$CAIDAS" -gt 0 ]; then
    local espera=$((CAIDAS * 15)); [ "$espera" -gt 120 ] && espera=120
    log "next dev se cayó (vez $CAIDAS seguida): se espera $espera s antes de volver a arrancarlo (registro: dev.log)"
    sleep "$espera"
  fi
  ULTIMO_ARRANQUE=$SECONDS
  local cmd=${VISTA_ARRANCAR:-"cd apps/web && exec ./node_modules/.bin/next dev -H 0.0.0.0 -p $PUERTO"}
  [ -f "$CONTROL/dev.log" ] && tail -n 2000 "$CONTROL/dev.log" > "$CONTROL/dev.log.nuevo" && mv -f "$CONTROL/dev.log.nuevo" "$CONTROL/dev.log"
  # setsid: next dev y sus hijos en su propio grupo, para pararlos juntos.
  ( cd "$REPO" && TOLATINO_COMMIT="vista-$(cut -c1-7 "$COMMIT_F" 2>/dev/null)" exec setsid bash -c "$cmd" >> "$CONTROL/dev.log" 2>&1 ) &
  echo $! > "$PID_F"
  log "next dev arrancado (commit $(cut -c1-7 "$COMMIT_F" 2>/dev/null))"
  calentar &
}

# 23 nov · En modo desarrollo cada página se compila la PRIMERA vez que alguien la pide (medido por el fundador en su teléfono: la portada se quedó
# cargando más de un minuto y parecía que seguía en pausa). Al arrancar, el propio bucle pide las pantallas principales, una tras otra, para que
# ya estén compiladas cuando él llegue. Solo lecturas (GET) a 127.0.0.1; si algo falla no pasa nada. VISTA_CALENTAR=0 lo apaga (las pruebas).
RUTAS_CALIENTES=${VISTA_RUTAS:-"/ /negocios /n/sabor-dominicano /n/barberia-el-primo /comunidad /eventos /buscar /cuenta /panel /admin"}
calentar() {
  [ "${VISTA_CALENTAR:-1}" = 1 ] || return 0
  local t0=$SECONDS n=0 r
  for _ in $(seq 1 90); do node -e "fetch('http://127.0.0.1:$PUERTO/api/salud').then(()=>process.exit(0),()=>process.exit(1))" 2>/dev/null && break; sleep 2; done
  for r in $RUTAS_CALIENTES; do
    node -e "fetch('http://127.0.0.1:$PUERTO$r',{redirect:'manual',signal:AbortSignal.timeout(240000)}).then(()=>process.exit(0),()=>process.exit(1))" 2>/dev/null && n=$((n + 1))
  done
  log "páginas principales ya compiladas: $n en $((SECONDS - t0)) s"
}

traer() {
  if [ ! -d "$REPO/.git" ]; then
    rm -rf "$REPO"
    # Sin checkout: los archivos solo se ponen después de comprobar las migraciones (vuelta).
    git clone -q --no-checkout --depth 50 --single-branch --branch "$RAMA" "$URL" "$REPO" 2>>"$CONTROL/registro.txt" || { log "no se pudo clonar $RAMA"; return 1; }
    log "copia nueva de $RAMA"
  fi
  git -C "$REPO" fetch -q --depth 50 origin "+refs/heads/$RAMA:refs/remotes/origin/$RAMA" 2>>"$CONTROL/registro.txt" || { log "fetch de $RAMA falló (sigue lo de antes)"; return 1; }
}

# Lo que la base ya tiene: «nombre huella» por línea, de schema_migrations (solo lectura).
aplicadas() {
  if [ -n "${VISTA_APLICADAS_CMD:-}" ]; then bash -c "$VISTA_APLICADAS_CMD"; return; fi
  PGCONNECT_TIMEOUT=5 psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select name || ' ' || sha256 from schema_migrations"
}
# pendientes COMMIT: las migraciones de ese commit que la base no tiene con la misma huella (la misma cuenta que packages/db/migrar.sh: nombre del archivo
# y sha256 de su contenido). Sale con 2 si no pudo leer la base (entonces no se cambia nada).
pendientes() {
  local c="$1" lista ap
  lista="$CONTROL/migraciones-$c"
  if [ ! -s "$lista" ]; then
    rm -f "$CONTROL"/migraciones-*
    git -C "$REPO" ls-tree --name-only "$c" packages/db/migrations/ | grep '\.sql$' | while read -r f; do
      echo "${f##*/} $(git -C "$REPO" show "$c:$f" | sha256sum | cut -d' ' -f1)"
    done | sort > "$lista.tmp" && mv -f "$lista.tmp" "$lista"
  fi
  ap=$(aplicadas) || return 2
  comm -23 "$lista" <(printf '%s\n' "$ap" | sort) | cut -d' ' -f1
}

instalar_deps() {
  log "pnpm install (cambió el pnpm-lock.yaml o no estaba instalado)"
  if [ -n "${VISTA_INSTALAR:-}" ]; then (cd "$REPO" && bash -c "$VISTA_INSTALAR")
  else (cd "$REPO" && pnpm install --frozen-lockfile --prefer-offline --store-dir "$BASE/pnpm-store" --filter "@tolatino/web..." >> "$CONTROL/dev.log" 2>&1)
  fi || { log "pnpm install falló (se reintenta en la próxima vuelta)"; return 1; }
  sha256sum "$REPO/pnpm-lock.yaml" | cut -d' ' -f1 > "$INSTALADO_F"
}

vuelta() {
  traer || return 0
  local nuevo p r actual
  nuevo=$(git -C "$REPO" rev-parse "refs/remotes/origin/$RAMA" 2>/dev/null) || return 0
  # 1) Las migraciones ANTES de tocar la copia.
  p=$(pendientes "$nuevo"); r=$?
  if [ "$r" != 0 ]; then log "no se pudo leer qué migraciones tiene la base: no se cambia nada"; return 0; fi
  if [ -n "$p" ]; then
    [ -f "$PAUSA" ] || log "EN PAUSA: ${nuevo:0:7} trae migraciones que la base no tiene ($(echo $p)); se ve en el sandbox cuando «pruebas» las despliegue"
    { echo "commit $nuevo"; echo "$p"; } > "$PAUSA"
    parar_dev
    return 0
  fi
  if [ -f "$PAUSA" ]; then rm -f "$PAUSA"; log "sale de la pausa: la base ya tiene las migraciones de la rama"; fi
  # 2) La copia al día (solo esta copia).
  actual=$(cat "$COMMIT_F" 2>/dev/null || true)
  if [ "$actual" != "$nuevo" ] || [ ! -f "$REPO/package.json" ]; then
    git -C "$REPO" reset -q --hard "$nuevo" && git -C "$REPO" clean -qfd || { log "reset falló"; return 0; }
    echo "$nuevo" > "$COMMIT_F"
    log "al día con $RAMA: ${nuevo:0:7}"
    # 24 nov · Con un cambio nuevo, las pantallas principales se vuelven a compilar ANTES de que alguien las pida (si next dev sigue vivo; si no, lo hace al arrancar).
    if dev_vivo; then calentar & fi
  fi
  # 3) Dependencias solo si cambió el lockfile.
  if [ "$(cat "$INSTALADO_F" 2>/dev/null)" != "$(sha256sum "$REPO/pnpm-lock.yaml" 2>/dev/null | cut -d' ' -f1)" ]; then
    parar_dev
    instalar_deps || return 0
  fi
  # 4) next dev arriba (recarga solo los archivos que cambian).
  if ! dev_vivo; then
    # 24 nov · Si había un next dev y ya no está, queda dicho (con la última línea de su registro): un reinicio que nadie pidió se ve en /estado/vista.txt.
    [ -f "$PID_F" ] && log "next dev ya no estaba vivo (se vuelve a arrancar): $(tail -n 1 "$CONTROL/dev.log" 2>/dev/null | cut -c1-160)"
    arrancar_dev
  fi
}

estado() {
  local e=arrancando
  if [ -f "$PAUSA" ]; then e="EN PAUSA (la rama trae migraciones que la base no tiene)"; elif dev_vivo; then e=sirviendo; fi
  { echo "vista previa · rama $RAMA · commit $(cut -c1-7 "$COMMIT_F" 2>/dev/null) · $e · $(date -Is)"; echo; tail -n 40 "$CONTROL/registro.txt" 2>/dev/null; } > "$CONTROL/estado.nuevo" \
    && mv -f "$CONTROL/estado.nuevo" "$CONTROL/estado.txt"
}

if [ "${VISTA_UNA_VUELTA:-0}" = 1 ]; then vuelta; estado; exit 0; fi
trap 'parar_dev; exit 0' TERM INT
log "empieza: rama $RAMA, cada $INTERVALO s"
while :; do
  vuelta
  estado
  sleep "$INTERVALO" & wait $!
done
