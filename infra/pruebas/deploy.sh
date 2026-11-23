#!/bin/bash
# Despliegue del sandbox. Lo ejecuta tolatino-sync (root) en /opt/tolatino cada vez que la rama `pruebas` cambia.
# Idempotente: se puede correr mil veces. Nunca pide nada a nadie.
# 9o · Los pasos que comparte con producción viven en infra/comun/ (el mismo paquete; guardián mismoPaquete): los secretos que nacen en el servidor,
# el diagnóstico, los índices de la ayuda, lo legal y las cadenas, la comprobación de salud, el sobre sellado y el registro del despliegue. Lo propio del
# sandbox se queda aquí: un solo servidor (docker compose up --build), la semilla de pruebas y el modo pruebas del SMS.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO=$(pwd)
COMMIT=$(git rev-parse --short HEAD)
ENV_FILE=/etc/tolatino/pruebas.env
# shellcheck source=../comun/lib.sh
. "$REPO/infra/comun/lib.sh"
# shellcheck source=../comun/registro.sh
. "$REPO/infra/comun/registro.sh"
# shellcheck source=../comun/sellado.sh
. "$REPO/infra/comun/sellado.sh"
INICIO=$(date -u +%FT%TZ)
PREVIO=$(cat /var/lib/tolatino/last-deploy 2>/dev/null || true)
# 22 nov · Cada tramo del despliegue con su hora, para medir sin SSH: «tramo NOMBRE» cierra el que corría (lo anota en el registro con su hora y sus
# segundos) y abre el siguiente. Al salir, bien o mal, queda una línea «tramos (ok|fallo en …)» en el registro que publica /estado/ y otra en
# /estado/tramos.txt (una por despliegue; las últimas 500). Nunca cambia el resultado del despliegue.
TRAMO_N=preparar; TRAMO_T=$SECONDS; TRAMOS=""
tramo() { local s=$((SECONDS - TRAMO_T)); TRAMOS="$TRAMOS · $TRAMO_N $s s"; log "tramo $TRAMO_N: $s s"; TRAMO_N="$1"; TRAMO_T=$SECONDS; }
fin_tramos() {
  local res=ok linea t=/var/www/estado/tramos.txt
  [ "$1" = 0 ] || res="fallo en $TRAMO_N"
  [ -z "${AVISOS:-}" ] || res="$res, con avisos"
  log "tramo $TRAMO_N: $((SECONDS - TRAMO_T)) s" || true
  linea="tramos ($res, commit $COMMIT):${TRAMOS# ·} · $TRAMO_N $((SECONDS - TRAMO_T)) s · total $SECONDS s"
  log "$linea" || true
  { mkdir -p /var/www/estado && echo "$(date -Is) $linea" >> "$t" && tail -n 500 "$t" > "$t.nuevo" && mv -f "$t.nuevo" "$t"; } 2>/dev/null || true
}
trap 'fin_tramos $?' EXIT

# 1) El script de sincronización con candado (corrige el choque del primer arranque). Es el ÚNICO camino por el que el servidor se arregla solo (sin
#    SSH): se instala solo si es bash válido y con cambio atómico (infra/comun/lib.sh · instalar_si_valido); si no, sigue el anterior y /estado/ lo dice.
#    instalar_si_valido devuelve 1 si no es bash válido y 2 si no se pudo copiar (disco lleno, permisos): /estado/ dice cuál de los dos.
mkdir -p /var/www/estado
SYNC_R=0; instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync || SYNC_R=$?
case "$SYNC_R" in
  0) echo "tolatino-sync: el del commit $COMMIT ($(date -Is))" > /var/www/estado/sync.txt ;;
  1) echo "tolatino-sync: el del commit $COMMIT NO es bash válido; sigue el anterior ($(date -Is))" > /var/www/estado/sync.txt ;;
  *) echo "tolatino-sync: el del commit $COMMIT no se pudo instalar (¿disco lleno?); sigue el anterior ($(date -Is))" > /var/www/estado/sync.txt ;;
