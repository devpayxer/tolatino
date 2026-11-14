#!/bin/bash
# 9o · Cloudflare por la API (fase9-apertura.md §3.2; Paquete 8-0: la cuenta y el dominio los pone el fundador una vez). Aplica
# infra/produccion/cloudflare/reglas.json: DNS, SSL «Full (strict)», HTTPS siempre, el WAF que no desafía a Apple/Google/Stripe/tiendas/pases, el límite
# por IP de las acciones sin cuenta (L683) y la caché de lo que no cambia. Y el certificado de ORIGEN: firma la solicitud que publica la app en
# /estado/csr.txt (la llave nunca sale del servidor) y deja el certificado listo para sellarlo (ORIGEN_CERT). Idempotente. Nunca imprime el token.
#   CLOUDFLARE_API_TOKEN  token con Zone:DNS, Zone:Settings, Zone:WAF/Rulesets, Zone:Cache Rules y SSL:Origin CA (secreto del entorno de Claude Code)
#   CLOUDFLARE_ZONA_ID    el id de la zona tolatino.com (no es secreto; Paquete 8-0)
#   CLOUDFLARE_SECO=1     imprime lo que haría
# Uso: cloudflare.sh dns IP_APP [IP_SANDBOX] · cloudflare.sh ajustes · cloudflare.sh reglas · cloudflare.sh origen URL_CSR (→ $ORIGEN_CERT en base64)
set -euo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
R="$RAIZ/infra/produccion/cloudflare/reglas.json"
API=https://api.cloudflare.com/client/v4
Z="${CLOUDFLARE_ZONA_ID:-}"
cf() { # cf MÉTODO RUTA [JSON]
  if [ "${CLOUDFLARE_SECO:-0}" = 1 ]; then echo "[seco] $1 $2 ${3:0:400}" >&2; echo '{"success":true,"result":[]}'; return 0; fi
  local h out; h=$(mktemp); chmod 600 "$h"; printf 'Authorization: Bearer %s\n' "${CLOUDFLARE_API_TOKEN:?falta CLOUDFLARE_API_TOKEN}" > "$h"
  out=$(curl -sS -m 60 -X "$1" -H @"$h" -H 'Content-Type: application/json' ${3:+--data "$3"} "$API$2"); rm -f "$h"
  printf '%s' "$out" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("success") else 1)' || { echo "✗ Cloudflare $1 $2: $(printf '%s' "$out" | head -c 300)" >&2; return 1; }
  printf '%s' "$out"
}
# shellcheck disable=SC2120  # argumentos opcionales
py() { python3 - "$R" "$@"; }

case "${1:-}" in
  dns)
    APP="${2:?IP de la app}"; SBX="${3:-}"
    for linea in $(py <<'PY'
import json, sys
for r in json.load(open(sys.argv[1]))["dns"]: print(f'{r["nombre"]},{r["destino"]},{str(r["proxied"]).lower()}')
PY
    ); do
      IFS=, read -r nombre destino prox <<<"$linea"
      ip=$([ "$destino" = app ] && echo "$APP" || echo "$SBX"); [ -n "$ip" ] || continue
      fqdn=$([ "$nombre" = @ ] && echo tolatino.com || echo "$nombre.tolatino.com")
      id=$(cf GET "/zones/$Z/dns_records?type=A&name=$fqdn" | python3 -c 'import json,sys; r=json.load(sys.stdin)["result"]; print(r[0]["id"] if r else "")')
      cuerpo=$(printf '{"type":"A","name":"%s","content":"%s","proxied":%s,"ttl":1}' "$fqdn" "$ip" "$prox")
      if [ -n "$id" ]; then cf PUT "/zones/$Z/dns_records/$id" "$cuerpo" >/dev/null; else cf POST "/zones/$Z/dns_records" "$cuerpo" >/dev/null; fi
      echo "✓ $fqdn → (IP de $destino), proxied $prox"
    done ;;
  ajustes)
    cf PATCH "/zones/$Z/settings/ssl" "$(py <<'PY'
import json, sys; print(json.dumps({"value": json.load(open(sys.argv[1]))["ssl"]}))
PY
)" >/dev/null
    cf PATCH "/zones/$Z/settings/always_use_https" '{"value":"on"}' >/dev/null
    cf PATCH "/zones/$Z/settings/min_tls_version" '{"value":"1.2"}' >/dev/null
    echo "✓ SSL Full (strict), HTTPS siempre, TLS ≥ 1.2" ;;
  reglas)
    # Tres conjuntos de reglas de la zona (PUT del punto de entrada de cada fase: reemplaza, idempotente).
    cf PUT "/zones/$Z/rulesets/phases/http_request_firewall_custom/entrypoint" "$(py <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
expr = " or ".join(f"({e})" for e in d["sin_desafio"])
print(json.dumps({"rules": [{"description": "sin desafío: Apple, Google, Stripe, tiendas, pases, canales", "expression": expr, "action": "skip",
  "action_parameters": {"phases": ["http_ratelimit", "http_request_firewall_managed", "http_request_sbfm"], "products": ["bic", "securityLevel", "uaBlock"]}, "logging": {"enabled": True}}]}))
PY
)" >/dev/null
    cf PUT "/zones/$Z/rulesets/phases/http_ratelimit/entrypoint" "$(py <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(json.dumps({"rules": [{"description": r["nombre"], "expression": r["expresion"], "action": r["accion"],
  "ratelimit": {"characteristics": ["ip.src", "cf.colo.id"], "period": 10, "requests_per_period": r["por_10s"], "mitigation_timeout": 10}} for r in d["limites"]]}))
PY
)" >/dev/null
    cf PUT "/zones/$Z/rulesets/phases/http_request_cache_settings/entrypoint" "$(py <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(json.dumps({"rules": [{"description": c["expresion"][:60], "expression": c["expresion"], "action": "set_cache_settings",
  "action_parameters": {"cache": True, "edge_ttl": {"mode": "override_origin", "default": c["edge_ttl"]}}} for c in d["cache"]]}))
PY
)" >/dev/null
    echo "✓ WAF sin desafío, límite por IP, caché" ;;
  origen)
    URL="${2:?URL de /estado/ de la app}"
    csr=$(curl -fsS -m 20 "$URL/csr.txt")
    printf '%s' "$csr" | grep -q 'BEGIN CERTIFICATE REQUEST' || { echo "✗ no hay solicitud en $URL/csr.txt" >&2; exit 1; }
    cuerpo=$(printf '%s' "$csr" | python3 -c 'import json,sys; print(json.dumps({"csr": sys.stdin.read(), "hostnames": ["tolatino.com", "*.tolatino.com"], "request_type": "origin-rsa", "requested_validity": 5475}))')
    # El certificado (público) sale en base64 a la variable ORIGEN_CERT del entorno de quien llama; se sella para la app con sellar.sh.
    cf POST /certificates "$cuerpo" | python3 -c 'import base64,json,sys; print(base64.b64encode(json.load(sys.stdin)["result"]["certificate"].encode()).decode())' > "${ORIGEN_CERT_ARCHIVO:-/dev/stdout}"
    echo "✓ certificado de origen firmado (15 años): sellar con «ORIGEN_CERT=\$(cat archivo) sellar.sh sellar produccion app ORIGEN_CERT»" >&2 ;;
  *) echo "uso: cloudflare.sh dns IP_APP [IP_SANDBOX] | ajustes | reglas | origen URL_ESTADO" >&2; exit 2 ;;
esac
