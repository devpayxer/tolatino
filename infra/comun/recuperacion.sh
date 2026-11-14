#!/bin/bash
# 9o · Reconstruir una máquina perdida (docs/incidentes/servidor-perdido.md; fase9-apertura.md §3.4). La máquina nueva nace con el mismo cloud-init y
# TOLATINO_RECONSTRUIR=1: NO inventa llaves nuevas (sin DATOS_SECRET no se leería op_private, L458; sin QR_LLAVE_PRIVADA los QR ya emitidos no valdrían,
# L775). Publica su llave age provisional en /estado/llave.txt y espera su sobre de recuperación en la rama «recuperacion» del repo
# (recuperacion/para-<huella>.age): lo deja ahí scripts/produccion/reconstruir.sh, que abre el sobre de recuperación del almacén con la llave de
# recuperación (vive solo en los secretos del entorno de Claude Code) y lo vuelve a cifrar SOLO para esta llave provisional. Al abrirlo, la máquina
# vuelve a tener sus llaves de siempre (también su llave age: los sobres sellados del repo vuelven a abrir) y borra la provisional: el texto cifrado de la
# rama ya no lo abre nadie. Espera hasta 60 minutos; si no llega, NO sigue (mejor caída que con llaves nuevas).
# Lo carga infra/produccion/deploy.sh (usa log, env_poner).

# recuperar_si_hace_falta REPO ARCHIVO_ENV: devuelve 0 si no hacía falta o si recuperó; 1 si esperó y no llegó.
recuperar_si_hace_falta() {
  local repo="$1" env="$2" fp tmp i linea n v
  [ "${TOLATINO_RECONSTRUIR:-0}" = 1 ] || return 0
  [ -f /var/lib/tolatino/recuperada ] && return 0
  fp=$(sed -n 's/^huella //p' /var/www/estado/llave.txt 2>/dev/null)
  [ -n "$fp" ] || { log "recuperación: sin llave provisional publicada"; return 1; }
  log "recuperación: esperando el sobre para $fp en la rama «${RAMA_RECUPERACION:-recuperacion}»"
  tmp=$(mktemp)
  for i in $(seq 1 120); do
    if git -C "$repo" fetch -q --depth 1 origin "${RAMA_RECUPERACION:-recuperacion}" 2>/dev/null && git -C "$repo" show "FETCH_HEAD:recuperacion/para-$fp.age" > "$tmp.age" 2>/dev/null && [ -s "$tmp.age" ]; then break; fi
    rm -f "$tmp.age"; sleep 30
  done
  if [ ! -s "$tmp.age" ] || ! age -d -i "$AGE_LLAVE" -o "$tmp" "$tmp.age" 2>/dev/null; then
    rm -f "$tmp" "$tmp.age"; log "recuperación: el sobre no llegó o no abre; la máquina NO sigue con llaves nuevas"; return 1
  fi
  while IFS= read -r linea; do
    n=${linea%%=*}; v=${linea#*=}
    case "$n" in
      AGE_SERVIDOR) ( umask 077; printf '%s\n' "$v" > "$AGE_LLAVE.recuperada" ) ;;
      GARAGE_TOML_B64) ( umask 077; printf '%s' "$v" | base64 -d > /etc/tolatino/garage.toml ); chmod 644 /etc/tolatino/garage.toml ;;
      [A-Z]*) env_poner "$env" "$n" "$v" ;;
    esac
  done < "$tmp"
  shred -u "$tmp" 2>/dev/null || rm -f "$tmp"; rm -f "$tmp.age"
  if [ -s "$AGE_LLAVE.recuperada" ]; then shred -u "$AGE_LLAVE" 2>/dev/null || rm -f "$AGE_LLAVE"; mv "$AGE_LLAVE.recuperada" "$AGE_LLAVE"; chmod 600 "$AGE_LLAVE"; fi
  date -Is > /var/lib/tolatino/recuperada
  log "recuperación: llaves de siempre de vuelta (la llave provisional se borró)"
}
