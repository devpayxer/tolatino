#!/bin/bash
# 22 nov · Lo que de verdad entra en el contexto de la imagen de la app, listado por BuildKit (no por una imitación de sus reglas): con el .dockerignore de
# lista blanca, el contexto tiene que ser EXACTAMENTE los archivos de las rutas «!» (sin node_modules, .next, .turbo, *.tsbuildinfo, .env, fotos locales),
# y tiene que traer lo que el build lee de fuera de apps/web y packages/ui (guardián imagenSoloLoQueUsa). Construye solo una imagen de listado (sin red,
# sin instalar nada) y la tira. Necesita docker; en el CI tiene que correr.
# Uso: bash pruebas/infra/contexto-imagen.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd); cd "$RAIZ" || exit 1
if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
  if [ "${CI:-}" = true ]; then echo "✗ contexto de la imagen: en el CI tiene que correr y falta docker"; exit 1; fi
  echo "· contexto de la imagen: docker no está (no corrió)"; exit 0
fi
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
printf 'FROM node:22-alpine AS l\nCOPY . /c\nRUN cd /c && find . \\( -type f -o -type l \\) | sed "s|^\\./||" | LC_ALL=C sort > /lista.txt\nFROM scratch\nCOPY --from=l /lista.txt /\n' > "$T/Dockerfile"
if ! DOCKER_BUILDKIT=1 docker build -q -f "$T/Dockerfile" --output "type=local,dest=$T/out" . > "$T/build.log" 2>&1; then
  echo "✗ contexto de la imagen: no se pudo listar con BuildKit"; tail -5 "$T/build.log"; exit 1
fi
mapfile -t RUTAS < <(sed -n 's/^!//p' .dockerignore)
{ git ls-files -z -- "${RUTAS[@]}"; git ls-files -z --others --exclude-standard -- "${RUTAS[@]}"; } | tr '\0' '\n' \
  | grep -vE '(^|/)(node_modules|\.next|\.turbo)/|\.tsbuildinfo$|(^|/)\.env(\.[^/]*)?$|^apps/web/public/medios/' | LC_ALL=C sort -u > "$T/espera.txt"
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
echo "contexto de la imagen (BuildKit):"
ok "lo que entra es exactamente lo de las rutas «!» del .dockerignore" "$(diff "$T/espera.txt" "$T/out/lista.txt" | grep -c '^[<>]')" 0
diff "$T/espera.txt" "$T/out/lista.txt" | grep '^[<>]' | head -10 | sed 's/^/      /'
for f in apps/web/package.json packages/ui/package.json tsconfig.base.json pnpm-lock.yaml apps/mobile/apps.json packages/db/mapa-de-datos.json scripts/ayuda/forma.mjs \
         scripts/mapas-privados.mjs docs/LAUNCH-CHECKLIST.md; do
  ok "entra $f" "$(grep -cxF "$f" "$T/out/lista.txt")" 1
done
ok "no entran node_modules, .next ni .git" "$(grep -cE '(^|/)(node_modules|\.next|\.git)/' "$T/out/lista.txt")" 0
ok "no entra nada de infra/, pruebas/, guardianes/, .github/ ni el resto de docs/" "$(grep -E '^(infra|pruebas|guardianes|services|\.github|docs)/' "$T/out/lista.txt" | grep -cvxF docs/LAUNCH-CHECKLIST.md)" 0
echo "  ($(wc -l < "$T/out/lista.txt") archivos, $(tr '\n' '\0' < "$T/out/lista.txt" | du -sk --apparent-size --files0-from=- 2>/dev/null | awk '{s+=$1} END {printf "%.1f MB", s/1024}'))"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
