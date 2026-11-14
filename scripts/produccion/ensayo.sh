#!/bin/bash
# 9o · El ENSAYO completo: una «producción de mentira» (fase9-apertura.md §4 9o; punta a punta prod9o) en máquinas desechables del proyecto de pruebas,
# desplegada desde la rama «ensayo» como sería produccion, con los simulacros del manual (docs/incidentes/) y sus cifras. Al terminar se destruye TODO
# (también si falla: trap). Lo corre el flujo .github/workflows/ensayo.yml (a mano) o una sesión con las mismas variables. Sin datos reales.
#   1. Rama «ensayo» = la revisión pedida (por defecto origin/pruebas) + la llave pública de recuperación del ensayo.
#   2. Cuatro máquinas (almacen, base, app, réplica) con el cloud-init de producción, red privada y firewalls.
#   3. Las llaves públicas de cada una → llaves.json; la llave del almacén sellada para las cuatro → la rama → despliegan solas.
#   4. Simulacros y medidas: primer despliegue sano · sobre sellado para otro servidor → no abre · versión que rompe /api/salud → vuelta atrás sola
#      (≤ 10 min, anotada) · migración expandir → contraer · respaldo completo + WAL + diferencial, RPO observado · dato borrado → PITR a otra base y
#      recuperarlo · restauración de prueba con su consulta de control (RTO) · Garage borra de verdad (L468) · respaldo de las fotos y sobres de
#      recuperación · perder la máquina de la app → reconstruirla con cloud-init + sobre (≤ 1 h).
#   5. Las cifras a ENSAYO_SALIDA/medidas.txt y resultado.md (van a docs/incidentes/simulacros.md y PROGRESS).
# Variables: HCLOUD_TOKEN (proyecto de pruebas) · git que pueda empujar las ramas «ensayo» y «recuperacion-ensayo» · docker, age, python3, curl.
# Opcionales: ENSAYO_REF (revisión; origin/pruebas) · ENSAYO_CONSERVAR=1 (no destruir, para mirar; ¡se paga por hora!) · TIPO_* y UBICACION (maquinas.sh).
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd); RAIZ=$(cd "$DIR/../.." && pwd)
# shellcheck source=hetzner.sh
. "$DIR/hetzner.sh"
# shellcheck source=/dev/null
. "$RAIZ/infra/ensayo/entorno.conf"
SAL=${ENSAYO_SALIDA:-$PWD/ensayo-salida}; mkdir -p "$SAL"; : > "$SAL/medidas.txt"
T=$(mktemp -d); chmod 700 "$T"
REF=${ENSAYO_REF:-origin/pruebas}
T_INICIO=$(date +%s)
medida() { echo "$1=$2" | tee -a "$SAL/medidas.txt"; }
paso() { echo; echo "── $(date -u +%T) · $*"; }
falla() { echo "✗ $*"; medida fallo "$*"; exit 1; }
limpiar() {
  local rc=$?
  find "$T" -type f -name '*.key' -exec shred -u {} + 2>/dev/null || true
  if [ "${ENSAYO_CONSERVAR:-0}" != 1 ]; then
    paso "destruyendo todo lo del ensayo"; entorno_borrar ensayo || echo "✗ revisar a mano en la consola del proveedor: quedó algo del ensayo (se paga)"
    git -C "$RAIZ" push -q origin --delete ensayo recuperacion-ensayo 2>/dev/null || true
  fi
  medida duracion_total_s "$(( $(date +%s) - T_INICIO ))"
  git -C "$RAIZ" worktree remove --force "$T/rama" 2>/dev/null || true
  rm -rf "$T"; exit "$rc"
}
trap limpiar EXIT
esperar() { # esperar SEGUNDOS DESCRIPCIÓN COMANDO… → los segundos que tardó (falla si no llega)
  local max="$1" que="$2" t0; shift 2; t0=$(date +%s)
  while ! "$@" >/dev/null 2>&1; do [ $(( $(date +%s) - t0 )) -lt "$max" ] || falla "no llegó a tiempo: $que"; sleep 15; done
  echo $(( $(date +%s) - t0 ))
}
empujar() { git -C "$T/rama" add -A; git -C "$T/rama" -c user.email=tolatino@users.noreply.github.com -c user.name="To'Latino ensayo" commit -qm "ensayo: $1"; git -C "$T/rama" push -q -f origin HEAD:refs/heads/ensayo; git -C "$T/rama" rev-parse --short=12 HEAD; }
salud_commit() { curl -fsS -m 10 "http://$APP_IP/api/salud" | grep -q "\"commit\":\"$1\""; }
estado_tiene() { curl -fsS -m 10 "http://$APP_IP/estado/$1" | grep -q -- "$2"; }

