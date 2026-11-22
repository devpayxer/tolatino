#!/bin/bash
# 22 nov · Pruebas de packages/db/migrar.sh contra un Postgres 16 de verdad (guardián migrarUnaLectura). Lo que garantizaba antes, igual: el orden (el del
# glob), cada migración una sola vez con su huella, «se detiene en la primera aplicada que cambió» sin aplicar las de después, el primer error lo
# detiene todo, las semillas se vuelven a aplicar cuando cambian (también las de pruebas, como hace el CI con «sha256 = 'cambiada'»), --verificar no
# cambia nada. Y lo nuevo: sin nada nuevo son unas pocas idas y vueltas (no una por archivo), y un archivo con begin sin su commit no queda anotado.
# Necesita Postgres 16 (/usr/lib/postgresql/16/bin); corre como root (la base la levanta el usuario postgres, en una carpeta aparte y otro puerto).
# Uso (root): bash pruebas/infra/migrar.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
PG=/usr/lib/postgresql/16/bin
[ -x "$PG/initdb" ] || { echo "✗ falta Postgres 16 ($PG)"; exit 1; }
T=$(mktemp -d /tmp/tl-migrar.XXXX); chmod 755 "$T"; chown postgres "$T"
P=55494
pararlo() { su postgres -c "$PG/pg_ctl -D $T/datos -m immediate stop" >/dev/null 2>&1; rm -rf "$T"; }
trap pararlo EXIT
su postgres -c "$PG/initdb -D $T/datos -U postgres -A trust >/dev/null"
printf "port=$P\nunix_socket_directories='/tmp'\n" >> "$T/datos/postgresql.conf"
su postgres -c "$PG/pg_ctl -D $T/datos -l $T/datos.log -w start >/dev/null"
psql -h /tmp -p "$P" -U postgres -qc "create role tolatino login superuser" && psql -h /tmp -p "$P" -U postgres -qc "create database tolatino owner tolatino"
# El «docker compose … exec -T db psql -h 127.0.0.1 …» de mentira: cuenta cada llamada y habla con la base de aquí.
mkdir -p "$T/db/migrations" "$T/db/seeds" "$T/semilla"
cp "$RAIZ/packages/db/migrar.sh" "$T/db/migrar.sh"
cat > "$T/compose" <<EOF
#!/bin/bash
echo x >> "$T/llamadas"
shift 3; [ "\$1" = psql ] && shift
a=(); while [ \$# -gt 0 ]; do case "\$1" in -h) a+=(-h /tmp -p $P); shift 2 ;; *) a+=("\$1"); shift ;; esac; done
exec psql "\${a[@]}"
EOF
chmod +x "$T/compose"
M() { : > "$T/llamadas"; bash "$T/db/migrar.sh" "$@" "$T/compose" > "$T/salida" 2>&1; }
Q() { psql -h /tmp -p "$P" -U tolatino -d tolatino -qAt -c "$1"; }
llamadas() { wc -l < "$T/llamadas" | tr -d ' '; }
mig() { printf 'begin;\ncreate table %s (x int);\ninsert into orden (n) values (%s);\ncommit;\n' "t$1" "'$1'" > "$T/db/migrations/$1_t.sql"; }
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; tail -3 "$T/salida" | sed 's/^/      /'; fi; }

