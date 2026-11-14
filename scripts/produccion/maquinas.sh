#!/bin/bash
# 9o · Crear y reconstruir las máquinas de un entorno por la API del proveedor (fase9-apertura.md §3.2; nadie entra a mano: emergencia = reconstruir con
# el mismo cloud-init). Nunca imprime el token. Los tamaños y la ubicación se eligen con el precio del día (Paquete 9-3; §6 #2–#3) y se pasan por variables.
#   maquinas.sh crear ENTORNO              red privada + firewalls + base (con su disco) + app + réplica (+ almacen en el ensayo), cada una con su IP privada
#   maquinas.sh reconstruir ENTORNO ROL    borra la máquina perdida y crea otra igual con TOLATINO_RECONSTRUIR=1 (espera su sobre de recuperación;
#                                          scripts/produccion/reconstruir.sh se lo da). Imprime la IP pública nueva (Cloudflare se apunta con cloudflare.sh)
#   maquinas.sh ips ENTORNO                las IP públicas de cada rol (para el guion; nunca van al repo)
# Variables: HCLOUD_TOKEN · UBICACION (fsn1 en el ensayo; ash/hil en producción) · ZONA (eu-central / us-east) · TIPO_APP, TIPO_BASE, TIPO_REPLICA,
#            TIPO_ALMACEN · DISCO_BASE_GB (producción 100) · RAMA (la del entorno).
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=hetzner.sh
. "$DIR/hetzner.sh"
acc="${1:?crear | reconstruir | ips}"; E="${2:?entorno}"
case "$E" in ensayo|produccion) ;; *) echo "entorno: ensayo | produccion (el sandbox se reconstruye con su propio cloud-init: infra/pruebas/cloud-init.yml)" >&2; exit 2 ;; esac
# shellcheck source=/dev/null
. "$DIR/../../infra/$E/entorno.conf"
UBICACION=${UBICACION:-$([ "$E" = ensayo ] && echo fsn1 || echo ash)}
ZONA=${ZONA:-$([ "$E" = ensayo ] && echo eu-central || echo us-east)}
RAMA=${RAMA:-$TOLATINO_RAMA}
tipo() { case "$1" in app) echo "${TIPO_APP:-cx33}" ;; base) echo "${TIPO_BASE:-cx23}" ;; replica) echo "${TIPO_REPLICA:-cx23}" ;; almacen) echo "${TIPO_ALMACEN:-cx23}" ;; esac; }
ip_de() { case "$1" in app) echo "$RED_APP" ;; base) echo "$RED_BASE" ;; replica) echo "$RED_REPLICA" ;; almacen) echo "${RED_ALMACEN:?}" ;; esac; }
red_id() { hapi GET "/networks?name=tolatino-$E" | jq_ "(d['networks'][0]['id'] if d['networks'] else '')"; }

una() { # una ROL RECONSTRUIR → id
  local rol="$1" id red vol=""
  # El disco de la base: si ya existe (la máquina se perdió pero su disco no), se vuelve a montar con los datos; si no, se crea.
  if [ "$rol" = base ] && [ "${DISCO_BASE_GB:-0}" -gt 0 ]; then
    vol=$(volumen_de "tolatino-$E-base-datos"); [ -n "$vol" ] || vol=$(volumen_crear "tolatino-$E-base-datos" "$DISCO_BASE_GB" "$UBICACION")
  fi
  id=$(servidor_crear "tolatino-$E-$rol-$(date +%m%d%H%M)" "$(tipo "$rol")" "$UBICACION" "$rol" "$E" "$RAMA" "$2" "$vol")
  red=$(red_id); red_unir "$id" "$red" "$(ip_de "$rol")"
  echo "$id"
}

case "$acc" in
  crear)
    [ -n "$(red_id)" ] || red_crear "tolatino-$E" "${RED_RED%.*.*}.0.0/16" "$RED_RED" "$ZONA" >/dev/null
    bash "$DIR/firewall.sh" aplicar "$E"
    roles="base app replica"; [ "$E" = ensayo ] && roles="almacen $roles"
    for rol in $roles; do
      [ -z "$(servidor_de "$E" "$rol")" ] || { echo "· $rol ya existe"; continue; }
      id=$(una "$rol" 0); echo "✓ $rol ($(tipo "$rol"), $UBICACION): id $id"
    done ;;
  reconstruir)
    R="${3:?rol}"
    for id in $(servidor_de "$E" "$R"); do servidor_borrar "$id"; echo "· la máquina perdida ($R, id $id) se borró"; done
    sleep 10
    id=$(una "$R" 1); echo "✓ $R reconstruida: id $id · IP $(ip_publica "$id") · espera su sobre de recuperación (reconstruir.sh)" ;;
  ips)
    for rol in app base replica almacen; do for id in $(servidor_de "$E" "$rol"); do echo "$rol $(ip_publica "$id")"; done; done ;;
  *) echo "acción desconocida" >&2; exit 2 ;;
esac
