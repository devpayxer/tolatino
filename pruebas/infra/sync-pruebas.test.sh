#!/bin/bash
# 22 nov · Pruebas de infra/pruebas/tolatino-sync (el del SANDBOX; guardián sandboxSeArreglaSolo) contra un repo de mentira en una carpeta. El sandbox no
# tiene SSH: tolatino-sync es el único camino por el que se arregla solo, así que un push nunca puede dejarlo sin poder bajar el siguiente:
#   (1) un deploy.sh, o algo que carga en el momento, que no es bash válido NO se corre: los contenedores siguen como estaban (sirviendo lo de antes),
#       queda FALLO con el motivo y /estado/ lo dice; el commit siguiente que lo arregla sí se despliega;
#   (2) sin cambios no se vuelve a desplegar; un FALLO se reintenta a los 15 min;
#   (2b) 26 nov (docs/incidentes/sandbox-no-se-actualiza.md) · un reinicio que corta git a medias no lo deja trabado: los *.lock que quedan en .git se
#       borran y se despliega; si no se puede bajar la rama, /estado/ lo dice (motivo, desde cuándo, cuántas vueltas) en vez de quedarse callada; a las
#       15 vueltas fallidas seguidas se vuelve a clonar (sin red, se queda el .git de antes, sin restos); un deploy.sh colgado se corta en su tope;
#   (3) instalar_si_valido (infra/comun/lib.sh), con lo que deploy.sh se reinstala tolatino-sync: uno roto no reemplaza al bueno, y el bueno entra con
#       cambio atómico (otro inodo: el que está corriendo sigue leyendo su copia).
# Corre aislado (pruebas/infra/aislar.sh: montajes y red aparte, tmpfs sobre /opt, /etc, /var/lib/tolatino, /var/www, /var/log, /run…); el deploy.sh del
# repo de mentira solo anota. Un tolatino-sync que no lee TOLATINO_SYNC_REPO y TOLATINO_SYNC_DIR no se corre (clonaría y desplegaría en esta máquina).
# Uso (root): bash pruebas/infra/sync-pruebas.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
# shellcheck source=aislar.sh
. "$RAIZ/pruebas/infra/aislar.sh"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
G() { git -C "$T/trabajo" -c user.email=t@t -c user.name=t -c commit.gpgsign=false "$@"; }
git init -q --bare "$T/origen.git"
git init -q -b pruebas "$T/trabajo"
mkdir -p "$T/trabajo/infra/pruebas" "$T/trabajo/infra/comun" "$T/trabajo/packages/db"
cp "$RAIZ/infra/pruebas/tolatino-sync" "$T/trabajo/infra/pruebas/tolatino-sync"
cat > "$T/trabajo/infra/pruebas/deploy.sh" <<'EOF'
#!/bin/bash
. infra/comun/lib.sh
echo "$(git rev-parse --short HEAD)" >> /var/lib/tolatino/desplegados
sleep "$(cat dormir 2>/dev/null || echo 0)"
exit "$(cat salida 2>/dev/null || echo 0)"
EOF
printf '#!/bin/bash\nlog() { echo "$*"; }\n' > "$T/trabajo/infra/comun/lib.sh"
printf '#!/bin/bash\necho migrar\n' > "$T/trabajo/packages/db/migrar.sh"
echo 0 > "$T/trabajo/salida"
commit() { echo "$1" > "$T/trabajo/x"; G add -A; G commit -qm "$1"; G push -q origin pruebas 2>/dev/null; G rev-parse --short HEAD; }
G remote add origin "$T/origen.git"
correr() { # correr → el último resultado; los despliegues en $T/estado/desplegados, la página en $T/estado/index.html
  AISLAR_VISIBLES="$T" aislado '
    mkdir -p /var/lib/tolatino /var/www/estado
    cp -a "$0/estado/." /var/lib/tolatino/ 2>/dev/null
    TOLATINO_SYNC_REPO="$0/origen.git" TOLATINO_SYNC_DIR="$0/maquina" bash "$0/trabajo/infra/pruebas/tolatino-sync"
    [ -e /opt/tolatino ] && echo "$(date -Is)" >> "$0/desobedece"
    rm -rf "$0/estado"; mkdir -p "$0/estado"; cp -a /var/lib/tolatino/. "$0/estado/"; cp /var/www/estado/index.html "$0/estado/index.html" 2>/dev/null' "$T" 2>/dev/null
  cat "$T/estado/last-result" 2>/dev/null
}
# Antes de nada: el tolatino-sync bajo prueba lee las variables con las que la prueba lo apunta a sus carpetas; si no, no se corre.
aislar_exige "$T/trabajo/infra/pruebas/tolatino-sync" TOLATINO_SYNC_REPO TOLATINO_SYNC_DIR || exit 1
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
n() { grep -c . "$T/estado/desplegados" 2>/dev/null || echo 0; }
ult() { tail -1 "$T/estado/desplegados" 2>/dev/null; }
echo "tolatino-sync del sandbox:"
C1=$(commit uno)
ok "primer despliegue" "$(correr)" OK
ok "… y corrió deploy.sh con ese commit" "$(ult)" "$C1"
correr >/dev/null
ok "sin cambios no se vuelve a desplegar" "$(n)" 1
printf '#!/bin/bash\nif [ x = x ]; then\necho roto\n' >> "$T/trabajo/infra/pruebas/deploy.sh"; C2=$(commit deploy-roto)
ok "un deploy.sh que no es bash válido: FALLO" "$(correr)" FALLO
ok "… y NO se corre (los contenedores siguen como estaban)" "$(n)" 1
ok "… /estado/ dice por qué" "$(grep -o 'no es bash válido: infra/pruebas/deploy.sh' "$T/estado/index.html" | head -1)" "no es bash válido: infra/pruebas/deploy.sh"
touch -d '-20 min' "$T/estado/last-result"; correr >/dev/null
ok "… a los 15 min se vuelve a mirar y tampoco se corre" "$(n)" 1
G checkout -q HEAD~1 -- infra/pruebas/deploy.sh; C3=$(commit deploy-arreglado)
ok "el commit que lo arregla se despliega" "$(correr)" OK
ok "… y es el nuevo" "$(ult)" "$C3"
ok "… y /estado/ ya no dice el motivo" "$(grep -c 'Motivo' "$T/estado/index.html")" 0
printf 'log() {\n' >> "$T/trabajo/infra/comun/lib.sh"; commit lib-roto >/dev/null
ok "una pieza que deploy.sh carga (infra/comun/lib.sh) rota: FALLO sin correr nada" "$(correr):$(n)" "FALLO:2"
printf 'echo "$(\n' >> "$T/trabajo/packages/db/migrar.sh"; G checkout -q HEAD~1 -- infra/comun/lib.sh; commit migrar-roto >/dev/null
ok "migrar.sh roto: FALLO sin correr nada" "$(correr):$(n)" "FALLO:2"
G checkout -q HEAD~2 -- packages/db/migrar.sh; echo 1 > "$T/trabajo/salida"; C5=$(commit deploy-falla)
ok "un deploy.sh válido que falla: FALLO (sí se corrió)" "$(correr):$(ult)" "FALLO:$C5"
touch -d '-20 min' "$T/estado/last-result"; m=$(n); correr >/dev/null
ok "… y se reintenta a los 15 min" "$(n)" "$((m + 1))"