# 1) La rama del ensayo y sus llaves de un solo uso (recuperación y almacén): nacen aquí y mueren con el ensayo.
paso "rama ensayo desde $REF"
git -C "$RAIZ" fetch -q origin pruebas
git -C "$RAIZ" worktree add -q --detach "$T/rama" "$REF"
age-keygen -o "$T/rec.key" 2>/dev/null
mkdir -p "$T/rama/infra/ensayo/sellado"
{ echo "# llave pública de recuperación del ENSAYO (de un solo uso; su privada vive solo en el guion y se borra al terminar)"; age-keygen -y "$T/rec.key"; } > "$T/rama/infra/ensayo/sellado/recuperacion.txt"
printf '{\n  "_": "ensayo"\n}\n' > "$T/rama/infra/ensayo/sellado/llaves.json"
COMMIT0=$(empujar "rama y llave de recuperación")
RESPALDO_S3_KEY_ID="GK$(openssl rand -hex 12)"; RESPALDO_S3_SECRET=$(openssl rand -hex 32); export RESPALDO_S3_KEY_ID RESPALDO_S3_SECRET

# 2) Las máquinas.
paso "máquinas"
ENSAYO_IP_GUION=$(curl -fsS -m 10 https://api.ipify.org) bash "$DIR/maquinas.sh" crear ensayo
APP_IP=$(for id in $(servidor_de ensayo app); do ip_publica "$id"; done | head -1); ALM_IP=$(for id in $(servidor_de ensayo almacen); do ip_publica "$id"; done | head -1)
[ -n "$APP_IP" ] && [ -n "$ALM_IP" ] || falla "sin IP pública de la app o del almacén"

# 3) Las llaves públicas → llaves.json; la llave del almacén sellada para las cuatro.
paso "llaves públicas de las cuatro máquinas"
medida app_llave_s "$(esperar 1800 'llave de la app' curl -fsS -m 10 "http://$APP_IP/estado/llave.txt")"
export SELLADO_DIR="$T/rama/infra/ensayo/sellado"
curl -fsS "http://$APP_IP/estado/llave.txt" | bash "$DIR/sellar.sh" llave ensayo app
for rol in base replica almacen; do
  esperar 2700 "llave de $rol" curl -fsS -m 10 "http://$APP_IP/estado/$rol/llave.txt" >/dev/null
  curl -fsS "http://$APP_IP/estado/$rol/llave.txt" | bash "$DIR/sellar.sh" llave ensayo "$rol"
done
for rol in almacen base app replica; do bash "$DIR/sellar.sh" todos ensayo "$rol"; done
COMMIT1=$(empujar "llaves y sobres")

# 4a) Primer despliegue sano.
paso "primer despliegue sano ($COMMIT1)"
medida primer_despliegue_s "$(esperar 3600 'la app sana con el commit de las llaves' salud_commit "$COMMIT1")"

# 4b) Un sobre sellado para OTRO servidor no abre (y el de verdad sí).
paso "sobre sellado para otro servidor"
mkdir -p "$SELLADO_DIR/app"; printf 'x' | age -r "$(grep -Eo '"replica": *"age1[0-9a-z]{58}"' "$SELLADO_DIR/llaves.json" | grep -Eo 'age1[0-9a-z]{58}')" -o "$SELLADO_DIR/app/ANTHROPIC_API_KEY.age"
COMMIT2=$(empujar "un sobre para otro servidor")
esperar 1800 'despliegue con el sobre ajeno' salud_commit "$COMMIT2" >/dev/null
estado_tiene sobres.txt "ANTHROPIC_API_KEY · NO ABRE" && medida sobre_ajeno "no abre (bien)" || falla "un sobre para otro servidor ABRIÓ o no se dijo"
estado_tiene sobres.txt "RESPALDO_S3_KEY_ID · abierto" && medida sobre_propio "abre (bien)" || falla "el sobre propio no abrió"
rm -f "$SELLADO_DIR/app/ANTHROPIC_API_KEY.age"

# 4c) Una versión que rompe /api/salud después de pasar la puerta → vuelta atrás sola, anotada.
paso "versión que se rompe a los 90 s → vuelta atrás sola"
python3 - "$T/rama/apps/web/app/api/salud/route.ts" <<'PY'
import sys
p = sys.argv[1]; t = open(p).read()
t = t.replace("export async function GET() {", "const ROMPE_ENSAYO = Date.now();\nexport async function GET() {\n  if (Date.now() - ROMPE_ENSAYO > 90_000) return NextResponse.json({ ok: false, ensayo: 'rota a propósito' }, { status: 503 });", 1)
open(p, "w").write(t)
PY
t_push=$(date +%s); COMMIT3=$(empujar "versión que rompe /api/salud (solo el ensayo)")
medida vuelta_atras_desde_push_s "$(esperar 3600 'la vuelta atrás anotada' estado_tiene despliegues.txt "vuelta_atras|$COMMIT3")"
salud_commit "$COMMIT2" && medida vuelta_atras_sirve "la versión anterior ($COMMIT2)" || falla "después de la vuelta atrás no sirve la versión anterior"
medida vuelta_atras_rollback_s "$(curl -fsS "http://$APP_IP/estado/despliegues.txt" | awk -F'|' -v c="$COMMIT3" '$2 == "vuelta_atras" && $3 == c { print $4; exit }')"
estado_tiene despliegues.txt "incidente|despliegue-malo" && medida vuelta_atras_incidente "abierto (bien)" || falla "la vuelta atrás no abrió el incidente"
git -C "$T/rama" checkout -q HEAD~1 -- apps/web/app/api/salud/route.ts
COMMIT4=$(empujar "vuelve la versión buena"); esperar 3600 'la versión buena otra vez' salud_commit "$COMMIT4" >/dev/null

# 4d) Migración expandir → contraer (una columna nueva; en otro despliegue, cuando ningún código la lee, se quita).
paso "migración expandir → contraer"
printf 'begin;\nalter table cities add column if not exists ensayo_9o text;\ncommit;\n' > "$T/rama/packages/db/migrations/9001_ensayo_expandir.sql"
COMMIT5=$(empujar "expandir"); medida expandir_s "$(esperar 3600 'expandir' salud_commit "$COMMIT5")"
printf 'begin;\nalter table cities drop column if exists ensayo_9o;\ncommit;\n' > "$T/rama/packages/db/migrations/9002_ensayo_contraer.sql"
COMMIT6=$(empujar "contraer"); medida contraer_s "$(esperar 3600 'contraer' salud_commit "$COMMIT6")"
estado_tiene despliegues.txt "9002_ensayo_contraer.sql" && medida expandir_contraer "las dos sirvieron sin vuelta atrás" || falla "contraer no quedó anotado"

# 4e) Respaldos, RPO, dato borrado → PITR a otra base, restauración de prueba, fotos, Garage borra, sobres de recuperación.
paso "respaldos y restauraciones (órdenes del ensayo)"
mkdir -p "$T/rama/infra/ensayo/ordenes"
cat > "$T/rama/infra/ensayo/ordenes/base.sh" <<'EOF'
set -u; R=/opt/tolatino; P() { docker exec -i tolatino-base-db-1 psql -U tolatino -d tolatino -qAt "$@"; }
bash $R/infra/comun/respaldos/respaldar.sh base-completo
P -c "create table if not exists ensayo_9o_notas (id int primary key, texto text); create table if not exists ensayo_9o_marca (k text primary key, v text)"
P -c "insert into ensayo_9o_notas values (1, 'dato importante del ensayo') on conflict do nothing"
t0=$(date +%s); P -c "select pg_current_wal_lsn()" >/dev/null
for i in $(seq 1 120); do a=$(P -c "select coalesce(extract(epoch from last_archived_time)::int, 0) from pg_stat_archiver"); [ "$a" -ge "$t0" ] && break; sleep 2; done
echo "RPO_OBSERVADO_S=$(( $(date +%s) - t0 ))"
sleep 5; ANTES=$(P -c "select now()::text"); sleep 5
P -c "insert into ensayo_9o_marca values ('antes', '$ANTES') on conflict (k) do update set v = excluded.v"
P -c "delete from ensayo_9o_notas where id = 1"; P -c "select pg_switch_wal()" >/dev/null
bash $R/infra/comun/respaldos/respaldar.sh wal; bash $R/infra/comun/respaldos/respaldar.sh base-diferencial
bash $R/infra/comun/respaldos/respaldar.sh fotos; bash $R/infra/comun/respaldos/respaldar.sh sobre
# L468 · Garage borra de verdad: un objeto sube, se borra por la API S3 y ya no está (ni en la lista ni al pedirlo); el conteo del bucket vuelve.
. /etc/tolatino/rol.conf; E=/etc/tolatino/$TOLATINO_ENTORNO.env; G=$(grep -m1 '^MEDIOS_KEY_ID=' $E | cut -d= -f2); GS=$(grep -m1 '^MEDIOS_SECRET=' $E | cut -d= -f2 | tr -d "'")
RC() { docker run --rm -i --network host -e RCLONE_CONFIG_G_TYPE=s3 -e RCLONE_CONFIG_G_PROVIDER=Other -e RCLONE_CONFIG_G_ENDPOINT=http://10.41.0.2:3900 -e RCLONE_CONFIG_G_REGION=garage \
  -e RCLONE_CONFIG_G_ACCESS_KEY_ID="$G" -e RCLONE_CONFIG_G_SECRET_ACCESS_KEY="$GS" -e RCLONE_CONFIG_G_FORCE_PATH_STYLE=true rclone/rclone:1.68.2 "$@"; }
antes=$(docker exec tolatino-base-medios-1 /garage bucket info medios | grep -iE 'objects' | head -1)
head -c 1048576 /dev/urandom | RC rcat G:medios/privado/ensayo-9o.bin; RC deletefile G:medios/privado/ensayo-9o.bin
RC lsf G:medios/privado/ 2>/dev/null | grep -q ensayo-9o.bin && echo "GARAGE_BORRA=no" || echo "GARAGE_BORRA=si"
echo "GARAGE_CONTEO=$antes → $(docker exec tolatino-base-medios-1 /garage bucket info medios | grep -iE 'objects' | head -1)"
EOF
cat > "$T/rama/infra/ensayo/ordenes/app.sh" <<'EOF'
bash /opt/tolatino/infra/comun/respaldos/respaldar.sh sobre
EOF
cat > "$T/rama/infra/ensayo/ordenes/replica.sh" <<'EOF'
set -u; R=/opt/tolatino; . /etc/tolatino/rol.conf; E=/etc/tolatino/$TOLATINO_ENTORNO.env
export PGPASSWORD=$(grep -m1 '^POSTGRES_PASSWORD=' $E | cut -d= -f2-) DB_HOST=$(grep -m1 '^DB_HOST=' $E | cut -d= -f2-)
Q() { bash $R/infra/comun/psql-remoto.sh exec -T db psql -h x -U tolatino -d tolatino -qAt -c "$1"; }
for i in $(seq 1 90); do ANTES=$(Q "select v from ensayo_9o_marca where k = 'antes'" 2>/dev/null); [ -n "$ANTES" ] && [ "$(Q "select count(*) from backup_runs where kind = 'base' and result = 'ok' and detail like '%diff%'")" -ge 1 ] && break; sleep 20; done
# El dato borrado: PITR a OTRA base al instante de antes del borrado, sin tocar la de verdad.
t0=$(date +%s); RESTAURAR_COPIA=tl-pitr-ensayo bash $R/infra/comun/respaldos/restaurar-prueba.sh "$ANTES"
echo "PITR_S=$(( $(date +%s) - t0 ))"
echo "PITR_RECUPERADO=$(docker exec tl-pitr-ensayo psql -U tolatino -d tolatino -qAt -c "select texto from ensayo_9o_notas where id = 1")"
echo "BASE_DE_VERDAD=$(Q "select count(*) from ensayo_9o_notas where id = 1") filas"
docker rm -f tl-pitr-ensayo >/dev/null; docker volume rm -f tl-pitr-ensayo >/dev/null
# La restauración de prueba de cada semana (a hace 2 minutos), con su consulta de control y su RTO en restore_drills.
bash $R/infra/comun/respaldos/restaurar-prueba.sh "$(date -u -d '-2 min' '+%F %T+00')"
echo "RESTAURACION=$(Q "select result || ' rto ' || rto_s || ' s' from restore_drills order by id desc limit 1")"
bash $R/infra/comun/respaldos/respaldar.sh sobre
EOF
COMMIT7=$(empujar "órdenes de respaldos y restauraciones")
esperar 5400 'la orden de la réplica' estado_tiene replica/orden.txt "RESTAURACION=" >/dev/null
O_BASE=$(curl -fsS "http://$APP_IP/estado/base/orden.txt"); O_REP=$(curl -fsS "http://$APP_IP/estado/replica/orden.txt")
printf '%s\n%s\n' "$O_BASE" "$O_REP" > "$SAL/ordenes.txt"
for k in RPO_OBSERVADO_S GARAGE_BORRA GARAGE_CONTEO PITR_S PITR_RECUPERADO BASE_DE_VERDAD RESTAURACION; do medida "$k" "$(printf '%s\n%s\n' "$O_BASE" "$O_REP" | sed -n "s/^$k=//p" | tail -1)"; done
grep -q '^PITR_RECUPERADO=dato importante del ensayo' "$SAL/ordenes.txt" || falla "el PITR no recuperó el dato borrado"
grep -q '^RESTAURACION=ok' "$SAL/ordenes.txt" || falla "la restauración de prueba no salió bien"
grep -q '^GARAGE_BORRA=si' "$SAL/ordenes.txt" || falla "Garage no borró el objeto"
esperar 900 'el sobre de recuperación de la app' estado_tiene despliegues.txt "respaldo|sobre|ok" >/dev/null

# 4f) Perder la máquina de la app → reconstruirla con el mismo cloud-init + su sobre de recuperación (objetivo ≤ 1 h).
paso "perder la app y reconstruirla"
FP_ANTES=$(curl -fsS "http://$APP_IP/estado/llave.txt" | sed -n 's/^huella //p')
t0=$(date +%s)
TOLATINO_RECUPERACION_LLAVE=$(grep '^AGE-SECRET-KEY-' "$T/rec.key") RESPALDO_S3_ENDPOINT_PUBLICO="$ALM_IP:3443" RAMA_RECUPERACION=recuperacion-ensayo \
  bash "$DIR/reconstruir.sh" ensayo app | tee "$SAL/reconstruir.txt"
APP_IP=$(for id in $(servidor_de ensayo app); do ip_publica "$id"; done | head -1)
esperar 3600 'la app reconstruida sana' salud_commit "$COMMIT7" >/dev/null
medida reconstruir_app_s "$(( $(date +%s) - t0 ))"
[ "$(curl -fsS "http://$APP_IP/estado/llave.txt" | sed -n 's/^huella //p')" = "$FP_ANTES" ] && medida reconstruir_llaves "las de siempre (misma llave age)" || falla "la app reconstruida no tiene sus llaves de siempre"
estado_tiene sobres.txt "· abierto" && medida reconstruir_sobres "los sobres sellados del repo vuelven a abrir" || falla "los sobres no abren en la app reconstruida"

# 5) El resumen.
{ echo "# Ensayo de producción · $(date -u +%F) · revisión $(git -C "$RAIZ" rev-parse --short "$REF")"
  echo; echo "| Medida | Valor |"; echo "|---|---|"; sed -E 's/^([^=]+)=(.*)$/| \1 | \2 |/' "$SAL/medidas.txt"; } > "$SAL/resultado.md"
paso "ensayo completo ✓ (las cifras en $SAL/resultado.md)"
