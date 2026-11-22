#!/bin/bash
# 22 nov · Pruebas de infra/pruebas/tolatino-sync (el del SANDBOX; guardián sandboxSeArreglaSolo) contra un repo de mentira en una carpeta. El sandbox no
# tiene SSH: tolatino-sync es el único camino por el que se arregla solo, así que un push nunca puede dejarlo sin poder bajar el siguiente:
#   (1) un deploy.sh, o algo que carga en el momento, que no es bash válido NO se corre: los contenedores siguen como estaban (sirviendo lo de antes),
#       queda FALLO con el motivo y /estado/ lo dice; el commit siguiente que lo arregla sí se despliega;
#   (2) sin cambios no se vuelve a desplegar; un FALLO se reintenta a los 15 min;
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
    mkdir -p "$0/estado"; cp -a /var/lib/tolatino/. "$0/estado/"; cp /var/www/estado/index.html "$0/estado/index.html" 2>/dev/null' "$T" 2>/dev/null
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

echo "instalar_si_valido (deploy.sh se reinstala tolatino-sync):"
I=$(bash -c '
  set -u; log() { echo "LOG $*"; }; eval "$(sed -n "/^instalar_si_valido() {/,/^}/p" "$1/infra/comun/lib.sh")"
  d=$(mktemp -d); printf "#!/bin/bash\necho bueno\n" > "$d/viejo"; cp "$d/viejo" "$d/dest"; chmod 755 "$d/dest"; i1=$(stat -c %i "$d/dest")
  printf "#!/bin/bash\nif true; then\n" > "$d/roto"
  instalar_si_valido "$d/roto" "$d/dest" >/dev/null; echo "roto:$?:$(cmp -s "$d/viejo" "$d/dest" && echo sigue-el-viejo)"
  printf "#!/bin/bash\necho nuevo\n" > "$d/nuevo"
  instalar_si_valido "$d/nuevo" "$d/dest"; echo "nuevo:$?:$(cmp -s "$d/nuevo" "$d/dest" && echo instalado):$([ "$(stat -c %i "$d/dest")" != "$i1" ] && echo otro-inodo):$(stat -c %a "$d/dest")"
  ls "$d" | grep -c "nuevo\." ; rm -rf "$d"' _ "$RAIZ")
ok "uno que no es bash válido no reemplaza al bueno" "$(echo "$I" | grep '^roto:')" "roto:1:sigue-el-viejo"
ok "uno válido entra con cambio atómico (otro inodo) y 755" "$(echo "$I" | grep '^nuevo:')" "nuevo:0:instalado:otro-inodo:755"
ok "… sin dejar archivos a medias" "$(echo "$I" | tail -1)" 0
ok "ninguna vuelta tocó /opt/tolatino (el tolatino-sync obedece a la prueba)" "$(grep -c . "$T/desobedece" 2>/dev/null || echo 0)" 0
echo "$bien/$total casos"
[ "$bien" = "$total" ]
