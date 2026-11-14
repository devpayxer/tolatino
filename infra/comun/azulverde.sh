#!/bin/bash
# 9o · Despliegue azul/verde con la puerta de salud y la vuelta atrás sola (fase9-apertura.md §3.5; T#16, PLAN §3.4). En la máquina de la app:
#   1. Migraciones primero (expandir → contraer, guardián migracionReversible: el código que sirve sigue funcionando con la base nueva).
#   2. La versión nueva (imagen tolatino/web:<commit>) arranca en el OTRO color (azul :3001, verde :3002) junto a la que sirve.
#   3. Puerta de salud: /api/salud del color nuevo contesta bien 3 veces seguidas (hasta 3 minutos). Si no: se apaga el nuevo, «fallo», nada cambió.
#   4. nginx cambia de destino (tolatino-activo.conf; nginx -t antes de recargar).
#   5. Vigilancia (vuelta_vigilancia_min, 10 min): cada 30 s, /api/salud del nuevo, la tasa de 5xx y el p95 de nginx (tolatino-vigia.log, solo lo que
#      fue al color nuevo) y los grupos de errores nuevos (app_error_groups: web, apps y servidor). Umbrales en Configuración › Despliegues (cfg_int).
#   6. Si pasa un umbral: nginx vuelve al color viejo (que siguió arrancado), se apaga el nuevo, «vuelta_atras» con el motivo y lo medido, un incidente
#      abierto (despliegue-malo) y el barrido avisa al equipo. Si no: se apaga el viejo y queda «ok».
# Lo cargan los deploy.sh con «source» (usa log, salud_esperar, registrar_despliegue, abrir_incidente). Las piezas de afuera (docker, nginx, curl, psql)
# se pueden cambiar por variables para probarlo sin servidor (pruebas/infra/azulverde.test.sh).

AV_ESTADO=${AV_ESTADO:-/var/lib/tolatino/azulverde}
AV_UPSTREAM=${AV_UPSTREAM:-/etc/nginx/tolatino-activo.conf}
AV_LOG=${AV_LOG:-/var/log/nginx/tolatino-vigia.log}
AV_PASO_S=${AV_PASO_S:-30}
AV_GATE_N=${AV_GATE_N:-60}
AV_GATE_P=${AV_GATE_P:-3}
AV_NGINX_RECARGAR=${AV_NGINX_RECARGAR:-"nginx -t -q && systemctl reload nginx"}

puerto_de() { [ "$1" = azul ] && echo 3001 || echo 3002; }
otro_color() { [ "$1" = azul ] && echo verde || echo azul; }
color_activo() { local c; c=$(cat "$AV_ESTADO/activo" 2>/dev/null || true); case "$c" in azul|verde) echo "$c" ;; esac; }

# El destino de nginx (un upstream con un solo servidor). Si nginx no acepta el archivo, se deja el de antes.
apuntar_nginx() {
  local puerto="$1" antes
  antes=$(cat "$AV_UPSTREAM" 2>/dev/null || true)
  printf 'upstream tolatino_app {\n    server 127.0.0.1:%s;\n    keepalive 16;\n}\n' "$puerto" > "$AV_UPSTREAM.tmp" && mv "$AV_UPSTREAM.tmp" "$AV_UPSTREAM"
  if ! bash -c "$AV_NGINX_RECARGAR"; then
    if [ -n "$antes" ]; then printf '%s\n' "$antes" > "$AV_UPSTREAM"; else rm -f "$AV_UPSTREAM"; fi
    bash -c "$AV_NGINX_RECARGAR" || true
    return 1
  fi
}

# Un umbral de Configuración (cfg_int, con sus límites); si la base no contesta, el de fábrica.
umbral() { local v; v=$("${PSQL[@]}" -c "select cfg_int('$1')" 2>/dev/null | tr -dc 0-9); echo "${v:-$2}"; }

