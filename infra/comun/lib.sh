#!/bin/bash
# 9o · El paquete común de los despliegues (fase9-apertura.md §3.2): lo que el sandbox y producción hacen IGUAL, en un solo lugar. Lo cargan
# infra/pruebas/deploy.sh y infra/produccion/deploy.sh con «source»; cada uno solo pone sus diferencias (cuántas máquinas, el compose, nginx, la semilla
# solo en pruebas). El guardián mismoPaquete compara los pasos de los dos (produccion no tiene un paso que pruebas no tenga, salvo su lista cerrada).
# Nada de aquí pide nada a nadie ni imprime un secreto. Idempotente.

log() { echo "$(date -Is) [deploy] $*"; }

# ── Secretos que NACEN en el servidor (una vez; nunca viajan, nunca en el repo) ──
# secreto_nace ARCHIVO NOMBRE: si el archivo no tiene NOMBRE=, lo genera con su receta y lo agrega. Las recetas son las de siempre del sandbox.
secreto_receta() {
  case "$1" in
    POSTGRES_PASSWORD|MINIO_ROOT_PASSWORD|REPLICA_PASSWORD) openssl rand -hex 24 ;;
    AUTH_SECRET|DATOS_SECRET|BARRIDO_TOKEN|RESPALDO_LLAVE|LLAVERO_SECRET|ALERTA_TOKEN) openssl rand -hex 32 ;;
    # Llave Ed25519 que firma el QR de los boletos (6c): una por entorno; PKCS8 DER en base64.
    QR_LLAVE_PRIVADA) openssl genpkey -algorithm ed25519 -outform DER | base64 -w0 ;;
    # 8c · Llave VAPID de Web Push (P-256, PKCS8 DER en base64): una por entorno.
    VAPID_PRIVADA) openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -outform DER | base64 -w0 ;;
    # 8i · El código FIJO de cada cuenta de revisión de Apple y Google (6 dígitos al azar, uno por app).
    REVISION_CODIGO_*) printf '%06d' $(( $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % 1000000 )) ;;
    *) return 1 ;;
  esac
}
secreto_nace() {
  local f="$1" n="$2" v
  grep -q "^$n=" "$f" 2>/dev/null && return 0
  v=$(secreto_receta "$n") || { log "secreto sin receta: $n"; return 1; }
  echo "$n=$v" >> "$f"
}

# ── Diagnóstico a la vista (sin SSH): disco, Docker y la base, en /estado/diag.txt (las contraseñas tapadas) ──
# diag ETIQUETA (usa COMPOSE y COMMIT del que lo carga)
diag() {
  mkdir -p /var/www/estado
  { echo "== $(date -Is) commit $COMMIT · $1"; df -h / /var/lib/docker 2>/dev/null; echo; docker system df 2>/dev/null; echo
    echo "== contenedores"; "${COMPOSE[@]}" ps -a 2>/dev/null; echo
    echo "== base (últimas líneas)"; "${COMPOSE[@]}" logs --tail=60 db 2>/dev/null | sed -E 's/(password|PASSWORD)=[^ ]*/\1=***/g'
  } > /var/www/estado/diag.txt 2>&1 || true
}
# Si el disco pasa del 85 %, se libera lo que Docker puede rehacer (caché de builds, imágenes sin uso); nunca volúmenes.
disco_liberar() {
  local uso
  uso=$(df --output=pcent / | tail -1 | tr -dc 0-9)
  if [ "${uso:-0}" -ge 85 ]; then
    log "disco al $uso %: se libera la caché de Docker"
    docker builder prune -af >/dev/null 2>&1 || true
    docker image prune -af >/dev/null 2>&1 || true
    journalctl --vacuum-size=200M >/dev/null 2>&1 || true
  fi
}

# ── Índices que salen del repo (corren con el node de la imagen base, sin red; imprimen SQL que psql aplica en una transacción) ──
# indexar_docs REPO PSQL... : el Centro de ayuda (7a), las páginas legales (9e) y las cadenas de la interfaz (9f). Si uno falla, la app sigue con lo de antes.
indexar_docs() {
  local repo="$1"; shift
  docker run --rm --network none -v "$repo":/repo:ro -w /repo node:22-alpine node scripts/ayuda/indexar.mjs \
    | "$@" || log "ayuda: no se pudo indexar docs/ayuda (el Centro de ayuda queda como estaba)"
  docker run --rm --network none -v "$repo":/repo:ro -w /repo node:22-alpine node scripts/legal/indexar.mjs \
    | "$@" || log "legal: no se pudo indexar docs/legal (las páginas legales quedan como estaban)"
  docker run --rm --network none -v "$repo":/repo:ro -w /repo node:22-alpine node scripts/cms/indexar.mjs \
    | "$@" || log "cms: no se pudieron indexar las cadenas (la interfaz sigue con las de antes y las del código)"
}

# ── La comprobación real: la app responde y ve la base ──
# salud_esperar URL INTENTOS PAUSA [SEGUIDAS]: 0 cuando /api/salud contesta bien SEGUIDAS veces seguidas (1 por defecto). Deja la última respuesta en /tmp/salud.json.
salud_esperar() {
  local url="$1" n="$2" p="$3" seguidas="${4:-1}" bien=0 i
  for i in $(seq 1 "$n"); do
    if curl -fsS -m 5 "$url" >/tmp/salud.json 2>/dev/null; then
      bien=$((bien + 1))
      [ "$bien" -ge "$seguidas" ] && return 0
    else
      bien=0
    fi
    sleep "$p"
  done
  return 1
}