esac
# 1b) 23 nov · tolatino-sync cada 20 s y a su hora. Antes: cada 60 s con la precisión por omisión de systemd (AccuracySec=1min), así que un push esperaba
#     hasta ~2 min a que el servidor se enterara. Cada vuelta sin cambios es un «git fetch» y nada más (el candado impide que dos se pisen). El temporizador
#     nació con el cloud-init (que ya trae esto para una máquina nueva); aquí se ajusta la viva con un añadido de systemd, solo si cambió. Nunca corta.
SYNC_DROPIN=/etc/systemd/system/tolatino-sync.timer.d/intervalo.conf
SYNC_TIMER=$'[Timer]\nOnUnitActiveSec=\nOnUnitActiveSec=20\nAccuracySec=1s'
if [ "$(cat "$SYNC_DROPIN" 2>/dev/null || true)" != "$SYNC_TIMER" ]; then
  { mkdir -p "${SYNC_DROPIN%/*}" && printf '%s\n' "$SYNC_TIMER" > "$SYNC_DROPIN" && systemctl daemon-reload && systemctl restart tolatino-sync.timer \
    && log "tolatino-sync: cada 20 s (AccuracySec=1s)"; } || log "tolatino-sync: no se pudo ajustar el temporizador (sigue el de antes)"
fi

# 2) Secretos del sandbox: se generan una sola vez en el servidor, nunca viven en el repo.
mkdir -p /etc/tolatino
if [ ! -f "$ENV_FILE" ]; then
  log "creando $ENV_FILE"
  # 22 nov · umask 077 solo para crear este archivo (subshell): antes quedaba puesto el resto del guion y, en un servidor recién nacido,
  # /var/www/mantenimiento nacía 700 (nginx no la leía: 503 pelado en vez de la página) y diag.txt y tramos.txt 600.
  ( umask 077
    cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
MINIO_ROOT_USER=tolatino
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
EOF
  )
fi
# Secretos que se agregaron después: se completan sin tocar los que ya existen (las recetas, en infra/comun/lib.sh).
#   AUTH_SECRET · DATOS_SECRET (cifrado de columna op_private, 4j: perderla vuelve ilegibles las notas vivas) · BARRIDO_TOKEN (0078) ·
#   QR_LLAVE_PRIVADA (6c: una por entorno; un QR del sandbox nunca vale en producción) · VAPID_PRIVADA (8c) · REVISION_CODIGO_* (8i: el código fijo de
#   cada cuenta de revisión de Apple y Google; nunca en el repo ni en el chat).
for n in AUTH_SECRET DATOS_SECRET BARRIDO_TOKEN QR_LLAVE_PRIVADA VAPID_PRIVADA \
         REVISION_CODIGO_CLIENTE REVISION_CODIGO_NEGOCIO REVISION_CODIGO_REPARTIDOR REVISION_CODIGO_PUERTA; do
  secreto_nace "$ENV_FILE" "$n"
done
chmod 600 "$ENV_FILE"

# 2a) 9o · El sobre sellado: la llave age del sandbox (la pública en /estado/llave.txt) y los secretos de terceros que lleguen sellados para él
#     (infra/pruebas/sellado/sandbox/*.age; Paquete 9-1 → 9q). Nunca detiene el despliegue: sin age o sin sobres, sigue como siempre.
FP_AGE=$(sellado_preparar /var/www/estado/llave.txt || true)
sellado_abrir "$REPO/infra/pruebas/sellado" sandbox "$ENV_FILE" "$REPO/infra/comun/secretos.json" /var/www/estado/sobres.txt || true

