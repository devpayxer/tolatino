#!/bin/bash
# 8a · Humo de las cuatro cáscaras de iOS en el simulador (CI, job cascara-ios). Uso: humo-ios.sh <carpeta de .app> <carpeta de capturas>
# Cada app se instala, abre y sigue viva; se guarda la captura (sin el dominio con HTTPS todavía —Paquete 8-0— muestra su página local
# «Sin señal»). Lo que la app escribe (Capacitor dice qué carga y qué plugins registra) queda en <capturas>/<app>.out|.err; si la app se
# cierra, se imprime con el registro del simulador y el informe de cierre, para saber por qué. El XCUITest con modo avión y la isla queda
# para cuando haya dominio (LAUNCH-CHECKLIST).
set -euo pipefail
APPS="$1"; mkdir -p "$2"; OUT="$(cd "$2" && pwd)"
DEV=$(xcrun simctl list devices available -j | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).devices;for(const k of Object.keys(j).sort().reverse()){const d=j[k].find(x=>/iPhone/.test(x.name));if(d){console.log(d.udid);return}}process.exit(1)})')
xcrun simctl boot "$DEV" || true
xcrun simctl bootstatus "$DEV" -b > /dev/null
INFORMES="$HOME/Library/Logs/DiagnosticReports"
fallo=0
for par in ToLatino:com.tolatino.app ToLatinoNegocios:com.tolatino.negocios ToLatinoRepartidor:com.tolatino.repartidor ToLatinoPuerta:com.tolatino.puerta; do
  IFS=: read -r t id <<< "$par"
  xcrun simctl install "$DEV" "$APPS/$t.app"
  desde=$(date '+%Y-%m-%d %H:%M:%S')
  l=$(xcrun simctl launch --terminate-running-process --stdout="$OUT/$t.out" --stderr="$OUT/$t.err" "$DEV" "$id")
  pid=${l##*: }
  sleep 12
  xcrun simctl io "$DEV" screenshot "$OUT/$t.png" > /dev/null
  if xcrun simctl spawn "$DEV" launchctl list | grep -q "UIKitApplication:$id" && kill -0 "$pid" 2> /dev/null; then
    echo "✓ $t abre y sigue viva (pid $pid)"
    grep -m4 "Loading app at\|ERROR\|Error registering" "$OUT/$t.out" "$OUT/$t.err" 2> /dev/null | sed "s/^/  $t · /" || true
  else
    echo "✗ $t: la app se cerró (pid $pid)"; fallo=1
    echo "── $t · lo que escribió la app (stdout y stderr) ──"; tail -60 "$OUT/$t.out" "$OUT/$t.err" 2> /dev/null || true
    echo "── $t · registro del simulador ──"
    xcrun simctl spawn "$DEV" log show --style compact --start "$desde" \
      --predicate "process == \"$t\" OR (eventMessage CONTAINS \"$id\" AND (process == \"SpringBoard\" OR process == \"runningboardd\"))" 2> /dev/null \
      | grep -v "^Timestamp" | tail -80 > "$OUT/$t-registro.txt" || true
    grep -i "exception\|terminat\|fatal\|crash\|abort\|error\|⚡️" "$OUT/$t-registro.txt" | tail -40 || tail -40 "$OUT/$t-registro.txt"
    echo "── $t · informe de cierre ──"
    inf=$(ls -t "$INFORMES"/"$t"*.ips 2> /dev/null | head -1 || true)
    if [ -n "$inf" ]; then cp "$inf" "$OUT/"; grep -m12 '"exception"\|"type"\|"signal"\|"reason"\|"asi"\|"crashed"' "$inf" || head -c 3000 "$inf"; else echo "(sin informe en $INFORMES)"; fi
  fi
  xcrun simctl terminate "$DEV" "$id" 2> /dev/null || true
done
exit $fallo
