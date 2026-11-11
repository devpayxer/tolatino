#!/bin/bash
# 8a · Humo de las cuatro cáscaras de Android en el emulador (CI, job cascara-android). Uso: humo-android.sh <carpeta de apk> <carpeta de capturas>
# En modo avión, cada app abre su página local «Sin señal» (server.errorPath) y la que tiene isla la abre sin red; además, en la página y en
# la isla el puente está en el marco principal y NUNCA llega a un marco de otro origen (guardián puenteSoloNuestroOrigen). Mientras el
# sandbox no tenga su dominio con HTTPS (Paquete 8-0), con red las apps también terminan en «Sin señal»: se dice en REVISION. Todo lo que ve
# el WebView se lee por DevTools (solo los builds de pruebas lo permiten). Las apps salen de apps.json (las cuatro, sin lista a mano).
# La red (guardián senalHonesta): en modo avión la página sabe que no hay red (navigator.onLine false: la cáscara se la cuenta a la WebView),
# la isla del Repartidor y la de la Puerta dicen «sin señal» y nunca «Hay señal» (11 nov: la del Repartidor lo decía), y el cambio llega en
# vivo: sin modo avión, online; con modo avión otra vez, offline.
set -euo pipefail
APK="$1"; OUT="$2"; mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"
APPS=$(node -e 'const A=require(process.argv[1]);console.log(A.apps.map(a=>[a.sabor,a.android,a.islas[0]??"",a.plugins.includes("TLLocal")].join(":")).join(" "))' "$DIR/../apps.json")
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
# Una página del origen local funciona sin red: hidratada y, si la app trae TLLocal, con el almacén del teléfono.
origen_local() { # $1 = app, $2 = dónde
  local r; r=$(node "$DIR/cdp.mjs" 9222 eval "$(cat "$DIR/humo/local.js")")
  echo "$1 · $2 · origen local: $r"
  [ "$r" = "\"{\\\"hidratada\\\":true,\\\"tllocal\\\":$tllocal}\"" ] || { echo "✗ $1 ($2): la página local no se hidrató o no tiene el almacén del teléfono (TLLocal: $tllocal)"; fallo=1; }
}
# Lo que la página cree de la red (la cáscara se lo cuenta a la WebView; RedWebView). $1 = app, $2 = dónde, $3 = lo esperado (true | false).
red_pagina() {
  local r; r=$(node "$DIR/cdp.mjs" 9222 eval "navigator.onLine")
  echo "$1 · $2 · navigator.onLine: $r"
  [ "$r" = "$3" ] || { echo "✗ $1 ($2): la página cree navigator.onLine=$r y debía ser $3 (la cáscara no le cuenta la red a la WebView)"; fallo=1; }
}
# Avión fuera → la página lo sabe (online); avión otra vez → offline. Se espera hasta 30 s a que el emulador cambie de red.
red_en_vivo() { # $1 = app, $2 = dónde
  local r="" i
  node "$DIR/cdp.mjs" 9222 eval "window.__tlRed=[];addEventListener('online',()=>__tlRed.push('online'));addEventListener('offline',()=>__tlRed.push('offline'));true" > /dev/null
  adb shell cmd connectivity airplane-mode disable || adb shell settings put global airplane_mode_on 0
  for i in $(seq 1 30); do sleep 1; r=$(node "$DIR/cdp.mjs" 9222 eval "navigator.onLine"); [ "$r" = "true" ] && break; done
  echo "$1 · $2 · sin modo avión ($i s) · navigator.onLine: $r"
  [ "$r" = "true" ] || { echo "✗ $1 ($2): con red la página sigue creyendo que no hay (el cambio no llega a la WebView)"; fallo=1; }
  adb shell cmd connectivity airplane-mode enable || adb shell settings put global airplane_mode_on 1
  for i in $(seq 1 30); do sleep 1; r=$(node "$DIR/cdp.mjs" 9222 eval "navigator.onLine"); [ "$r" = "false" ] && break; done
  echo "$1 · $2 · modo avión otra vez ($i s) · navigator.onLine: $r"
  [ "$r" = "false" ] || { echo "✗ $1 ($2): en modo avión otra vez la página cree tener red"; fallo=1; }
  r=$(node "$DIR/cdp.mjs" 9222 eval "__tlRed.includes('online') && __tlRed[__tlRed.length - 1] === 'offline' ? 'ok' : __tlRed.join(',')")
  echo "$1 · $2 · eventos de red: $r"
  [ "$r" = '"ok"' ] || { echo "✗ $1 ($2): la página no recibió online y después offline ($r)"; fallo=1; }
}
for par in $APPS; do
  IFS=: read -r s id isla tllocal <<< "$par"
  adb logcat -c || true
  adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null
  sleep 10
  adb exec-out screencap -p > "$OUT/$s-sin-red.png"
  adb logcat -d -s Capacitor:* Capacitor/Console:* TLCascara:* chromium:E AndroidRuntime:E > "$OUT/$s-logcat.txt" 2>&1 || true
  # Sin «cmd | grep -q» con pipefail (grep -q corta el tubo y el SIGPIPE se lee como fallo): se lee entero y se busca después.
  pid=$(adb shell pidof "$id" | tr -d '\r' || true)
  if [ -z "$pid" ]; then echo "✗ $s: la app se cerró"; tail -40 "$OUT/$s-logcat.txt"; fallo=1; continue; fi
  grep "Loading app at\|TLCascara\|Capacitor/Console.*\(rror\|Uncaught\)\|AndroidRuntime" "$OUT/$s-logcat.txt" | head -12 | sed "s/^/$s · logcat · /" || true
  adb forward --remove-all; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null
  t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · $t"
  grep -q '"titulo":"Sin señal' <<< "$t" || { echo "✗ $s: sin red no abre la página local «Sin señal»"; fallo=1; }
  # El rótulo TLApp de esta app viaja en el user-agent (lo lee el servidor; nunca da permisos).
  ua=$(node "$DIR/cdp.mjs" 9222 eval "navigator.userAgent"); grep -q "TLApp/" <<< "$ua" || { echo "✗ $s: sin rótulo TLApp"; fallo=1; }
  origen_local "$s" "página local"
  red_pagina "$s" "página local" false
  if [ -n "$isla" ]; then grep -q "funciona sin señal\|works offline" <<< "$t" || { echo "✗ $s: «Sin señal» no ofrece la isla de la app"; fallo=1; }; fi
  marco "$s" "página local"
  if [ -n "$isla" ]; then
    node "$DIR/cdp.mjs" 9222 ir "$isla.html" > /dev/null
    t=$(node "$DIR/cdp.mjs" 9222 titulo); echo "$s · isla · $t"
    adb exec-out screencap -p > "$OUT/$s-isla.png"
    grep -q "\"url\":\"https://localhost$isla.html\"" <<< "$t" || { echo "✗ $s: la isla $isla no se abre dentro de la app (sigue en otra página)"; fallo=1; }
    grep -qi 'sin conexión\|sin señal\|offline' <<< "$t" || { echo "✗ $s: la isla $isla no abre sin red"; fallo=1; }
    red_pagina "$s" "isla" false
    # En modo avión la isla nunca dice que hay señal (el emulador está en inglés: los dos idiomas).
    if grep -qi 'Hay señal\|There is signal' <<< "$t"; then echo "✗ $s: en modo avión la isla $isla dice «Hay señal» / \"There is signal\""; fallo=1; fi
    case "$isla" in
      /repartidor/*|/puerta/*) grep -qi 'Sin señal\|No signal' <<< "$t" || { echo "✗ $s: en modo avión la isla $isla no dice «Sin señal» / \"No signal\""; fallo=1; } ;;
    esac
    origen_local "$s" "isla"
    marco "$s" "isla"
  fi
  if [ -n "$isla" ]; then red_en_vivo "$s" "isla"; else red_en_vivo "$s" "página local"; fi
  adb shell am force-stop "$id"
done
adb shell cmd connectivity airplane-mode disable || true
exit $fallo
