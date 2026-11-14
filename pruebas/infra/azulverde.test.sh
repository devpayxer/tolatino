#!/bin/bash
# 9o · Pruebas del azul/verde y la vuelta atrás sola (infra/comun/azulverde.sh) SIN servidor: docker, curl y nginx de mentira, la base de mentira
# (los umbrales y los errores nuevos) y el registro anotado en un archivo. Cada caso arma su escenario y comprueba qué color sirve, a dónde apunta nginx,
# qué se anotó (ok / fallo / vuelta_atras, con su motivo) y si se abrió el incidente. La vigilancia dura 6 s (en producción, 10 min).
# Uso: bash pruebas/infra/azulverde.test.sh   → «N/N casos» y sale con 1 si alguno falla.
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
bien=0; total=0
mkdir -p "$T/bin"
# curl de mentira: /api/salud de un puerto contesta según el escenario (FALLA_<puerto>=siempre | tras:N = falla después de N respuestas buenas).
cat > "$T/bin/curl" <<'EOF'
#!/bin/bash
u="${*: -1}"; p=$(echo "$u" | sed -nE 's#.*127\.0\.0\.1:([0-9]+)/.*#\1#p')
c="$ESC/curl-$p"; n=$(( $(cat "$c" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$c"
r=$(grep -m1 "^FALLA_$p=" "$ESC/escenario" 2>/dev/null | cut -d= -f2)
case "$r" in siempre) exit 22 ;; tras:*) [ "$n" -gt "${r#tras:}" ] && exit 22 ;; esac
echo '{"ok":true}'
EOF
cat > "$T/bin/docker" <<'EOF'
#!/bin/bash
echo "docker $*" >> "$ESC/docker"
case "$*" in "image inspect"*) echo "sha256:$(printf '%064d' 1)" ;; esac
exit 0
EOF
chmod +x "$T/bin/curl" "$T/bin/docker"
export PATH="$T/bin:$PATH"

caso() { # caso NOMBRE ESPERADO_RC ESPERADO_ACTIVO ESPERADO_PUERTO ESPERADO_RESULTADO [REGEX_MOTIVO] [INCIDENTE=si|no]
  local nombre="$1" erc="$2" eact="$3" epuerto="$4" eres="$5" emot="${6:-}" einc="${7:-}" rc=0 msg=""
  total=$((total + 1))
  ( set +e
    # shellcheck source=../../infra/comun/lib.sh
    . "$RAIZ/infra/comun/lib.sh"
    # shellcheck source=../../infra/comun/azulverde.sh
    . "$RAIZ/infra/comun/azulverde.sh"
    registrar_despliegue() { echo "$8|$9|${11}" >> "$ESC/registro"; echo 41; }
    abrir_incidente() { echo "$1|$2|$3|$4" >> "$ESC/incidentes"; }
    PSQL=(psql_mentira)
    psql_mentira() { local a="$*"; case "$a" in *cfg_int*vuelta_5xx_pct*) echo 2 ;; *cfg_int*vuelta_p95_ms*) echo 1500 ;; *cfg_int*vuelta_errores_nuevos*) echo 5 ;;
      *cfg_int*vuelta_salud_fallos*) echo 3 ;; *cfg_int*) echo 10 ;; *) cat >/dev/null; cat "$ESC/errores" 2>/dev/null || echo 0 ;; esac; }
    av_compose() { echo "compose $*" >> "$ESC/docker"; }
    migrar() { [ "$(grep -m1 '^MIGRAR=' "$ESC/escenario" | cut -d= -f2)" != falla ]; }
    log() { :; }
    desplegar_azulverde ensayo abc1234 tolatino/web:abc1234 "" migrar
  ) >/dev/null 2>&1 || rc=$?
  local act puerto res
  act=$(cat "$AV_ESTADO/activo" 2>/dev/null || echo -); puerto=$(sed -nE 's/.*127\.0\.0\.1:([0-9]+);.*/\1/p' "$AV_UPSTREAM" 2>/dev/null || echo -)
  res=$(tail -1 "$ESC/registro" 2>/dev/null | cut -d'|' -f1)
  [ "$rc" = "$erc" ] || msg+=" rc=$rc (esperaba $erc)"
  [ "$act" = "$eact" ] || msg+=" activo=$act (esperaba $eact)"
  [ "$puerto" = "$epuerto" ] || msg+=" nginx→$puerto (esperaba $epuerto)"
  [ "$res" = "$eres" ] || msg+=" anotado=$res (esperaba $eres)"
  [ -z "$emot" ] || tail -1 "$ESC/registro" | cut -d'|' -f2 | grep -qE "$emot" || msg+=" motivo «$(tail -1 "$ESC/registro" | cut -d'|' -f2)» no dice /$emot/"
  if [ "$einc" = si ] && ! [ -s "$ESC/incidentes" ]; then msg+=" sin incidente"; fi
  if [ "$einc" = no ] && [ -s "$ESC/incidentes" ]; then msg+=" incidente de más"; fi
  if [ -z "$msg" ]; then bien=$((bien + 1)); echo "  ✓ $nombre"; else echo "  ✗ $nombre:$msg"; fi
}
nuevo_escenario() { # nuevo_escenario ACTIVO_PREVIO (vacío = primer despliegue) LÍNEAS…
  export ESC="$T/esc$total"; rm -rf "$ESC"; mkdir -p "$ESC/estado"
  export AV_ESTADO="$ESC/estado" AV_UPSTREAM="$ESC/upstream.conf" AV_LOG="$ESC/vigia.log" AV_PASO_S=1 AV_GATE_N=4 AV_GATE_P=0 AV_VIGILANCIA_S=6 AV_NGINX_RECARGAR="true"
  local previo="$1"; shift
  if [ -n "$previo" ]; then echo "$previo" > "$AV_ESTADO/activo"; echo "prev0001" > "$AV_ESTADO/commit"
    printf 'upstream tolatino_app {\n    server 127.0.0.1:%s;\n}\n' "$([ "$previo" = azul ] && echo 3001 || echo 3002)" > "$AV_UPSTREAM"; fi
  : > "$ESC/escenario"; for l in "$@"; do echo "$l" >> "$ESC/escenario"; done
}

