#!/bin/bash
# 9o · El firewall del proveedor (fase9-apertura.md §3.2): en la máquina de la app, 80 y 443 SOLO desde los rangos publicados de Cloudflare (los del día;
# si no contestan, infra/comun/cloudflare-rangos.txt); ICMP para el diagnóstico. La base y la réplica: nada entra de afuera (todo va por la red privada).
# Sin puerto 22: nadie entra a mano. Idempotente (set_rules reemplaza las reglas).
#   firewall.sh reglas-app [cloudflare|todos]   imprime las reglas (JSON) — «todos» solo para el ensayo, que no tiene Cloudflare delante
#   firewall.sh aplicar ENTORNO                 crea o actualiza los firewalls tolatino-ENTORNO-{app,base,replica[,almacen]} (HCLOUD_TOKEN)
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=hetzner.sh
. "$DIR/hetzner.sh"

rangos() {
  local r
  r=$( { curl -fsS -m 15 https://www.cloudflare.com/ips-v4; echo; curl -fsS -m 15 https://www.cloudflare.com/ips-v6; } 2>/dev/null | grep -E '^[0-9a-f:.]+/[0-9]+$' || true)
  [ -n "$r" ] || r=$(grep -E '^[0-9a-f:.]+/[0-9]+$' "$DIR/../../infra/comun/cloudflare-rangos.txt")
  echo "$r"
}
reglas_app() { # reglas_app cloudflare|todos [IP_EXTRA/32]
  local fuentes
  if [ "$1" = todos ]; then fuentes='["0.0.0.0/0","::/0"]'
  else fuentes=$(rangos | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))'); fi
  python3 - "$fuentes" <<'PY'
import json, sys
f = json.loads(sys.argv[1])
r = [{"direction": "in", "protocol": "tcp", "port": p, "source_ips": f, "description": "web solo desde Cloudflare" if len(f) > 2 else "web (ensayo)"} for p in ("80", "443")]
r.append({"direction": "in", "protocol": "icmp", "source_ips": ["0.0.0.0/0", "::/0"], "description": "diagnóstico"})
print(json.dumps(r))
PY
}

case "${1:-}" in
  reglas-app) reglas_app "${2:-cloudflare}" ;;
  aplicar)
    E="${2:?entorno}"; modo=cloudflare; [ "$E" = ensayo ] && modo=todos
    roles="app base replica"; [ "$E" = ensayo ] && roles="$roles almacen"
    for rol in $roles; do
      reglas='[]'; [ "$rol" = app ] && reglas=$(reglas_app "$modo")
      # El almacén del ensayo deja entrar al S3 SOLO desde quien corre el ensayo (para bajar el sobre de recuperación, como haría con el de verdad).
      [ "$rol" = almacen ] && [ -n "${ENSAYO_IP_GUION:-}" ] && reglas=$(printf '[{"direction":"in","protocol":"tcp","port":"3443","source_ips":["%s/32"]}]' "$ENSAYO_IP_GUION")
      id=$(hapi GET "/firewalls?name=tolatino-$E-$rol" | jq_ "(d['firewalls'][0]['id'] if d['firewalls'] else '')")
      if [ -n "$id" ] && [ "$id" != 0 ]; then firewall_reglas "$id" "$reglas"; else firewall_crear "tolatino-$E-$rol" "$E" "$rol" "$reglas" >/dev/null; fi
      echo "✓ firewall tolatino-$E-$rol ($(printf '%s' "$reglas" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))') reglas)"
    done ;;
  *) echo "uso: firewall.sh reglas-app [cloudflare|todos] | aplicar ENTORNO" >&2; exit 2 ;;
esac
