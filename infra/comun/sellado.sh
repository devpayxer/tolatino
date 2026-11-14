#!/bin/bash
# 9o · El sobre sellado (fase9-apertura.md §3.3): los secretos de terceros (Stripe, Telnyx, SES, Meta, Anthropic, el almacén de los respaldos…) llegan a
# un servidor cifrados SOLO para él. Cada servidor genera al nacer su par X25519 (formato age, BSD-3) y publica la llave PÚBLICA en /estado/llave.txt;
# Claude, con el secreto en los secretos de su entorno, lo cifra para esa llave (scripts/produccion/sellar.sh) y lo sube como
# infra/<entorno>/sellado/<máquina>/<NOMBRE>.age; aquí se abre con la llave privada, que nunca sale del servidor, y va a /etc/tolatino/<entorno>.env.
# Un sobre cifrado para otro servidor NO abre: se dice en /estado/sobres.txt y se deja el valor que había. Solo nombres de la lista cerrada
# infra/comun/secretos.json con origen «sellado» (guardianes secretoConDueno y selladoSoloSuServidor). Nada de aquí imprime un valor.
# Lo cargan los deploy.sh con «source» (usa log de lib.sh). Si age no está, se instala (paquete de Ubuntu); si no se puede, se sigue sin sobres.

AGE_LLAVE=${AGE_LLAVE:-/etc/tolatino/age.key}

age_disponible() {
  command -v age >/dev/null 2>&1 && command -v age-keygen >/dev/null 2>&1 && return 0
  log "sellado: se instala age (paquete de Ubuntu)" >&2
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-install-recommends -o DPkg::Lock::Timeout=60 age >/dev/null 2>&1 || true
  command -v age >/dev/null 2>&1 && command -v age-keygen >/dev/null 2>&1
}

# sellado_preparar PUBLICAR_EN: crea la llave del servidor una vez (0600, root) y publica la pública con su huella. Imprime SOLO la huella (lo demás
# va a stderr, que es el registro del despliegue).
sellado_preparar() {
  local pub="$1" llave fp
  age_disponible || { log "sellado: sin age; los sobres no se abren en este despliegue" >&2; return 1; }
  if [ ! -s "$AGE_LLAVE" ]; then
    mkdir -p "$(dirname "$AGE_LLAVE")"
    ( umask 077; age-keygen -o "$AGE_LLAVE" >/dev/null 2>&1 ) || { log "sellado: no se pudo crear la llave" >&2; return 1; }
    log "sellado: llave del servidor creada" >&2
  fi
  chmod 600 "$AGE_LLAVE"
  llave=$(age-keygen -y "$AGE_LLAVE" 2>/dev/null) || return 1
  fp=$(printf '%s' "$llave" | sha256sum | cut -c1-32)
  mkdir -p "$(dirname "$pub")"
  printf '%s\nhuella %s\n' "$llave" "$fp" > "$pub.tmp" && mv "$pub.tmp" "$pub"
  echo "$fp"
}

# El nombre está en la lista cerrada con origen «sellado» (una entrada por línea en secretos.json).
sellado_permitido() { grep -Eq "^  \"$1\": \{[^}]*\"origen\": \"sellado\"" "$2" 2>/dev/null; }

# Escribe NOMBRE=valor en el archivo del entorno (reemplaza la línea si estaba). Los valores con caracteres raros van entre comillas simples.
env_poner() {
  local f="$1" n="$2" v="$3" tmp
  case "$v" in *$'\n'*|*"'"*) return 1 ;; esac
  [[ "$v" =~ ^[A-Za-z0-9_./+=:@,-]*$ ]] || v="'$v'"
  tmp=$(mktemp "$f.XXXX") || return 1
  grep -v "^$n=" "$f" > "$tmp" 2>/dev/null || true
  echo "$n=$v" >> "$tmp"
  chmod 600 "$tmp" && mv "$tmp" "$f"
}

# sellado_abrir DIR_SELLADO MAQUINA ARCHIVO_ENV LISTA_SECRETOS ESTADO: abre los sobres de esa máquina. Devuelve 0 aunque alguno no abra.
sellado_abrir() {
  local dir="$1/$2" env="$3" lista="$4" estado="$5" f n v bien=0 mal=0
  mkdir -p "$(dirname "$estado")"
  : > "$estado.tmp"
  [ -d "$dir" ] || { echo "sin sobres para $2" > "$estado.tmp"; mv "$estado.tmp" "$estado"; return 0; }
  [ -s "$AGE_LLAVE" ] || { log "sellado: sin llave del servidor"; return 0; }
  for f in "$dir"/*.age; do
    [ -e "$f" ] || continue
    n=$(basename "$f" .age)
    if ! [[ "$n" =~ ^[A-Z][A-Z0-9_]{2,60}$ ]] || ! sellado_permitido "$n" "$lista"; then
      echo "$n · fuera de la lista cerrada (no se abre)" >> "$estado.tmp"; mal=$((mal + 1)); continue
    fi
    if v=$(age -d -i "$AGE_LLAVE" "$f" 2>/dev/null) && [ -n "$v" ] && env_poner "$env" "$n" "$v"; then
      echo "$n · abierto" >> "$estado.tmp"; bien=$((bien + 1))
    else
      echo "$n · NO ABRE con la llave de este servidor (sellado para otro): queda el valor de antes" >> "$estado.tmp"; mal=$((mal + 1))
    fi
  done
  v=""
  mv "$estado.tmp" "$estado"
  log "sellado: $bien sobres abiertos, $mal sin abrir (ver /estado/sobres.txt)"
  return 0
}