# 2b) Fotos: Garage (S3 propio). Antes que el resto: su configuración (con secretos) tiene que existir antes de montar
#     el contenedor. La primera vez crea el bucket y la llave de la app (a $ENV_FILE), que el paso 3 le pasa a la app.
# shellcheck disable=SC2097,SC2098  # (como siempre: ENV_FILE va al proceso de medios.sh y el mismo valor a sus argumentos)
ENV_FILE="$ENV_FILE" GARAGE_TOML=/etc/tolatino/garage.toml bash "$REPO/infra/pruebas/medios.sh" docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" \
  || log "medios: falló la preparación (las fotos no se pueden subir)"

# 2c) Diagnóstico a la vista (sin SSH): disco, Docker y la base, en /estado/diag.txt. Si el disco pasa del 85 %, se libera lo que Docker
#     puede rehacer (caché de builds, imágenes sin uso); nunca volúmenes.
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml")
disco_liberar
diag "antes"

# 3) Construir → migrar → cambiar (22 nov; el orden de producción, infra/comun/azulverde.sh). Mientras se construye la imagen y se migra la base, la
#    app VIEJA sigue sirviendo; si algo de eso falla, el despliegue se detiene SIN tocar el contenedor de la app (sigue lo de antes; la app vieja
#    tolera la base nueva: guardián migracionReversible). Solo al final (4b) se cambia de contenedor: unos segundos, con la página de mantenimiento.
#    Antes era al revés: «up --build» quitaba la app vieja antes de saber si la nueva arrancaba, y la app nueva corría ~1 min contra la base vieja.
export TOLATINO_COMMIT="$COMMIT"
base_lista() { # base_lista INTENTOS PAUSA: 0 cuando la base contesta
  local i
  for i in $(seq 1 "$1"); do
    "${COMPOSE[@]}" exec -T db pg_isready -h 127.0.0.1 -U tolatino -d tolatino >/dev/null 2>&1 && return 0
    sleep "$2"
  done
  return 1
}
# 22 nov · base_sana INTENTOS PAUSA: 0 cuando Docker ya da la base por «healthy». Compose no espera: si el healthcheck (cada 10 s) todavía dice
# «unhealthy», «up» de la app falla al instante aunque pg_isready ya conteste. Va antes de cada «up» de la app.
base_sana() {
  local i id
  for i in $(seq 1 "$1"); do
    id=$("${COMPOSE[@]}" ps -q db 2>/dev/null || true)
    [ -n "$id" ] && [ "$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || true)" = healthy ] && return 0
    sleep "$2"
  done
  return 1
}
# 22 nov · Entre migrar y cambiar la app, un paso accesorio (la semilla de pruebas, el mapa, la recarga de nginx) NO corta el despliegue: con la base
# ya migrada, cortar dejaba la app vieja contra la base nueva y el reintento repetía lo mismo. Se anota (registro y /estado/avisos.txt), la app se
# cambia igual y, si hubo avisos, el despliegue termina en FALLO DESPUÉS de cambiar (tolatino-sync lo reintenta a los 15 min). Prueba: orden-despliegue.
AVISOS=""
: > /var/www/estado/avisos.txt
aviso() { log "AVISO: $*"; AVISOS="$AVISOS · $*"; echo "$(date -Is) commit $COMMIT · $*" >> /var/www/estado/avisos.txt || true; }
tramo base
# 3a) La base y las fotos arriba, sin tocar la app. Si la base tarda en quedar sana (recuperación después de un corte), se espera hasta 10 min.
"${COMPOSE[@]}" up -d db medios || log "base: «up -d db medios» falló; se espera a que conteste"
if ! base_lista 60 10; then
  diag "la base no contesta"
  log "la base no contestó en 10 min: no se cambia nada (la app sigue con lo de antes)"
  exit 1
fi

