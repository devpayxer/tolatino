#!/bin/bash
# 23 nov · El sitio de vista previa del sandbox (infra/pruebas/vista-previa/; guardián vistaPreviaAcotada), sin servidor:
#   1. «docker compose config» del compose del sandbox CON el perfil «vista» (y los demás perfiles): se lee entero (si hay Docker; en el CI sí).
#   2. El bucle (vista.sh) contra un repo de mentira, una vuelta cada vez: copia y arranca; un cambio de pantalla llega sin reinstalar ni reiniciar; un
#      lockfile nuevo reinstala y reinicia; una migración que la base no tiene (nueva o con otra huella) PAUSA antes de tocar la copia y para next dev;
#      cuando la base la tiene, sigue; si no puede leer la base, no cambia nada; «produccion» u otra rama rara, se niega sin clonar.
#   3. nginx de verdad con la configuración del sandbox (los dos sitios, puertos de la prueba): la marca «VISTA PREVIA» y noindex en lo servido, la
#      página de pausa con 503, 404 apagada, la de mantenimiento si next dev no contesta, las rutas cerradas, las fotos por el sitio del puerto 80.
#   4. La página de pausa y la marca salen del sistema de diseño (infra/pruebas/vista-previa/pagina.mjs --revisar).
# Uso: bash pruebas/infra/vista-previa.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd); cd "$RAIZ" || exit 1
T=$(mktemp -d); chmod 755 "$T"
NG=""; APP=""
parar() {
  [ -n "$NG" ] && [ -f "$T/ng/nginx.pid" ] && kill "$(cat "$T/ng/nginx.pid")" 2>/dev/null
  [ -n "$APP" ] && kill "$APP" 2>/dev/null
  [ -f "$T/vista/control/dev.pid" ] && kill -- "-$(cat "$T/vista/control/dev.pid")" 2>/dev/null
  rm -rf "$T"
}
trap parar EXIT
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }

echo "vista previa · compose:"
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  r=$(POSTGRES_PASSWORD=x AUTH_SECRET=x VISTA_DB_PASSWORD=x docker compose -f infra/pruebas/docker-compose.yml --profile vista --profile mapa --profile moderacion \
      --profile video --profile traductor config -q 2>&1 && echo bien)
  ok "docker compose config con el perfil «vista» (y los demás)" "$r" bien
  svc=$(POSTGRES_PASSWORD=x docker compose -f infra/pruebas/docker-compose.yml --profile vista config --services 2>/dev/null | grep -cx vista-previa)
  ok "… el servicio vista-previa existe en su perfil" "$svc" 1
  sinperfil=$(POSTGRES_PASSWORD=x docker compose -f infra/pruebas/docker-compose.yml config --services 2>/dev/null | grep -cx vista-previa)
  ok "… y sin el perfil no está (el «up» de la app no la toca)" "$sinperfil" 0
elif [ "${CI:-}" = true ]; then echo "  ✗ en el CI tiene que correr y falta docker compose"; total=$((total + 1))
else echo "  · docker compose no está aquí (en el CI sí)"; fi

