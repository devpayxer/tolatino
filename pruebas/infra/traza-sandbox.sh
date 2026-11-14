#!/bin/bash
# 9o · El sandbox vivo no puede romperse: infra/pruebas/deploy.sh pasó al paquete común (infra/comun/) y esta prueba lo demuestra comparando la TRAZA
# de lo que hace contra la del deploy.sh de antes (el de una revisión dada, por defecto la rama de trabajo antes de 9o). Corre los dos en un espacio de
# montaje aparte (unshare -m: /etc/tolatino, /etc/nginx, /var/www, /var/lib/tolatino y /usr/local/bin son de mentira), con docker, systemctl, nginx,
# curl… de mentira que anotan cada llamada. Las diferencias permitidas son SOLO las nuevas de 9o: el sobre sellado (sin efectos si no hay sobres) y el
# registro del despliegue (dos psql más al final). Además: el archivo de secretos queda con las MISMAS claves y en el mismo orden.
# Uso (root): bash pruebas/infra/traza-sandbox.sh [REVISIÓN_VIEJA]   → «traza del sandbox: igual salvo lo de 9o» o la diferencia.
set -euo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
VIEJA=${1:-15c2d5a}
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# Los árboles: el viejo (git archive de la revisión) y el nuevo (lo que hay ahora, también lo no comprometido).
mkdir -p "$T/viejo" "$T/nuevo" "$T/stubs"
git -C "$RAIZ" archive "$VIEJA" infra packages/db/migrar.sh packages/db/migrations packages/db/seeds scripts/ayuda scripts/legal scripts/cms | tar -x -C "$T/viejo"
( cd "$RAIZ" && git ls-files --cached --others --exclude-standard -- infra packages/db/migrar.sh packages/db/migrations packages/db/seeds scripts/ayuda scripts/legal scripts/cms \
  | while read -r f; do [ -e "$f" ] && { mkdir -p "$T/nuevo/$(dirname "$f")"; cp -p "$f" "$T/nuevo/$f"; }; done )
# Las mismas migraciones en los dos (la 0145 es nueva; aquí se compara el despliegue, no la lista de migraciones).
rm -rf "$T/viejo/packages/db/migrations"; cp -rp "$T/nuevo/packages/db/migrations" "$T/viejo/packages/db/migrations"
for d in viejo nuevo; do git -C "$T/$d" init -q && git -C "$T/$d" add -A && git -C "$T/$d" -c user.email=t@t -c user.name=t commit -qm x; done

# Los programas de mentira: anotan su llamada (sin rutas temporales) y contestan lo mínimo.
cat > "$T/stubs/_anota" <<'EOF'
#!/bin/bash
n=$(basename "$0"); a="$*"; a=${a//$TL_RAIZ/RAIZ}
# Un psql que lee de una tubería se anota DESPUÉS de leerla (así el orden no depende de quién arrancó primero).
case "$n $*" in "docker "*"exec -T db psql"*) [ -p /dev/stdin ] && cat >/dev/null ;; esac
echo "$n $a" >> "$TL_TRAZA"
case "$n $*" in
  "docker "*"exec -T db psql"*) exit 0 ;;
  "docker "*"exec -T medios /garage status"*) echo "0123456789abcdef  nodo  127.0.0.1:3901" ;;
  "docker "*"exec -T medios /garage key create"*) printf 'Key ID: GKprueba\nSecret key: secretoprueba\n' ;;
  "docker "*"exec -T medios /garage layout show"*) echo "No nodes currently have a role" ;;
  "docker image inspect"*) echo "sha256:$(printf '%064d' 7)" ;;
  "docker run"*"indexar.mjs"*) echo "select 1;" ;;
  "curl "*) echo '{"ok":true}' ;;
  "systemctl is-active"*) exit 3 ;;
  "df "*) printf 'Uso%%\n 40%%\n' ;;
esac
exit 0
EOF
chmod +x "$T/stubs/_anota"
for p in docker systemctl systemd-run nginx curl journalctl apt-get df; do ln -s _anota "$T/stubs/$p"; done

correr() { # correr ÁRBOL → $T/<árbol>.traza y $T/<árbol>.env
  local d="$1"
  for m in /etc/tolatino /etc/nginx /var/www /var/lib/tolatino; do [ -d "$m" ] || { mkdir -p "$m"; echo "$m" >> "$T/creados"; }; done
  TL_TRAZA="$T/$d.traza" TL_RAIZ="$T/$d" PATH="$T/stubs:$PATH" unshare -m --propagation private bash -c '
    for m in /etc/tolatino /etc/nginx /var/www /var/lib/tolatino /usr/local/bin; do mount -t tmpfs none "$m"; done
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/lib/tolatino
    bash "$0/infra/pruebas/deploy.sh" > "$0.salida" 2>&1; echo "salida $?" >> "$0.salida"
    cut -d= -f1 /etc/tolatino/pruebas.env > "$0.env"' "$T/$d"
  sed -i -E 's/[0-9a-f]{7,40}/HASH/g' "$T/$d.traza"
}
correr viejo; correr nuevo
[ -f "$T/creados" ] && while read -r m; do rmdir "$m" 2>/dev/null || true; done < "$T/creados"

ok=1
grep -q '^salida 0$' "$T/viejo.salida" || { echo "✗ el deploy.sh viejo no terminó bien en la prueba:"; tail -5 "$T/viejo.salida"; ok=0; }
grep -q '^salida 0$' "$T/nuevo.salida" || { echo "✗ el deploy.sh nuevo no terminó bien:"; tail -15 "$T/nuevo.salida"; ok=0; }
if ! diff -q "$T/viejo.env" "$T/nuevo.env" >/dev/null; then echo "✗ el archivo de secretos cambió de claves:"; diff "$T/viejo.env" "$T/nuevo.env"; ok=0; fi
# La traza nueva = la vieja + solo lo de 9o (apt-get de age si faltara, y los psql del registro: los que llevan «-v e=pruebas»).
grep -v -E '^(apt-get install .* age|docker image inspect tolatino/web:pruebas .*|docker compose .* exec -T db psql .* -v e=pruebas .*)$' "$T/nuevo.traza" > "$T/nuevo.sin9o" || true
if ! diff -u "$T/viejo.traza" "$T/nuevo.sin9o" > "$T/dif"; then echo "✗ la traza del sandbox cambió:"; head -40 "$T/dif"; ok=0; fi
extra=$(grep -c -E 'exec -T db psql .* -v e=pruebas ' "$T/nuevo.traza" || true)
[ "$extra" -ge 2 ] || { echo "✗ el despliegue nuevo no se anota en deploy_releases (y la huella de la llave age en server_keys)"; ok=0; }
echo "  pasos del despliegue viejo: $(wc -l < "$T/viejo.traza") · nuevo: $(wc -l < "$T/nuevo.traza") (de ellos, $extra del registro de 9o)"
[ "$ok" = 1 ] && echo "✓ traza del sandbox: igual salvo lo de 9o (mismos pasos, mismo orden, mismas claves de secretos)" && exit 0
exit 1