echo "un reinicio que corta git a medias (26 nov):"
P="$T/estado/index.html"
echo 0 > "$T/trabajo/salida"; C6=$(commit tras-reinicio)
: > "$T/maquina/.git/shallow.lock"; : > "$T/maquina/.git/index.lock"; mkdir -p "$T/maquina/.git/refs/remotes/origin"; : > "$T/maquina/.git/refs/remotes/origin/pruebas.lock"
ok "queda un shallow.lock (y index.lock, refs/…/pruebas.lock): se borran y se despliega el commit nuevo" "$(correr):$(ult)" "OK:$C6"
ok "… no queda ningún candado" "$(find "$T/maquina/.git" -name '*.lock' | wc -l)" 0
ok "… y el registro (en /estado/) dice cuáles borró" "$(grep -c 'candados de git que dejó una vuelta cortada, borrados: .*shallow\.lock' "$P")" 1
m=$(n); C7=$(commit sin-red); mv "$T/origen.git" "$T/origen.fuera"; rm -f "$P"   # hay un commit nuevo en la rama y el servidor no llega
ok "el fetch falla: no despliega y el resultado de antes se queda" "$(correr):$(n)" "OK:$m"
ok "… /estado/ se escribe igual y lo dice: desde cuándo, cuántas vueltas" "$(grep -cE 'No se puede bajar la rama pruebas</b> desde [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} [^·]*· vueltas fallidas seguidas: 1 ' "$P" 2>/dev/null)" 1
ok "… y el motivo (lo que dijo git)" "$(grep -c 'Motivo:</b> [^<]*origen\.git' "$P")" 1
correr >/dev/null
ok "… la vuelta siguiente cuenta 2 y sigue el «desde» de la primera" "$(grep -oE 'vueltas fallidas seguidas: [0-9]+' "$P"):$(cat "$T/estado/bajar-desde" 2>/dev/null | wc -l)" "vueltas fallidas seguidas: 2:1"
mv "$T/origen.fuera" "$T/origen.git"
ok "vuelve la red: se despliega lo que faltaba" "$(correr):$(ult)" "OK:$C7"
ok "… y /estado/ ya no dice que no se puede bajar" "$(grep -c 'No se puede bajar' "$P"):$(find "$T/estado" -name 'bajar-*' | wc -l)" "0:0"