echo "vista previa · el bucle (vista.sh) contra un repo de mentira:"
G=(git -c user.email=t@t -c user.name=t -c init.defaultBranch=main)
"${G[@]}" init -q --bare "$T/origen.git"
"${G[@]}" clone -q "$T/origen.git" "$T/trabajo" 2>/dev/null
mkdir -p "$T/trabajo/packages/db/migrations" "$T/trabajo/apps/web"
echo "select 1;" > "$T/trabajo/packages/db/migrations/0001_a.sql"
echo "lock v1" > "$T/trabajo/pnpm-lock.yaml"; echo '{}' > "$T/trabajo/package.json"; echo "uno" > "$T/trabajo/apps/web/p.tsx"
sub() { ( cd "$T/trabajo" && "${G[@]}" add -A && "${G[@]}" commit -qm "$1" && "${G[@]}" push -q origin HEAD:refs/heads/rama/de-trabajo 2>/dev/null; "${G[@]}" rev-parse HEAD ); }
huella() { echo "$1 $(sha256sum "$T/trabajo/packages/db/migrations/$1" | cut -d' ' -f1)"; }
C1=$(sub uno)
huella 0001_a.sql > "$T/aplicadas.txt"
vuelta() { # vuelta [VAR=valor…]: una vuelta de vista.sh con el repo de mentira
  env VISTA_RAMA=rama/de-trabajo VISTA_REPO_URL="$T/origen.git" VISTA_DIR="$T/vista" VISTA_UNA_VUELTA=1 \
    VISTA_APLICADAS_CMD="cat '$T/aplicadas.txt'" VISTA_INSTALAR="echo instalado >> '$T/instalar.log'" VISTA_ARRANCAR="exec sleep 600" \
    "$@" bash infra/pruebas/vista-previa/vista.sh > "$T/vuelta.log" 2>&1
}
vivo() { [ -f "$T/vista/control/dev.pid" ] && kill -0 "$(cat "$T/vista/control/dev.pid")" 2>/dev/null && echo si || echo no; }
instalaciones() { wc -l < "$T/instalar.log" 2>/dev/null | tr -d ' ' || echo 0; }
vuelta
ok "primera vuelta: la copia en el commit de la rama" "$(cat "$T/vista/control/commit"):$(cat "$T/vista/repo/apps/web/p.tsx")" "$C1:uno"
ok "… instala una vez y arranca next dev" "$(instalaciones):$(vivo)" "1:si"
ok "… sin pausa" "$([ -f "$T/vista/control/pausa" ] && echo pausa || echo no)" no
P1=$(cat "$T/vista/control/dev.pid")
echo "dos" > "$T/trabajo/apps/web/p.tsx"; C2=$(sub dos)
vuelta
ok "un cambio de pantalla: la copia al día" "$(cat "$T/vista/control/commit"):$(cat "$T/vista/repo/apps/web/p.tsx")" "$C2:dos"
ok "… sin reinstalar ni reiniciar next dev (lo recarga solo)" "$(instalaciones):$(cat "$T/vista/control/dev.pid"):$(vivo)" "1:$P1:si"
echo "lock v2" > "$T/trabajo/pnpm-lock.yaml"; C3=$(sub lock)
vuelta
ok "un lockfile nuevo: reinstala" "$(cat "$T/vista/control/commit"):$(instalaciones)" "$C3:2"
ok "… y reinicia next dev" "$([ "$(cat "$T/vista/control/dev.pid")" != "$P1" ] && echo otro || echo el-mismo):$(vivo)" "otro:si"
echo "create table t (x int);" > "$T/trabajo/packages/db/migrations/0002_b.sql"; echo "tres" > "$T/trabajo/apps/web/p.tsx"; C4=$(sub migracion)
vuelta
ok "una migración que la base no tiene: PAUSA" "$(grep -c '^0002_b.sql$' "$T/vista/control/pausa" 2>/dev/null)" 1
ok "… para next dev" "$(vivo)" no
ok "… y NO toca la copia (sigue en el commit de antes)" "$(cat "$T/vista/control/commit"):$(cat "$T/vista/repo/apps/web/p.tsx")" "$C3:dos"
vuelta
ok "… y sigue en pausa mientras la base no la tenga" "$([ -f "$T/vista/control/pausa" ] && echo pausa):$(vivo)" "pausa:no"
huella 0002_b.sql >> "$T/aplicadas.txt"
vuelta
ok "la base ya la tiene: sale de la pausa y se pone al día" "$([ -f "$T/vista/control/pausa" ] && echo pausa || echo no):$(cat "$T/vista/control/commit"):$(cat "$T/vista/repo/apps/web/p.tsx")" "no:$C4:tres"
ok "… con next dev arriba" "$(vivo)" si
echo "cuatro" > "$T/trabajo/apps/web/p.tsx"; C5=$(sub cuatro)
vuelta VISTA_APLICADAS_CMD="exit 1"
ok "si no puede leer la base: no cambia nada" "$(cat "$T/vista/control/commit"):$(grep -c 'no se pudo leer' "$T/vuelta.log")" "$C4:1"
echo "select 2;" > "$T/trabajo/packages/db/migrations/0001_a.sql"; sub huella >/dev/null
vuelta
ok "una migración ya aplicada que cambió de huella: también PAUSA" "$(grep -c '^0001_a.sql$' "$T/vista/control/pausa" 2>/dev/null):$(vivo)" "1:no"
ok "… el estado lo dice (/estado/vista.txt)" "$(head -1 "$T/vista/control/estado.txt" | grep -c 'EN PAUSA')" 1
[ -n "$C5" ] || true
for r in produccion "-x" "a..b" ""; do
  rm -rf "$T/otra"
  env VISTA_RAMA="$r" VISTA_REPO_URL="$T/origen.git" VISTA_DIR="$T/otra" VISTA_UNA_VUELTA=1 VISTA_ARRANCAR="exec sleep 600" bash infra/pruebas/vista-previa/vista.sh > /dev/null 2>&1
  ok "VISTA_RAMA «$r»: se niega (64) sin clonar" "$?:$([ -d "$T/otra/repo" ] && echo clonado || echo no)" "64:no"
