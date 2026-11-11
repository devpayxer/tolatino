#!/bin/bash
# 8a · Humo de las cuatro cáscaras de Android en el emulador (CI, job cascara-android). Uso: humo-android.sh <carpeta de apk> <carpeta de capturas>
# En modo avión, cada app abre su página local «Sin señal» (server.errorPath) y la que tiene isla la abre sin red; además, la página nunca le
# entrega el puente a un marco de otro origen. Mientras el sandbox no tenga su dominio con HTTPS (Paquete 8-0), con red las apps también
# terminan en «Sin señal»: se dice en REVISION. Todo lo que ve el WebView se lee por DevTools (solo los builds de pruebas lo permiten).
set -euo pipefail
APK="$1"; OUT="$2"; mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"
adb wait-for-device
for s in cliente negocios repartidor puerta; do adb install -r "$APK/$s/debug/app-$s-debug.apk" > /dev/null; done
adb shell cmd connectivity airplane-mode enable || adb shell settings put global airplane_mode_on 1
sleep 3
fallo=0
for par in cliente:com.tolatino.app:/cuenta/boletos/sin-conexion negocios:com.tolatino.negocios: repartidor:com.tolatino.repartidor:/repartidor/sin-conexion puerta:com.tolatino.puerta:/puerta/sin-conexion; do
  IFS=: read -r s id isla <<< "$par"
  adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null
  sleep 10
  adb exec-out screencap -p > "$OUT/$s-sin-red.png"
  pid=$(adb shell pidof "$id" | tr -d '\r')
  if [ -z "$pid" ]; then echo "✗ $s: la app se cerró"; fallo=1; continue; fi
  adb forward --remove-all; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null
  t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · $t"
  echo "$t" | grep -q '"titulo":"Sin señal' || { echo "✗ $s: sin red no abre la página local «Sin señal»"; fallo=1; }
  # El rótulo TLApp de esta app viaja en el user-agent (lo lee el servidor; nunca da permisos).
  node "$DIR/cdp.mjs" 9222 eval "navigator.userAgent" | grep -q "TLApp/" || { echo "✗ $s: sin rótulo TLApp"; fallo=1; }
  # Un marco de otro origen no recibe el puente.
  r=$(node "$DIR/cdp.mjs" 9222 eval "new Promise((ok)=>{const f=document.createElement('iframe');f.srcdoc='<script>parent.postMessage(String(!!(window.Capacitor||window.androidBridge)),\"*\")<\/script>';f.sandbox='allow-scripts';addEventListener('message',(e)=>ok(e.data),{once:true});document.body.appendChild(f);setTimeout(()=>ok('sin respuesta'),3000)})")
  echo "$s · marco ajeno ve el puente: $r"; [ "$r" = '"false"' ] || { echo "✗ $s: un marco ajeno alcanza el puente"; fallo=1; }
  if [ -n "$isla" ]; then
    node "$DIR/cdp.mjs" 9222 ir "$isla.html" > /dev/null
    t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · isla · $t"
    adb exec-out screencap -p > "$OUT/$s-isla.png"
    echo "$t" | grep -qi 'sin conexión\|sin señal\|offline' || { echo "✗ $s: la isla $isla no abre sin red"; fallo=1; }
  fi
  adb shell am force-stop "$id"
done
adb shell cmd connectivity airplane-mode disable || true
exit $fallo
