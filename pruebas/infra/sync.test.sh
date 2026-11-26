#!/bin/bash
# 9o · Pruebas de infra/produccion/tolatino-sync (guardián produccionSoloAvanza) contra un repo de mentira en una carpeta: la máquina de producción solo
# despliega un commit que (1) avanza (fast-forward), (2) ya está en «pruebas» y (3) lleva la etiqueta ok-produccion/* con el OK del fundador, y ese OK
# llega al despliegue (TOLATINO_OK_REF). Una vuelta atrás no se reintenta sola. Corre aislado (pruebas/infra/aislar.sh: montajes y
# red aparte, tmpfs sobre /opt, /etc/tolatino, /var/lib/tolatino, /var/www, /var/log, /run…); el deploy.sh del repo de mentira solo anota con qué lo
# llamaron. Un tolatino-sync que no lee TOLATINO_SYNC_REPO y TOLATINO_SYNC_DIR no se corre.
# 26 nov (docs/incidentes/sandbox-no-se-actualiza.md, guardián produccionSeArreglaSola) · lo que el sandbox aprendió, sin perder nada de lo de arriba: los
# *.lock que deja un reinicio a medias se borran y se despliega; si no se puede bajar la rama, /estado/ lo dice (desde cuándo, cuántas vueltas, el
# motivo); a las 15 vueltas fallidas seguidas se vuelve a clonar (con pruebas y las etiquetas) y se despliega; volver a clonar no se salta «solo avanza»
# (una historia reescrita y un commit sin etiqueta siguen RECHAZADOS) ni vuelve a desplegar una versión que volvió atrás sola; un reset --hard que
# falla cuenta como no poder bajar; lo que deploy.sh carga se comprueba con bash -n; un deploy.sh colgado se corta en su tope.
# Uso (root): bash pruebas/infra/sync.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
# shellcheck source=aislar.sh
. "$RAIZ/pruebas/infra/aislar.sh"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
G() { git -C "$T/trabajo" -c user.email=t@t -c user.name=t -c commit.gpgsign=false -c tag.gpgsign=false "$@"; }
git init -q --bare "$T/origen.git"
git init -q -b pruebas "$T/trabajo"
mkdir -p "$T/trabajo/infra/produccion"
cp "$RAIZ/infra/produccion/tolatino-sync" "$T/trabajo/infra/produccion/tolatino-sync"
cat > "$T/trabajo/infra/produccion/deploy.sh" <<'EOF'
#!/bin/bash
echo "$(git rev-parse --short HEAD)|${TOLATINO_OK_REF:-}" >> /var/lib/tolatino/desplegados
sleep "$(cat dormir 2>/dev/null || echo 0)"
exit "$(cat salida 2>/dev/null || echo 0)"
EOF
echo 0 > "$T/trabajo/salida"
commit() { echo "$1" > "$T/trabajo/x"; [ -n "${2:-}" ] && echo "$2" > "$T/trabajo/salida"; G add -A; G commit -qm "$1"; G rev-parse --short HEAD; }
C1=$(commit uno); G remote add origin "$T/origen.git"; G push -q origin pruebas; G push -q origin pruebas:produccion
G tag -a "ok-produccion/2026-11-14-$C1" "$C1" -m "OK del fundador: «dale» (14 nov 2026)"; G push -q origin --tags
correr() { # correr → el último resultado; el registro de despliegues en $T/estado/desplegados, la página en $T/estado/index.html
  AISLAR_VISIBLES="$T" aislado '
    mkdir -p /etc/tolatino /var/lib/tolatino /var/www/estado
    printf "TOLATINO_ROL=app\nTOLATINO_ENTORNO=produccion\nTOLATINO_RAMA=produccion\n" > /etc/tolatino/rol.conf
    cp -a "$0/estado/." /var/lib/tolatino/ 2>/dev/null
    TOLATINO_SYNC_REPO="$0/origen.git" TOLATINO_SYNC_DIR="$0/maquina" bash "$0/trabajo/infra/produccion/tolatino-sync"
    [ -e /opt/tolatino ] && echo "$(date -Is)" >> "$0/desobedece"
    rm -rf "$0/estado"; mkdir -p "$0/estado"; cp -a /var/lib/tolatino/. "$0/estado/"; cp /var/www/estado/index.html "$0/estado/index.html" 2>/dev/null' "$T" 2>/dev/null
  cat "$T/estado/last-result" 2>/dev/null
}
aislar_exige "$T/trabajo/infra/produccion/tolatino-sync" TOLATINO_SYNC_REPO TOLATINO_SYNC_DIR || exit 1
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
ult() { tail -1 "$T/estado/desplegados" 2>/dev/null | cut -d'|' -f1; }
echo "tolatino-sync de producción:"
ok "primer despliegue con la etiqueta del OK" "$(correr)" OK
ok "… y el OK del fundador llega al despliegue" "$(tail -1 "$T/estado/desplegados" | cut -d'|' -f2 | grep -o 'dale')" dale
C2=$(commit dos); G push -q origin pruebas; G push -q origin pruebas:produccion
ok "un commit nuevo SIN la etiqueta no se despliega" "$(correr)" RECHAZADO
ok "… y sigue el de antes" "$(ult)" "$C1"
G tag -a "ok-produccion/2026-11-14-$C2" "$C2" -m "OK del fundador: «va» (14 nov 2026)"; G push -q origin --tags
ok "con su etiqueta, sí" "$(correr)" OK
ok "… y es el nuevo" "$(ult)" "$C2"
G checkout -q -b otra "$C1"; C3=$(commit fuera-de-pruebas); G tag -a "ok-produccion/2026-11-14-$C3" "$C3" -m "OK del fundador: «x» (14 nov 2026)"; G push -q origin --tags; G push -q -f origin otra:produccion
ok "una rama que reescribe la historia (aunque tenga etiqueta) se rechaza" "$(correr)" RECHAZADO
ok "… y sigue el de antes" "$(ult)" "$C2"
G checkout -q pruebas; G push -q -f origin pruebas:produccion; C4=$(commit no-paso-por-pruebas); G push -q origin pruebas:produccion
G tag -a "ok-produccion/2026-11-14-$C4" "$C4" -m "OK del fundador: «y» (14 nov 2026)"; G push -q origin --tags
ok "un commit que no está en pruebas se rechaza" "$(correr)" RECHAZADO
G push -q origin pruebas; ok "cuando llega a pruebas, sí" "$(correr)" OK
C5=$(commit mala 2); G push -q origin pruebas pruebas:produccion; G tag -a "ok-produccion/2026-11-14-$C5" "$C5" -m "OK del fundador: «z» (14 nov 2026)"; G push -q origin --tags
ok "una versión que vuelve atrás sola queda VUELTA_ATRAS" "$(correr)" VUELTA_ATRAS
n=$(grep -c "^$C5|" "$T/estado/desplegados"); touch -d '-20 min' "$T/estado/last-result"; correr >/dev/null
ok "… y no se reintenta sola (sería servir otra vez la mala)" "$(grep -c "^$C5|" "$T/estado/desplegados")" "$n"
# promover NOMBRE [SALIDA] → un commit nuevo en pruebas y produccion con su etiqueta del OK (lo que haría promover.sh); escribe su commit corto.
promover() { local c; c=$(commit "$1" "${2:-}"); G push -q origin pruebas pruebas:produccion 2>/dev/null
  G tag -a "ok-produccion/2026-11-26-$c" "$c" -m "OK del fundador: «$1» (26 nov 2026)"; G push -q origin --tags 2>/dev/null; echo "$c"; }
