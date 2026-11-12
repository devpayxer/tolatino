#!/bin/bash
# 8i · Capturas de la cáscara REAL de Android en el emulador (tiendas.yml, job «capturas»; fase8-apps.md §4 8i). Las cuatro apps compiladas
# contra el servidor del job con la semilla del sandbox (TOLATINO_URL=http://10.0.2.2:3100, solo en el CI; nunca se guarda en el repo). Cada
# app abre su entrada, entra con su cuenta de la semilla por el código del modo pruebas (por DevTools: solo los builds de pruebas lo
# permiten), y para cada pantalla de apps/mobile/tiendas/capturas.json (las de una puerta abierta, no) y cada idioma: adb exec-out screencap.
# Es la prueba de que la cáscara muestra lo mismo; las de la ficha de Google salen de scripts/tiendas/capturas.mjs al mismo tamaño (1080×2400).
# Uso: capturas-android.sh <carpeta de apk> <salida>
#
# 9b-1 · Robusto (corrida 43106676848: ES 6/6 y el emulador desapareció antes de la primera llamada en EN; `set -e` abortaba sin decir nada):
# - sin `set -e`: cada toma se informa (✓ / ✗ con el motivo) y la corrida sigue; al final, la cuenta y el código 1 si faltó alguna;
# - el reenvío del puerto de DevTools se rehace en CADA llamada con el pid actual de la app (si la WebView se reinició, cambia);
# - cada idioma abre la app de nuevo (force-stop + start) y vuelve a entrar con el código, así nada depende de lo que quedó en memoria;
# - antes de cada app y cada idioma se mira que el emulador siga ahí (`adb get-state`, sys.boot_completed); si se fue, se dice con el
#   diagnóstico de la máquina (memoria, el asesino de procesos del kernel, el registro del emulador) y se vuelve a levantar (máx. 2 veces);
# - cada llamada a DevTools tiene su tiempo máximo (timeout), así un emulador colgado no deja la corrida esperando.
set -uo pipefail
APK="$1"; OUT="$2"; mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"; CDP="$DIR/../../apps/mobile/scripts/cdp.mjs"; RAIZ="$DIR/../.."
DIAG="$OUT/diagnostico"; mkdir -p "$DIAG"
AVD="${TL_AVD:-test}"; PUERTO_EMU="${TL_EMU_PUERTO:-5554}"
EMU_OPC="${TL_EMU_OPCIONES:--no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim}"
LISTA=$(node -e '
  const A = require(process.argv[1] + "/apps/mobile/apps.json"), C = require(process.argv[1] + "/apps/mobile/tiendas/capturas.json");
  for (const a of A.apps) console.log([a.key, a.sabor, a.android, C.cuentas[a.key], C.tomas[a.key].filter((t) => !t.ruta.startsWith("@")).map((t) => t.nombre + "=" + t.ruta).join(",")].join(" "));
' "$RAIZ") || { echo "✗ no se pudo leer apps.json / capturas.json"; exit 1; }

bien=0; mal=0; revividas=0
falla() { echo "✗ $*"; mal=$((mal + 1)); }

# ── El emulador ──
vivo() { [ "$(timeout 10 adb get-state 2> /dev/null)" = device ] && [ "$(timeout 10 adb shell getprop sys.boot_completed 2> /dev/null | tr -d '\r')" = 1 ]; }
diagnostico() { # $1 = cuándo
  local f="$DIAG/$(date +%H%M%S)-$1.txt"
  { echo "== $1 · $(date -u +%FT%TZ)"; echo "== adb devices"; adb devices 2>&1
    echo "== memoria"; free -m; echo "== procesos (más memoria)"; ps -eo pid,rss,etime,comm --sort=-rss | head -15
    echo "== kernel (OOM)"; sudo -n dmesg 2> /dev/null | grep -iE "out of memory|oom|killed process" | tail -20
    echo "== emulador (fallos guardados)"; ls -la /tmp/android-runner/ 2> /dev/null; ls -la "${ANDROID_AVD_HOME:-$HOME/.android/avd}/$AVD.avd/" 2> /dev/null | tail -20
    echo "== logcat (lo último)"; timeout 15 adb logcat -d -t 200 2> /dev/null | grep -iE "FATAL|lowmemorykiller|am_kill|crash|chromium.*E " | tail -40
  } > "$f" 2>&1
  sed 's/^/  · /' "$f" | head -60
}
revivir() {
  if [ "$revividas" -ge 2 ]; then echo "✗ el emulador se fue otra vez y ya se levantó $revividas veces: no se insiste"; return 1; fi
  revividas=$((revividas + 1))
  echo "… el emulador no responde: diagnóstico y se levanta de nuevo ($revividas)"
  diagnostico "emulador-caido-$revividas"
  adb -s "emulator-$PUERTO_EMU" emu kill > /dev/null 2>&1 || true
  pkill -f "qemu-system.*-avd $AVD" 2> /dev/null || true; sleep 3
  # Las mismas opciones con las que lo levantó android-emulator-runner (TL_EMU_OPCIONES en el workflow).
  # shellcheck disable=SC2086
  nohup "$ANDROID_HOME/emulator/emulator" -port "$PUERTO_EMU" -avd "$AVD" $EMU_OPC > "$DIAG/emulador-$revividas.log" 2>&1 &
  timeout 300 adb wait-for-device || { echo "✗ el emulador no volvió (adb)"; tail -30 "$DIAG/emulador-$revividas.log"; return 1; }
  local i; for i in $(seq 1 150); do vivo && break; sleep 2; done
  vivo || { echo "✗ el emulador no terminó de arrancar"; tail -30 "$DIAG/emulador-$revividas.log"; return 1; }
  for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global "$k" 0.0 > /dev/null 2>&1 || true; done
  adb shell input keyevent 82 > /dev/null 2>&1 || true
  echo "… emulador de nuevo arriba"
}
asegurar() { vivo || revivir; }

# ── La app y su WebView ──
pid_de() { timeout 10 adb shell pidof "$1" 2> /dev/null | tr -d '\r' | awk '{print $1}'; }
# Reenvía :9222 al socket de DevTools del pid ACTUAL de la app (se rehace en cada llamada) y corre cdp.mjs con tiempo máximo.
cdp() { # $1 = id de la app, resto = argumentos de cdp.mjs
  local id="$1" pid; shift
  pid=$(pid_de "$id"); [ -n "$pid" ] || { echo "SIN_APP"; return 1; }
  adb forward --remove-all > /dev/null 2>&1; adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid" > /dev/null 2>&1 || { echo "SIN_REENVIO"; return 1; }
  timeout 60 node "$CDP" 9222 "$@" 2> "$DIAG/cdp-ultimo.err" || { echo "CDP_FALLO $(tail -c 300 "$DIAG/cdp-ultimo.err" | tr '\n' ' ')"; return 1; }
}
# Abre la app de cero y espera a que su WebView exponga DevTools (hasta 90 s: después de levantar el emulador otra vez, la primera tarda).
abrir() { # $1 = id
  local id="$1" pid i t=""
  adb shell am force-stop "$id" > /dev/null 2>&1 || true
  timeout 60 adb shell am start -W -n "$id/com.tolatino.cascara.MainActivity" > /dev/null 2>&1 || { echo "  · am start falló"; return 1; }
  for i in $(seq 1 90); do
    pid=$(pid_de "$id")
    if [ -n "$pid" ] && timeout 10 adb shell cat /proc/net/unix 2> /dev/null | grep -q "webview_devtools_remote_$pid"; then
      # La página tiene que haber cargado (no about:blank) antes de pedirle nada.
      t=$(cdp "$id" titulo 2> /dev/null); grep -q '"url":"http' <<< "$t" && return 0
    fi
    sleep 1
  done
  echo "  · pid: ${pid:-ninguno} · lo último de DevTools: ${t:0:200}"
  return 1
}
entrar() { # $1 = id, $2 = teléfono → "ok" o el motivo
  cdp "$1" eval "(async()=>{const h={'content-type':'application/json'};const a=await (await fetch('/api/cuenta/codigo',{method:'POST',headers:h,body:JSON.stringify({telefono:'$2'})})).json();if(!a.codigoPrueba)return 'sin código';const b=await (await fetch('/api/cuenta/verificar',{method:'POST',headers:h,body:JSON.stringify({telefono:'$2',codigo:a.codigoPrueba})})).json();return b.ok?'ok':'no entró'})()"
}

asegurar || { diagnostico "sin-emulador-al-empezar"; echo "✗ no hay emulador"; exit 1; }
while read -r app sabor id tel tomas; do
  asegurar || { falla "$app: sin emulador"; continue; }
  timeout 180 adb install -r "$APK/$sabor/debug/app-$sabor-debug.apk" > /dev/null || { falla "$app: no se instaló el apk"; continue; }
  IFS=, read -ra T <<< "$tomas"
  for idioma in es en; do
    asegurar || { falla "$app $idioma: sin emulador (se saltan ${#T[@]} tomas)"; continue; }
    abrir "$id" || { falla "$app $idioma: la app no abrió su WebView"; diagnostico "$app-$idioma-no-abre"; continue; }
    r=$(entrar "$id" "$tel"); echo "$app $idioma · entrar: $r"
    [ "$r" = '"ok"' ] || { falla "$app $idioma: no entró ($r)"; continue; }
    r=$(cdp "$id" eval "document.cookie='tl_lang=$idioma; path=/; max-age=86400';document.cookie.includes('tl_lang=$idioma')")
    [ "$r" = true ] || { falla "$app $idioma: no se pudo poner el idioma ($r)"; continue; }
    n=0
    for par in "${T[@]}"; do
      nombre=${par%%=*}; ruta=${par#*=}; n=$((n + 1)); png="$OUT/$app/$idioma/$n-$nombre.png"
      mkdir -p "$OUT/$app/$idioma"
      if ! vivo; then falla "$app $idioma $n-$nombre: el emulador se fue"; revivir && abrir "$id" && entrar "$id" "$tel" > /dev/null && cdp "$id" eval "document.cookie='tl_lang=$idioma; path=/; max-age=86400'" > /dev/null || break; fi
      r=$(cdp "$id" ir "$ruta") || { falla "$app $idioma $n-$nombre: no navegó ($r)"; continue; }
      t=$(cdp "$id" titulo) || { falla "$app $idioma $n-$nombre: no leyó la página ($t)"; continue; }
      timeout 60 adb exec-out screencap -p > "$png" 2> /dev/null
      if [ ! -s "$png" ] || [ "$(head -c 4 "$png" | tail -c 3)" != PNG ]; then falla "$app $idioma $n-$nombre: la captura salió vacía"; continue; fi
      if grep -q '"url":"[^"]*/\(entrar\|app/\)' <<< "$t"; then falla "$app $idioma $n-$nombre: terminó en $(grep -o '"url":"[^"]*"' <<< "$t")"
      else echo "✓ $app $idioma $n-$nombre"; bien=$((bien + 1)); fi
    done
  done
  adb shell am force-stop "$id" > /dev/null 2>&1 || true
done <<< "$LISTA"
diagnostico "final" > /dev/null
# Los volcados del emulador (si se cayó), para mirarlos en el artefacto.
[ -d /tmp/android-runner ] && cp -r /tmp/android-runner "$DIAG/android-runner" 2> /dev/null || true
echo "capturas de Android: $bien bien, $mal mal, emulador levantado de nuevo $revividas vez/veces"
[ "$mal" -eq 0 ] && [ "$bien" -gt 0 ]