done

echo "vista previa · nginx del sandbox:"
if command -v nginx >/dev/null && command -v python3 >/dev/null; then
  PN=$((20000 + RANDOM % 15000)); PV=$((PN + 1)); PA=$((PN + 2)); PP=$((PN + 3))
  mkdir -p "$T/ng/tmp" "$T/ng/mant" "$T/ng/www" "$T/ng/control"
  cp infra/comun/mantenimiento/index.html "$T/ng/mant/index.html"; cp infra/pruebas/vista-previa/pausa.html "$T/ng/www/pausa.html"
  sed -e "s/listen 80 default_server;/listen 127.0.0.1:$PN;/" -e '/listen \[::\]:80 default_server;/d' -e "s/listen 8081;/listen 127.0.0.1:$PV;/" -e '/listen \[::\]:8081;/d' \
      -e "s#127.0.0.1:3010#127.0.0.1:$PA#g" -e "s#127.0.0.1:3902#127.0.0.1:$PA#g" -e "s#http://127.0.0.1:80;#http://127.0.0.1:$PN;#g" \
      -e "s#root /var/www/mantenimiento;#root $T/ng/mant;#" -e "s#root /var/www/vista;#root $T/ng/www;#" -e "s#/var/lib/tolatino/vista/control/#$T/ng/control/#g" \
      infra/pruebas/nginx-pruebas.conf > "$T/ng/sitio.conf"
  MIME=/etc/nginx/mime.types; [ -f "$MIME" ] || MIME=""
  cat > "$T/ng/nginx.conf" <<EOF
pid $T/ng/nginx.pid;
error_log $T/ng/error.log;
events {}
http {
  ${MIME:+include $MIME;}
  access_log off;
  client_body_temp_path $T/ng/tmp; proxy_temp_path $T/ng/tmp; fastcgi_temp_path $T/ng/tmp; uwsgi_temp_path $T/ng/tmp; scgi_temp_path $T/ng/tmp;
  include $T/ng/sitio.conf;
}
EOF
  if nginx -t -c "$T/ng/nginx.conf" -p "$T/ng" >/dev/null 2>&1 && nginx -c "$T/ng/nginx.conf" -p "$T/ng" 2>/dev/null; then
    NG=1
    pide() { curl -s -D "$T/cab" -o "$T/cuerpo" -w '%{http_code}' "http://127.0.0.1:$PV$1"; }
    for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PV/" && break; sleep 0.1; done
    ok "next dev no contesta: la página de mantenimiento (503)" "$(pide /negocios):$(grep -c 'Volvemos' "$T/cuerpo")" "503:1"
    # Una «app» que contesta HTML (con </body>), y en /n/x.jpg una «foto» (hace de almacén de medios a través del sitio del puerto 80).
    cat > "$T/app.py" <<'EOF'
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/n/"): b, t = b"FOTO", "image/jpeg"
        else: b, t = ("<html><body><h1>hola " + self.headers.get("Host", "") + " ae=" + self.headers.get("Accept-Encoding", "-") + "</h1></body></html>").encode(), "text/html"
        self.send_response(200); self.send_header("Content-Type", t); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
