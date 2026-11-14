#!/bin/bash
# 9o · Pruebas de infra/produccion/tolatino-sync (guardián produccionSoloAvanza) contra un repo de mentira en una carpeta: la máquina de producción solo
# despliega un commit que (1) avanza (fast-forward), (2) ya está en «pruebas» y (3) lleva la etiqueta ok-produccion/* con el OK del fundador, y ese OK
# llega al despliegue (TOLATINO_OK_REF). Una vuelta atrás no se reintenta sola. Corre en un espacio de montaje aparte (root): /etc/tolatino,
# /var/lib/tolatino, /var/www y /usr/local/bin son de mentira; el deploy.sh del repo de mentira solo anota con qué lo llamaron.
# Uso (root): bash pruebas/infra/sync.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
G() { git -C "$T/trabajo" -c user.email=t@t -c user.name=t "$@"; }
git init -q --bare "$T/origen.git"
git init -q -b pruebas "$T/trabajo"
mkdir -p "$T/trabajo/infra/produccion"
cp "$RAIZ/infra/produccion/tolatino-sync" "$T/trabajo/infra/produccion/tolatino-sync"
cat > "$T/trabajo/infra/produccion/deploy.sh" <<'EOF'
#!/bin/bash
echo "$(git rev-parse --short HEAD)|${TOLATINO_OK_REF:-}" >> /var/lib/tolatino/desplegados
exit "$(cat salida 2>/dev/null || echo 0)"
EOF
echo 0 > "$T/trabajo/salida"
commit() { echo "$1" > "$T/trabajo/x"; [ -n "${2:-}" ] && echo "$2" > "$T/trabajo/salida"; G add -A; G commit -qm "$1"; G rev-parse --short HEAD; }
C1=$(commit uno); G remote add origin "$T/origen.git"; G push -q origin pruebas; G push -q origin pruebas:produccion
G tag -a "ok-produccion/2026-11-14-$C1" "$C1" -m "OK del fundador: «dale» (14 nov 2026)"; G push -q origin --tags
correr() { # correr → el último resultado; el registro de despliegues en $T/desplegados
  unshare -m --propagation private bash -c '
    for m in /etc/tolatino /var/lib/tolatino /var/www /usr/local/bin; do mkdir -p "$m" 2>/dev/null; mount -t tmpfs none "$m"; done
    mkdir -p /var/lib/tolatino /var/www/estado
    printf "TOLATINO_ROL=app\nTOLATINO_ENTORNO=produccion\nTOLATINO_RAMA=produccion\n" > /etc/tolatino/rol.conf
    cp -a "$1/estado/." /var/lib/tolatino/ 2>/dev/null
    TOLATINO_SYNC_REPO="$1/origen.git" TOLATINO_SYNC_DIR="$1/maquina" bash "$1/trabajo/infra/produccion/tolatino-sync"
    mkdir -p "$1/estado"; cp -a /var/lib/tolatino/. "$1/estado/"' _ "$T" 2>/dev/null
  cat "$T/estado/last-result" 2>/dev/null
}
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
rmdir /var/www 2>/dev/null || true
echo "$bien/$total casos"
[ "$bien" = "$total" ]
