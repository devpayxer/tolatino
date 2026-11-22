#!/bin/bash
# 22 nov · Pruebas de huella_imagen (infra/comun/lib.sh), con la que deploy.sh decide si la imagen de la app se vuelve a construir: la huella cambia con
# CUALQUIER cambio en lo que entra en la imagen (y con la receta o el .dockerignore) y NO cambia con lo que no entra (docs/ayuda, pruebas/, infra/);
# ante la duda (algo sin versionar o cambiado a mano dentro de esas rutas, sin .dockerignore) no hay huella y se construye. Un repo de mentira en una
# carpeta, con el .dockerignore, el Dockerfile y el .gitignore de verdad. lib.sh se carga como en deploy.sh (set -euo pipefail).
# Uso: bash pruebas/infra/huella-imagen.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
cd "$T" || exit 1
git init -q
G() { git -c user.email=t@t -c user.name=t -c commit.gpgsign=false "$@"; }
mkdir -p infra/pruebas apps/web/lib packages/ui/src apps/mobile/tiendas/privacidad packages/db scripts/ayuda docs/ayuda pruebas
cp "$RAIZ/.dockerignore" .dockerignore; cp "$RAIZ/infra/pruebas/Dockerfile" infra/pruebas/Dockerfile
for f in $(sed -n 's/^!//p' .dockerignore); do case "$f" in apps/web|packages/ui) ;; *) echo "$f" > "$f" ;; esac; done
mkdir -p apps/web/public; echo r > apps/web/public/r.txt; echo a > apps/web/lib/a.ts; echo u > packages/ui/src/u.tsx; echo d > docs/ayuda/x.md; echo p > pruebas/p.cjs; echo s > infra/pruebas/deploy.sh
echo '/// <reference types="next" />' > apps/web/next-env.d.ts
# El .gitignore de verdad (en el servidor no hay .git/info/exclude: apps/web/public/medios/ sale como «??»).
cp "$RAIZ/.gitignore" .gitignore
G add -A; G commit -qm uno
h() { bash -c 'set -euo pipefail; . "$1/infra/comun/lib.sh"; huella_imagen' _ "$RAIZ"; }
bien=0; total=0
ok() { total=$((total + 1)); if [ "$2" = "$3" ]; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1: «$2» (esperaba «$3»)"; fi; }
distinta() { [ -n "$1" ] && [ -n "$2" ] && [ "$1" != "$2" ] && echo distinta || echo "igual o vacía"; }
echo "huella de la imagen:"
H0=$(h)
ok "hay huella (32 hex)" "$(echo "$H0" | grep -cE '^[0-9a-f]{32}$')" 1
ok "la misma, otra vez" "$(h)" "$H0"
echo y > docs/ayuda/x.md; echo q > pruebas/p.cjs; echo t > infra/pruebas/deploy.sh; G commit -qam fuera
ok "un commit de docs/ayuda, pruebas/ e infra/ (fuera de la imagen): la misma" "$(h)" "$H0"
mkdir -p apps/web/node_modules/x apps/web/.next apps/web/public/medios; echo n > apps/web/node_modules/x/n; echo n > apps/web/.next/n; echo n > apps/web/tsconfig.tsbuildinfo; echo n > apps/web/public/medios/f.jpg
ok "node_modules, .next, *.tsbuildinfo y fotos locales (no entran): la misma" "$(h)" "$H0"
ok "… las fotos locales salen como «??» con el .gitignore de verdad (y se toleran igual)" "$(git status --porcelain -- apps/web/public/medios)" "?? apps/web/public/medios/"
echo '/// otro' >> apps/web/next-env.d.ts
ok "apps/web/next-env.d.ts está versionado: cambiado a mano, sin huella (se construye)" "$(h)" ""
G checkout -q -- apps/web/next-env.d.ts
echo b > apps/web/lib/a.ts; G commit -qam app; H1=$(h)
ok "un cambio en apps/web: otra" "$(distinta "$H0" "$H1")" distinta
echo v > packages/ui/src/u.tsx; G commit -qam ui; H2=$(h)
ok "un cambio en packages/ui: otra" "$(distinta "$H1" "$H2")" distinta
echo w >> docs/LAUNCH-CHECKLIST.md; G commit -qam launch; H3=$(h)
ok "un cambio en docs/LAUNCH-CHECKLIST.md (viaja en la imagen): otra" "$(distinta "$H2" "$H3")" distinta
echo w >> apps/mobile/apps.json; G commit -qam mobile; H4=$(h)
ok "un cambio en apps/mobile/apps.json (lo importa la app): otra" "$(distinta "$H3" "$H4")" distinta
echo '# x' >> infra/pruebas/Dockerfile; G commit -qam receta; H5=$(h)
ok "un cambio en la receta (Dockerfile): otra" "$(distinta "$H4" "$H5")" distinta
echo '# x' >> .dockerignore; G commit -qam ignore; H6=$(h)
ok "un cambio en el .dockerignore: otra" "$(distinta "$H5" "$H6")" distinta
echo c > apps/web/lib/a.ts
ok "un cambio sin commit dentro de la imagen: sin huella (se construye)" "$(h)" ""
G checkout -q -- apps/web/lib/a.ts; echo n > apps/web/lib/nuevo.ts
ok "un archivo sin versionar dentro de la imagen: sin huella (se construye)" "$(h)" ""
rm apps/web/lib/nuevo.ts
ok "limpio otra vez: la de antes" "$(h)" "$H6"
mv .dockerignore /tmp/.di-$$; ok "sin .dockerignore: sin huella (se construye)" "$(h)" ""; mv /tmp/.di-$$ .dockerignore
echo '!scripts/no-existe.mjs' >> .dockerignore; G commit -qam ruta-que-falta
ok "una ruta «!» que no está en el commit: sin huella (se construye)" "$(h)" ""
# Con pipefail y más de 64 KB de «git status» («grep -q» cerraba el tubo y el «if» daba la huella con el árbol sucio).
sed -i '/^!scripts\/no-existe.mjs$/d' .dockerignore
mkdir -p apps/web/lib/muchos; for i in $(seq 1 3100); do echo a > "apps/web/lib/muchos/archivo-con-un-nombre-largo-para-pasar-de-64-kb-$i.ts"; done
G add -A; G commit -qm muchos; HM=$(h)
for i in $(seq 1 3100); do echo b > "apps/web/lib/muchos/archivo-con-un-nombre-largo-para-pasar-de-64-kb-$i.ts"; done
ok "con pipefail, 3.100 archivos cambiados sin commit ($(git status --porcelain | wc -c) bytes de estado): sin huella (se construye)" "$(echo "$HM" | grep -cE '^[0-9a-f]{32}$'):$(h)" "1:"
echo "$bien/$total casos"
[ "$bien" = "$total" ]
