#!/bin/bash
# 23 nov · Enciende o apaga el sitio de vista previa del sandbox (SOLO pruebas; guardián vistaPreviaAcotada). Lo lanza deploy.sh APARTE (systemd-run
# … || true, como la moderación o el traductor): si algo de aquí falla, el despliegue de la app no se entera y «web» sigue igual.
# Uso: encender.sh REPO COMPOSE…   (COMPOSE = docker compose --env-file /etc/tolatino/pruebas.env -f …/docker-compose.yml)
# Lee el interruptor de infra/pruebas/vista-previa/vista.conf (VISTA_ENCENDIDA=1|0; se cambia en el repo, sin reconstruir nada):
#   0 → para y quita el contenedor y deja /var/lib/tolatino/vista/control/apagada (nginx contesta 404 en el puerto de la vista previa).
#   1 → el usuario de la base tolatino_vista (solo filas: leer, insertar, cambiar, borrar; NI crear NI cambiar tablas, NI superusuario), su contraseña
#       en /etc/tolatino/vista.env (nace aquí, nunca en el repo), las carpetas, la página de pausa para nginx y el contenedor («up --no-deps»: no toca
#       la base ni la app).
set -uo pipefail
REPO="$1"; shift
COMPOSE=("$@")
CONF="$REPO/infra/pruebas/vista-previa/vista.conf"
V=/var/lib/tolatino/vista
ENV_VISTA=/etc/tolatino/vista.env
log() { echo "[vista] $*"; }
ENC=$(sed -n 's/^VISTA_ENCENDIDA=\([01]\)$/\1/p' "$CONF" | tail -1)
install -d -m 0755 -o 1000 -g 1000 "$V" "$V/control"
install -d -m 0755 /var/www/vista
install -m 0644 "$REPO/infra/pruebas/vista-previa/pausa.html" /var/www/vista/pausa.html || log "no se pudo instalar la página de pausa"
install -m 0644 "$REPO/infra/pruebas/vista-previa/arrancando.html" /var/www/vista/arrancando.html || log "no se pudo instalar la página de arranque"
[ -f "$ENV_VISTA" ] || ( umask 077; echo "VISTA_DB_PASSWORD=$(openssl rand -hex 24)" > "$ENV_VISTA" )
chmod 600 "$ENV_VISTA"
CV=("${COMPOSE[@]}" --env-file "$ENV_VISTA" --profile vista)

if [ "$ENC" != 1 ]; then
  : > "$V/control/apagada"
  "${CV[@]}" stop vista-previa >/dev/null 2>&1 || true
  "${CV[@]}" rm -f vista-previa >/dev/null 2>&1 || true
  log "apagada (vista.conf: VISTA_ENCENDIDA=${ENC:-?})"
  exit 0
fi

# El usuario de la base: solo filas. Idempotente (se repite en cada despliegue; las tablas nuevas de una migración le llegan por los privilegios por
# omisión del dueño, «tolatino»). La contraseña va como variable de psql (nunca en la línea de órdenes del proceso).
PW=$(sed -n 's/^VISTA_DB_PASSWORD=//p' "$ENV_VISTA")
if ! "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -q -v pw="$PW" <<'SQL'
select format('create role tolatino_vista login password %L', :'pw') where not exists (select 1 from pg_roles where rolname = 'tolatino_vista') \gexec
select format('alter role tolatino_vista login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls connection limit 40 password %L', :'pw') \gexec
revoke all on database tolatino from tolatino_vista;
grant connect, temporary on database tolatino to tolatino_vista;
revoke create on schema public from tolatino_vista;
grant usage on schema public to tolatino_vista;
grant select, insert, update, delete on all tables in schema public to tolatino_vista;
grant usage, select, update on all sequences in schema public to tolatino_vista;
grant execute on all functions in schema public to tolatino_vista;
alter default privileges for role tolatino in schema public grant select, insert, update, delete on tables to tolatino_vista;
alter default privileges for role tolatino in schema public grant usage, select, update on sequences to tolatino_vista;
SQL
then
  log "no se pudo preparar el usuario de la base tolatino_vista: la vista previa no se enciende"
  exit 1
fi
rm -f "$V/control/apagada"
"${CV[@]}" up -d --no-deps --build vista-previa || { log "el contenedor de la vista previa no arrancó (la app sigue igual)"; exit 1; }
log "encendida (rama $(sed -n 's/^VISTA_RAMA=//p' "$CONF" | tail -1))"