P="$T/estado/index.html"
romper() { printf '[core\n' >> "$T/maquina/.git/config"; echo "$1" > "$T/estado/bajar-fallos"; echo "2026-11-26 04:30 EST" > "$T/estado/bajar-desde"; }

echo "volver a clonar tras una vuelta atrás (26 nov):"
n5=$(grep -c "^$C5|" "$T/estado/desplegados"); romper 14
ok "vuelta 15 con un .git roto: se vuelve a clonar y la versión que volvió atrás NO se despliega otra vez" "$(correr):$(grep -c "^$C5|" "$T/estado/desplegados")" "VUELTA_ATRAS:$n5"
ok "… el clon nuevo queda en lo desplegado y el registro dice que se re-clonó" "$(git -C "$T/maquina" rev-parse --short HEAD):$(grep -c 're-clonado: el .git nuevo' "$P")" "$C5:1"

echo "un reinicio que corta git a medias (26 nov):"
C6=$(promover tras-reinicio 0)
: > "$T/maquina/.git/shallow.lock"; : > "$T/maquina/.git/index.lock"; mkdir -p "$T/maquina/.git/refs/remotes/origin"; : > "$T/maquina/.git/refs/remotes/origin/produccion.lock"
ok "queda un shallow.lock (y index.lock, refs/…/produccion.lock): se borran y se despliega el commit nuevo" "$(correr):$(ult)" "OK:$C6"
ok "… no queda ningún candado" "$(find "$T/maquina/.git" -name '*.lock' | wc -l)" 0
ok "… y el registro (en /estado/) dice cuáles borró" "$(grep -c 'candados de git que dejó una vuelta cortada, borrados: .*shallow\.lock' "$P")" 1
m=$(grep -c . "$T/estado/desplegados"); C7=$(promover sin-red); mv "$T/origen.git" "$T/origen.fuera"; rm -f "$P"
ok "el fetch falla: no despliega y el resultado de antes se queda" "$(correr):$(grep -c . "$T/estado/desplegados")" "OK:$m"
ok "… /estado/ se escribe igual y lo dice: desde cuándo, cuántas vueltas" "$(grep -cE 'No se puede bajar la rama produccion</b> desde [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} [^·]*· vueltas fallidas seguidas: 1 ' "$P" 2>/dev/null)" 1
ok "… y el motivo (lo que dijo git)" "$(grep -c 'Motivo:</b> [^<]*origen\.git' "$P")" 1
correr >/dev/null
ok "… la vuelta siguiente cuenta 2 y sigue el «desde» de la primera" "$(grep -oE 'vueltas fallidas seguidas: [0-9]+' "$P"):$(wc -l < "$T/estado/bajar-desde")" "vueltas fallidas seguidas: 2:1"
mv "$T/origen.fuera" "$T/origen.git"
ok "vuelve la red: se despliega lo que faltaba" "$(correr):$(ult)" "OK:$C7"
ok "… y /estado/ ya no dice que no se puede bajar" "$(grep -c 'No se puede bajar' "$P"):$(find "$T/estado" -name 'bajar-*' | wc -l)" "0:0"

