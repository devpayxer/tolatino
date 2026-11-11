#!/bin/bash
# Pruebas al revés de senalHonesta y permisosMinimos: se rompe, se ve fallar, se restaura. Corre desde la raíz del repo (9a: se mueve sola).
cd "$(dirname "$0")/../.." || exit 9
B="${PRUEBAS_SALIDA:-${TMPDIR:-/tmp}/tolatino-pruebas}/alreves-respaldo"
ok=0; mal=0
caso() { # $1 = nombre, $2 = archivo, $3 = expresión de perl, $4 = guardián
  mkdir -p "$B" || exit 9; cp "$2" "$B/x" || exit 9
  perl -0pi -e "$3" "$2"
  if cmp -s "$2" "$B/x"; then echo "?? $1: la rotura no cambió nada"; mal=$((mal+1)); return; fi
  out=$(node guardianes/run.mjs --solo "$4" 2>&1); r=$?
  cp "$B/x" "$2" || { echo "RESTAURAR FALLÓ $2"; exit 9; }
  if [ $r -ne 0 ]; then echo "✓ $1 → falla: $(grep '^\s*\[' <<< "$out" | head -1 | sed 's/^ *//')"; ok=$((ok+1)); else echo "✗ $1 → NO falla"; mal=$((mal+1)); fi
}
caso "isla del Repartidor lee navigator.onLine" apps/web/app/repartidor/sin-conexion/SinSenalRep.tsx 's/const linea = useSenal\(\) === true;/const linea = navigator.onLine;/' senalHonesta
caso "pantalla escucha online por su cuenta" apps/web/app/repartidor/Repartidor.tsx 's/const quitar = alCambiarRed\(\(r\) => \{ if \(r\) on\(\); \}\);/window.addEventListener("online", on); const quitar = () => undefined;/' senalHonesta
caso "window.ononline en la Puerta" "apps/web/app/(puerta)/puerta/Puerta.tsx" 's/const enLinea = useRef\(true\);/const enLinea = useRef(true); if (typeof window !== "undefined") window.ononline = () => undefined;/' senalHonesta
caso "isla de la Puerta sin la prueba al servidor" "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts" 's/haySenal\(\)/Promise.resolve(true)/g' senalHonesta
caso "post desde la isla al origen local" "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts" 's/  if \(enIsla\(\)\) return null;[^\n]*\n//' senalHonesta
caso "haySenal sin tiempo límite" apps/web/lib/nativo/senal.ts 's/, signal: ab\.signal//' senalHonesta
caso "sin setNetworkAvailable" apps/mobile/android/app/src/main/java/com/tolatino/cascara/RedWebView.java 's/web\.setNetworkAvailable\(hay\);/\/\/ nada/' senalHonesta
caso "sin registrar el escucha" apps/mobile/android/app/src/main/java/com/tolatino/cascara/RedWebView.java 's/cm\.registerDefaultNetworkCallback\(escucha, new Handler\(Looper\.getMainLooper\(\)\)\);//' senalHonesta
caso "sin soltar el escucha" apps/mobile/android/app/src/main/java/com/tolatino/cascara/RedWebView.java 's/cm\.unregisterNetworkCallback\(escucha\);//' senalHonesta
caso "MainActivity no para RedWebView" apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java 's/if \(red != null\) red\.parar\(\);//' senalHonesta
caso "MainActivity no empieza RedWebView" apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java 's/red\.empezar\(\);//' senalHonesta
caso "sin el permiso en apps.json" apps/mobile/apps.json 's/"androidComun": \["android\.permission\.ACCESS_NETWORK_STATE"\]/"androidComun": []/' senalHonesta
caso "sin el permiso en un manifiesto" apps/mobile/android/app/src/repartidor/AndroidManifest.xml 's/    <uses-permission android:name="android\.permission\.ACCESS_NETWORK_STATE" \/>\n//' senalHonesta
caso "humo sin la comprobación de Hay señal" apps/mobile/scripts/humo-android.sh 's/Hay señal\\\|There is signal/Hay senal/g' senalHonesta
caso "permiso peligroso en androidComun" apps/mobile/apps.json 's/"android\.permission\.ACCESS_NETWORK_STATE"\]/"android.permission.ACCESS_NETWORK_STATE", "android.permission.READ_PHONE_STATE"]/' permisosMinimos
caso "manifiesto con permiso de red sin apps.json" apps/mobile/apps.json 's/"androidComun": \["android\.permission\.ACCESS_NETWORK_STATE"\]/"androidComun": []/' permisosMinimos
echo "al revés: $ok fallan como deben, $mal no"
[ "$mal" -eq 0 ]
