#!/bin/bash
# 22 nov · El orden del despliegue del sandbox (infra/pruebas/deploy.sh de verdad, con docker, nginx y systemctl de mentira que anotan cada llamada, como
# traza-sandbox.sh): construir → migrar → nginx → cambiar. Lo que importa es lo que pasa cuando algo falla a mitad, porque el servidor no tiene SSH:
#   · un build que falla: sale con 1, UN solo intento, y el contenedor de la app NO se toca (sigue lo de antes);
#   · una migración que falla: sale con 1 y la app NO se toca (la app vieja sigue sirviendo con la base a medio migrar, que tolera: migracionReversible);
#   · la base que no contesta: sale con 1 sin construir ni tocar la app;
#   · nginx -t que no pasa: vuelve la configuración anterior y el despliegue sigue;
#   · la misma huella y la misma imagen: no se construye; la misma huella con otra imagen (otro Id) o sin imagen: SÍ se construye;
#   · cada tramo queda con su hora y al salir (bien o mal) una línea «tramos (ok|fallo en …)» (lo que publica /estado/).
# Corre aislado (pruebas/infra/aislar.sh: montajes y red aparte; tmpfs sobre /opt, /etc/tolatino, /etc/nginx, /var/www, /var/lib/tolatino, /var/log,
# /usr/local/bin, /run con el socket de Docker y /tmp): un docker o un systemctl de verdad que se colara no llega a nada.
# Uso (root): bash pruebas/infra/orden-despliegue.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
# shellcheck source=aislar.sh
. "$RAIZ/pruebas/infra/aislar.sh"
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
F=${TL_FALLA:-}
case "$n $*" in
  "docker "*"exec -T db pg_isready"*) [ "$F" = base ] && exit 1; exit 0 ;;
  "docker "*" build web"*) [ "$F" = build ] && exit 1; exit 0 ;;
  "docker "*"exec -T db psql"*)
    if [ "$F" = migracion ] && [[ "$ent" == *"insert into schema_migrations"* ]]; then echo "ERROR: de mentira" >&2; exit 3; fi
    if [ "$F" = semilla ] && [[ "$*" == *"tl_m_nombre=pruebas/"* ]] && [[ "$ent" == *"insert into schema_seeds"* ]]; then echo "ERROR: de mentira" >&2; exit 3; fi
    case "$ent" in *"select count(*) from"*"tl_m_huella';"*) echo 1 ;; esac; exit 0 ;;
  "docker "*"--profile mapa up -d mapa"*) [ "$F" = mapa ] && exit 1; exit 0 ;;
  "docker "*" ps -q db"*) echo id-de-la-base ;;
  "docker inspect"*) echo healthy ;;
  "docker "*" up -d --remove-orphans"*) [ "$F" = up1 ] && [ ! -f "$TL_TRAZA.up" ] && { : > "$TL_TRAZA.up"; exit 1; }; exit 0 ;;
  "docker image inspect"*) [ "${TL_IMAGEN:-7}" = ninguna ] && exit 1; echo "sha256:$(printf '%064d' "${TL_IMAGEN:-7}")" ;;
  # nginx -t: con TL_FALLA=nginx solo pasa la configuración marcada «# buena» (la del repo no pasa).
  "nginx -t"*) [ "$F" = nginx ] && ! grep -q "# buena" /etc/nginx/sites-available/tolatino-pruebas && exit 1; exit 0 ;;
  "systemctl reload nginx"*) [ "$F" = recarga ] || [ "$F" = nginx-parado ] && exit 1; exit 0 ;;
  "systemctl restart nginx"*) [ "$F" = nginx-parado ] && exit 1; exit 0 ;;
  "curl "*) if [ "$F" = viejo ]; then echo '{"ok":true,"commit":"0000000"}'; else echo "{\"ok\":true,\"commit\":\"$TOLATINO_COMMIT\"}"; fi ;;
  "systemctl is-active"*) exit 3 ;;
  "df "*) printf 'Uso%%\n 40%%\n' ;;
