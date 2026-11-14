#!/bin/bash
# 9o · Avanzar la rama «produccion» con el OK del fundador (CLAUDE.md regla 2; fase9-apertura.md §3.2; guardián produccionSoloAvanza). Lo hace Claude en
# su sesión cuando el fundador dice OK en el chat; nadie empuja a produccion de otra forma.
#   1. El commit a subir ya está en «pruebas» (es ancestro de origin/pruebas) y su CI terminó en verde (la corrida de «CI» de ese commit).
#   2. produccion solo AVANZA (fast-forward): el commit nuevo es descendiente del que hay.
#   3. Una etiqueta anotada ok-produccion/<AAAA-MM-DD>-<commit> con la frase del fundador y su fecha (el mensaje va a deploy_releases.founder_ok_ref).
#   4. Push de la etiqueta y de produccion (sin --force). Las máquinas de producción vuelven a comprobar 1–3 antes de desplegar (tolatino-sync).
# Uso: promover.sh COMMIT "frase del OK del fundador" "fecha del OK"   (PROMOVER_SECO=1: comprueba todo y no empuja)
set -euo pipefail
C="${1:?commit}"; FRASE="${2:?la frase del OK del fundador}"; FECHA="${3:?la fecha del OK}"
git fetch -q origin pruebas produccion 2>/dev/null || git fetch -q origin pruebas
C=$(git rev-parse "$C^{commit}")
git merge-base --is-ancestor "$C" origin/pruebas || { echo "✗ $C no está en pruebas: primero pasa por el sandbox"; exit 1; }
if git rev-parse -q --verify origin/produccion >/dev/null; then
  git merge-base --is-ancestor origin/produccion "$C" || { echo "✗ produccion no avanzaría (no es fast-forward a $C)"; exit 1; }
fi
v=$(gh run list --workflow ci.yml --commit "$C" --json conclusion,status --jq '[.[] | select(.status == "completed")] | (map(select(.conclusion == "success")) | length)' 2>/dev/null || echo 0)
[ "${v:-0}" -ge 1 ] || { echo "✗ $C no tiene una corrida del CI en verde"; exit 1; }
[ "${#FRASE}" -ge 2 ] || { echo "✗ falta la frase del OK"; exit 1; }
T="ok-produccion/$(date -u +%F)-${C:0:12}"
if [ "${PROMOVER_SECO:-0}" = 1 ]; then echo "✓ (seco) $C se puede subir a produccion con la etiqueta $T"; exit 0; fi
git tag -a "$T" "$C" -m "OK del fundador: «$FRASE» ($FECHA)"
git push -q origin "refs/tags/$T"
git push -q origin "$C:refs/heads/produccion"
echo "✓ produccion → ${C:0:12} con $T"