# Lo que nginx mandó a ese puerto desde ese instante: «total 5xx p95_ms».
medir_nginx() {
  local puerto="$1" desde="$2"
  [ -f "$AV_LOG" ] || { echo "0 0 0"; return; }
  awk -v p=":$puerto" -v d="$desde" '$1 >= d && index($4, p) == length($4) - length(p) + 1 { n++; if ($2 >= 500) e++; print int($3 * 1000) > "/dev/stderr" } END { printf "%d %d", n, e }' "$AV_LOG" 2>"$AV_ESTADO/tiempos" \
    && { local n95; n95=$(sort -n "$AV_ESTADO/tiempos" | awk '{ a[NR] = $1 } END { if (NR == 0) print 0; else { i = int(NR * 0.95 + 0.999); if (i < 1) i = 1; print a[i] } }'); echo " $n95"; }
}

# Grupos de errores nuevos desde ese instante (web, apps y servidor).
errores_nuevos() { local v; v=$("${PSQL[@]}" -v d="$1" 2>/dev/null <<'SQL' | tr -dc 0-9
select count(*) from app_error_groups where first_seen >= (:'d')::timestamptz;
SQL
); echo "${v:-0}"; }

# decidir TOTAL N5XX P95 NUEVOS FALLOS_SALUD U5XX_PCT UP95 UNUEVOS USALUD → el motivo de la vuelta atrás, o nada. Sin muestra suficiente, la tasa y el
# p95 no deciden (50 y 20 respuestas); la salud y los errores nuevos sí.
decidir() {
  local total="$1" e="$2" p95="$3" nuevos="$4" fallos="$5" u5="$6" up95="$7" unuevos="$8" usalud="$9"
  if [ "$fallos" -ge "$usalud" ]; then echo "/api/salud falló $fallos veces seguidas"; return; fi
  if [ "$total" -ge 50 ] && [ $((e * 100)) -gt $((u5 * total)) ]; then echo "5xx $((e * 100 / total)) % > $u5 % ($e de $total)"; return; fi
  if [ "$total" -ge 20 ] && [ "$p95" -gt "$up95" ]; then echo "p95 $p95 ms > $up95 ms"; return; fi
  if [ "$nuevos" -ge "$unuevos" ]; then echo "$nuevos grupos de errores nuevos (umbral $unuevos)"; return; fi
}