esac
exit 0
EOF
chmod +x "$T/stubs/_anota"
for p in docker systemctl systemd-run nginx curl journalctl apt-get df sleep; do ln -s _anota "$T/stubs/$p"; done
correr() { # correr FALLA [HUELLA_PREVIA] → salida; la traza en $T/traza; lo que quedó en la máquina de mentira en $T/repo.*
  : > "$T/traza"; rm -f "$T/traza.up"
  TL_FALLA="$1" TL_TRAZA="$T/traza" TL_RAIZ="$T/repo" PATH="$T/stubs:$PATH" AISLAR_VISIBLES="$T" aislado '
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/lib/tolatino
    S=/etc/nginx/sites-available/tolatino-pruebas
    echo "server { listen 80; } # anterior" > "$S"
    [ -n "${TL_BUENA:-}" ] && echo "server { listen 80; } # buena" > "$S.buena"
    [ -n "$1" ] && echo "$1 sha256:$(printf "%064d" 7)" > /var/lib/tolatino/imagen-huella
    [ "$TL_FALLA" = mapa ] && mkdir -p /var/lib/tolatino/mapa && : > /var/lib/tolatino/mapa/pennsylvania.mbtiles
    [ "$TL_FALLA" = instalar ] && mount -o remount,ro /usr/local/bin
    bash "$0/infra/pruebas/deploy.sh" > "$0.salida" 2>&1; echo "salida $?" >> "$0.salida"
    c() { [ -f "$2" ] || { echo sin-buena; return; }; grep -c "$1" "$2"; true; }
    echo "$(c "# buena" "$S"):$(c "# buena" "$S.buena"):$(c mantenimiento "$S.buena")" > "$0.nginx"
    grep -c . /var/www/estado/avisos.txt > "$0.avisos" 2>/dev/null || echo 0 > "$0.avisos"
    cat /var/www/estado/sync.txt > "$0.sync" 2>/dev/null
    stat -c %a /var/www/mantenimiento /var/www/estado/diag.txt /var/www/estado/tramos.txt /etc/tolatino/pruebas.env 2>&1 | tr "\n" " " > "$0.permisos"' "$T/repo" "${2:-}"
  tail -1 "$T/repo.salida" | grep -o '[0-9]*$'
}
linea() { grep -n -m1 -E "$1" "$T/traza" | cut -d: -f1; }
cuenta() { grep -c -E "$1" "$T/traza"; }
UP='compose .* up -d --remove-orphans$'; BUILD='compose .* build web$'; MIG='exec -T db psql .*tl_m_nombre=0001_'; SANA='^docker inspect -f \{\{\.State\.Health\.Status\}\} id-de-la-base$'
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
ok "… la configuración de nginx que pasó «nginx -t» queda como la buena, y sin avisos" "$([ "$(cut -d: -f3 "$T/repo.nginx")" -gt 0 ] 2>/dev/null && echo la-del-repo):$(cat "$T/repo.avisos")" "la-del-repo:0"
ok "… servidor recién nacido: mantenimiento 755, diag y tramos 644, secretos 600 (el umask 077 no se queda puesto)" "$(cat "$T/repo.permisos")" "755 644 644 600 "
ok "… espera a que Docker dé la base por «healthy» antes del «up» de la app" "$(s=$(linea "$SANA"); [ -n "$s" ] && [ "$s" -lt "$u" ] && [ "$s" -gt "$x" ] && echo antes)" antes
ok "un build que falla: sale con 1" "$(correr build)" 1
ok "… y la línea de tramos dice dónde falló" "$(grep -c 'tramos (fallo en imagen, commit' "$T/repo.salida")" 1
ok "… un solo intento de build" "$(cuenta "$BUILD")" 1
ok "… sin migrar y sin tocar la app" "$(cuenta 'tl_m_nombre='):$(cuenta "$UP")" "0:0"
ok "una migración que falla: el despliegue falla" "$(r=$(correr migracion); [ "$r" != 0 ] && echo falla || echo "salió $r")" falla
ok "… sin tocar la app (sigue la vieja)" "$(cuenta "$UP")" 0
ok "la base que no contesta: sale con 1 sin construir ni tocar la app" "$(correr base):$(cuenta "$BUILD"):$(cuenta "$UP")" "1:0:0"
echo "entre migrar y cambiar, un paso accesorio no corta (la app nueva se cambia igual):"
ok "la semilla de pruebas falla: la app SÍ se cambia y el despliegue queda en FALLO después, con su aviso" "$(correr semilla):$(cuenta "$UP"):$(cat "$T/repo.avisos")" "1:1:1"
ok "… y la línea de tramos dice que hubo avisos" "$(grep -c 'tramos (fallo en salud, con avisos, commit' "$T/repo.salida")" 1
ok "el servidor del mapa no arranca: la app se cambia y el despliegue termina bien" "$(correr mapa):$(cuenta "$UP"):$(cuenta 'profile mapa up -d mapa$')" "0:1:1"
ok "la recarga de nginx falla (nginx parado): se reinicia y el despliegue termina bien" "$(correr recarga):$(cuenta "$UP"):$(cuenta '^systemctl restart nginx$')" "0:1:1"
ok "nginx no recarga ni reinicia: la app se cambia igual, aviso y FALLO después" "$(correr nginx-parado):$(cuenta "$UP"):$(cat "$T/repo.avisos")" "1:1:1"
ok "nginx -t no pasa y hay copia buena: vuelve la buena, la app se cambia, aviso y FALLO después" "$(TL_BUENA=1 correr nginx):$(cuenta "$UP"):$(cut -d: -f1 "$T/repo.nginx"):$(cat "$T/repo.avisos")" "1:1:1:1"
ok "nginx -t no pasa y no hay copia buena (un despliegue cortado a mitad): la rota NO se guarda como buena" "$(correr nginx):$(cuenta "$UP"):$(cut -d: -f2 "$T/repo.nginx")" "1:1:sin-buena"
ok "el primer «up» falla: se espera a «healthy» otra vez antes del reintento" \
  "$(correr up1):$(cuenta "$UP"):$(u1=$(grep -n -E "$UP" "$T/traza" | sed -n 1p | cut -d: -f1); u2=$(grep -n -E "$UP" "$T/traza" | sed -n 2p | cut -d: -f1); grep -n -E "$SANA" "$T/traza" | cut -d: -f1 | awk -v a="$u1" -v b="$u2" '$1 > a && $1 < b' | grep -c .)" "0:2:1"
