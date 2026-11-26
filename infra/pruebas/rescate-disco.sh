#!/usr/bin/env bash
# 26 nov · Lo que el rescate del SANDBOX hace en el disco del servidor (docs/incidentes/sandbox-no-se-actualiza.md). Corre DENTRO del sistema de rescate
# de Hetzner (su raíz vive en memoria), lo manda .github/workflows/sandbox-rescate.yml en sus dos modos (api y llave):
#   ssh root@IP 'bash /tmp/rescate-disco.sh /tmp/tolatino-sync.nuevo < /dev/null'
# El argumento es el tolatino-sync del checkout del repo (el flujo copia antes los dos a /tmp del rescate).
# (1) busca la partición ext4 con /opt/tolatino/.git y la monta en /mnt/tl; (2) imprime el diagnóstico; (3) borra SOLO los *.lock de /opt/tolatino/.git;
# (4) si el /usr/local/bin/tolatino-sync instalado es el de antes del 26 nov (no se destraba solo), instala el nuevo (bash -n primero, 0755, cambio
# atómico con mv); (5) sync y desmonta. Nada más: ni la base, ni el resto de /opt/tolatino, ni systemd. Guardián: sandboxSeArreglaSolo.
# Prueba en local: RESCATE_RAIZ=DIR hace de disco ya montado (no busca, no monta, no desmonta).
set -euo pipefail
NUEVO=${1:?falta la ruta del tolatino-sync nuevo}
MARCA='candados de git'   # solo la trae el tolatino-sync del 26 nov en adelante (el que borra los *.lock antes del fetch)

if [ -n "${RESCATE_RAIZ:-}" ]; then
  M=$RESCATE_RAIZ; MONTADO=0
  echo "== prueba local: $M hace de disco montado"
else
  echo "== discos"; lsblk -o NAME,TYPE,FSTYPE,SIZE,MOUNTPOINT
  # La raíz del servidor: la partición ext4 que tiene /opt/tolatino/.git (normalmente /dev/sda1). Se prueba de solo lectura.
  M=/mnt/tl; mkdir -p "$M"; RAIZ=""
  for p in $(lsblk -rnpo NAME,TYPE,FSTYPE | awk '$2 == "part" && $3 == "ext4" {print $1}'); do
    mount -o ro "$p" "$M" 2>/dev/null || continue
    if [ -d "$M/opt/tolatino/.git" ] && [ -f "$M/etc/os-release" ]; then RAIZ=$p; fi
    umount "$M"; [ -n "$RAIZ" ] && break
  done
  [ -n "$RAIZ" ] || { echo "no encontré la partición con /opt/tolatino/.git"; exit 1; }
  mount "$RAIZ" "$M"; MONTADO=1
  # Pase lo que pase, el disco queda sincronizado y desmontado antes de salir.
  trap 'sync; [ "$MONTADO" = 1 ] && umount "$M" && echo "== desmontado"' EXIT
  echo "== raíz del servidor: $RAIZ (montada en $M)"
fi
G="$M/opt/tolatino/.git"
DST="$M/usr/local/bin/tolatino-sync"

echo "== reinicios y apagados (last -x)"; last -x -F -f "$M/var/log/wtmp" reboot shutdown 2>/dev/null | head -n 10 || true
echo "== arranques (journal)"; journalctl -D "$M/var/log/journal" --list-boots --no-pager 2>/dev/null | tail -n 5 || true
echo "== unattended-upgrades (últimas 15)"; tail -n 15 "$M/var/log/unattended-upgrades/unattended-upgrades.log" 2>/dev/null || true
echo "== tolatino-sync.timer: systemctl is-enabled (del sistema montado)"; systemctl --root="$M" is-enabled tolatino-sync.timer 2>&1 || true
echo "== enlaces de tolatino-sync en /etc/systemd"
find "$M/etc/systemd" -name 'tolatino-sync*' -printf '%p -> %l\n' 2>/dev/null | sed "s|^$M||" || true
[ -L "$M/etc/systemd/system/timers.target.wants/tolatino-sync.timer" ] || echo "(tolatino-sync.timer NO está habilitado: falta el enlace en timers.target.wants)"
echo "== /var/lib/tolatino/*"; ls -la "$M/var/lib/tolatino" 2>/dev/null || echo "(no existe)"
for f in "$M"/var/lib/tolatino/*; do
  [ -f "$f" ] || continue
  case "${f##*/}" in *llave*|*key*|*secret*|*token*|*.env) continue ;; esac   # (por si acaso: nada que parezca un secreto sale al registro)
  printf -- '-- %s (%s): ' "${f#"$M"}" "$(date -r "$f" '+%F %T %Z')"; head -c 300 "$f" | tr '\n' ' '; echo
done
echo "== /var/log/tolatino-sync.log (últimas 60)"; tail -n 60 "$M/var/log/tolatino-sync.log" 2>/dev/null || echo "(no existe)"
echo "== tolatino-sync instalado"
if [ -f "$DST" ]; then
  echo "  sha256 $(sha256sum "$DST" | cut -d' ' -f1) · $(date -r "$DST" '+%F %T %Z') · menciones de «$MARCA»: $(grep -c "$MARCA" "$DST" || true) (0 = la versión de antes del 26 nov)"
else
  echo "  (no está instalado)"
fi
echo "  el del repo: sha256 $(sha256sum "$NUEVO" | cut -d' ' -f1)"
echo "== /opt/tolatino/.git: ¿sano? (sin red)"
if command -v git >/dev/null; then
  GITR=(git -c safe.directory='*' -C "$M/opt/tolatino")
  echo "  HEAD: $("${GITR[@]}" rev-parse HEAD 2>&1 || true) · origin/pruebas: $("${GITR[@]}" rev-parse refs/remotes/origin/pruebas 2>&1 || true)"
  if out=$(timeout 300 "${GITR[@]}" fsck --connectivity-only --no-dangling 2>&1); then echo "  fsck --connectivity-only: sano"; else echo "  fsck --connectivity-only FALLA:"; printf '%s\n' "$out" | tail -n 20; fi
else
  echo "  (git no está en el rescate: no se comprueba)"
fi
echo "== todos los *.lock de /opt/tolatino/.git"; find "$G" -name '*.lock' -type f -printf '%TY-%Tm-%Td %TH:%TM  %s bytes  %P\n'

# Lo ÚNICO que se cambia (1/2): los candados que dejó la vuelta cortada.
echo "== se borran (solo los *.lock de /opt/tolatino/.git):"; find "$G" -name '*.lock' -type f -print -delete

# Lo ÚNICO que se cambia (2/2): el tolatino-sync de antes del 26 nov se cambia por el del repo, que se destraba solo de aquí en adelante.
if [ -f "$DST" ] && grep -q "$MARCA" "$DST"; then
  echo "== tolatino-sync: el instalado ya se destraba solo; no se toca"
elif ! grep -q "$MARCA" "$NUEVO" || ! bash -n "$NUEVO"; then
  echo "== tolatino-sync: el del repo no es bash válido o no se destraba solo; se queda el instalado"
else
  install -m 0755 "$NUEVO" "$DST.rescate"
  mv -f "$DST.rescate" "$DST"
  echo "== tolatino-sync: instalado el del repo (sha256 $(sha256sum "$DST" | cut -d' ' -f1), modo $(stat -c %a "$DST"))"
fi
