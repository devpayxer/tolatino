#!/bin/bash
# Fotos a la medida (decisión AI, 20 nov) · El respaldo de las variantes en nginx, con la configuración REAL del sandbox y la de producción
# (pruebas/infra/medios-nginx.py saca sus ubicaciones de fotos y les pone un almacén de mentira que se porta como Garage):
#   1. la variante existe y el navegador acepta WebP → la variante, image/webp, caché de un año (una sola Cache-Control: la del almacén se esconde)
#   2. la variante NO existe → la maestra JPEG en esa misma dirección, 200, «public, max-age=60» (nunca una foto rota, nunca un año de respaldo)
#   3. el navegador no dice que acepta WebP (o no manda Accept) → la maestra JPEG, «private, max-age=60» (ningún caché compartido la guarda)
#   y lo de siempre: la maestra con su año, lo privado 404, nada que no sea GET/HEAD, una foto que no existe 404.
# nginx: el del sistema (el CI de GitHub lo trae) o, si no está, el de la imagen oficial con docker. En el CI tiene que correr; aquí, sin ninguno
# de los dos, avisa y no corre. Guardián fotosConVariantes.
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd); cd "$RAIZ" || exit 1
mal=0
ok() { echo "  ✓ $*"; }
no() { echo "  ✗ $*"; mal=1; }
if command -v nginx >/dev/null; then MODO=local
elif command -v docker >/dev/null && docker info >/dev/null 2>&1; then MODO=docker
elif [ "${CI:-}" = true ]; then echo "  ✗ sin nginx ni docker: en el CI esta prueba tiene que correr"; exit 1
else echo "  · sin nginx ni docker aquí: el respaldo de nginx no se probó (en el CI sí)"; exit 0; fi

