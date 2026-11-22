#!/bin/bash
# 22 nov · El orden del despliegue del sandbox (infra/pruebas/deploy.sh de verdad, con docker, nginx y systemctl de mentira que anotan cada llamada, como
# traza-sandbox.sh): construir → migrar → nginx → cambiar. Lo que importa es lo que pasa cuando algo falla a mitad, porque el servidor no tiene SSH:
#   · un build que falla: sale con 1, UN solo intento, y el contenedor de la app NO se toca (sigue lo de antes);
#   · una migración que falla: sale con 1 y la app NO se toca (la app vieja sigue sirviendo con la base a medio migrar, que tolera: migracionReversible);
#   · la base que no contesta: sale con 1 sin construir ni tocar la app;
#   · nginx -t que no pasa: vuelve la configuración anterior y el despliegue sigue;
#   · la misma huella y la misma imagen: no se construye;
#   · cada tramo queda con su hora y al salir (bien o mal) una línea «tramos (ok|fallo en …)» (lo que publica /estado/).
# Corre en un espacio de montaje aparte (root): /etc/tolatino, /etc/nginx, /var/www, /var/lib/tolatino y /usr/local/bin son de mentira.
# Uso (root): bash pruebas/infra/orden-despliegue.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/repo" "$T/stubs"
( cd "$RAIZ" && git ls-files -z --cached --others --exclude-standard -- .dockerignore infra packages/db/migrar.sh packages/db/migrations packages/db/seeds \
    scripts/ayuda scripts/legal scripts/cms apps/web/package.json \
  | while IFS= read -r -d '' f; do [ -e "$f" ] && { mkdir -p "$T/repo/$(dirname "$f")"; cp -p "$f" "$T/repo/$f"; }; done )
