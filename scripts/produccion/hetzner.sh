#!/bin/bash
# 9o · La API del proveedor de servidores (Hetzner Cloud: el del sandbox y el default de producción, fase9 §6 #2). Funciones para crear, buscar y borrar
# máquinas, la red privada, el firewall y el disco de la base. El token NUNCA en la línea de comandos ni en el registro: va por una cabecera desde
# un archivo temporal 0600 (curl -H @archivo). Lo cargan maquinas.sh, firewall.sh, reconstruir.sh y ensayo.sh.
#   HCLOUD_TOKEN       el token del proyecto (ensayo: el del proyecto de pruebas; producción: HCLOUD_TOKEN_PRODUCCION, Paquete 9-3)
#   HCLOUD_SECO=1      no llama a la API: imprime lo que haría (para revisar el guion sin gastar)
HAPI=${HAPI:-https://api.hetzner.cloud/v1}

_cabecera() { local f; f=$(mktemp); chmod 600 "$f"; printf 'Authorization: Bearer %s\n' "${HCLOUD_TOKEN:?falta HCLOUD_TOKEN}" > "$f"; echo "$f"; }
# hapi MÉTODO RUTA [JSON] → el cuerpo de la respuesta (sale con error si la API contesta 4xx/5xx)
hapi() {
  local m="$1" r="$2" d="${3:-}" h out
  if [ "${HCLOUD_SECO:-0}" = 1 ]; then echo "[seco] $m $r ${d:0:300}" >&2; echo '{"servers":[],"networks":[],"firewalls":[],"volumes":[],"server":{"id":0,"public_net":{"ipv4":{"ip":"0.0.0.0"}}},"network":{"id":0},"firewall":{"id":0},"volume":{"id":0},"action":{"id":0,"status":"success"}}'; return 0; fi
  h=$(_cabecera)
  out=$(curl -sS -m 60 -X "$m" -H @"$h" -H 'Content-Type: application/json' ${d:+--data "$d"} -w '\n%{http_code}' "$HAPI$r")
  rm -f "$h"
  local code=${out##*$'\n'}; out=${out%$'\n'*}
  if [ "${code:0:1}" != 2 ]; then echo "✗ API $m $r → $code: $(printf '%s' "$out" | head -c 300)" >&2; return 1; fi
  printf '%s' "$out"
}
jq_() { python3 -c "import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1], {'d': d}))" "$1"; }

# La plantilla de cloud-init llena para un rol (user_data).
cloud_init() { # cloud_init ROL ENTORNO RAMA RECONSTRUIR
  sed -e "s|__ROL__|$1|g" -e "s|__ENTORNO__|$2|g" -e "s|__RAMA__|$3|g" -e "s|__RECONSTRUIR__|$4|g" "$(dirname "${BASH_SOURCE[0]}")/../../infra/produccion/cloud-init.yml"
}

red_crear() { # red_crear NOMBRE RANGO_16 SUBRED_24 ZONA → id
  hapi POST /networks "$(printf '{"name":"%s","ip_range":"%s","subnets":[{"type":"cloud","network_zone":"%s","ip_range":"%s"}],"labels":{"tolatino":"si"}}' "$1" "$2" "$4" "$3")" | jq_ "d['network']['id']"
}
# servidor_crear NOMBRE TIPO UBICACION ROL ENTORNO RAMA RECONSTRUIR [VOLUMEN] → id (etiquetas tolatino-entorno / tolatino-rol: el firewall se aplica
# por ellas). El disco de la base va DESDE el nacimiento (cloud-init lo monta en /var/lib/tolatino antes de todo).
servidor_crear() {
  local ud vol="${8:-}"; ud=$(cloud_init "$4" "$5" "$6" "$7" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  hapi POST /servers "$(printf '{"name":"%s","server_type":"%s","location":"%s","image":"ubuntu-24.04","user_data":%s,"labels":{"tolatino-entorno":"%s","tolatino-rol":"%s"},"public_net":{"enable_ipv4":true,"enable_ipv6":true},"start_after_create":true%s}' \
    "$1" "$2" "$3" "$ud" "$5" "$4" "${vol:+,\"volumes\":[$vol],\"automount\":false}")" | jq_ "d['server']['id']"
}
red_unir() { hapi POST "/servers/$1/actions/attach_to_network" "$(printf '{"network":%s,"ip":"%s"}' "$2" "$3")" >/dev/null; } # red_unir SERVIDOR RED IP
ip_publica() { hapi GET "/servers/$1" | jq_ "d['server']['public_net']['ipv4']['ip']"; }
servidores_de() { hapi GET "/servers?label_selector=tolatino-entorno%3D$1" | jq_ "' '.join(str(s['id']) for s in d['servers'])"; } # ids del entorno
servidor_de() { hapi GET "/servers?label_selector=tolatino-entorno%3D$1,tolatino-rol%3D$2" | jq_ "' '.join(str(s['id']) for s in d['servers'])"; }
servidor_borrar() { hapi DELETE "/servers/$1" >/dev/null; }
volumen_crear() { # volumen_crear NOMBRE GB UBICACION → id (formateado ext4; cloud-init lo monta en /var/lib/tolatino)
  hapi POST /volumes "$(printf '{"name":"%s","size":%s,"location":"%s","format":"ext4","labels":{"tolatino":"si"}}' "$1" "$2" "$3")" | jq_ "d['volume']['id']"
}
volumen_de() { hapi GET "/volumes?name=$1" | jq_ "(d['volumes'][0]['id'] if d['volumes'] else '')"; }
# firewall_crear NOMBRE ENTORNO ROL REGLAS_JSON → id (se aplica por etiquetas a las máquinas de ese rol y entorno; sin reglas = nada entra)
firewall_crear() {
  hapi POST /firewalls "$(printf '{"name":"%s","rules":%s,"apply_to":[{"type":"label_selector","label_selector":{"selector":"tolatino-entorno=%s,tolatino-rol=%s"}}],"labels":{"tolatino":"si"}}' "$1" "$4" "$2" "$3")" | jq_ "d['firewall']['id']"
}
firewall_reglas() { hapi POST "/firewalls/$1/actions/set_rules" "$(printf '{"rules":%s}' "$2")" >/dev/null; }
# Lo de un entorno que se borra al terminar (solo el ensayo): máquinas, discos, firewalls y red con su nombre.
entorno_borrar() {
  local e="$1" id
  [ "$e" = ensayo ] || { echo "✗ solo el ensayo se borra entero (nunca $e)" >&2; return 1; }
  for id in $(servidores_de "$e"); do servidor_borrar "$id" || true; done
  sleep 10
  for id in $(hapi GET "/volumes?label_selector=tolatino%3Dsi" | jq_ "' '.join(str(v['id']) for v in d['volumes'] if v['name'].startswith('tolatino-$e'))"); do hapi DELETE "/volumes/$id" >/dev/null || true; done
  for id in $(hapi GET "/firewalls?label_selector=tolatino%3Dsi" | jq_ "' '.join(str(f['id']) for f in d['firewalls'] if f['name'].startswith('tolatino-$e'))"); do hapi DELETE "/firewalls/$id" >/dev/null || true; done
  for id in $(hapi GET "/networks?label_selector=tolatino%3Dsi" | jq_ "' '.join(str(n['id']) for n in d['networks'] if n['name'].startswith('tolatino-$e'))"); do hapi DELETE "/networks/$id" >/dev/null || true; done
}
