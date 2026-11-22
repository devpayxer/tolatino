#!/bin/bash
# 22 nov · Aislamiento de las pruebas de infra que corren un guion de despliegue de verdad (deploy.sh, tolatino-sync) en esta máquina como root.
# Un revisor corrió sync-pruebas.test.sh contra un tolatino-sync que no leía las variables de la prueba: clonó el repo real en /opt/tolatino, creó
# /etc/tolatino y levantó contenedores en la máquina de la prueba. Desde aquí, eso no puede pasar:
#   · aislado: espacio de montaje Y de red aparte (unshare -m -n: sin red, ni la de GitHub ni la local), tmpfs sobre TODO lo de la máquina que un
#     guion de despliegue toca (AISLAR_RUTAS: /opt, /etc/tolatino, /etc/nginx, /var/log, /run con el socket de Docker y de systemd y /var/lock, /tmp…).
#     Solo siguen a la vista las carpetas de la prueba (AISLAR_VISIBLES: su carpeta temporal y el repo), aunque vivan debajo de una de esas rutas. Antes
#     de correr comprueba que el aislamiento de verdad está (Docker y systemd no contestan, cada ruta tapada, sin más red que lo); si no, no corre nada.
#     Un punto de montaje que no existía se crea vacío y se quita al terminar.
#   · aislar_exige GUION VARIABLE…: no se corre un guion que no lee las variables con las que la prueba lo apunta a sus carpetas de mentira.
# Uso: . pruebas/infra/aislar.sh; AISLAR_VISIBLES="$T $RAIZ" aislado 'script de bash' arg0 arg1…   (los argumentos llegan como $0, $1, …)
# Prueba: pruebas/infra/aislar.test.sh. Guardián: pruebasInfraAisladas.
AISLAR_RUTAS="/opt /etc/tolatino /etc/nginx /etc/systemd/system /var/www /var/lib/tolatino /var/lib/garage /var/log /usr/local/bin /run /tmp"

aislado() {
  local guion="$1" m creados="" r; shift
  [ "$(id -u)" = 0 ] || { echo "✗ aislado: hace falta root (unshare)" >&2; return 97; }
  for m in $AISLAR_RUTAS; do [ -e "$m" ] || { mkdir -p "$m" && creados="$m $creados"; }; done
  AISLAR_RUTAS="$AISLAR_RUTAS" AISLAR_VISIBLES="${AISLAR_VISIBLES:-}" AISLAR_GUION="$guion" unshare -m -n --propagation private bash -c '
    set -u
    # 1) Las carpetas de la prueba se guardan aparte (bind) antes de tapar; después vuelven a su misma ruta.
    mount -t tmpfs none /mnt || exit 98
    i=0; for v in $AISLAR_VISIBLES; do i=$((i + 1)); [ -d "$v" ] || continue; mkdir -p "/mnt/$i"; mount --bind "$v" "/mnt/$i" || exit 98; done
    for m in $AISLAR_RUTAS; do mount -t tmpfs none "$m" || exit 98; done
    i=0; for v in $AISLAR_VISIBLES; do i=$((i + 1)); [ -d "/mnt/$i" ] || continue; mkdir -p "$v"; mount --bind "/mnt/$i" "$v" || exit 98; done
    mkdir -p /run/lock; chmod 1777 /tmp
    # 2) Antes de correr nada: el aislamiento de verdad está.
    for s in /run/docker.sock /var/run/docker.sock /run/systemd/private /run/dbus/system_bus_socket; do [ -S "$s" ] && { echo "✗ aislado: $s sigue a la vista" >&2; exit 98; }; done
    for m in $AISLAR_RUTAS; do mountpoint -q "$m" || { echo "✗ aislado: $m no quedó tapada" >&2; exit 98; }; done
    [ "$(tail -n +3 /proc/net/dev | grep -vc "^ *lo:")" = 0 ] || { echo "✗ aislado: hay red" >&2; exit 98; }
    unset AISLAR_RUTAS AISLAR_VISIBLES
    g=$AISLAR_GUION; unset AISLAR_GUION
    exec bash -c "$g" "$@"' _ "$@"
  r=$?
  for m in $creados; do rmdir "$m" 2>/dev/null; done
  return "$r"
}

# aislar_exige GUION VARIABLE… : 0 si GUION lee cada VARIABLE (la prueba lo apunta a sus carpetas con ellas); si no, lo dice y devuelve 1: la prueba
# NO lo corre (correría contra la máquina real: clonar en /opt, desplegar de verdad).
aislar_exige() {
  local g="$1" v falta=""; shift
  for v in "$@"; do grep -qE "\\\$\\{?$v\\b" "$g" 2>/dev/null || falta="$falta $v"; done
  [ -z "$falta" ] && return 0
  echo "✗ $(basename "$g") no lee$falta: NO se corre (sin esas variables apuntaría a la máquina real)" >&2
  return 1
}