echo "N vueltas fallidas seguidas → volver a clonar (26 nov):"
INODO=$(stat -c %i "$T/maquina"); C8=$(promover git-roto); rm -rf "$T/maquina.git-roto"; romper 13
ok "un .git que git no puede leer: vuelta 14, todavía no se vuelve a clonar" "$(correr):$(cat "$T/estado/bajar-fallos"):$([ -e "$T/maquina.git-roto" ] && echo reclonado || echo no)" "OK:14:no"
mv "$T/origen.git" "$T/origen.fuera"
ok "vuelta 15 sin red: volver a clonar falla, se queda el .git de antes y sin restos" "$(correr):$(cat "$T/estado/bajar-fallos"):$(grep -c '^\[core$' "$T/maquina/.git/config"):$(ls -d "$T"/maquina.* 2>/dev/null | wc -l)" "OK:15:1:0"
ok "… y el registro lo dice" "$(grep -c 'volver a clonar falló (sigue el .git de antes)' "$P")" 1
mv "$T/origen.fuera" "$T/origen.git"; echo 29 > "$T/estado/bajar-fallos"
ok "vuelta 30 (con red): se vuelve a clonar y se despliega el commit de la rama" "$(correr):$(ult)" "OK:$C8"
ok "… el .git nuevo trae pruebas y las etiquetas del OK, el roto queda aparte y la carpeta de trabajo es la misma" "$(git -C "$T/maquina" rev-parse --short HEAD):$(git -C "$T/maquina" rev-parse -q --verify origin/pruebas >/dev/null && echo pruebas):$(git -C "$T/maquina" tag -l 'ok-produccion/*' | grep -c "$C8"):$([ -d "$T/maquina.git-roto" ] && echo aparte):$([ -e "$T/maquina.reclon" ] && echo restos || echo limpio):$(stat -c %i "$T/maquina")" "$C8:pruebas:1:aparte:limpio:$INODO"
ok "… /estado/ ya no dice que no se puede bajar y el registro dice que se re-clonó" "$(grep -c 'No se puede bajar' "$P"):$(grep -c 're-clonado: el .git nuevo' "$P")" "0:1"
m=$(grep -c . "$T/estado/desplegados"); correr >/dev/null
ok "… y la vuelta siguiente es normal (sin desplegar otra vez)" "$(grep -c . "$T/estado/desplegados")" "$m"