# 3b) La imagen. 22 nov · Solo se construye si cambió lo que entra en ella (infra/comun/lib.sh · huella_imagen: las rutas «!» del .dockerignore, la
#     receta y el .dockerignore, por contenido). Si la huella y la imagen son las de la última construcción buena, se reutiliza. Ante la duda (sin
#     huella, sin imagen, otra imagen) se construye. Un build que falla NO se reintenta como si fuera la base (antes: dos builds cada 15 min) y no
#     toca la app: sigue la versión anterior. La app se recrea igual en 4b: TOLATINO_COMMIT (environment) cambia y /api/salud dice el commit desplegado.
tramo imagen
HUELLA=$(huella_imagen || true)
IMAGEN_ANTES=$(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)
if [ -n "$HUELLA" ] && [ -n "$IMAGEN_ANTES" ] && [ "$(cat /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA $IMAGEN_ANTES" ]; then
  log "imagen: no cambió lo que entra en ella (huella ${HUELLA:0:12}): se reutiliza ${IMAGEN_ANTES:7:12}"
else
  log "imagen: se construye (commit $COMMIT, huella ${HUELLA:-sin huella})"
  # 23 nov · La vista previa (next dev, hasta 2,5 GB) se para mientras se construye: el build es el pico de memoria del servidor (cx33, 8 GB). La vuelve
  # a levantar encender.sh en 3i (si el build falla, en el reintento).
  docker stop tolatino-pruebas-vista-previa-1 >/dev/null 2>&1 || true
  if ! "${COMPOSE[@]}" build web; then
    diag "la imagen no se pudo construir"
    log "la imagen no se pudo construir: la app sigue con lo de antes"
    exit 1
  fi
  # La huella queda con la imagen que salió (la próxima subida con la misma huella y esta imagen no construye).
  mkdir -p /var/lib/tolatino
  if [ -n "$HUELLA" ]; then echo "$HUELLA $(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)" > /var/lib/tolatino/imagen-huella
  else rm -f /var/lib/tolatino/imagen-huella; fi
fi

tramo migraciones
# 3c) Base de datos: migraciones pendientes, en orden, una sola vez cada una (con la app vieja sirviendo). Si una falla, se detiene aquí.
bash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"

tramo semilla
# 3c-semilla) Semilla del SANDBOX (decisión I: datos de ejemplo solo en pruebas). Se vuelve a aplicar si cambia. 22 nov · Si falla, se anota y la app
#     se cambia igual (la semilla son datos de ejemplo; el esquema ya está migrado): el despliegue termina en FALLO después y se reintenta.
SEMILLA_DIR="$REPO/infra/pruebas/semilla" bash "$REPO/packages/db/migrar.sh" --semilla-pruebas "${COMPOSE[@]}" \
  || aviso "la semilla de pruebas falló (la app nueva se cambia igual; el despliegue queda en FALLO y se reintenta)"
tramo aparte
# 3c-demos) Los negocios DEMO del fundador (17 nov: 850, 10 en las 5 subcategorías principales de cada categoría, en las 5 ciudades, con
#     historia de años): SOLO el sandbox. El CI no los carga (sus pruebas cuentan sobre la semilla de siempre) y producción nunca (candado de
#     migrar.sh). Cada archivo marca is_demo y es idempotente (llaves fijas; se vuelve a aplicar si cambia).
#     El SQL (≈ 120 MB) NO va en el repo: lo generan aquí los generadores deterministas de scripts/semilla/demos/ (node de la imagen base,
#     sin red), así que sale igual cada vez y migrar.sh solo vuelve a aplicar el archivo que cambió.
#     Ronda 2 (17 nov): ≈ 7.000 negocios y ≈ 400 eventos más; cargar todo tarda bastante más que el tope del servicio (TimeoutStartSec=3600),
#     así que va APARTE (systemd-run, como el mapa): el despliegue de la app nunca espera por los demos. Cada archivo queda anotado al
#     terminar (schema_seeds), así que si se corta, la próxima vuelta sigue con los que faltan.
if [ -d "$REPO/scripts/semilla/demos" ] && ! systemctl is-active --quiet tolatino-demos; then
  log "demos: se generan y se cargan aparte (tolatino-demos)"
  # shellcheck disable=SC2048  # (como siempre: las partes del compose no llevan espacios)
  systemd-run --unit tolatino-demos --collect bash -c "docker run --rm --network none -v '$REPO':/repo -w /repo node:22-alpine \
    sh -c 'for g in scripts/semilla/demos/grupo-*.mjs scripts/semilla/demos/r2-*.mjs; do [ -f \"\$g\" ] || continue; node \"\$g\" || exit 1; done' \
    && SEMILLA_DIR='$REPO/infra/pruebas/demos' bash '$REPO/packages/db/migrar.sh' --semilla-pruebas ${COMPOSE[*]}" \
    || echo "[deploy] demos: no se pudo lanzar (la app sigue con lo de antes)"
