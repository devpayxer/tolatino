#!/bin/bash
# 22 nov · Pruebas de pruebas/infra/aislar.sh: lo que un guion de despliegue escribe dentro de «aislado» no llega a la máquina (ni /opt, ni /etc/tolatino,
# ni /var/log, ni /var/lock, ni /usr/local/bin, ni /tmp), Docker y systemd no contestan, no hay red, las carpetas de la prueba sí siguen a la vista, los
# puntos de montaje que no existían no quedan, y aislar_exige no deja correr un guion que no lee sus variables de aislamiento.
# Uso (root): bash pruebas/infra/aislar.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
# shellcheck source=aislar.sh
. "$RAIZ/pruebas/infra/aislar.sh"
T=$(mktemp -d)
# Algo que escucha en esta máquina (127.0.0.1): desde dentro no se tiene que poder llegar.
PU=$((20000 + RANDOM % 20000)); python3 -m http.server "$PU" --bind 127.0.0.1 --directory "$T" >/dev/null 2>&1 & ESCUCHA=$!
trap 'kill "$ESCUCHA" 2>/dev/null; rm -rf "$T"' EXIT
for _ in $(seq 1 50); do (exec 3<>"/dev/tcp/127.0.0.1/$PU") 2>/dev/null && break; sleep 0.1; done
M="tl-aislar-$$"
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
antes_etc=$([ -e /etc/tolatino ] && echo existe || echo no)
antes_log=$(stat -c %s /var/log/tolatino-sync.log 2>/dev/null || echo 0)
echo "aislamiento de las pruebas de infra:"
# Un guion «desobediente»: escribe en las rutas reales de un despliegue, como el tolatino-sync que no leía las variables de la prueba.
AISLAR_VISIBLES="$T" aislado '
  m=$1
  mkdir -p /opt/tolatino /etc/tolatino /var/www/estado /var/lib/tolatino /usr/local/bin
  echo x > "/opt/tolatino/$m"; echo x > "/etc/tolatino/$m"; echo x >> /var/log/tolatino-sync.log; echo x > "/var/lock/$m"
  echo x > "/usr/local/bin/$m"; echo x > "/tmp/$m"; echo x > "/var/www/estado/$m"; echo x > "/var/lib/tolatino/$m"
  echo visible > "$0/visible"
  { [ -S /run/docker.sock ] || [ -S /var/run/docker.sock ]; } && echo docker-a-la-vista > "$0/docker"
  [ -S /run/systemd/private ] && echo systemd-a-la-vista > "$0/systemd"
  if timeout 3 bash -c "exec 3<>/dev/tcp/127.0.0.1/$2" 2>/dev/null; then echo hay-red > "$0/red"; fi
  exit 7' "$T" "$M" "$PU"
ok "la salida del guion llega" "$?" 7
ok "lo que escribe en /opt, /etc/tolatino, /var/lock, /usr/local/bin, /tmp, /var/www y /var/lib/tolatino no llega a la máquina" \
  "$(ls "/opt/tolatino/$M" "/etc/tolatino/$M" "/var/lock/$M" "/usr/local/bin/$M" "/tmp/$M" "/var/www/estado/$M" "/var/lib/tolatino/$M" 2>/dev/null | wc -l)" 0
ok "… ni al registro de verdad (/var/log/tolatino-sync.log)" "$(stat -c %s /var/log/tolatino-sync.log 2>/dev/null || echo 0)" "$antes_log"
ok "… y un punto de montaje que no existía no queda (/etc/tolatino)" "$([ -e /etc/tolatino ] && echo existe || echo no)" "$antes_etc"
ok "la carpeta de la prueba sí sigue a la vista (aunque viva en /tmp)" "$(cat "$T/visible" 2>/dev/null)" visible
ok "Docker y systemd no contestan" "$(cat "$T/docker" "$T/systemd" 2>/dev/null)" ""
ok "sin red (ni la de esta máquina: 127.0.0.1)" "$(cat "$T/red" 2>/dev/null)" ""
printf '#!/bin/bash\nDIR=${TOLATINO_SYNC_DIR:-/opt/tolatino}\nREPO=$TOLATINO_SYNC_REPO\n' > "$T/obedece"
printf '#!/bin/bash\nDIR=/opt/tolatino\n' > "$T/desobedece"
ok "aislar_exige: un guion que lee sus variables se corre" "$(aislar_exige "$T/obedece" TOLATINO_SYNC_DIR TOLATINO_SYNC_REPO 2>&1; echo $?)" 0
ok "aislar_exige: uno que no las lee NO se corre, y lo dice" "$(aislar_exige "$T/desobedece" TOLATINO_SYNC_DIR TOLATINO_SYNC_REPO 2>&1 | grep -c 'no lee TOLATINO_SYNC_DIR TOLATINO_SYNC_REPO: NO se corre'):$(aislar_exige "$T/desobedece" TOLATINO_SYNC_DIR 2>/dev/null; echo $?)" "1:1"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
