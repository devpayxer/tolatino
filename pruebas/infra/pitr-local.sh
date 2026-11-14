#!/bin/bash
# 9o · La recuperación a un punto en el tiempo DE VERDAD, en local, con la MISMA plantilla de pgBackRest de producción (infra/comun/respaldos/
# pgbackrest.conf.tpl: cifrado aes-256-cbc, retención 35 días, archivo continuo), cambiando solo el almacén S3 por una carpeta (repo1-type=posix).
# El caso del manual «dato borrado por error» (docs/incidentes/dato-borrado.md): se borra una fila, se restaura a OTRA base al instante de antes del
# borrado, la fila está ahí y la base de verdad no se tocó. Y: el almacén no tiene el dato en claro (está cifrado); --verificar de migrar.sh contra la
# base restaurada. Necesita Postgres 16 (/usr/lib/postgresql/16/bin) y pgbackrest instalados; corre como root (usa el usuario postgres).
# Uso: bash pruebas/infra/pitr-local.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
PG=/usr/lib/postgresql/16/bin
command -v pgbackrest >/dev/null && [ -x "$PG/initdb" ] || { echo "✗ faltan pgbackrest o Postgres 16"; exit 1; }
T=$(mktemp -d /tmp/tl-pitr.XXXX); chmod 755 "$T"; chown postgres "$T"
P1=55491; P2=55492
pararlo() { su postgres -c "$PG/pg_ctl -D $T/datos -m immediate stop" >/dev/null 2>&1; su postgres -c "$PG/pg_ctl -D $T/restaurada -m immediate stop" >/dev/null 2>&1; rm -rf "$T"; }
trap pararlo EXIT
bien=0; total=0
ok() { total=$((total + 1)); if eval "$2"; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1"; fi; }
q() { su postgres -c "psql -h /tmp -p $1 -d tolatino -qAt -c \"$2\""; }

# La plantilla de producción, con el almacén en una carpeta (lo único que cambia) y la llave al azar.
LLAVE=$(openssl rand -hex 32)
sed -e "s|^repo1-type=s3|repo1-type=posix|" -e '/^repo1-s3-/d' -e '/^repo1-storage-/d' -e "s|^repo1-path=.*|repo1-path=$T/almacen|" -e "s|__RESPALDO_LLAVE__|$LLAVE|" \
    -e "s|^spool-path=.*|spool-path=$T/spool|" -e "s|^pg1-path=.*|pg1-path=$T/datos|" -e "s|^pg1-user=.*|pg1-user=postgres\npg1-port=$P1\npg1-socket-path=/tmp|" -e "s|^process-max=.*|process-max=1\nlock-path=$T/lock\nlog-path=$T|" \
    "$RAIZ/infra/comun/respaldos/pgbackrest.conf.tpl" > "$T/pgbackrest.conf"
chown postgres "$T/pgbackrest.conf"; chmod 600 "$T/pgbackrest.conf"
PB="pgbackrest --config=$T/pgbackrest.conf --stanza=tolatino"
su postgres -c "$PG/initdb -D $T/datos -U postgres -A trust >/dev/null"
cat >> "$T/datos/postgresql.conf" <<EOF
port=$P1
unix_socket_directories='/tmp'
wal_level=replica
archive_mode=on
archive_command='$PB archive-push %p'
archive_timeout=60
EOF
su postgres -c "$PG/pg_ctl -D $T/datos -l $T/datos.log -w start >/dev/null"
su postgres -c "psql -h /tmp -p $P1 -qc 'create database tolatino'"
su postgres -c "$PB stanza-create >/dev/null 2>&1"
echo "PITR con pgBackRest (la plantilla de producción, cifrada):"
ok "stanza-create y el archivo continuo funcionan (pgbackrest check)" "su postgres -c '$PB check' >/dev/null 2>&1"
q $P1 "create table notas (id int primary key, texto text); insert into notas values (1, 'dato importante del vecino'), (2, 'otro');" >/dev/null
ok "respaldo completo" "su postgres -c '$PB --type=full backup' >/dev/null 2>&1"
q $P1 "insert into notas values (3, 'después del completo');" >/dev/null
q $P1 "select pg_switch_wal();" >/dev/null; sleep 2
ANTES=$(q $P1 "select now()::text")
sleep 2
q $P1 "delete from notas where id = 1;" >/dev/null
q $P1 "select pg_switch_wal();" >/dev/null
ok "respaldo diferencial después del borrado" "su postgres -c '$PB --type=diff backup' >/dev/null 2>&1"
ok "el almacén no tiene el dato en claro (cifrado aes-256-cbc)" "! grep -rq 'dato importante' $T/almacen"
ok "la base de verdad ya no tiene la fila borrada" '[ "$(q $P1 "select count(*) from notas where id = 1")" = 0 ]'
# PITR a OTRA base (nunca encima de la de verdad).
mkdir -p "$T/restaurada"; chown postgres "$T/restaurada"; chmod 700 "$T/restaurada"
T0=$(date +%s)
ok "pgBackRest restaura a otra carpeta al instante de antes del borrado" \
  "su postgres -c \"$PB --pg1-path=$T/restaurada --type=time '--target=$ANTES' --target-action=promote restore\" >/dev/null 2>&1"
sed -i -e "s/^port=.*/port=$P2/" -e "s/^archive_mode=on/archive_mode=off/" "$T/restaurada/postgresql.conf"
su postgres -c "$PG/pg_ctl -D $T/restaurada -l $T/restaurada.log -w -t 120 start >/dev/null"
for _ in $(seq 1 60); do [ "$(q $P2 "select not pg_is_in_recovery()" 2>/dev/null)" = t ] && break; sleep 1; done
RTO=$(( $(date +%s) - T0 ))
ok "la base restaurada tiene la fila borrada ('dato importante del vecino') y la de después del completo" \
  '[ "$(q $P2 "select texto from notas where id = 1")" = "dato importante del vecino" ] && [ "$(q $P2 "select count(*) from notas where id = 3")" = 1 ]'
ok "la base de verdad sigue igual (no se restauró encima)" '[ "$(q $P1 "select count(*) from notas")" = 2 ]'
echo "  (RTO de esta base de juguete: ${RTO} s)"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
