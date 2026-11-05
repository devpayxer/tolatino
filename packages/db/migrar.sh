#!/bin/bash
# Aplica las migraciones de packages/db/migrations en orden, una sola vez cada una, dentro del contenedor `db`.
# Lo corre deploy.sh en cada despliegue (regla U: nadie pega SQL a mano). Cada archivo va en su propia
# transacción (los .sql traen begin/commit) y se registra con su huella; si un archivo ya aplicado cambia,
# se avisa y se detiene: las migraciones ya aplicadas no se editan, se agrega una nueva.
set -euo pipefail
SOLO_SEMILLA=0
if [ "${1:-}" = "--semilla-pruebas" ]; then SOLO_SEMILLA=1; shift; fi
COMPOSE=("$@")  # p. ej.: docker compose --env-file … -f …
DIR="$(cd "$(dirname "$0")" && pwd)/migrations"
psql() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt "$@"; }

if [ "$SOLO_SEMILLA" = 1 ]; then
  # Semilla del sandbox: SOLO pruebas. Candado: la base debe decir que es de pruebas.
  psql -c "create table if not exists schema_seeds (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
  for f in "${SEMILLA_DIR:?}"/*.sql; do
    [ -e "$f" ] || continue
    n="pruebas/$(basename "$f")"; h=$(sha256sum "$f" | cut -d' ' -f1)
    prev=$(psql -c "select sha256 from schema_seeds where name = '$n'")
    if [ "$prev" != "$h" ]; then
      echo "[migrar] semilla de pruebas $n"
      psql < "$f"
      psql -c "insert into schema_seeds (name, sha256) values ('$n', '$h') on conflict (name) do update set sha256 = excluded.sha256, applied_at = now()"
    fi
  done
  exit 0
fi

psql -c "create table if not exists schema_migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
for f in "$DIR"/*.sql; do
  n=$(basename "$f"); h=$(sha256sum "$f" | cut -d' ' -f1)
  prev=$(psql -c "select sha256 from schema_migrations where name = '$n'")
  if [ -z "$prev" ]; then
    echo "[migrar] aplicando $n"
    psql < "$f"
    psql -c "insert into schema_migrations (name, sha256) values ('$n', '$h')"
  elif [ "$prev" != "$h" ]; then
    echo "[migrar] ✗ $n ya estaba aplicada y su contenido cambió. Las migraciones aplicadas no se editan: crea una nueva." >&2
    exit 1
  fi
done
# Semillas repetibles (configuración real, no datos de ejemplo): se vuelven a aplicar cuando cambian.
psql -c "create table if not exists schema_seeds (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
for f in "$(dirname "$DIR")"/seeds/*.sql; do
  [ -e "$f" ] || continue
  n=$(basename "$f"); h=$(sha256sum "$f" | cut -d' ' -f1)
  prev=$(psql -c "select sha256 from schema_seeds where name = '$n'")
  if [ "$prev" != "$h" ]; then
    echo "[migrar] semilla $n"
    psql < "$f"
    psql -c "insert into schema_seeds (name, sha256) values ('$n', '$h') on conflict (name) do update set sha256 = excluded.sha256, applied_at = now()"
  fi
done
echo "[migrar] al día: $(psql -c 'select count(*) from schema_migrations') migraciones"
