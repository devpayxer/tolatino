#!/bin/bash
# Aplica las migraciones de packages/db/migrations en orden, una sola vez cada una, dentro del contenedor `db`.
# Lo corre deploy.sh en cada despliegue (regla U: nadie pega SQL a mano). Cada archivo se registra con su huella (sha256); si un archivo ya aplicado
# cambia, se avisa y se detiene: las migraciones ya aplicadas no se editan, se agrega una nueva.
# Transacciones: cada migración trae su begin/commit (guardián migracionConTransaccion), SALVO 16 viejas que no lo traen y no se editan (la lista está
# en el guardián): si una de esas fallara a mitad, quedaría medio aplicada y sin anotar. Aplicar y anotar van en la MISMA sesión de psql (el archivo y,
# detrás, su insert en schema_migrations): un corte entre los dos ya no deja una migración aplicada sin anotar, y un archivo con begin sin commit no
# queda anotado (el insert se deshace con él; se comprueba y se detiene).
# 22 nov · Lo aplicado se lee UNA vez (nombre y huella de schema_migrations y de schema_seeds) y se compara aquí: antes era un psql por archivo
# (≈ 280 idas y vueltas, ~58 s por despliegue aunque no hubiera nada nuevo). Mismo orden (el del glob), mismo «se detiene en el primero que cambió».
# Prueba: pruebas/infra/migrar.test.sh (guardián migrarUnaLectura).
# 26 nov · Las reglas de toda migración nueva (fase9-apertura.md §3.5 «Migraciones que permiten volver»): (1) compatible con la versión ANTERIOR de la
# app, que sigue sirviendo mientras se migra y vuelve a servir en una vuelta atrás: expandir antes, contraer después (guardián migracionReversible; un
# drop / rename / cambio de tipo lleva «-- contraer: <por qué la app anterior ya no lo usa>», guardián migracionContraeConMotivo); (2) si toca una tabla
# grande, «set local lock_timeout» y «set local statement_timeout» al empezar (guardián migracionConTope). Un choque con las escrituras de la app hace
# fallar la migración en segundos SIN aplicar nada (es una transacción) en vez de dejar la app esperando detrás: aquí se reintenta (MIGRAR_INTENTOS
# veces, 3; cada MIGRAR_PAUSA s, 20), solo ese error y solo un archivo que empieza con «begin;». Si sigue ocupada, o pasa su statement_timeout, se
# detiene y lo dice con su motivo (también en el archivo MIGRAR_MOTIVO, si se da: el azul/verde lo anota en el despliegue); la app vieja sigue.
set -euo pipefail
SOLO_SEMILLA=0; VERIFICAR=0
if [ "${1:-}" = "--semilla-pruebas" ]; then SOLO_SEMILLA=1; shift; fi
if [ "${1:-}" = "--verificar" ]; then VERIFICAR=1; shift; fi
COMPOSE=("$@")  # p. ej.: docker compose --env-file … -f …
DIR="$(cd "$(dirname "$0")" && pwd)/migrations"
psql() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt "$@"; }
# Derivados de búsqueda (vocabulario de «¿Quisiste decir…?»): se refrescan después de cualquier semilla.
refrescar() { psql -c "do \$\$ begin if exists (select 1 from pg_proc where proname = 'refrescar_busqueda') then perform refrescar_busqueda(); end if; end \$\$;"; }
INICIO=$SECONDS
# leer TABLA [PREFIJO]: nombre → huella de lo ya aplicado, en HECHAS (una sola consulta). Los nombres son de archivos (sin espacios).
declare -A HECHAS=()
leer() {
  local filas n h
  HECHAS=()
  filas=$(psql -c "select name || ' ' || sha256 from $1${2:+ where name like '$2%'}")
  while read -r n h; do [ -n "$n" ] && HECHAS["$n"]="$h"; done <<< "$filas"
  return 0
}
# aplicar ARCHIVO TABLA NOMBRE HUELLA MODO: el archivo y su anotación en la misma sesión de psql. MODO «nueva» (insert: una migración se anota una sola
# vez; si otro la anotó antes, la llave primaria lo detiene) o «repetible» (las semillas: insert o update). Después se comprueba que quedó anotada.
INTENTOS=${MIGRAR_INTENTOS:-3}; PAUSA=${MIGRAR_PAUSA:-20}
# en_transaccion ARCHIVO: 0 si su primera línea con algo (sin comentarios) es «begin;»: lo que falló se deshizo entero y se puede reintentar.
en_transaccion() { [ "$(sed -e 's/--.*$//' "$1" | tr -d ' \t\r' | grep -m1 -v '^$' | tr '[:upper:]' '[:lower:]')" = "begin;" ]; }
aplicar() {
  local f="$1" tabla="$2" n="$3" h="$4" modo="$5" sql intento=1 rc motivo err
  if [ "$modo" = nueva ]; then sql="insert into $tabla (name, sha256) values (:'tl_m_nombre', :'tl_m_huella');"
  else sql="insert into $tabla (name, sha256) values (:'tl_m_nombre', :'tl_m_huella') on conflict (name) do update set sha256 = excluded.sha256, applied_at = now();"; fi
  err=$(mktemp)
  while :; do
    rc=0
    { cat "$f"; printf '\n;\n%s\n' "$sql"; } | psql -v tl_m_nombre="$n" -v tl_m_huella="$h" 2>"$err" || rc=$?
    cat "$err" >&2
    [ "$rc" = 0 ] && break
    # 26 nov · Una tabla ocupada por la app (lock_timeout): la transacción se deshizo entera; se espera y se reintenta.
    if grep -q 'canceling statement due to lock timeout' "$err" && en_transaccion "$f" && [ "$intento" -lt "$INTENTOS" ]; then
      echo "[migrar] $n: una tabla estaba ocupada (lock_timeout); no se aplicó nada; intento $((intento + 1)) de $INTENTOS en $PAUSA s" >&2
      intento=$((intento + 1)); sleep "$PAUSA"; continue
    fi
    if grep -q 'canceling statement due to lock timeout' "$err"; then motivo="una tabla siguió ocupada por la app en $intento intentos (lock_timeout)"
    elif grep -q 'canceling statement due to statement timeout' "$err"; then motivo="pasó su statement_timeout (partirla por tandas o subir el tope con su motivo)"
    else motivo="falló ($(grep -m1 'ERROR' "$err" | cut -c1-160 || true))"; fi
    if en_transaccion "$f"; then motivo="$motivo; no se aplicó nada"; fi
    echo "[migrar] ✗ $n: $motivo. Se detiene aquí: la app sigue con lo de antes." >&2
    if [ -n "${MIGRAR_MOTIVO:-}" ]; then echo "$n: $motivo" > "$MIGRAR_MOTIVO" || true; fi
    rm -f "$err"
    exit "$rc"
  done
  rm -f "$err"
  if [ "$(psql -v tl_m_nombre="$n" -v tl_m_huella="$h" <<< "select count(*) from $tabla where name = :'tl_m_nombre' and sha256 = :'tl_m_huella';")" != 1 ]; then
    echo "[migrar] ✗ $n no quedó anotada (¿un begin sin su commit?): se detiene aquí" >&2
    exit 1
  fi
}