# La huella necesita las rutas «!» del .dockerignore en el commit: las que no se copiaron se crean vacías.
( cd "$T/repo" && for r in $(sed -n 's/^!//p' .dockerignore); do [ -e "$r" ] || { mkdir -p "$(dirname "$r")"; case "$r" in */*.*|*.*) : > "$r" ;; *) mkdir -p "$r"; : > "$r/x" ;; esac; }; done
  git init -q && git add -A && git -c user.email=t@t -c user.name=t -c commit.gpgsign=false commit -qm x )
cat > "$T/stubs/_anota" <<'EOF'
#!/bin/bash
n=$(basename "$0"); a="$*"; a=${a//$TL_RAIZ/RAIZ}
ent=""; case "$n $*" in "docker "*"exec -T db psql"*) { [ -p /dev/stdin ] || [ -f /dev/stdin ]; } && ent=$(cat) ;; esac
echo "$n $a" >> "$TL_TRAZA"
case "$n $*" in
  "docker "*"exec -T db pg_isready"*) [ "${TL_FALLA:-}" = base ] && exit 1; exit 0 ;;
  "docker "*" build web"*) [ "${TL_FALLA:-}" = build ] && exit 1; exit 0 ;;
  "docker "*"exec -T db psql"*)
    if [ "${TL_FALLA:-}" = migracion ] && [[ "$ent" == *"insert into schema_migrations"* ]]; then echo "ERROR: de mentira" >&2; exit 3; fi
    case "$ent" in *"select count(*) from"*"tl_m_huella';"*) echo 1 ;; esac; exit 0 ;;
  "docker image inspect"*) echo "sha256:$(printf '%064d' 7)" ;;
  "nginx -t"*) [ "${TL_FALLA:-}" = nginx ] && [ ! -f "$TL_TRAZA.una" ] && { : > "$TL_TRAZA.una"; exit 1; }; exit 0 ;;
  "curl "*) echo '{"ok":true}' ;;
  "systemctl is-active"*) exit 3 ;;
  "df "*) printf 'Uso%%\n 40%%\n' ;;
esac
exit 0
EOF
chmod +x "$T/stubs/_anota"
for p in docker systemctl systemd-run nginx curl journalctl apt-get df sleep; do ln -s _anota "$T/stubs/$p"; done
correr() { # correr FALLA [HUELLA_PREVIA] → salida; la traza en $T/traza
  : > "$T/traza"; rm -f "$T/traza.una"
  TL_FALLA="$1" TL_TRAZA="$T/traza" TL_RAIZ="$T/repo" PATH="$T/stubs:$PATH" unshare -m --propagation private bash -c '
    for m in /etc/tolatino /etc/nginx /var/www /var/lib/tolatino /usr/local/bin; do mkdir -p "$m"; mount -t tmpfs none "$m"; done
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/lib/tolatino
    echo "server { listen 80; } # anterior" > /etc/nginx/sites-available/tolatino-pruebas
    [ -n "$1" ] && echo "$1 sha256:$(printf "%064d" 7)" > /var/lib/tolatino/imagen-huella
    bash "$0/infra/pruebas/deploy.sh" > "$0.salida" 2>&1; echo "salida $?" >> "$0.salida"
    grep -c "# anterior" /etc/nginx/sites-available/tolatino-pruebas > "$0.nginx" 2>/dev/null' "$T/repo" "${2:-}"
  tail -1 "$T/repo.salida" | grep -o '[0-9]*$'
}
linea() { grep -n -m1 -E "$1" "$T/traza" | cut -d: -f1; }
cuenta() { grep -c -E "$1" "$T/traza"; }
UP='compose .* up -d --remove-orphans$'; BUILD='compose .* build web$'; MIG='exec -T db psql .*tl_m_nombre=0001_'
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
echo "orden del despliegue del sandbox:"
ok "todo bien: termina con 0" "$(correr '')" 0
b=$(linea "$BUILD"); m=$(linea "$MIG"); x=$(linea '^nginx -t'); u=$(linea "$UP")
ok "… construir → migrar → nginx → cambiar" "$([ -n "$b" ] && [ -n "$m" ] && [ -n "$x" ] && [ -n "$u" ] && [ "$b" -lt "$m" ] && [ "$m" -lt "$x" ] && [ "$x" -lt "$u" ] && echo en-orden)" en-orden
ok "… sin «up --build» en la app (la app no se quita antes de tener la imagen)" "$(cuenta '^docker compose [^|]*docker-compose.yml up -d --build')" 0
TR=$(grep -o 'tramos (ok, commit [0-9a-f]*):.*' "$T/repo.salida" | tail -1)
ok "… y deja su línea de tramos: base, imagen, migraciones, semilla, aparte, nginx, recrear, salud y el total" \
  "$(echo "$TR" | grep -cE ': preparar [0-9]+ s · base [0-9]+ s · imagen [0-9]+ s · migraciones [0-9]+ s · semilla [0-9]+ s · aparte [0-9]+ s · nginx [0-9]+ s · recrear [0-9]+ s · salud [0-9]+ s · total [0-9]+ s$')" 1
ok "… cada tramo también con su hora en el registro" "$(grep -cE '^[0-9T:+-]+ \[deploy\] tramo (imagen|migraciones|recrear|salud): [0-9]+ s$' "$T/repo.salida")" 4
ok "un build que falla: sale con 1" "$(correr build)" 1
ok "… y la línea de tramos dice dónde falló" "$(grep -c 'tramos (fallo en imagen, commit' "$T/repo.salida")" 1
ok "… un solo intento de build" "$(cuenta "$BUILD")" 1
ok "… sin migrar y sin tocar la app" "$(cuenta 'tl_m_nombre='):$(cuenta "$UP")" "0:0"
ok "una migración que falla: el despliegue falla" "$(r=$(correr migracion); [ "$r" != 0 ] && echo falla || echo "salió $r")" falla
ok "… sin tocar la app (sigue la vieja)" "$(cuenta "$UP")" 0
ok "la base que no contesta: sale con 1 sin construir ni tocar la app" "$(correr base):$(cuenta "$BUILD"):$(cuenta "$UP")" "1:0:0"
ok "nginx -t no pasa: el despliegue sigue y vuelve la configuración anterior" "$(correr nginx):$(cat "$T/repo.nginx")" "0:1"
H=$(cd "$T/repo" && bash -c '. infra/comun/lib.sh; huella_imagen')
ok "la misma huella y la misma imagen: no se construye (y sí se cambia: /api/salud dice el commit)" "$(correr '' "$H"):$(cuenta "$BUILD"):$(cuenta "$UP")" "0:0:1"
ok "otra huella: se construye" "$(correr '' "otra$H"):$(cuenta "$BUILD")" "0:1"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