fi

# 3c-bis/ter/quater) Lo que sale del repo (infra/comun/lib.sh · indexar_docs): el Centro de ayuda (7a: docs/ayuda/ → help_articles), las páginas
#     legales (9e: docs/legal/ → legal_pages; un archivo que cambió es una versión NUEVA en borrador, publicar es del Super Admin) y las cadenas de la
#     interfaz (9f: apps/web/lib/cms-cadenas.json → cms_strings; lo editado en el Super Admin se respeta). Cada uno con el node de la imagen base, sin
#     red, imprime SQL que psql aplica en una transacción; lo mismo otra vez no cambia nada. Si uno falla, la app sigue con lo de antes.
PSQL=("${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt)
indexar_docs "$REPO" "${PSQL[@]}"

# 3d) Mapa: teselas propias de Pensilvania. Generarlas tarda minutos: si faltan, se hacen aparte (systemd-run) y al
#     terminar se enciende el servidor de teselas. El despliegue de la app nunca espera por el mapa.
MAPA=/var/lib/tolatino/mapa
COMPOSE_MAPA=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile mapa)
if [ -f "$MAPA/pennsylvania.mbtiles" ]; then
  "${COMPOSE_MAPA[@]}" up -d mapa || log "teselas: el servidor del mapa no arrancó (la app sigue; el mapa sale sin teselas)"
elif ! systemctl is-active --quiet tolatino-mapa; then
  log "teselas: no existen todavía, se generan aparte"
  systemd-run --unit tolatino-mapa --collect bash -c "bash '$REPO/infra/mapa/generar.sh' '$MAPA' && ${COMPOSE_MAPA[*]} up -d mapa" || true
fi

# 3f) Moderación de imágenes propia (5d): se construye y se enciende aparte (perfil «moderacion»). Si falla, la app sigue
#     arriba y las fotos nuevas de la Comunidad esperan revisión manual; nunca se publican sin revisar.
COMPOSE_MOD=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile moderacion)
if ! systemctl is-active --quiet tolatino-moderacion; then
  # shellcheck disable=SC2048  # (como siempre: las partes del compose no llevan espacios)
  systemd-run --unit tolatino-moderacion --collect ${COMPOSE_MOD[*]} up -d --build moderacion-img || true
fi

# 3f-2) Video de presentación (C-001): ffmpeg propio, se construye y se enciende aparte (perfil «video»). Si falla, la app sigue arriba y
#     subir un video dice «no está disponible ahora»; los videos que ya están se siguen viendo (los sirve el almacén de medios).
COMPOSE_VID=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile video)
if ! systemctl is-active --quiet tolatino-video; then
  # shellcheck disable=SC2048
  systemd-run --unit tolatino-video --collect ${COMPOSE_VID[*]} up -d --build video || true
fi

