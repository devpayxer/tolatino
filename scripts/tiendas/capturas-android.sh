#!/bin/bash
# 8i · Capturas de la cáscara REAL de Android en el emulador (tiendas.yml, job «capturas»; fase8-apps.md §4 8i). Las cuatro apps compiladas
# contra el servidor del job con la semilla del sandbox (TOLATINO_URL=http://10.0.2.2:3100, solo en el CI; nunca se guarda en el repo). Cada
# app abre su entrada, entra con su cuenta de la semilla por el código del modo pruebas (por DevTools: solo los builds de pruebas lo
# permiten), y para cada pantalla de apps/mobile/tiendas/capturas.json (las de una puerta abierta, no) y cada idioma: adb exec-out screencap.
# Es la prueba de que la cáscara muestra lo mismo; las de la ficha de Google salen de scripts/tiendas/capturas.mjs al mismo tamaño (1080×2400).
# Uso: capturas-android.sh <carpeta de apk> <salida>
set -euo pipefail
APK="$1"; OUT="$2"; mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"; CDP="$DIR/../../apps/mobile/scripts/cdp.mjs"; RAIZ="$DIR/../.."
LISTA=$(node -e '
  const A = require(process.argv[1] + "/apps/mobile/apps.json"), C = require(process.argv[1] + "/apps/mobile/tiendas/capturas.json");
  for (const a of A.apps) console.log([a.key, a.sabor, a.android, C.cuentas[a.key], C.tomas[a.key].filter((t) => !t.ruta.startsWith("@")).map((t) => t.nombre + "=" + t.ruta).join(",")].join(" "));
' "$RAIZ")
adb wait-for-device
fallo=0
while read -r app sabor id tel tomas; do
  adb install -r "$APK/$sabor/debug/app-$sabor-debug.apk" > /dev/null
  adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null
  sleep 12
  pid=$(adb shell pidof "$id" | tr -d '\r' || true)
  [ -n "$pid" ] || { echo "✗ $app: la app se cerró"; fallo=1; continue; }
  adb forward --remove-all; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null
  r=$(node "$CDP" 9222 eval "(async()=>{const h={'content-type':'application/json'};const a=await (await fetch('/api/cuenta/codigo',{method:'POST',headers:h,body:JSON.stringify({telefono:'$tel'})})).json();if(!a.codigoPrueba)return 'sin código';const b=await (await fetch('/api/cuenta/verificar',{method:'POST',headers:h,body:JSON.stringify({telefono:'$tel',codigo:a.codigoPrueba})})).json();return b.ok?'ok':'no entró'})()")
  echo "$app · entrar: $r"; [ "$r" = '"ok"' ] || { fallo=1; continue; }
  for idioma in es en; do
    node "$CDP" 9222 eval "document.cookie='tl_lang=$idioma; path=/; max-age=86400'" > /dev/null
    n=0
    IFS=, read -ra T <<< "$tomas"
    for par in "${T[@]}"; do
      nombre=${par%%=*}; ruta=${par#*=}; n=$((n + 1))
      node "$CDP" 9222 ir "$ruta" > /dev/null
      t=$(node "$CDP" 9222 titulo)
      mkdir -p "$OUT/$app/$idioma"
      adb exec-out screencap -p > "$OUT/$app/$idioma/$n-$nombre.png"
      if grep -q '"url":"[^"]*/\(entrar\|app/\)' <<< "$t"; then echo "✗ $app $idioma $nombre: terminó en $(grep -o '"url":"[^"]*"' <<< "$t")"; fallo=1; else echo "✓ $app $idioma $n-$nombre"; fi
    done
  done
  adb shell am force-stop "$id" || true
done <<< "$LISTA"
exit $fallo