echo "lo que se sirve es lo desplegado:"
ok "/api/salud contesta con OTRO commit (un contenedor viejo): FALLO" "$(correr viejo)" 1
ok "… y lo dice" "$(grep -c '/api/salud contesta con el commit 0000000, no con' "$T/repo.salida")" 1
echo "imagen:"
H=$(cd "$T/repo" && bash -c '. infra/comun/lib.sh; huella_imagen')
ok "la misma huella y la misma imagen: no se construye (y sí se cambia: /api/salud dice el commit)" "$(correr '' "$H"):$(cuenta "$BUILD"):$(cuenta "$UP")" "0:0:1"
ok "otra huella: se construye" "$(correr '' "otra$H"):$(cuenta "$BUILD")" "0:1"
ok "la misma huella con OTRA imagen (otro Id: borrada y hecha a mano, o de otra receta): se construye" "$(TL_IMAGEN=8 correr '' "$H"):$(cuenta "$BUILD")" "0:1"
ok "la misma huella SIN imagen (borrada): se construye" "$(TL_IMAGEN=ninguna correr '' "$H"):$(cuenta "$BUILD")" "0:1"
echo "tolatino-sync:"
ok "no se pudo instalar (disco de solo lectura): /estado/ lo dice así, no «no es bash válido»" "$(correr instalar >/dev/null; grep -c 'no se pudo instalar' "$T/repo.sync"):$(grep -c 'NO es bash válido' "$T/repo.sync")" "1:0"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