# 3g) Traductor propio (5h, «Ver traducción»): se baja y se enciende aparte (perfil «traductor»). Primero los modelos español ↔ inglés
#     (una sola vez, al volumen; si ya están, no baja nada) y después el traductor, solo en la red interna. Si algo falla, la app sigue
#     arriba y «Ver traducción» dice «La traducción no está disponible ahora.»; el texto nunca va a un tercero.
COMPOSE_TRAD=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile traductor)
if ! systemctl is-active --quiet tolatino-traductor; then
  systemd-run --unit tolatino-traductor --collect bash -c "${COMPOSE_TRAD[*]} run --rm traductor-modelos && ${COMPOSE_TRAD[*]} up -d traductor" || true
fi

# 3e) Direcciones propias: tramos de calle del Censo (TIGER) para ubicar direcciones de entrega. Aparte y sin esperar;
#     el script mismo no hace nada si la carga tiene menos de 90 días.
if ! systemctl is-active --quiet tolatino-direcciones; then
  systemd-run --unit tolatino-direcciones --collect bash "$REPO/infra/direcciones/generar.sh" /var/lib/tolatino/direcciones \
    "${COMPOSE[@]}" || true
fi
# 3h) 9m · Retiros del fabricante (NHTSA, datos públicos): una vez al mes, aparte y sin esperar (el script no hace nada si tiene menos de 30 días).
if ! systemctl is-active --quiet tolatino-retiros; then
  systemd-run --unit tolatino-retiros --collect bash "$REPO/infra/retiros/generar.sh" /var/lib/tolatino/retiros "${COMPOSE[@]}" || true
fi
# 3i) 23 nov · Sitio de vista previa (SOLO el sandbox; infra/pruebas/vista-previa/): la web en modo desarrollo sobre la rama de vista.conf, en el puerto
#     8081, para ver un ajuste de pantalla sin construir la imagen. Aparte y sin esperar (como la moderación): encender.sh la enciende o la apaga según
#     el interruptor de vista.conf (VISTA_ENCENDIDA) y, si falla, la app no se entera. Nunca migra ni siembra (guardián vistaPreviaAcotada).
if ! systemctl is-active --quiet tolatino-vista; then
  systemd-run --unit tolatino-vista --collect bash "$REPO/infra/pruebas/vista-previa/encender.sh" "$REPO" "${COMPOSE[@]}" || true
fi

tramo nginx
# 4) nginx: la app en /, la página de estado del servidor en /estado y, mientras la app cambia de contenedor o no contesta, la página de mantenimiento
#    (la de producción, infra/comun/mantenimiento/index.html) en vez del «502 Bad Gateway» de nginx. Va ANTES de cambiar de contenedor. 22 nov · La
#    configuración nueva solo se queda si «nginx -t» la acepta; si no, vuelve la ÚLTIMA BUENA («.buena»: se guarda solo después de un «nginx -t» que
#    pasa; antes se copiaba «.anterior» sin saber si servía, y un despliegue cortado a mitad dejaba la rota como «anterior»). Nada de esto corta el
#    despliegue: un fallo es un aviso (/estado/avisos.txt) y la app se cambia igual. Una recarga que falla se intenta como reinicio (nginx parado).
nginx_recargar() { systemctl reload nginx || systemctl restart nginx || aviso "nginx: no se pudo recargar ni reiniciar (systemctl)"; }
install -d -m 0755 /var/www/mantenimiento
install -m 0644 "$REPO/infra/comun/mantenimiento/index.html" /var/www/mantenimiento/index.html || aviso "nginx: no se pudo instalar la página de mantenimiento"
NGINX_SITIO=/etc/nginx/sites-available/tolatino-pruebas
{ install -m 0644 "$REPO/infra/pruebas/nginx-pruebas.conf" "$NGINX_SITIO" && ln -sf "$NGINX_SITIO" /etc/nginx/sites-enabled/tolatino-pruebas \
  && rm -f /etc/nginx/sites-enabled/estado /etc/nginx/sites-enabled/default; } || aviso "nginx: no se pudo instalar la configuración del commit $COMMIT"
if nginx -t; then
  cp -p "$NGINX_SITIO" "$NGINX_SITIO.buena" || aviso "nginx: no se pudo guardar la copia buena"
  nginx_recargar
