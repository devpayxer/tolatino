#!/bin/bash
# 9o · Pruebas del sobre sellado, los sobres privados entre máquinas y la recuperación de una máquina perdida, con age DE VERDAD y sin servidor
# (fase9-apertura.md §3.3–§3.4; prod9o «sobre sellado para otro servidor → no abre»). Todo en una carpeta temporal: nada toca el repo ni /etc.
# Uso: bash pruebas/infra/sellado.test.sh   → «N/N casos».
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
command -v age >/dev/null && command -v age-keygen >/dev/null || { echo "✗ falta age"; exit 1; }
# shellcheck source=../../infra/comun/lib.sh
. "$RAIZ/infra/comun/lib.sh"
log() { :; }
# shellcheck source=../../infra/comun/sellado.sh
. "$RAIZ/infra/comun/sellado.sh"
# shellcheck source=../../infra/comun/sobres-privados.sh
. "$RAIZ/infra/comun/sobres-privados.sh"
# shellcheck source=../../infra/comun/recuperacion.sh
. "$RAIZ/infra/comun/recuperacion.sh"
LISTA="$RAIZ/infra/comun/secretos.json"
bien=0; total=0
ok() { total=$((total + 1)); if eval "$2"; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1"; fi; }
val() { grep -m1 "^$1=" "$2" 2>/dev/null | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//"; }

echo "sobre sellado:"
AGE_LLAVE="$T/a.key"; fpA=$(sellado_preparar "$T/estadoA/llave.txt")
ok "la máquina crea su llave (0600) y publica SOLO la pública con su huella" \
  '[ "$(stat -c %a "$T/a.key")" = 600 ] && grep -q "^age1" "$T/estadoA/llave.txt" && ! grep -q SECRET "$T/estadoA/llave.txt" && grep -q "^huella $fpA$" "$T/estadoA/llave.txt"'
fp2=$(sellado_preparar "$T/estadoA/llave.txt")
ok "la llave nace UNA vez (otro despliegue no la cambia)" '[ "$fp2" = "$fpA" ]'
export SELLADO_DIR="$T/sellado" SELLAR_SIN_GITHUB=1
bash "$RAIZ/scripts/produccion/sellar.sh" llave produccion app < "$T/estadoA/llave.txt" >/dev/null
STRIPE_SECRET_KEY="sk_prueba_valor_1" TELNYX_FROM="+15705550000" bash "$RAIZ/scripts/produccion/sellar.sh" sellar produccion app STRIPE_SECRET_KEY >/dev/null  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
TELNYX_FROM="+15705550000" bash "$RAIZ/scripts/produccion/sellar.sh" sellar produccion app TELNYX_FROM >/dev/null  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
ok "sellar.sh cifra para la llave de la máquina (el archivo no lleva el valor) y anota para qué huella" \
  '[ -s "$T/sellado/app/STRIPE_SECRET_KEY.age" ] && ! grep -q sk_prueba "$T/sellado/app/STRIPE_SECRET_KEY.age" && grep -q "\"app/STRIPE_SECRET_KEY\": {\"para\": \"$fpA\"" "$T/sellado/sobres.json"'
ok "sellar.sh no sella un nombre fuera de la lista cerrada" '! FOO_SECRETO=x bash "$RAIZ/scripts/produccion/sellar.sh" sellar produccion app FOO_SECRETO >/dev/null 2>&1'
ok "sellar.sh no sella para la máquina equivocada (STRIPE solo va a la app)" '! STRIPE_SECRET_KEY=x bash "$RAIZ/scripts/produccion/sellar.sh" sellar produccion replica STRIPE_SECRET_KEY >/dev/null 2>&1'
: > "$T/a.env"; echo "STRIPE_SECRET_KEY=viejo" >> "$T/a.env"  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
sellado_abrir "$T/sellado" app "$T/a.env" "$LISTA" "$T/estadoA/sobres.txt"
ok "la máquina abre su sobre y reemplaza el valor (sin dejar el viejo)" '[ "$(val STRIPE_SECRET_KEY "$T/a.env")" = sk_prueba_valor_1 ] && [ "$(grep -c ^STRIPE_SECRET_KEY= "$T/a.env")" = 1 ]'
ok "un valor con «+» queda tal cual" '[ "$(val TELNYX_FROM "$T/a.env")" = "+15705550000" ]'
ok "el archivo del entorno queda 0600" '[ "$(stat -c %a "$T/a.env")" = 600 ]'
# Un sobre sellado para OTRA máquina (otra llave) no abre aquí: se dice y queda el valor de antes.
age-keygen -o "$T/b.key" 2>/dev/null; printf 'otro' | age -r "$(age-keygen -y "$T/b.key")" -o "$T/sellado/app/STRIPE_WEBHOOK_SECRET.age"
echo "STRIPE_WEBHOOK_SECRET=el_de_antes" >> "$T/a.env"  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
sellado_abrir "$T/sellado" app "$T/a.env" "$LISTA" "$T/estadoA/sobres.txt"
ok "un sobre sellado para otro servidor NO abre y el valor de antes se queda" \
  'grep -q "STRIPE_WEBHOOK_SECRET · NO ABRE" "$T/estadoA/sobres.txt" && [ "$(val STRIPE_WEBHOOK_SECRET "$T/a.env")" = el_de_antes ]'
printf 'x' | age -r "$(age-keygen -y "$T/a.key")" -o "$T/sellado/app/TOLATINO_PAGOS_SIMULADOR.age"
sellado_abrir "$T/sellado" app "$T/a.env" "$LISTA" "$T/estadoA/sobres.txt"
ok "un sobre con un nombre fuera de la lista (TOLATINO_PAGOS_SIMULADOR) no se abre" \
  'grep -q "TOLATINO_PAGOS_SIMULADOR · fuera de la lista" "$T/estadoA/sobres.txt" && ! grep -q "^TOLATINO_PAGOS_SIMULADOR=" "$T/a.env"'
ok "nada de lo que se publica lleva un valor" '! grep -rq "sk_prueba\|el_de_antes" "$T/estadoA"'

echo "sobres privados entre máquinas:"
AGE_LLAVE="$T/app.key"; sellado_preparar "$T/estadoApp/llave.txt" >/dev/null
AGE_LLAVE="$T/rep.key"; sellado_preparar "$T/estadoRep/llave.txt" >/dev/null
SELLADO_DIR="$T/s2" bash "$RAIZ/scripts/produccion/sellar.sh" llave produccion app < "$T/estadoApp/llave.txt" >/dev/null
SELLADO_DIR="$T/s2" bash "$RAIZ/scripts/produccion/sellar.sh" llave produccion replica < "$T/estadoRep/llave.txt" >/dev/null
printf 'POSTGRES_PASSWORD=pg_secreta\nREPLICA_PASSWORD=rep_secreta\nRESPALDO_LLAVE=resp_secreta\nMEDIOS_KEY_ID=GK1\nMEDIOS_SECRET=ms1\n' > "$T/base.env"  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
SOBRES_SERVIDOS="$T/servidos" servir_sobres base "$T/base.env" "$T/s2/llaves.json" "$LISTA" app replica
# curl de mentira: «http://IP:8099/<máquina>.age» sale de la carpeta servida.
mkdir -p "$T/bin"; printf '#!/bin/bash\nfor a; do case "$a" in http://*) f="$a";; esac; done; o=""; while [ $# -gt 0 ]; do [ "$1" = -o ] && o="$2"; shift; done\ncp "%s/servidos/$(basename "$f")" "$o" 2>/dev/null\n' "$T" > "$T/bin/curl"; chmod +x "$T/bin/curl"
: > "$T/app.env"; AGE_LLAVE="$T/app.key" PATH="$T/bin:$PATH" traer_sobre 10.0.0.2 app "$T/app.env" "$LISTA" base
ok "la app recibe de la base SOLO lo suyo (contraseña de la base y llaves de Garage), nunca la de la réplica ni la de los respaldos" \
  '[ "$(val POSTGRES_PASSWORD "$T/app.env")" = pg_secreta ] && [ "$(val MEDIOS_SECRET "$T/app.env")" = ms1 ] && ! grep -q "REPLICA_PASSWORD\|RESPALDO_LLAVE" "$T/app.env"'
ok "el sobre servido no lleva nada en claro" '! grep -q "pg_secreta" "$T/servidos/app.age" "$T/servidos/replica.age"'
: > "$T/rep2.env"; AGE_LLAVE="$T/app.key" PATH="$T/bin:$PATH" traer_sobre 10.0.0.2 replica "$T/rep2.env" "$LISTA" base
ok "el sobre de la réplica no abre con la llave de la app" '! grep -q REPLICA_PASSWORD "$T/rep2.env"'

echo "recuperación de una máquina perdida:"
# La máquina vieja: su llave age y sus llaves que nacen en el servidor; el sobre de recuperación es para la llave de recuperación.
age-keygen -o "$T/vieja.key" 2>/dev/null; age-keygen -o "$T/recuperacion.key" 2>/dev/null
printf 'DATOS_SECRET=datos_de_siempre\nQR_LLAVE_PRIVADA=qr_de_siempre\nAGE_SERVIDOR=%s\n' "$(grep '^AGE-SECRET' "$T/vieja.key")" > "$T/sobre.txt"  # GUARDIAN-OK: valores de mentira de la prueba (nunca un secreto)
age -r "$(age-keygen -y "$T/recuperacion.key")" -o "$T/sobre-recuperacion.age" "$T/sobre.txt"; rm -f "$T/sobre.txt"
# La máquina nueva nace con una llave provisional y la publica.
mkdir -p "$T/var/lib/tolatino"; AGE_LLAVE="$T/nueva.key"
# (recuperar_si_hace_falta usa /var/www/estado/llave.txt y /var/lib/tolatino/recuperada: se corre en un espacio de montaje aparte)
fpN=$(sellado_preparar "$T/llave-nueva.txt")
# reconstruir.sh (lado de Claude): abre el sobre con la llave de recuperación y lo vuelve a cifrar SOLO para la llave provisional, en la rama «recuperacion».
git init -q --bare "$T/origen.git"; git -C "$T" clone -q "$T/origen.git" clon 2>/dev/null; git -C "$T/clon" checkout -q -b recuperacion
mkdir -p "$T/clon/recuperacion"; age -d -i "$T/recuperacion.key" "$T/sobre-recuperacion.age" | age -r "$(grep -Eo 'age1[0-9a-z]{58}' "$T/llave-nueva.txt")" -o "$T/clon/recuperacion/para-$fpN.age"
git -C "$T/clon" add -A; git -C "$T/clon" -c user.email=t@t -c user.name=t commit -qm sobre; git -C "$T/clon" push -q origin recuperacion 2>/dev/null
git -C "$T" clone -q "$T/origen.git" maquina 2>/dev/null
: > "$T/n.env"
unshare -m --propagation private bash -c '
  mkdir -p /var/www/estado /var/lib/tolatino 2>/dev/null; mount -t tmpfs none /var/www; mount -t tmpfs none /var/lib/tolatino; mkdir -p /var/www/estado
  cp "$1/llave-nueva.txt" /var/www/estado/llave.txt
  . "$2/infra/comun/lib.sh"; log() { :; }; . "$2/infra/comun/sellado.sh"; . "$2/infra/comun/recuperacion.sh"
  AGE_LLAVE="$1/nueva.key" TOLATINO_RECONSTRUIR=1 recuperar_si_hace_falta "$1/maquina" "$1/n.env" && echo listo > "$1/rc"' _ "$T" "$RAIZ" 2>/dev/null
rmdir /var/www/estado /var/www 2>/dev/null || true
ok "la máquina nueva recupera sus llaves de siempre (DATOS_SECRET, QR) del sobre de la rama «recuperacion»" \
  '[ -f "$T/rc" ] && [ "$(val DATOS_SECRET "$T/n.env")" = datos_de_siempre ] && [ "$(val QR_LLAVE_PRIVADA "$T/n.env")" = qr_de_siempre ]'
ok "… y vuelve a tener su llave age de siempre (los sobres sellados del repo vuelven a abrir); la provisional ya no existe" \
  '[ "$(age-keygen -y "$T/nueva.key")" = "$(age-keygen -y "$T/vieja.key")" ]'
ok "… y el texto cifrado de la rama ya no lo abre nadie (era para la llave provisional)" '! age -d -i "$T/nueva.key" "$T/clon/recuperacion/para-$fpN.age" >/dev/null 2>&1'

echo "$bien/$total casos"
[ "$bien" = "$total" ]