echo "N vueltas fallidas seguidas → volver a clonar (26 nov):"
INODO=$(stat -c %i "$T/maquina")
printf '[core\n' >> "$T/maquina/.git/config"; C8=$(commit git-roto)
echo 13 > "$T/estado/bajar-fallos"; echo "2026-11-26 04:30 EST" > "$T/estado/bajar-desde"
ok "un .git que git no puede leer: vuelta 14, todavía no se vuelve a clonar" "$(correr):$(cat "$T/estado/bajar-fallos"):$([ -e "$T/maquina.git-roto" ] && echo reclonado || echo no)" "OK:14:no"
mv "$T/origen.git" "$T/origen.fuera"
ok "vuelta 15 sin red: volver a clonar falla, se queda el .git de antes y sin restos" "$(correr):$(cat "$T/estado/bajar-fallos"):$(grep -c '^\[core$' "$T/maquina/.git/config"):$(ls -d "$T"/maquina.* 2>/dev/null | wc -l)" "OK:15:1:0"
ok "… y el registro lo dice" "$(grep -c 'volver a clonar falló (sigue el .git de antes)' "$P")" 1
mv "$T/origen.fuera" "$T/origen.git"; echo 29 > "$T/estado/bajar-fallos"
ok "vuelta 30 (con red): se vuelve a clonar y se despliega el commit de la rama" "$(correr):$(ult)" "OK:$C8"
ok "… el .git nuevo funciona, el roto queda aparte y la carpeta de trabajo es la misma" "$(git -C "$T/maquina" rev-parse --short HEAD):$([ -d "$T/maquina.git-roto" ] && echo aparte):$([ -e "$T/maquina.reclon" ] && echo restos || echo limpio):$(stat -c %i "$T/maquina")" "$C8:aparte:limpio:$INODO"
ok "… /estado/ ya no dice que no se puede bajar y el registro dice que se re-clonó" "$(grep -c 'No se puede bajar' "$P"):$(grep -c 're-clonado: el .git nuevo' "$P")" "0:1"
m=$(n); correr >/dev/null
ok "… y la vuelta siguiente es normal (sin desplegar otra vez)" "$(n)" "$m"

echo "un deploy.sh colgado (26 nov):"
echo 30 > "$T/trabajo/dormir"; C9=$(commit deploy-colgado)
t0=$SECONDS; r=$(TOLATINO_SYNC_TOPE_DEPLOY=2 correr)
ok "se corta en su tope: FALLO y /estado/ dice por qué" "$r:$(ult):$(grep -c 'deploy.sh pasó de 2 s y se cortó' "$P")" "FALLO:$C9:1"
ok "… sin esperar a que termine" "$([ $((SECONDS - t0)) -lt 20 ] && echo pronto || echo tarde)" pronto

echo "instalar_si_valido (deploy.sh se reinstala tolatino-sync):"
I=$(bash -c '
  set -u; log() { echo "LOG $*"; }; eval "$(sed -n "/^instalar_si_valido() {/,/^}/p" "$1/infra/comun/lib.sh")"
  d=$(mktemp -d); printf "#!/bin/bash\necho bueno\n" > "$d/viejo"; cp "$d/viejo" "$d/dest"; chmod 755 "$d/dest"; i1=$(stat -c %i "$d/dest")
  printf "#!/bin/bash\nif true; then\n" > "$d/roto"
  instalar_si_valido "$d/roto" "$d/dest" >/dev/null; echo "roto:$?:$(cmp -s "$d/viejo" "$d/dest" && echo sigue-el-viejo)"
  printf "#!/bin/bash\necho nuevo\n" > "$d/nuevo"
  instalar_si_valido "$d/nuevo" "$d/dest"; echo "nuevo:$?:$(cmp -s "$d/nuevo" "$d/dest" && echo instalado):$([ "$(stat -c %i "$d/dest")" != "$i1" ] && echo otro-inodo):$(stat -c %a "$d/dest")"
  : > "$d/archivo"; instalar_si_valido "$d/nuevo" "$d/archivo/dest" >/dev/null 2>&1; echo "no-se-pudo:$?"
  ls "$d" | grep -c "nuevo\." ; rm -rf "$d"' _ "$RAIZ")
ok "uno que no es bash válido no reemplaza al bueno" "$(echo "$I" | grep '^roto:')" "roto:1:sigue-el-viejo"
ok "uno válido entra con cambio atómico (otro inodo) y 755" "$(echo "$I" | grep '^nuevo:')" "nuevo:0:instalado:otro-inodo:755"
ok "uno válido que no se pudo copiar (disco lleno, permisos) devuelve 2, no 1 (/estado/ no dice «no es bash válido»)" "$(echo "$I" | grep '^no-se-pudo:')" "no-se-pudo:2"
ok "… sin dejar archivos a medias" "$(echo "$I" | tail -1)" 0
ok "ninguna vuelta tocó /opt/tolatino (el tolatino-sync obedece a la prueba)" "$(grep -c . "$T/desobedece" 2>/dev/null || echo 0)" 0
echo "$bien/$total casos"
[ "$bien" = "$total" ]