else
  aviso "nginx: la configuración del commit $COMMIT no pasa «nginx -t»; se vuelve a la última buena"
  if [ -f "$NGINX_SITIO.buena" ]; then
    cp -p "$NGINX_SITIO.buena" "$NGINX_SITIO" || true
    if nginx -t; then nginx_recargar; else aviso "nginx: tampoco pasa la última buena (nginx sigue con la que tiene en memoria; NO reiniciar el servidor)"; fi
  else
    aviso "nginx: no hay copia buena a la que volver (nginx sigue con la que tiene en memoria; NO reiniciar el servidor)"
  fi
fi

tramo recrear
# 4b) Cambiar: la app nueva (y barrido y push si cambió su imagen). barrido y push paran en segundos (init + stop_grace_period en el compose; antes
#     Docker esperaba 10 s por cada uno); durante el cambio nginx muestra la página de mantenimiento. Antes de cada «up» se espera a que Docker dé la base
#     por «healthy» (hasta 10 min); si el primero falla, se reintenta una vez (sin construir otra vez).
base_sana 60 10 || log "la base no quedó «healthy» en 10 min: se intenta igual"
log "docker compose up (commit $COMMIT)"
if ! "${COMPOSE[@]}" up -d --remove-orphans; then
  log "la app nueva no arrancó a la primera: se espera a que la base quede «healthy» (hasta 10 min) y se reintenta"
  diag "primer intento fallido"
  base_sana 60 10 || true
  "${COMPOSE[@]}" up -d --remove-orphans || { diag "segundo intento fallido"; exit 1; }
fi
diag "después"
docker image prune -f >/dev/null 2>&1 || true

tramo salud
# 5) Comprobación real: la app responde, ve la base con PostGIS y es la DESPLEGADA: 22 nov · el commit que dice /api/salud tiene que ser $COMMIT (con
#    el build aparte del «up», es la única prueba de qué se sirve; un contenedor viejo que sigue contestando daba «OK»). 9o: el despliegue queda anotado
#    en deploy_releases (Sistema › Despliegues) con su resultado; si la base no contesta, se dice y se sigue (el registro nunca cambia el resultado).
if salud_esperar http://127.0.0.1:3000/api/salud 30 3; then
  log "salud: $(cat /tmp/salud.json)"
  SERVIDO=$(sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' /tmp/salud.json | head -1)
  if [ "$SERVIDO" != "$COMMIT" ]; then
    log "salud: /api/salud contesta con el commit ${SERVIDO:-(ninguno)}, no con $COMMIT: la app nueva no quedó sirviendo"
    "${COMPOSE[@]}" logs --tail=40 web || true
    registrar_despliegue pruebas "$(git rev-parse HEAD)" "$PREVIO" "" unico "$INICIO" "" fallo "/api/salud dice el commit ${SERVIDO:-(ninguno)}, no $COMMIT" "" "" "" >/dev/null || true
    exit 1
  fi
  DIGEST=$(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)
  registrar_despliegue pruebas "$(git rev-parse HEAD)" "$PREVIO" "$DIGEST" unico "$INICIO" "$(date -u +%FT%TZ)" ok "" "" "" "" >/dev/null || true
  anotar_llave pruebas age_servidor sandbox "${FP_AGE:-}" || true
  if [ -n "$AVISOS" ]; then log "la app nueva sirve, pero el despliegue terminó con avisos (FALLO; se reintenta):$AVISOS"; exit 1; fi
  exit 0
fi
log "la app no respondió en /api/salud a tiempo"
"${COMPOSE[@]}" logs --tail=40 web || true
registrar_despliegue pruebas "$(git rev-parse HEAD)" "$PREVIO" "" unico "$INICIO" "" fallo "la app no respondió en /api/salud a tiempo" "" "" "" >/dev/null || true
exit 1
