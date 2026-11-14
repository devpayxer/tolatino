#!/bin/bash
# 9o · La restauración de prueba (fase9-apertura.md §3.4: «restauración probada, no respaldo verificado de palabra»; guardián respaldoRestaurado).
# Cada semana (temporizador de la réplica, domingo 05:20) y en el ensayo:
#   1. Un contenedor DESECHABLE con la misma imagen de la base y un volumen vacío (nada de la réplica ni de la base se toca).
#   2. pgBackRest restaura el último respaldo a un punto de hace 1 hora (PITR: completo + diferencial + WAL).
#   3. Postgres arranca sobre eso (promovido), migrar.sh --verificar (no cambia nada) y las consultas de control (consultas-control.sql).
#   4. Se destruye el contenedor y el volumen.
#   5. restore_drills (en la base de verdad, solo inserción): cuánto tardó (RTO real), el punto, lo contado, la consulta y el resultado.
# Si falla o no corre en 8 días, Sistema › Respaldos lo dice, la alerta de Prometheus avisa y el barrido manda la alerta crítica.
# Uso: restaurar-prueba.sh [PUNTO]   (PUNTO: «AAAA-MM-DD HH:MM:SS+00»; por defecto hace 1 hora). RESTAURAR_COPIA=nombre deja la base restaurada
#      corriendo con ese nombre (para recuperar un dato borrado: «PITR a otra base», docs/incidentes/dato-borrado.md) en vez de destruirla.
set -uo pipefail
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
# shellcheck source=/dev/null
. /etc/tolatino/rol.conf
ENV_FILE=/etc/tolatino/${TOLATINO_ENTORNO}.env
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
# shellcheck source=../lib.sh
. "$REPO/infra/comun/lib.sh"
PGPASSWORD=${POSTGRES_PASSWORD:-}; export PGPASSWORD
PSQL=(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt)
PUNTO="${1:-$(date -u -d '-1 hour' '+%F %T+00')}"
N="tl-restauracion-$(date +%s)"; C="${RESTAURAR_COPIA:-$N}"
INICIO=$(date -u +%FT%TZ); T0=$(date +%s)
CONF=$(mktemp); chmod 600 "$CONF"
limpiar() { [ -z "${RESTAURAR_COPIA:-}" ] && { docker rm -f "$C" >/dev/null 2>&1; docker volume rm -f "$C" >/dev/null 2>&1; }; shred -u "$CONF" 2>/dev/null || rm -f "$CONF"; }
trap limpiar EXIT

anotar() {
  local r="$1" checks="${2:-}" detalle="${3:-}" rto
  rto=$(( $(date +%s) - T0 ))
  [ -n "$checks" ] || checks='{}'
  "${PSQL[@]}" -v e="$TOLATINO_ENTORNO" -v i="$INICIO" -v p="$PUNTO" -v t="$rto" -v c="$checks" -v v="$(cat "$REPO/infra/comun/respaldos/consultas-control.sql")" \
      -v r="$r" -v d="${detalle:0:300}" >/dev/null <<'SQL' || log "restauración: la base no anotó la corrida"
insert into restore_drills (backup_run_id, entorno, started_at, finished_at, point_at, rto_s, checks, verify_sql, result, detail)
values ((select id from backup_runs where kind = 'base' and result = 'ok' and not is_test order by finished_at desc limit 1),
        :'e', (:'i')::timestamptz, now(), (:'p')::timestamptz, (:'t')::int, (:'c')::jsonb, left(:'v', 2000), :'r', nullif(:'d', ''));
SQL
  log "restauración de prueba: $r en ${rto} s${detalle:+ · $detalle}"
}

# La configuración de pgBackRest de la base (la misma plantilla, en el servidor; solo lectura del almacén).
# shellcheck source=pgbackrest.sh
. "$REPO/infra/comun/respaldos/pgbackrest.sh"
pgbackrest_conf "$REPO" "$CONF"

docker volume create "$C" >/dev/null
if ! docker run --rm -u postgres -v "$C":/var/lib/postgresql/data -v "$CONF":/etc/pgbackrest/pgbackrest.conf:ro tolatino/base:produccion \
     pgbackrest --stanza=tolatino --type=time "--target=$PUNTO" --target-action=promote --delta restore >/tmp/tl-restaurar.log 2>&1; then
  anotar fallo "" "pgBackRest no restauró: $(tail -c 200 /tmp/tl-restaurar.log | tr '\n' ' ')"; exit 1
fi
# Arranca la base restaurada sin escuchar por TCP (solo su socket; la red es para que restore_command baje el WAL del almacén) y sin archivar
# (no ensucia el almacén de la base de verdad).
docker run -d --name "$C" -u postgres -v "$C":/var/lib/postgresql/data -v "$CONF":/etc/pgbackrest/pgbackrest.conf:ro tolatino/base:produccion \
  postgres -c archive_mode=off -c listen_addresses= -c hba_file=/var/lib/postgresql/data/pg_hba.conf >/dev/null
listo=0
for _ in $(seq 1 360); do
  docker exec "$C" pg_isready -U tolatino -d tolatino >/dev/null 2>&1 && docker exec "$C" psql -U tolatino -d tolatino -qAtc "select not pg_is_in_recovery()" 2>/dev/null | grep -q t && { listo=1; break; }
  sleep 5
done
[ "$listo" = 1 ] || { anotar fallo "" "la base restaurada no arrancó en 30 min: $(docker logs --tail 5 "$C" 2>&1 | tr '\n' ' ')"; exit 1; }
# migrar.sh --verificar contra la restaurada (por su socket) y las consultas de control.
cat > "$CONF.psql" <<'EOF'
#!/bin/bash
shift 5; args=(); while [ $# -gt 0 ]; do case "$1" in -h) shift 2;; *) args+=("$1"); shift;; esac; done
exec docker exec -i "$TL_CONT" psql "${args[@]}"
EOF
if ! TL_CONT="$C" bash "$REPO/packages/db/migrar.sh" --verificar bash "$CONF.psql" x >/tmp/tl-verificar.log 2>&1; then
  rm -f "$CONF.psql"; anotar fallo "" "migrar.sh --verificar: $(tail -c 200 /tmp/tl-verificar.log | tr '\n' ' ')"; exit 1
fi
rm -f "$CONF.psql"
checks=$(docker exec -i "$C" psql -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt < "$REPO/infra/comun/respaldos/consultas-control.sql" 2>/tmp/tl-control.log)
if [ -z "$checks" ] || ! printf '%s' "$checks" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d["migraciones"] > 0 and d["ciudades"] > 0 else 1)' 2>/dev/null; then
  anotar fallo "" "las consultas de control no cuadran: $(tail -c 200 /tmp/tl-control.log | tr '\n' ' ')"; exit 1
fi
anotar ok "$checks" "${RESTAURAR_COPIA:+copia «$C» queda corriendo para recuperar a mano}"