echo "migrar.sh contra Postgres 16:"
printf 'create table orden (i serial, n text);\n' > "$T/db/migrations/0001_orden.sql"   # una de las viejas, sin begin/commit
for i in $(seq 2 40); do [ "$i" = 15 ] || mig "$(printf %04d "$i")"; done
printf 'create table if not exists conf (k text primary key, v text);\ninsert into conf values (%s, %s) on conflict (k) do update set v = excluded.v;\n' "'a'" "'1'" > "$T/db/seeds/conf.sql"
M; ok "primera pasada: aplica las 39 en orden y la semilla" "$?:$(Q 'select count(*) from schema_migrations'):$(Q "select string_agg(n, ',' order by i) from orden" | cut -c1-14):$(Q "select v from conf")" "0:39:0002,0003,0004:1"
ok "… cada una anotada con su huella" "$(Q "select sha256 from schema_migrations where name = '0007_t.sql'")" "$(sha256sum "$T/db/migrations/0007_t.sql" | cut -d' ' -f1)"
M; ok "segunda pasada: no aplica nada" "$?:$(grep -c aplicando "$T/salida")" "0:0"
ok "… en 5 idas y vueltas, no una por archivo" "$(llamadas)" 5
mig 0015; mig 0041
M; ok "una nueva en medio y otra al final: se aplican las dos, en su orden" "$?:$(Q "select string_agg(n, ',' order by i) from orden where n in ('0015', '0041')")" "0:0015,0041"
printf '\n-- editada\n' >> "$T/db/migrations/0003_t.sql"; mig 0042
M; ok "una ya aplicada que cambió: se detiene" "$?:$(grep -c 'ya estaba aplicada y su contenido cambió' "$T/salida")" "1:1"
ok "… sin aplicar las de después" "$(Q "select count(*) from schema_migrations where name = '0042_t.sql'")" 0
M --verificar; ok "--verificar lo dice y no cambia nada" "$?:$(grep -c '0003_t.sql cambió' "$T/salida"):$(grep -c '0042_t.sql no está aplicada' "$T/salida"):$(Q 'select count(*) from schema_migrations')" "1:1:1:41"
mig 0003; M; ok "restaurada: sigue con la 0042" "$?:$(Q "select count(*) from schema_migrations where name = '0042_t.sql'")" "0:1"
M --verificar; ok "--verificar con todo aplicado" "$?:$(grep -c 'verificado: 42 migraciones' "$T/salida"):$(llamadas)" "0:1:1"
printf 'begin;\ncreate table t43 (x int);\nselect 1/0;\ncommit;\n' > "$T/db/migrations/0043_t.sql"; mig 0044
M; ok "una que falla: se detiene, no queda anotada, se deshace y no siguen las de después" "$?:$(Q "select count(*) from schema_migrations where name in ('0043_t.sql', '0044_t.sql')"):$(Q "select count(*) from pg_tables where tablename in ('t43', 't44')")" "3:0:0"
printf 'begin;\ncreate table t43 (x int);\n' > "$T/db/migrations/0043_t.sql"
M; ok "begin sin su commit: no queda anotada (antes sí) y se detiene" "$?:$(grep -c 'no quedó anotada' "$T/salida"):$(Q "select count(*) from schema_migrations where name = '0043_t.sql'"):$(Q "select count(*) from pg_tables where tablename = 't43'")" "1:1:0:0"
mig 0043; M; ok "arreglada: entran la 0043 y la 0044" "$?:$(Q "select count(*) from schema_migrations where name in ('0043_t.sql', '0044_t.sql')")" "0:2"
sed -i "s/'1'/'2'/" "$T/db/seeds/conf.sql"; M; ok "una semilla que cambió se vuelve a aplicar" "$?:$(Q "select v from conf"):$(grep -c 'semilla conf.sql' "$T/salida")" "0:2:1"
M; ok "… y sin cambios no" "$?:$(grep -c 'semilla conf.sql' "$T/salida")" "0:0"
printf 'insert into conf values (%s, %s) on conflict (k) do update set v = excluded.v;\n' "'p'" "'1'" > "$T/semilla/0001_p.sql"
SEMILLA_DIR="$T/semilla" M --semilla-pruebas; ok "semilla de pruebas: se aplica con su nombre pruebas/…" "$?:$(Q "select count(*) from schema_seeds where name = 'pruebas/0001_p.sql'")" "0:1"
SEMILLA_DIR="$T/semilla" M --semilla-pruebas; ok "… sin cambios, no se vuelve a aplicar (3 idas y vueltas)" "$?:$(grep -c 'semilla de pruebas pruebas/' "$T/salida"):$(llamadas)" "0:0:3"
Q "update schema_seeds set sha256 = 'cambiada' where name like 'pruebas/%'" >/dev/null
SEMILLA_DIR="$T/semilla" M --semilla-pruebas; ok "… con la huella cambiada (lo que hace el CI) se vuelve a aplicar" "$?:$(grep -c 'semilla de pruebas pruebas/0001_p.sql' "$T/salida")" "0:1"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
