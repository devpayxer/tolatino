#!/bin/bash
# 8a · Humo de las cuatro cáscaras de Android en el emulador (CI, job cascara-android). Uso: humo-android.sh <carpeta de apk> <carpeta de capturas>
# En modo avión, cada app abre su página local «Sin señal» (server.errorPath) y la que tiene isla la abre sin red; además, en la página y en
# la isla el puente está en el marco principal y NUNCA llega a un marco de otro origen (guardián puenteSoloNuestroOrigen). Mientras el
# sandbox no tenga su dominio con HTTPS (Paquete 8-0), con red las apps también terminan en «Sin señal»: se dice en REVISION. Todo lo que ve
# el WebView se lee por DevTools (solo los builds de pruebas lo permiten). Las apps salen de apps.json (las cuatro, sin lista a mano).
set -euo pipefail
APK="$1"; OUT="$2"; mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"
APPS=$(node -e 'const A=require(process.argv[1]);console.log(A.apps.map(a=>[a.sabor,a.android,a.islas[0]??""].join(":")).join(" "))' "$DIR/../apps.json")
adb wait-for-device
for par in $APPS; do s=${par%%:*}; adb install -r "$APK/$s/debug/app-$s-debug.apk" > /dev/null; done
adb shell cmd connectivity airplane-mode enable || adb shell settings put global airplane_mode_on 1
sleep 3
fallo=0
# El marco de otro origen: "false" o la lista de lo que alcanza. El marco principal: el puente sí, ningún objeto Java abierto a todos.
marco() { # $1 = app, $2 = dónde
  local r; r=$(node "$DIR/cdp.mjs" 9222 eval "$(cat "$DIR/humo/marco-ajeno.js")")
  echo "$1 · $2 · marco ajeno ve el puente: $r"; [ "$r" = '"false"' ] || { echo "✗ $1 ($2): un marco ajeno alcanza el puente"; fallo=1; }
  r=$(node "$DIR/cdp.mjs" 9222 eval "$(cat "$DIR/humo/puente-principal.js")")
  echo "$1 · $2 · marco principal: $r"; [ "$r" = '"{\"puente\":true,\"abiertos\":[]}"' ] || { echo "✗ $1 ($2): el marco principal no tiene el puente o quedó un objeto Java abierto"; fallo=1; }
}
for par in $APPS; do
  IFS=: read -r s id isla <<< "$par"
  adb logcat -c || true
  adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null
  sleep 10
  adb exec-out screencap -p > "$OUT/$s-sin-red.png"
  adb logcat -d -s Capacitor:* TLCascara:* chromium:E AndroidRuntime:E > "$OUT/$s-logcat.txt" 2>&1 || true
  pid=$(adb shell pidof "$id" | tr -d '\r')
  if [ -z "$pid" ]; then echo "✗ $s: la app se cerró"; tail -40 "$OUT/$s-logcat.txt"; fallo=1; continue; fi
  grep -m3 -i "Loading app at\|WebView sin addWebMessageListener" "$OUT/$s-logcat.txt" | sed "s/^/$s · logcat · /" || true
  adb forward --remove-all; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null
  t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · $t"
  echo "$t" | grep -q '"titulo":"Sin señal' || { echo "✗ $s: sin red no abre la página local «Sin señal»"; fallo=1; }
  # El rótulo TLApp de esta app viaja en el user-agent (lo lee el servidor; nunca da permisos).
  node "$DIR/cdp.mjs" 9222 eval "navigator.userAgent" | grep -q "TLApp/" || { echo "✗ $s: sin rótulo TLApp"; fallo=1; }
  marco "$s" "página local"
  if [ -n "$isla" ]; then
    node "$DIR/cdp.mjs" 9222 ir "$isla.html" > /dev/null
    t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · isla · $t"
    adb exec-out screencap -p > "$OUT/$s-isla.png"
    echo "$t" | grep -qi 'sin conexión\|sin señal\|offline' || { echo "✗ $s: la isla $isla no abre sin red"; fallo=1; }
    marco "$s" "isla"
  fi
  adb shell am force-stop "$id"
done
adb shell cmd connectivity airplane-mode disable || true
exit $fallo