T=$(mktemp -d); chmod 755 "$T"
PA=$((20000 + RANDOM % 20000)); PN=$((PA + 1))
ID=0f0e0d0c-0b0a-4908-8706-050403020100; OTRA=1f0e0d0c-0b0a-4908-8706-050403020199
mkdir -p "$T/almacen/n" "$T/almacen/privado/o" "$T/t"
printf 'JPEG-MAESTRA-%s' "$ID" > "$T/almacen/n/$ID.jpg"
# F3 · Una foto de destino privado en el almacén de mentira: si nginx la dejara pasar, contestaría 200 (así la prueba no pasa por casualidad).
printf 'JPEG-PRIVADA-%s' "$ID" > "$T/almacen/privado/o/$ID.jpg"
printf 'WEBP-PRIVADA-640-%s' "$ID" > "$T/almacen/privado/o/$ID.w640.webp"
printf 'WEBP-640-%s' "$ID" > "$T/almacen/n/$ID.w640.webp"
python3 pruebas/infra/medios-nginx.py almacen "$T/almacen" "$PA" & ALM=$!
CONT=""
limpiar() {
  kill "$ALM" 2>/dev/null
  [ -f "$T/nginx.pid" ] && kill "$(cat "$T/nginx.pid")" 2>/dev/null
  [ -n "$CONT" ] && docker rm -f "$CONT" >/dev/null 2>&1
  rm -rf "$T"
}
trap limpiar EXIT
esperar() { for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$1/" && return 0; sleep 0.1; done; return 1; }
esperar "$PA" || { echo "  ✗ el almacén de mentira no arrancó"; exit 1; }

# pedir RUTA ACCEPT [MÉTODO] → status; deja las cabeceras en $T/h y el cuerpo en $T/b. ACCEPT «-» = sin cabecera Accept.
pedir() {
  local a=(-H "Accept: $2") m=(-X "${3:-GET}"); [ "$2" = "-" ] && a=(-H "Accept:"); [ "${3:-}" = HEAD ] && m=(-I)
  curl -s -m 10 -o "$T/b" -D "$T/h" "${m[@]}" "${a[@]}" "http://127.0.0.1:$PN$1" -w '%{http_code}'
}
# crudo RUTA → status, con la dirección tal cual (--path-as-is: curl no resuelve «..» ni «.»; nginx la normaliza antes de elegir la ubicación).
crudo() { curl -s -m 10 -o "$T/b" -D "$T/h" --path-as-is -H "Accept: image/webp" "http://127.0.0.1:$PN$1" -w '%{http_code}'; }
cab() { grep -i "^$1:" "$T/h" | tr -d '\r' | sed 's/^[^:]*: //'; }
cuantas() { grep -ci "^$1:" "$T/h"; }
WEBP='image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
SIN='image/png,image/svg+xml,image/*;q=0.8,video/*;q=0.8,*/*;q=0.5'

for ent in pruebas produccion; do
  echo "  · $ent (infra/$ent/nginx-$ent.conf)"
  conf="$T/$ent.conf"
  if ! python3 pruebas/infra/medios-nginx.py extraer "infra/$ent/nginx-$ent.conf" "$PA" "$PN" "$T" "$([ "$(id -u)" = 0 ] || [ "$MODO" = docker ] && echo root)" > "$conf"; then
    no "$ent: no pude sacar las ubicaciones de fotos"; continue
  fi
  rm -f "$T/nginx.pid"
  if [ "$MODO" = local ]; then
    if ! nginx -t -q -c "$conf" -p "$T" 2>"$T/err"; then no "$ent: nginx -t: $(tail -3 "$T/err")"; continue; fi
    nginx -c "$conf" -p "$T" 2>"$T/err" || { no "$ent: nginx no arrancó: $(tail -3 "$T/err")"; continue; }
  else
    CONT=$(docker run -d --network host -v "$T:$T" nginx:1.27.4-alpine nginx -c "$conf" -g 'daemon off;' 2>"$T/err") || { no "$ent: docker: $(tail -3 "$T/err")"; continue; }
  fi
  esperar "$PN" || { no "$ent: nginx no contesta"; cat "$T/error.log" 2>/dev/null | tail -3; continue; }

  s=$(pedir "/medios/n/$ID.w640.webp" "$WEBP")
  if [ "$s" = 200 ] && [ "$(cab content-type)" = image/webp ] && [ "$(cab cache-control)" = "public, max-age=31536000, immutable" ] && [ "$(cuantas cache-control)" = 1 ] \
     && cab vary | grep -qi accept && cmp -s "$T/b" "$T/almacen/n/$ID.w640.webp"; then ok "$ent: la variante existe → WebP con caché de un año"
  else no "$ent: la variante existe → $s $(cab content-type) [$(cab cache-control | tr '\n' '|')] vary=$(cab vary)"; fi

  s=$(pedir "/medios/n/$ID.w1080.webp" "$WEBP")
  if [ "$s" = 200 ] && [ "$(cab content-type)" = image/jpeg ] && [ "$(cab cache-control)" = "public, max-age=60" ] && [ "$(cuantas cache-control)" = 1 ] \
     && cab vary | grep -qi accept && cmp -s "$T/b" "$T/almacen/n/$ID.jpg"; then ok "$ent: la variante no existe → la maestra JPEG en la misma dirección, 60 s"
  else no "$ent: la variante no existe → $s $(cab content-type) [$(cab cache-control | tr '\n' '|')]"; fi

  for acc in "$SIN" -; do
    s=$(pedir "/medios/n/$ID.w640.webp" "$acc")
    if [ "$s" = 200 ] && [ "$(cab content-type)" = image/jpeg ] && [ "$(cab cache-control)" = "private, max-age=60" ] && [ "$(cuantas cache-control)" = 1 ] \
       && cmp -s "$T/b" "$T/almacen/n/$ID.jpg"; then ok "$ent: sin image/webp en Accept (${acc:0:24}) → la maestra JPEG, private 60 s"
    else no "$ent: sin image/webp en Accept (${acc:0:24}) → $s $(cab content-type) [$(cab cache-control | tr '\n' '|')]"; fi
  done

  s=$(pedir "/medios/n/$ID.jpg" "$WEBP")
  if [ "$s" = 200 ] && [ "$(cab content-type)" = image/jpeg ] && cab cache-control | grep -q "max-age=31536000" && cmp -s "$T/b" "$T/almacen/n/$ID.jpg"; then ok "$ent: la maestra sigue igual (un año)"
  else no "$ent: la maestra → $s $(cab content-type) [$(cab cache-control | tr '\n' '|')]"; fi

  s=$(pedir "/medios/n/$OTRA.w640.webp" "$WEBP")
  [ "$s" = 404 ] && ok "$ent: una foto que no existe → 404 (no hay maestra que dar)" || no "$ent: una foto que no existe → $s"
  s=$(pedir "/medios/privado/m/$ID.jpg" "$WEBP")
  [ "$s" = 404 ] && ok "$ent: lo privado nunca sale por aquí (404)" || no "$ent: lo privado → $s"
  # F3 · Una foto de destino privado (cita, solicitud, viaje, balanza, daño, estimado…): ni la maestra ni su variante, ni con la dirección disfrazada.
  bien=1; for r in "/medios/privado/o/$ID.jpg" "/medios/privado/o/$ID.w640.webp" "/medios/n/../privado/o/$ID.jpg" "/medios/./privado/o/$ID.jpg" "/medios//privado/o/$ID.jpg" "/medios/%70rivado/o/$ID.jpg" "/medios/privado%2Fo/$ID.jpg"; do
    s=$(crudo "$r"); if [ "$s" != 404 ] || grep -q PRIVADA "$T/b" 2>/dev/null; then bien=0; no "$ent: una foto privada salió por $r → $s"; fi
  done
  [ "$bien" = 1 ] && ok "$ent: una foto de destino privado (privado/o/) nunca sale por /medios/, tampoco disfrazada (404)"
  s=$(pedir "/medios/n/$ID.w640.webp" "$WEBP" POST); s2=$(pedir "/medios/n/$ID.w640.webp" "$SIN" POST)
  [ "$s" = 403 ] && [ "$s2" = 403 ] && ok "$ent: solo GET y HEAD (POST → 403, también por el respaldo)" || no "$ent: POST → $s / $s2"
  s=$(pedir "/medios/n/$ID.w640.webp" "$WEBP" HEAD)
  [ "$s" = 200 ] && ok "$ent: HEAD de una variante → 200" || no "$ent: HEAD → $s"
  if [ "$ent" = pruebas ]; then
    pedir "/medios/n/$ID.w1080.webp" "$SIN" >/dev/null
    cab x-robots-tag | grep -q noindex && ok "$ent: el respaldo también dice noindex (sandbox)" || no "$ent: el respaldo sin X-Robots-Tag noindex"
  fi

  if [ "$MODO" = local ]; then kill "$(cat "$T/nginx.pid")" 2>/dev/null; for _ in $(seq 1 30); do [ -f "$T/nginx.pid" ] || break; sleep 0.1; done
  else docker rm -f "$CONT" >/dev/null 2>&1; CONT=""; fi
  for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PN/" || break; sleep 0.1; done
done
[ "$mal" = 0 ] && echo "  ✓ fotos a la medida: el respaldo de nginx, en el sandbox y en producción" || echo "  ✗ fotos a la medida: el respaldo de nginx falla"
exit "$mal"
