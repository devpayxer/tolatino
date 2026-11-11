#!/bin/bash
# 8a · Humo de las cuatro cáscaras de Android en el emulador (CI, job cascara-android). Uso: humo-android.sh <carpeta de apk> <carpeta de capturas>
# En modo avión, cada app abre su página local «Sin señal» (server.errorPath) y la que tiene isla la abre sin red; además, en la página y en
# la isla el puente está en el marco principal y NUNCA llega a un marco de otro origen (guardián puenteSoloNuestroOrigen). Mientras el
# sandbox no tenga su dominio con HTTPS (Paquete 8-0), con red las apps también terminan en «Sin señal»: se dice en REVISION. Todo lo que ve
# el WebView se lee por DevTools (solo los builds de pruebas lo permiten). Las apps salen de apps.json (las cuatro, sin lista a mano).
# La red (guardián senalHonesta): en modo avión la página sabe que no hay red (navigator.onLine false: la cáscara se la cuenta a la WebView),
# la isla del Repartidor y la de la Puerta dicen «sin señal» y nunca «Hay señal» (11 nov: la del Repartidor lo decía), y el cambio llega en
# vivo: sin modo avión, online; con modo avión otra vez, offline.
# 8e · La ruta del Repartidor (ruta_repartidor, al final): con el simulador del servidor (humo/ruta-sim.mjs en la máquina del emulador, 10.0.2.2)
# y una ruta GPS por N Wyoming St (adb emu geo fix): TLRuta.empezar arranca el servicio en primer plano de tipo «location» con el aviso fijo,
# las posiciones llegan con el token de la entrega; con la pantalla apagada siguen llegando; en modo avión se guardan y suben juntas al volver;
# cuando el servidor dice que la entrega terminó (410) el servicio se detiene solo; detener() también lo detiene. Nunca pide «siempre».
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
# 8d · TLLlave (llaves de acceso con Credential Manager): está en la app, carga, y mientras apps.json diga `llaves.activas: false` (antes del
# dominio, 8b) responde que NO se ofrece y rechaza cualquier pedido sin abrir ningún diálogo del sistema (nunca un botón roto).
llave() { # $1 = app
  local r; r=$(node "$DIR/cdp.mjs" 9222 eval "$(cat "$DIR/humo/llave.js")")
  echo "$1 · TLLlave: $r"
  [ "$r" = '"{\"plugin\":true,\"disponible\":{\"entrar\":false,\"plataforma\":false},\"obtener\":\"opciones\"}"' ] || { echo "✗ $1: TLLlave no está, no carga o responde algo distinto de «apagada» ($r)"; fallo=1; }
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
  llave "$s"
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

# ── 8e · La ruta del Repartidor ──
ruta_repartidor() {
  local id r t c0 c1 i SIMPID
  id=$(node -e 'const A=require(process.argv[1]);const a=A.apps.find(x=>x.plugins.includes("TLRuta"));console.log(a?a.android:"")' "$DIR/../apps.json")
  [ -n "$id" ] || { echo "✗ ruta: ninguna app trae TLRuta"; fallo=1; return; }
  node "$DIR/humo/ruta-sim.mjs" 4510 > "$OUT/ruta-sim.log" 2>&1 & SIMPID=$!
  sim() { curl -s "http://127.0.0.1:4510/$1" || echo '{}'; }
  cuenta() { sim __estado | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).posiciones??0)}catch{console.log(0)}})' || echo 0; }
  servicio() { adb shell dumpsys activity services "$id" 2> /dev/null | tr -d '\r' > "$OUT/ruta-servicios.txt" || true; grep -q "TLRutaServicio" "$OUT/ruta-servicios.txt"; }
  geo() { adb emu geo fix "$2" "$1" > /dev/null; } # lat lng (adb pide longitud primero)
  for p in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION POST_NOTIFICATIONS; do adb shell pm grant "$id" "android.permission.$p" 2> /dev/null || true; done
  adb shell dumpsys package "$id" | tr -d '\r' > "$OUT/ruta-paquete.txt" || true
  if grep -q "ACCESS_BACKGROUND_LOCATION" "$OUT/ruta-paquete.txt"; then echo "✗ ruta: la app pide ubicación «siempre»"; fallo=1; fi
  adb shell cmd location set-location-enabled true 2> /dev/null || adb shell settings put secure location_mode 3 || true
  geo 40.95500 -75.97818
  adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null; sleep 10
  local pid; pid=$(adb shell pidof "$id" | tr -d '\r' || true)
  [ -n "$pid" ] || { echo "✗ ruta: la app se cerró"; fallo=1; kill $SIMPID 2> /dev/null || true; return; }
  adb forward --remove-all; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null
  t=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))')
  r=$(node "$DIR/cdp.mjs" 9222 eval "Capacitor.nativePromise('TLRuta','empezar',{token:'$t',entrega:'4242',negocio:'Sabor de prueba',cadaS:5,minM:5,idioma:'es',servidorPrueba:'http://10.0.2.2:4510'}).then((x)=>JSON.stringify(x)).catch((e)=>'error '+e.message)")
  echo "ruta · empezar: $r"; grep -q '\\"estado\\":\\"ok\\"' <<< "$r" || { echo "✗ ruta: TLRuta.empezar no dijo ok"; fallo=1; }
  sleep 3
  # dumpsys (API 34): «isForeground=true foregroundId=7301 types=00000008 …» (8 = FOREGROUND_SERVICE_TYPE_LOCATION, y nada más).
  if servicio && grep -Eq "isForeground=true foregroundId=7301 types=(0x)?0*8( |$)" "$OUT/ruta-servicios.txt"; then echo "ruta · servicio en primer plano de tipo ubicación (types=8): sí"
  else echo "✗ ruta: no corre el servicio en primer plano de tipo «location»"; head -60 "$OUT/ruta-servicios.txt"; fallo=1; fi
  adb shell dumpsys notification --noredact 2> /dev/null | tr -d '\r' > "$OUT/ruta-avisos.txt" || true
  grep -q "Sharing your location with Sabor de prueba and the customer · Delivery #4242\|Compartiendo tu ubicación con Sabor de prueba y el cliente · Entrega #4242" "$OUT/ruta-avisos.txt" \
    && echo "ruta · aviso fijo: sí" || { echo "✗ ruta: falta el aviso fijo «Compartiendo tu ubicación…»"; grep -i "tolatino\|ubicaci\|location" "$OUT/ruta-avisos.txt" | head -10; fallo=1; }
  # La ruta (cada paso ~26 m; el teléfono anota cada 5 s o 5 m).
  for i in $(seq 1 10); do geo "$(node -e "console.log((40.955+$i*0.00024).toFixed(6))")" -75.97818; sleep 2; done
  sleep 6; c0=$(cuenta); echo "ruta · posiciones recibidas: $c0"
  [ "${c0:-0}" -ge 3 ] || { echo "✗ ruta: el servidor no recibió las posiciones"; fallo=1; }
  r=$(sim __estado); echo "ruta · simulador: $r"
  grep -q '"fuente":"app"' <<< "$r" || { echo "✗ ruta: el lote no dice fuente app"; fallo=1; }
  grep -q '"sinToken":0' <<< "$r" || { echo "✗ ruta: llegó una llamada sin el token"; fallo=1; }
  adb exec-out screencap -p > "$OUT/repartidor-ruta.png"
  # Pantalla apagada: sigue.
  adb shell input keyevent KEYCODE_SLEEP; sleep 2
  for i in $(seq 11 16); do geo "$(node -e "console.log((40.955+$i*0.00024).toFixed(6))")" -75.97818; sleep 2; done
  sleep 6; c1=$(cuenta); echo "ruta · con la pantalla apagada: $c0 → $c1"
  [ "${c1:-0}" -gt "${c0:-0}" ] || { echo "✗ ruta: con la pantalla apagada dejó de mandar"; fallo=1; }
  adb shell input keyevent KEYCODE_WAKEUP
  # Modo avión: se guardan y suben juntas al volver.
  adb shell cmd connectivity airplane-mode enable || adb shell settings put global airplane_mode_on 1
  sleep 4; c0=$(cuenta)
  for i in $(seq 17 24); do geo "$(node -e "console.log((40.955+$i*0.00024).toFixed(6))")" -75.97818; sleep 2; done
  c1=$(cuenta); echo "ruta · en modo avión: $c0 → $c1 (no debe subir)"
  [ "$c1" = "$c0" ] || echo "  (aviso: llegaron posiciones en modo avión; el emulador pudo tardar en cortar la red)"
  r=$(node "$DIR/cdp.mjs" 9222 eval "Capacitor.nativePromise('TLRuta','estado',{}).then((x)=>JSON.stringify(x))")
  echo "ruta · estado sin señal: $r"; grep -q 'pendientes\\":[1-9]' <<< "$r" || { echo "✗ ruta: sin señal no guardó las posiciones en la cola"; fallo=1; }
  adb shell cmd connectivity airplane-mode disable || adb shell settings put global airplane_mode_on 0
  for i in $(seq 1 40); do sleep 1; c1=$(cuenta); [ "$c1" -gt "$c0" ] && break; done
  echo "ruta · al volver la señal: $c0 → $c1"; [ "$c1" -gt "$c0" ] || { echo "✗ ruta: al volver la señal no subió lo guardado"; fallo=1; }
  sim __estado | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s);console.log("ruta · lotes: "+e.lotes.join(","));process.exit(e.lotes.some(n=>n>1)?0:1)})' \
    || { echo "✗ ruta: lo guardado sin señal no subió en lote"; fallo=1; }
  # El servidor dice que la entrega terminó: el servicio se detiene solo.
  sim __fin > /dev/null
  for i in $(seq 25 30); do geo "$(node -e "console.log((40.955+$i*0.00024).toFixed(6))")" -75.97818; sleep 2; done
  for i in $(seq 1 30); do sleep 1; servicio || break; done
  if servicio; then echo "✗ ruta: con 410 del servidor el servicio sigue"; fallo=1; else echo "ruta · 410 del servidor → el servicio se detuvo solo"; fi
  adb shell dumpsys notification --noredact 2> /dev/null | tr -d '\r' > "$OUT/ruta-avisos-fin.txt" || true
  if grep -q "Delivery #4242\|Entrega #4242" "$OUT/ruta-avisos-fin.txt"; then echo "✗ ruta: el aviso fijo quedó después de terminar"; fallo=1; fi
  # detener() desde la página también lo detiene.
  sim __sigue > /dev/null
  t=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))')
  node "$DIR/cdp.mjs" 9222 eval "Capacitor.nativePromise('TLRuta','empezar',{token:'$t',entrega:'4243',negocio:'Sabor de prueba',cadaS:5,minM:5,idioma:'es',servidorPrueba:'http://10.0.2.2:4510'}).then(()=>'ok')" > /dev/null
  sleep 3; servicio || { echo "✗ ruta: no volvió a empezar"; fallo=1; }
  node "$DIR/cdp.mjs" 9222 eval "Capacitor.nativePromise('TLRuta','detener',{}).then(()=>'ok')" > /dev/null; sleep 3
  if servicio; then echo "✗ ruta: detener() no detuvo el servicio"; fallo=1; else echo "ruta · detener() → el servicio se detuvo"; fi
  # Una dirección que mande la página no cambia el destino (sin servidorPrueba depurable: el servidor de la cáscara).
  adb shell am force-stop "$id"; kill $SIMPID 2> /dev/null || true
}
ruta_repartidor
exit $fallo