echo "volver a clonar no se salta «solo avanza» (26 nov):"
# produccion vuelve a C1: tiene su etiqueta y está en pruebas; en el clon nuevo el HEAD sería C1, y compararse con él lo aceptaría.
G push -q -f origin "$C1:refs/heads/produccion" 2>/dev/null; romper 14
ok "una historia reescrita que llega justo al volver a clonar: RECHAZADO" "$(correr):$(ult)" "RECHAZADO:$C8"
ok "… re-clonó, el registro dice por qué y /estado/ también" "$(grep -c 're-clonado: el .git nuevo' "$P"):$(grep -cE "[0-9] RECHAZADO $C1: la rama produccion no avanzó: reescribe la historia" "$P"):$(grep -c "<b>Motivo:</b> RECHAZADO $C1: la rama produccion no avanzó" "$P")" "1:1:1"
ok "… y la vuelta siguiente lo sigue rechazando" "$(correr):$(ult)" "RECHAZADO:$C8"
G push -q -f origin pruebas:produccion 2>/dev/null; m=$(grep -c . "$T/estado/desplegados"); correr >/dev/null
ok "produccion vuelve a lo desplegado: no se despliega otra vez" "$(grep -c . "$T/estado/desplegados")" "$m"
C9=$(commit sin-etiqueta); G push -q origin pruebas pruebas:produccion 2>/dev/null; romper 14
ok "un commit sin la etiqueta del OK que llega justo al volver a clonar: RECHAZADO" "$(correr):$(ult)" "RECHAZADO:$C8"
ok "… y el motivo es la etiqueta" "$(grep -cE "[0-9] RECHAZADO $C9: sin la etiqueta ok-produccion" "$P")" 1
G tag -a "ok-produccion/2026-11-26-$C9" "$C9" -m "OK del fundador: «ya» (26 nov 2026)"; G push -q origin --tags 2>/dev/null
ok "… con su etiqueta, sí" "$(correr):$(ult)" "OK:$C9"

echo "un reset --hard que falla cuenta como no poder bajar (26 nov):"
# Un árbol que git no puede escribir (aquí, un filtro que falla al escribir los archivos; el fetch no lo usa).
C10=$(promover reset-falla); git -C "$T/maquina" config filter.roto.smudge false; git -C "$T/maquina" config filter.roto.required true; echo '* filter=roto' > "$T/maquina/.git/info/attributes"
ok "git no puede escribir el árbol: no se despliega y /estado/ dice que no se puede bajar, con el motivo" "$(correr):$(ult):$(grep -c 'vueltas fallidas seguidas: 1 .*Motivo:</b> git reset --hard falló' "$P")" "OK:$C9:1"
correr >/dev/null
ok "… cuenta las vueltas seguidas aunque el fetch funcione" "$(cat "$T/estado/bajar-fallos")" 2
echo 14 > "$T/estado/bajar-fallos"; correr >/dev/null
ok "… a la vuelta 15 se vuelve a clonar y la siguiente despliega" "$(grep -c 're-clonado: el .git nuevo' "$P"):$(correr):$(ult)" "1:OK:$C10"

echo "lo que deploy.sh carga se comprueba antes (26 nov):"
m=$(grep -c . "$T/estado/desplegados"); printf 'if [ x = x ]; then\n' >> "$T/trabajo/infra/produccion/deploy.sh"; C11=$(promover deploy-roto)
ok "un deploy.sh que no es bash válido: FALLO y NO se corre" "$(correr):$(grep -c . "$T/estado/desplegados")" "FALLO:$m"
ok "… /estado/ dice por qué" "$(grep -c 'Motivo:</b> no es bash válido: infra/produccion/deploy.sh' "$P")" 1
G checkout -q HEAD~1 -- infra/produccion/deploy.sh; C12=$(promover deploy-arreglado)
ok "el commit que lo arregla se despliega" "$(correr):$(ult)" "OK:$C12"

echo "un deploy.sh colgado (26 nov):"
echo 30 > "$T/trabajo/dormir"; C13=$(promover deploy-colgado)
t0=$SECONDS; r=$(TOLATINO_SYNC_TOPE_DEPLOY=2 correr)
ok "se corta en su tope: FALLO y /estado/ dice por qué" "$r:$(ult):$(grep -c 'deploy.sh pasó de 2 s y se cortó' "$P")" "FALLO:$C13:1"
ok "… sin esperar a que termine" "$([ $((SECONDS - t0)) -lt 20 ] && echo pronto || echo tarde)" pronto
ok "ninguna vuelta tocó /opt/tolatino (el tolatino-sync obedece a la prueba)" "$(grep -c . "$T/desobedece" 2>/dev/null || echo 0)" 0
echo "$bien/$total casos"
[ "$bien" = "$total" ]