EOF
    python3 "$T/app.py" "$PA" & APP=$!
    for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PA/" && break; sleep 0.1; done
    ok "sirviendo: la app con la marca «VISTA PREVIA» (pieza Tag)" "$(pide /negocios):$(grep -c 'data-vista-previa' "$T/cuerpo"):$(grep -c 'hola' "$T/cuerpo")" "200:1:1"
    ok "… la marca lleva al sandbox normal (el mismo servidor, puerto 80)" "$(grep -c 'href="http://127.0.0.1/"' "$T/cuerpo")" 1
    ok "… a la app le llega el Host con su puerto y sin compresión (para poner la marca)" "$(grep -c "hola 127.0.0.1:$PV ae=-" "$T/cuerpo")" 1
    ok "… noindex" "$(grep -ci '^x-robots-tag: noindex' "$T/cab")" 1
    ok "rutas cerradas igual que el sandbox: /api/interno y /medios/privado" "$(pide /api/interno/barrido):$(pide /medios/privado/x.pdf)" "404:404"
    ok "las fotos salen por el sitio del puerto 80 (sus reglas), sin noindex repetido" "$(pide /medios/n/x.jpg):$(cat "$T/cuerpo"):$(grep -ci '^x-robots-tag' "$T/cab")" "200:FOTO:1"
    echo "commit x" > "$T/ng/control/pausa"
    ok "en pausa: 503 con la página de pausa (ES/EN), sin llegar a la app" "$(pide /negocios):$(grep -c 'La vista previa está en pausa' "$T/cuerpo"):$(grep -c 'The preview is paused' "$T/cuerpo"):$(grep -c hola "$T/cuerpo")" "503:1:1:0"
    ok "… con Retry-After, sin caché y noindex" "$(grep -ci '^retry-after: 30' "$T/cab"):$(grep -ci '^cache-control: no-store' "$T/cab"):$(grep -ci '^x-robots-tag: noindex' "$T/cab")" "1:1:1"
    rm -f "$T/ng/control/pausa"; : > "$T/ng/control/apagada"
    ok "apagada (VISTA_ENCENDIDA=0): 404" "$(pide /negocios)" 404
    rm -f "$T/ng/control/apagada"
    ok "el sandbox normal (puerto 80) no lleva la marca ni pasa por la vista previa" "$(curl -s "http://127.0.0.1:$PN/negocios" | grep -c -e data-vista-previa -e hola)" 0
  else
    echo "  ✗ nginx no acepta la configuración del sandbox con la vista previa:"; nginx -t -c "$T/ng/nginx.conf" -p "$T/ng" 2>&1 | tail -3; total=$((total + 1))
  fi
elif [ "${CI:-}" = true ]; then echo "  ✗ en el CI tiene que correr y falta nginx"; total=$((total + 1))
else echo "  · nginx no está (no corrió)"; fi

echo "vista previa · la página de pausa y la marca salen del sistema de diseño:"
ok "pagina.mjs --revisar" "$(node infra/pruebas/vista-previa/pagina.mjs --revisar >/dev/null 2>&1 && echo bien)" bien

echo "vista previa: $bien/$total casos"
[ "$bien" = "$total" ]
