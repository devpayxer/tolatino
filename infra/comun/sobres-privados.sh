#!/bin/bash
# 9o · Los sobres privados entre máquinas del mismo entorno (fase9-apertura.md §3.2: «lo que nace en el servidor nunca viaja» en claro). Lo que nace en
# una máquina y otra necesita (la contraseña de la base para la app y la réplica, la llave de los respaldos para la restauración de prueba, las llaves de
# Garage para la app, el token de las alertas para la réplica) se cifra con age para la llave PÚBLICA de la máquina que lo necesita (llaves.json del
# entorno, en el repo) y se sirve SOLO por la red privada (nginx en la IP privada, puerto 8099). La otra lo baja y lo abre con su llave privada. Nada en
# claro sale de la máquina; nada de esto va al repo. La lista de qué va a quién es infra/comun/secretos.json («para»). Lo cargan los deploy.sh.

SOBRES_SERVIDOS=${SOBRES_SERVIDOS:-/var/lib/tolatino/sobres-servidos}

# La llave pública age de una máquina, de llaves.json del entorno (una por línea: "app": "age1…").
llave_de() { grep -Eo "\"$1\": *\"age1[0-9a-z]{58}\"" "$2" 2>/dev/null | grep -Eo 'age1[0-9a-z]{58}'; }

# Las variables que nacen en ORIGEN y van a DESTINO, según secretos.json.
variables_para() { grep -E "\"origen\": \"$1\"" "$3" | grep -E "\"para\": \[[^]]*\"$2\"" | grep -Eo '^  "[A-Z][A-Z0-9_]+"' | tr -d ' "'; }

# servir_sobres ORIGEN ARCHIVO_ENV LLAVES_JSON SECRETOS_JSON DESTINO...: arma <destino>.age con sus variables, cifrado para su llave.
servir_sobres() {
  local origen="$1" env="$2" llaves="$3" lista="$4" d pub n v tmp
  shift 4
  mkdir -p "$SOBRES_SERVIDOS"; chmod 755 "$SOBRES_SERVIDOS"
  for d in "$@"; do
    pub=$(llave_de "$d" "$llaves")
    [ -n "$pub" ] || { log "sobres: sin llave pública de «$d» en $llaves (todavía no se publicó)"; continue; }
    tmp=$(mktemp)
    for n in $(variables_para "$origen" "$d" "$lista"); do
      v=$(grep -m1 "^$n=" "$env" | cut -d= -f2-)
      [ -n "$v" ] && echo "$n=$v" >> "$tmp"
    done
    if age -r "$pub" -o "$SOBRES_SERVIDOS/$d.age.tmp" "$tmp" 2>/dev/null; then mv "$SOBRES_SERVIDOS/$d.age.tmp" "$SOBRES_SERVIDOS/$d.age"; chmod 644 "$SOBRES_SERVIDOS/$d.age"
    else log "sobres: no se pudo cifrar el de «$d»"; fi
    shred -u "$tmp" 2>/dev/null || rm -f "$tmp"
  done
}

# traer_sobre IP_ORIGEN MAQUINA ARCHIVO_ENV SECRETOS_JSON ORIGEN: baja <máquina>.age por la red privada, lo abre y pone solo lo que la lista dice que
# viene de ese ORIGEN para esta máquina. Espera hasta 10 minutos (la otra máquina puede estar naciendo).
traer_sobre() {
  local ip="$1" yo="$2" env="$3" lista="$4" origen="$5" tmp i linea n v puestos=0
  tmp=$(mktemp)
  for i in $(seq 1 60); do
    curl -fsS -m 5 "http://$ip:8099/$yo.age" -o "$tmp.age" 2>/dev/null && break
    sleep 10
  done
  if [ ! -s "$tmp.age" ] || ! age -d -i "${AGE_LLAVE:-/etc/tolatino/age.key}" -o "$tmp" "$tmp.age" 2>/dev/null; then
    log "sobres: el sobre de $origen ($ip) no llegó o no abre con la llave de esta máquina"; rm -f "$tmp" "$tmp.age"; return 1
  fi
  while IFS= read -r linea; do
    n=${linea%%=*}; v=${linea#*=}
    variables_para "$origen" "$yo" "$lista" | grep -qx "$n" || continue
    env_poner "$env" "$n" "$v" && puestos=$((puestos + 1))
  done < "$tmp"
  shred -u "$tmp" 2>/dev/null || rm -f "$tmp"; rm -f "$tmp.age"
  log "sobres: $puestos variables de $origen"
}
