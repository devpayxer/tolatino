#!/bin/bash
# 8a · Humo de las cuatro cáscaras de iOS en el simulador (CI, job cascara-ios). Uso: humo-ios.sh <carpeta de .app> <carpeta de capturas>
# Cada app se instala, abre y sigue viva; se guarda la captura (sin el dominio con HTTPS todavía —Paquete 8-0— muestra su página local
# «Sin señal»). El XCUITest con modo avión y la isla queda para cuando haya dominio (LAUNCH-CHECKLIST).
set -euo pipefail
APPS="$1"; OUT="$2"; mkdir -p "$OUT"
DEV=$(xcrun simctl list devices available -j | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).devices;for(const k of Object.keys(j).sort().reverse()){const d=j[k].find(x=>/iPhone/.test(x.name));if(d){console.log(d.udid);return}}process.exit(1)})')
xcrun simctl boot "$DEV" || true
xcrun simctl bootstatus "$DEV" -b > /dev/null
fallo=0
for par in ToLatino:com.tolatino.app ToLatinoNegocios:com.tolatino.negocios ToLatinoRepartidor:com.tolatino.repartidor ToLatinoPuerta:com.tolatino.puerta; do
  IFS=: read -r t id <<< "$par"
  xcrun simctl install "$DEV" "$APPS/$t.app"
  xcrun simctl launch "$DEV" "$id" > /dev/null
  sleep 12
  xcrun simctl io "$DEV" screenshot "$OUT/$t.png" > /dev/null
  if ! xcrun simctl spawn "$DEV" launchctl list | grep -q "UIKitApplication:$id"; then echo "✗ $t: la app se cerró"; fallo=1; else echo "✓ $t abre"; fi
  xcrun simctl terminate "$DEV" "$id" || true
done
exit $fallo
