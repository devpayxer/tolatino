#!/bin/bash
# 22 nov · La página de mantenimiento del sandbox, con la configuración REAL de nginx (infra/pruebas/nginx-pruebas.conf) en un nginx de verdad: mientras
# la app cambia de contenedor (o no contesta) se ve la página del sistema de diseño con 503 y Retry-After, nunca el «502 Bad Gateway · nginx/1.x»; con
# la app arriba, la app; un 503 que manda la app (p. ej. /api/salud sin base) pasa tal cual (no se tapa con la página). Guardián despliegueSinCorte.
# nginx: el del sistema (el CI lo trae); aquí, sin él, avisa y no corre. En el CI tiene que correr.
# Uso: bash pruebas/infra/mantenimiento-nginx.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd); cd "$RAIZ" || exit 1
if ! command -v nginx >/dev/null; then
  if [ "${CI:-}" = true ]; then echo "✗ mantenimiento: en el CI tiene que correr y falta nginx"; exit 1; fi
  echo "· mantenimiento: nginx no está (no corrió)"; exit 0
fi
T=$(mktemp -d); chmod 755 "$T"
PN=$((20000 + RANDOM % 20000)); PA=$((PN + 1))
APP=""
parar() { [ -f "$T/nginx.pid" ] && kill "$(cat "$T/nginx.pid")" 2>/dev/null; [ -n "$APP" ] && kill "$APP" 2>/dev/null; rm -rf "$T"; }
trap parar EXIT
mkdir -p "$T/mant" "$T/tmp"
cp infra/comun/mantenimiento/index.html "$T/mant/index.html"
# El sitio de verdad, con su puerto, la app y la carpeta de la página cambiados a los de la prueba.
# 23 nov · El sitio de la vista previa (puerto 8081) va a otro puerto de la prueba (su prueba es vista-previa.test.sh).
sed -e "s/listen 80 default_server;/listen 127.0.0.1:$PN;/" -e '/listen \[::\]:80 default_server;/d' -e "s#127.0.0.1:3000#127.0.0.1:$PA#g" \
    -e "s/listen 8081;/listen 127.0.0.1:$((PN + 2));/" -e '/listen \[::\]:8081;/d' \
    -e "s#root /var/www/mantenimiento;#root $T/mant;#" infra/pruebas/nginx-pruebas.conf > "$T/sitio.conf"
MIME=/etc/nginx/mime.types; [ -f "$MIME" ] || MIME=""
cat > "$T/nginx.conf" <<EOF
pid $T/nginx.pid;
error_log $T/error.log;
events {}
http {
  ${MIME:+include $MIME;}
  access_log off;
  client_body_temp_path $T/tmp; proxy_temp_path $T/tmp; fastcgi_temp_path $T/tmp; uwsgi_temp_path $T/tmp; scgi_temp_path $T/tmp;
  include $T/sitio.conf;
}
EOF
nginx -t -c "$T/nginx.conf" -p "$T" >/dev/null 2>&1 || { echo "✗ nginx -t no acepta la configuración del sandbox:"; nginx -t -c "$T/nginx.conf" -p "$T" 2>&1 | tail -3; exit 1; }
nginx -c "$T/nginx.conf" -p "$T" 2>/dev/null || { echo "✗ nginx no arrancó"; tail -3 "$T/error.log"; exit 1; }
for i in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PN/estado/" && break; sleep 0.1; done
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
pide() { curl -s -D "$T/cab" -o "$T/cuerpo" -w '%{http_code}' "http://127.0.0.1:$PN$1"; }
echo "página de mantenimiento (nginx del sandbox):"
TITULO=$(grep -o '<title>[^<]*</title>' infra/comun/mantenimiento/index.html | head -1)
ok "la app no contesta: 503" "$(pide /negocios)" 503
ok "… con la página de mantenimiento del sistema de diseño" "$(grep -cF "$TITULO" "$T/cuerpo")" 1
ok "… nunca «Bad Gateway»" "$(grep -ci 'bad gateway' "$T/cuerpo")" 0
ok "… con Retry-After y sin guardar en caché" "$(grep -ci '^retry-after: 10' "$T/cab"):$(grep -ci '^cache-control: no-store' "$T/cab")" "1:1"
ok "… sin la versión de nginx (server_tokens off)" "$(grep -ci '^server: nginx/' "$T/cab")" 0
ok "… y sin indexar (X-Robots-Tag)" "$(grep -ci '^x-robots-tag: noindex' "$T/cab")" 1
ok "/api/salud con la app caída: también la página (503)" "$(pide /api/salud):$(grep -cF "$TITULO" "$T/cuerpo")" "503:1"
# La app arriba: contesta 200 en todo y 503 propio en /api/salud.
cat > "$T/app.py" <<'EOF'
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        c = 503 if self.path == "/api/salud" else 200
        b = b'{"ok":false}' if c == 503 else b"hola desde la app"
        self.send_response(c); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
EOF
python3 "$T/app.py" "$PA" & APP=$!
for i in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PA/" && break; sleep 0.1; done
ok "la app arriba: la app" "$(pide /negocios):$(cat "$T/cuerpo")" "200:hola desde la app"
ok "un 503 que manda la app pasa tal cual (no se tapa)" "$(pide /api/salud):$(cat "$T/cuerpo")" '503:{"ok":false}'
echo "$bien/$total casos"
[ "$bien" = "$total" ]