# 9o · --verificar: NO cambia nada. Cada migración del repo está aplicada con la misma huella (la restauración de prueba semanal y el ensayo lo corren
# contra la base restaurada). Sale con 1 si falta una o si una cambió.
if [ "$VERIFICAR" = 1 ]; then
  leer schema_migrations
  faltan=0
  for f in "$DIR"/*.sql; do
    n=$(basename "$f"); h=$(sha256sum "$f" | cut -d' ' -f1)
    prev=${HECHAS[$n]:-}
    if [ "$prev" != "$h" ]; then echo "[migrar] ✗ $n ${prev:+cambió}${prev:-no está aplicada}" >&2; faltan=$((faltan + 1)); fi
  done
  [ "$faltan" = 0 ] && echo "[migrar] verificado: ${#HECHAS[@]} migraciones, todas con su huella" && exit 0
  exit 1
fi

if [ "$SOLO_SEMILLA" = 1 ]; then
  # Semilla del sandbox: SOLO pruebas. Candado: la base debe decir que es de pruebas.
  psql -c "create table if not exists schema_seeds (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
  leer schema_seeds pruebas/
  nuevas=0
  for f in "${SEMILLA_DIR:?}"/*.sql; do
    [ -e "$f" ] || continue
    n="pruebas/$(basename "$f")"; h=$(sha256sum "$f" | cut -d' ' -f1)
    if [ "${HECHAS[$n]:-}" != "$h" ]; then
      echo "[migrar] semilla de pruebas $n"
      aplicar "$f" schema_seeds "$n" "$h" repetible; nuevas=$((nuevas + 1))
    fi
  done
  t=$SECONDS; refrescar
  echo "[migrar] semilla de pruebas al día: $nuevas aplicadas · $((SECONDS - INICIO)) s (refrescar $((SECONDS - t)) s)"
  exit 0
fi

psql -c "create table if not exists schema_migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
leer schema_migrations
nuevas=0
for f in "$DIR"/*.sql; do
  n=$(basename "$f"); h=$(sha256sum "$f" | cut -d' ' -f1)
  prev=${HECHAS[$n]:-}
  if [ -z "$prev" ]; then
    echo "[migrar] aplicando $n"
    aplicar "$f" schema_migrations "$n" "$h" nueva; nuevas=$((nuevas + 1))
  elif [ "$prev" != "$h" ]; then
    echo "[migrar] ✗ $n ya estaba aplicada y su contenido cambió. Las migraciones aplicadas no se editan: crea una nueva." >&2
    exit 1
  fi
done
total=$(( ${#HECHAS[@]} + nuevas ))
# Semillas repetibles (configuración real, no datos de ejemplo): se vuelven a aplicar cuando cambian.
psql -c "create table if not exists schema_seeds (name text primary key, sha256 text not null, applied_at timestamptz not null default now());"
leer schema_seeds
semillas=0
for f in "$(dirname "$DIR")"/seeds/*.sql; do
  [ -e "$f" ] || continue
  n=$(basename "$f"); h=$(sha256sum "$f" | cut -d' ' -f1)
  if [ "${HECHAS[$n]:-}" != "$h" ]; then
    echo "[migrar] semilla $n"
    aplicar "$f" schema_seeds "$n" "$h" repetible; semillas=$((semillas + 1))
  fi
done
t=$SECONDS; refrescar
echo "[migrar] al día: $total migraciones ($nuevas nuevas, $semillas semillas) · $((SECONDS - INICIO)) s (refrescar $((SECONDS - t)) s)"
