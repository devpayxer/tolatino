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

# 1) El script de sincronización con candado (corrige el choque del primer arranque). Es el ÚNICO camino por el que el servidor se arregla solo (sin
#    SSH): se instala solo si es bash válido y con cambio atómico (infra/comun/lib.sh · instalar_si_valido); si no, sigue el anterior y /estado/ lo dice.
mkdir -p /var/www/estado
if instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync; then
  echo "tolatino-sync: el del commit $COMMIT ($(date -Is))" > /var/www/estado/sync.txt
else
  echo "tolatino-sync: el del commit $COMMIT NO es bash válido; sigue el anterior ($(date -Is))" > /var/www/estado/sync.txt
fi

# 2) Secretos del sandbox: se generan una sola vez en el servidor, nunca viven en el repo.
mkdir -p /etc/tolatino
if [ ! -f "$ENV_FILE" ]; then
  log "creando $ENV_FILE"
  umask 077
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
MINIO_ROOT_USER=tolatino
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
EOF
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

# 3) Contenedores: app (se reconstruye con el commit nuevo), Postgres + PostGIS y Garage (fotos).
#    Si la base tarda en quedar sana (recuperación después de un corte), se espera hasta 10 min y se vuelve a intentar una vez.
#    22 nov · La imagen solo se construye si cambió lo que entra en ella (infra/comun/lib.sh · huella_imagen: las rutas «!» del .dockerignore, la
#    receta y el .dockerignore, por contenido). Si la huella y la imagen son las de la última construcción, se reutiliza: ni build ni barrido/push
#    recreados. Ante la duda (sin huella, sin imagen, otra imagen) se construye. La app se recrea igual: TOLATINO_COMMIT (environment) cambia y
#    /api/salud tiene que decir el commit desplegado.
export TOLATINO_COMMIT="$COMMIT"
HUELLA=$(huella_imagen || true)
IMAGEN_ANTES=$(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)
CONSTRUIR=(--build)
if [ -n "$HUELLA" ] && [ -n "$IMAGEN_ANTES" ] && [ "$(cat /var/lib/tolatino/imagen-huella 2>/dev/null || true)" = "$HUELLA $IMAGEN_ANTES" ]; then
  CONSTRUIR=()
  log "imagen: no cambió lo que entra en ella (huella ${HUELLA:0:12}): se reutiliza ${IMAGEN_ANTES:7:12}"
else
  log "imagen: se construye (huella ${HUELLA:-sin huella})"
fi
log "docker compose up (commit $COMMIT)"
if ! "${COMPOSE[@]}" up -d "${CONSTRUIR[@]}" --remove-orphans; then
  log "la base no quedó sana a tiempo: se espera hasta 10 min y se reintenta"
  diag "primer intento fallido"
  "${COMPOSE[@]}" up -d db || true
  for i in $(seq 1 60); do
    "${COMPOSE[@]}" exec -T db pg_isready -h 127.0.0.1 -U tolatino -d tolatino >/dev/null 2>&1 && break
    sleep 10
  done
  "${COMPOSE[@]}" up -d "${CONSTRUIR[@]}" --remove-orphans || { diag "segundo intento fallido"; exit 1; }
fi
# La huella queda con la imagen que salió (la próxima subida con la misma huella y esta imagen no construye).
mkdir -p /var/lib/tolatino
if [ -n "$HUELLA" ]; then echo "$HUELLA $(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)" > /var/lib/tolatino/imagen-huella
else rm -f /var/lib/tolatino/imagen-huella; fi
diag "después"
docker image prune -f >/dev/null 2>&1 || true

# 3b) Base de datos: migraciones pendientes, en orden, una sola vez cada una.
for i in $(seq 1 30); do
  "${COMPOSE[@]}" exec -T db pg_isready -h 127.0.0.1 -U tolatino -d tolatino >/dev/null 2>&1 && break
  sleep 2
done
bash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"

# 3c) Semilla del SANDBOX (decisión I: datos de ejemplo solo en pruebas). Se vuelve a aplicar si cambia.
SEMILLA_DIR="$REPO/infra/pruebas/semilla" bash "$REPO/packages/db/migrar.sh" --semilla-pruebas "${COMPOSE[@]}"
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
  "${COMPOSE_MAPA[@]}" up -d mapa
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

# 4) nginx: la app en /, la página de estado del servidor en /estado.
install -m 0644 "$REPO/infra/pruebas/nginx-pruebas.conf" /etc/nginx/sites-available/tolatino-pruebas
ln -sf /etc/nginx/sites-available/tolatino-pruebas /etc/nginx/sites-enabled/tolatino-pruebas
rm -f /etc/nginx/sites-enabled/estado /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5) Comprobación real: la app responde y ve la base con PostGIS. 9o: el despliegue queda anotado en deploy_releases (Sistema › Despliegues) con su
#    resultado; si la base no contesta, se dice y se sigue (el registro nunca cambia el resultado del despliegue).
if salud_esperar http://127.0.0.1:3000/api/salud 30 3; then
  log "salud: $(cat /tmp/salud.json)"
  DIGEST=$(docker image inspect tolatino/web:pruebas --format '{{.Id}}' 2>/dev/null || true)
  registrar_despliegue pruebas "$(git rev-parse HEAD)" "$PREVIO" "$DIGEST" unico "$INICIO" "$(date -u +%FT%TZ)" ok "" "" "" "" >/dev/null || true
  anotar_llave pruebas age_servidor sandbox "${FP_AGE:-}" || true
  exit 0
fi
log "la app no respondió en /api/salud a tiempo"
"${COMPOSE[@]}" logs --tail=40 web || true
registrar_despliegue pruebas "$(git rev-parse HEAD)" "$PREVIO" "" unico "$INICIO" "" fallo "la app no respondió en /api/salud a tiempo" "" "" "" >/dev/null || true
exit 1