# desplegar_azulverde ENTORNO COMMIT IMAGEN OK_REF MIGRAR... : necesita av_compose COLOR ARGS… (definida por quien lo carga) y PSQL.
# Devuelve 0 (ok), 1 (fallo: no salió) o 2 (vuelta atrás).
desplegar_azulverde() {
  local entorno="$1" commit="$2" imagen="$3" okref="$4"; shift 4
  local inicio t0 activo nuevo puerto previo sano desde desde_iso vig fin fallos=0 motivo="" total=0 e=0 p95=0 nuevos=0 med u5 up95 unuevos usalud t1 vuelta id digest w
  mkdir -p "$AV_ESTADO"
  inicio=$(date -u +%FT%TZ); t0=$(date +%s)
  activo=$(color_activo); nuevo=$(otro_color "${activo:-verde}"); puerto=$(puerto_de "$nuevo")
  previo=$(cat "$AV_ESTADO/commit" 2>/dev/null || true)
  digest=$(docker image inspect "$imagen" --format '{{.Id}}' 2>/dev/null || true)
  log "azul/verde: sirve ${activo:-nada} ($previo); el nuevo va en $nuevo (:$puerto) con $commit"

  # 1) Migraciones (expandir). Si fallan, el código que sirve sigue: cada archivo es su propia transacción.
  if ! "$@"; then
    registrar_despliegue "$entorno" "$commit" "$previo" "$digest" "$nuevo" "$inicio" "" fallo "las migraciones fallaron: sigue la versión anterior" "" "" "$okref" >/dev/null
    abrir_incidente "$entorno" alta migracion-mala "una migración falló al desplegar $commit" "" despliegue
    return 1
  fi

  # 2) y 3) El color nuevo y su puerta de salud (3 respuestas buenas seguidas).
  if ! av_compose "$nuevo" up -d --remove-orphans web || ! salud_esperar "http://127.0.0.1:$puerto/api/salud" "$AV_GATE_N" "$AV_GATE_P" 3; then
    av_compose "$nuevo" logs --tail=40 web 2>/dev/null | sed -E 's/(password|PASSWORD|secret|SECRET|token|TOKEN)=[^ ]*/\1=***/g' | tail -40 || true
    av_compose "$nuevo" stop web >/dev/null 2>&1 || true
    registrar_despliegue "$entorno" "$commit" "$previo" "$digest" "$nuevo" "$inicio" "" fallo "no pasó la puerta de salud: sigue la versión anterior" "" "" "$okref" >/dev/null
    abrir_incidente "$entorno" media despliegue-malo "la versión $commit no pasó la puerta de salud" "se apagó; la anterior siguió sirviendo" despliegue "" 1
    return 1
  fi
  sano=$(date -u +%FT%TZ)

  # 4) nginx al color nuevo.
  if ! apuntar_nginx "$puerto"; then
    av_compose "$nuevo" stop web >/dev/null 2>&1 || true
    registrar_despliegue "$entorno" "$commit" "$previo" "$digest" "$nuevo" "$inicio" "$sano" fallo "nginx no aceptó el cambio: sigue la versión anterior" "" "" "$okref" >/dev/null
    return 1
  fi
  echo "$nuevo" > "$AV_ESTADO/activo"
  log "azul/verde: nginx apunta a $nuevo; vigilancia"

  # 5) Vigilancia.
  u5=$(umbral vuelta_5xx_pct 2); up95=$(umbral vuelta_p95_ms 1500); unuevos=$(umbral vuelta_errores_nuevos 5); usalud=$(umbral vuelta_salud_fallos 3)
  vig=${AV_VIGILANCIA_S:-$(( $(umbral vuelta_vigilancia_min 10) * 60 ))}
  desde=$(date +%s); desde_iso=$(date -u +%FT%TZ); fin=$((desde + vig))
  while [ "$(date +%s)" -lt "$fin" ]; do
    sleep "$AV_PASO_S"
    if curl -fsS -m 5 "http://127.0.0.1:$puerto/api/salud" >/dev/null 2>&1; then fallos=0; else fallos=$((fallos + 1)); fi
    med=$(medir_nginx "$puerto" "$desde"); read -r total e p95 <<<"$med"
    nuevos=$(errores_nuevos "$desde_iso")
    motivo=$(decidir "${total:-0}" "${e:-0}" "${p95:-0}" "${nuevos:-0}" "$fallos" "$u5" "$up95" "$unuevos" "$usalud")
    [ -n "$motivo" ] && break
  done
  w=$(printf '{"total":%d,"n5xx":%d,"p5xx":%d,"p95":%d,"nuevos":%d,"salud_fallos":%d,"vigilancia_s":%d}' "${total:-0}" "${e:-0}" \
    "$(( ${total:-0} > 0 ? ${e:-0} * 100 / ${total:-1} : 0 ))" "${p95:-0}" "${nuevos:-0}" "$fallos" "$(( $(date +%s) - desde ))")

  # 6) Vuelta atrás sola (si hay a dónde volver).
  if [ -n "$motivo" ] && [ -n "$activo" ]; then
    log "azul/verde: VUELTA ATRÁS — $motivo"
    t1=$(date +%s)
    if apuntar_nginx "$(puerto_de "$activo")"; then echo "$activo" > "$AV_ESTADO/activo"; fi
    av_compose "$nuevo" stop web >/dev/null 2>&1 || true
    vuelta=$(( $(date +%s) - t1 ))
    id=$(registrar_despliegue "$entorno" "$commit" "$previo" "$digest" "$nuevo" "$inicio" "$sano" vuelta_atras "$motivo" "$w" "$vuelta" "$okref" | tr -dc 0-9)
    abrir_incidente "$entorno" alta despliegue-malo "$commit: $motivo" "volvió sola a ${previo:-la versión anterior} en $vuelta s" despliegue "$id"
    return 2
  fi
  [ -n "$activo" ] && av_compose "$activo" stop web >/dev/null 2>&1
  echo "$commit" > "$AV_ESTADO/commit"
  id=$(registrar_despliegue "$entorno" "$commit" "$previo" "$digest" "$nuevo" "$inicio" "$sano" ok "${motivo:+primer despliegue con un umbral pasado: $motivo}" "$w" "" "$okref" | tr -dc 0-9)
  [ -n "$motivo" ] && abrir_incidente "$entorno" alta despliegue-malo "$commit (primer despliegue): $motivo" "" despliegue "$id"
  log "azul/verde: $commit sirve ($(( $(date +%s) - t0 )) s en total)"
  return 0
}