echo "azul/verde y la vuelta atrás sola:"
nuevo_escenario ""
caso "primer despliegue sano → azul sirve, ok" 0 azul 3001 ok "" no
nuevo_escenario azul
caso "despliegue sano con azul sirviendo → verde sirve, ok, azul se apaga" 0 verde 3002 ok "" no
grep -q "compose azul stop web" "$ESC/docker" && { bien=$((bien + 1)); echo "  ✓ … y el color viejo se apagó al final"; } || echo "  ✗ el color viejo no se apagó"; total=$((total + 1))
nuevo_escenario azul FALLA_3002=siempre
caso "la versión nueva no pasa la puerta de salud → fallo, azul sigue, nginx no se movió" 1 azul 3001 fallo "puerta de salud" si
nuevo_escenario azul "FALLA_3002=tras:4"
caso "pasa la puerta y después /api/salud falla 3 veces → vuelta atrás a azul" 2 azul 3001 vuelta_atras "salud falló 3" si
grep -q "compose verde stop web" "$ESC/docker" && { bien=$((bien + 1)); echo "  ✓ … y el color nuevo se apagó"; } || echo "  ✗ el color nuevo no se apagó"; total=$((total + 1))
nuevo_escenario verde
( a=$(date +%s); for i in $(seq 1 60); do echo "$((a + 30)).000 502 0.010 127.0.0.1:3001"; done; for i in $(seq 1 40); do echo "$((a + 30)).000 200 0.020 127.0.0.1:3001"; done ) > "$AV_LOG"
caso "60 % de 5xx en el color nuevo → vuelta atrás a verde" 2 verde 3002 vuelta_atras "^5xx" si
nuevo_escenario verde
( a=$(date +%s); for i in $(seq 1 100); do echo "$((a + 30)).000 502 0.010 127.0.0.1:3002"; done; for i in $(seq 1 30); do echo "$((a + 30)).000 200 0.020 127.0.0.1:3001"; done ) > "$AV_LOG"
caso "los 5xx del color VIEJO no cuentan contra el nuevo → ok" 0 azul 3001 ok "" no
nuevo_escenario azul
( a=$(date +%s); for i in $(seq 1 30); do echo "$((a + 30)).000 200 2.400 127.0.0.1:3002"; done ) > "$AV_LOG"
caso "p95 de 2400 ms > 1500 → vuelta atrás" 2 azul 3001 vuelta_atras "^p95 2400" si
nuevo_escenario azul
( a=$(date +%s); for i in $(seq 1 10); do echo "$((a + 30)).000 200 2.400 127.0.0.1:3002"; done ) > "$AV_LOG"
caso "lento pero con 10 respuestas (muestra chica) → no decide, ok" 0 verde 3002 ok "" no
nuevo_escenario azul; echo 7 > "$ESC/errores"
caso "7 grupos de errores nuevos (umbral 5) → vuelta atrás" 2 azul 3001 vuelta_atras "grupos de errores nuevos" si
nuevo_escenario azul MIGRAR=falla
caso "una migración falla → fallo, nada arrancó, azul sigue" 1 azul 3001 fallo "migraciones" si
grep -q "compose verde up" "$ESC/docker" && echo "  ✗ … y arrancó el color nuevo igual" || { bien=$((bien + 1)); echo "  ✓ … y el color nuevo ni arrancó"; }; total=$((total + 1))
nuevo_escenario azul; export AV_NGINX_RECARGAR="false"
caso "nginx no acepta el cambio → fallo, el archivo de nginx vuelve al de antes" 1 azul 3001 fallo "nginx" no
unset AV_NGINX_RECARGAR

# decidir() por sí sola: los bordes.
. "$RAIZ/infra/comun/azulverde.sh"
d() { total=$((total + 1)); local r; r=$(decidir "$@" 2 1500 5 3); if [ -n "$EXPECT" ] && [[ "$r" =~ $EXPECT ]] || { [ -z "$EXPECT" ] && [ -z "$r" ]; }; then bien=$((bien + 1)); echo "  ✓ decidir $* → «$r»"; else echo "  ✗ decidir $* → «$r» (esperaba /${EXPECT}/)"; fi; }
EXPECT="^p95" d 49 0 9000 0 0       # menos de 50 respuestas: la tasa no decide; el p95 sí (20 o más)
EXPECT="" d 49 49 100 0 0         # 49 de 49 en 5xx pero menos de 50: la tasa no decide
EXPECT="" d 19 19 9000 4 2          # …y con 19, tampoco; 4 errores nuevos < 5; 2 fallos < 3
EXPECT="^5xx" d 50 2 100 0 0        # 2 de 50 = 4 % > 2 %
EXPECT="" d 100 2 100 0 0           # 2 de 100 = 2 %: no pasa de 2 %
EXPECT="salud" d 0 0 0 0 3          # la salud manda aunque no haya tráfico
EXPECT="errores nuevos" d 0 0 0 5 0

echo "$bien/$total casos"
[ "$bien" = "$total" ]
