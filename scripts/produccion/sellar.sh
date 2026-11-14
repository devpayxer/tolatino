#!/bin/bash
# 9o · El sobre sellado desde el lado de Claude (fase9-apertura.md §3.3). Nadie copia ni pega: el secreto está en los secretos del entorno (variable con su
# mismo nombre) y sale de aquí cifrado SOLO para la llave pública de una máquina. Nunca imprime un valor.
#   sellar.sh llave ENTORNO MAQUINA [URL_ESTADO]   anota en infra/ENTORNO/sellado/llaves.json la llave pública que la máquina publica en /estado/llave.txt
#                                                  (o la lee de la entrada estándar si no hay URL)
#   sellar.sh sellar ENTORNO MAQUINA NOMBRE        cifra $NOMBRE para esa máquina → infra/ENTORNO/sellado/MAQUINA/NOMBRE.age + su fila en sobres.json
#   sellar.sh todos ENTORNO MAQUINA                sella todo lo de la lista cerrada para esa máquina que esté en el entorno (lo que falte se dice)
#   sellar.sh recuperacion ENTORNO                 crea la llave de recuperación: la pública a sellado/recuperacion.txt y la privada directo al secreto
#                                                  TOLATINO_RECUPERACION_LLAVE del entorno de GitHub «ENTORNO» (gh secret set, por la entrada estándar)
# Después: commit de infra/ENTORNO/sellado/ (solo texto cifrado y llaves públicas; guardianes selladoSoloSuServidor y llavesFueraDelRepo).
set -euo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
LISTA="$RAIZ/infra/comun/secretos.json"
accion="${1:?accion: llave | sellar | todos | recuperacion}"; ENT="${2:?entorno}"
case "$ENT" in pruebas|ensayo|produccion) ;; *) echo "entorno desconocido: $ENT" >&2; exit 2 ;; esac
DIR="${SELLADO_DIR:-$RAIZ/infra/$ENT/sellado}"; mkdir -p "$DIR"
[ -f "$DIR/llaves.json" ] || echo '{}' > "$DIR/llaves.json"
[ -f "$DIR/sobres.json" ] || echo '{}' > "$DIR/sobres.json"
huella() { printf '%s' "$1" | sha256sum | cut -c1-32; }

json_poner() { # json_poner ARCHIVO CLAVE VALOR_JSON (una entrada por línea, ordenadas)
  python3 - "$1" "$2" "$3" <<'PY'
import json, sys
f, k, v = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
d = json.load(open(f)); d[k] = v
cab = {x: d[x] for x in sorted(d) if x.startswith("_")}; resto = {x: d[x] for x in sorted(d) if not x.startswith("_")}
lineas = [f"  {json.dumps(x, ensure_ascii=False)}: {json.dumps(y, ensure_ascii=False)}" for x, y in {**cab, **resto}.items()]
open(f, "w").write("{\n" + ",\n".join(lineas) + "\n}\n")
PY
}

case "$accion" in
  llave)
    M="${3:?máquina}"; [[ "$M" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || { echo "máquina inválida" >&2; exit 2; }
    if [ -n "${4:-}" ]; then texto=$(curl -fsS -m 20 "$4/llave.txt"); else texto=$(cat); fi
    pub=$(printf '%s' "$texto" | grep -Eo 'age1[0-9a-z]{58}' | head -1)
    [ -n "$pub" ] || { echo "no encontré una llave pública age" >&2; exit 1; }
    publicada=$(printf '%s' "$texto" | sed -n 's/^huella //p')
    [ -z "$publicada" ] || [ "$publicada" = "$(huella "$pub")" ] || { echo "la huella publicada no es la de la llave" >&2; exit 1; }
    json_poner "$DIR/llaves.json" "$M" "\"$pub\""
    echo "✓ llave de «$M» ($ENT): huella $(huella "$pub")" ;;
  sellar|todos)
    M="${3:?máquina}"
    pub=$(grep -Eo "\"$M\": *\"age1[0-9a-z]{58}\"" "$DIR/llaves.json" | grep -Eo 'age1[0-9a-z]{58}' || true)
    [ -n "$pub" ] || { echo "no hay llave pública de «$M» en $DIR/llaves.json (sellar.sh llave primero)" >&2; exit 1; }
    if [ "$accion" = todos ]; then
      if [ "$ENT" = pruebas ]; then nombres=$(grep -E '"origen": "sellado"' "$LISTA" | grep -Eo '^  "[A-Z][A-Z0-9_]+"' | tr -d ' "')
      else nombres=$(grep -E '"origen": "sellado"' "$LISTA" | grep -E "\"maquina\": \"[^\"]*\\b$M\\b" | grep -Eo '^  "[A-Z][A-Z0-9_]+"' | tr -d ' "'); fi
    else nombres="${4:?nombre}"; fi
    hechos=0; faltan=""
    for N in $nombres; do
      grep -Eq "^  \"$N\": \{[^}]*\"origen\": \"sellado\"" "$LISTA" || { echo "✗ $N no está en la lista cerrada con origen «sellado» (infra/comun/secretos.json)" >&2; exit 1; }
      # En el sandbox hay una sola máquina («sandbox»): todo lo sellado es para ella.
      [ "$ENT" = pruebas ] || grep -Eq "^  \"$N\": \{[^}]*\"maquina\": \"[^\"]*\\b$M\\b" "$LISTA" || { echo "✗ $N no es para la máquina «$M» (secretos.json)" >&2; exit 1; }
      if [ -z "${!N:-}" ]; then faltan+=" $N"; continue; fi
      mkdir -p "$DIR/$M"
      printf '%s' "${!N}" | age -r "$pub" -o "$DIR/$M/$N.age"
      json_poner "$DIR/sobres.json" "$M/$N" "{\"para\": \"$(huella "$pub")\", \"sellado\": \"$(date -u +%F)\", \"origen\": \"secretos del entorno de Claude Code\"}"
      hechos=$((hechos + 1))
    done
    echo "✓ $hechos sobres para «$M» ($ENT)${faltan:+ · no están en el entorno:$faltan}" ;;
  recuperacion)
    tmp=$(mktemp); trap 'shred -u "$tmp" 2>/dev/null || rm -f "$tmp"' EXIT
    age-keygen -o "$tmp" 2>/dev/null
    pub=$(age-keygen -y "$tmp")
    if [ "${SELLAR_SIN_GITHUB:-0}" != 1 ]; then
      grep '^AGE-SECRET-KEY-' "$tmp" | gh secret set TOLATINO_RECUPERACION_LLAVE --env "$ENT" >/dev/null
    fi
    { echo "# 9o · La llave PÚBLICA de recuperación de «$ENT» (age). Su privada vive SOLO en el secreto TOLATINO_RECUPERACION_LLAVE del entorno de GitHub «$ENT»"
      echo "# (lo usa el flujo que reconstruye una máquina). Creada el $(date -u +%F). Huella $(huella "$pub")."
      echo "$pub"; } > "$DIR/recuperacion.txt"
    echo "✓ llave de recuperación de «$ENT»: huella $(huella "$pub")" ;;
  *) echo "acción desconocida: $accion" >&2; exit 2 ;;
esac
