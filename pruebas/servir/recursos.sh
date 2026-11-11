#!/bin/bash
# 9a · Los recursos de terceros que usan algunas pruebas y que NO viven en el repo (licencias ajenas, tamaño, binarios): se bajan o se hacen
# una vez en $PRUEBAS_RECURSOS (por defecto $PRUEBAS_SALIDA/recursos). Idempotente; lo que ya está no se vuelve a bajar.
#   jsqr/          jsQR 1.4.0 (npm): leer el QR de una captura (evt6c, evt6d, evt6g, evt6h, wal8g)
#   nayuki/        nayuki-qr-code-generator 1.8.0 (npm): dibujar un QR para la cámara de prueba (evt6g)
#   androidpublisher-v3.json, walletobjects-v1.json: los documentos de descubrimiento OFICIALES de Google, fijados al mismo commit y huella
#                  que scripts/contrato-tiendas y scripts/contrato-wallet (tien8h, fich8i, wal8g)
#   fotos/         fotos de prueba hechas aquí (portada.jpg con EXIF, galeria.png, falsa.jpg que no es una foto)
#   imgvenv/       el venv de services/moderacion-img (com5d levanta la moderación con él)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
SALIDA="${PRUEBAS_SALIDA:-${TMPDIR:-/tmp}/tolatino-pruebas}"
REC="${PRUEBAS_RECURSOS:-$SALIDA/recursos}"
mkdir -p "$REC"; cd "$REC"
npm_pkg() { # $1 carpeta, $2 paquete@versión
  [ -f "$1/package/package.json" ] && return
  mkdir -p "$1" && (cd "$1" && npm pack --silent "$2" >/dev/null && tar xzf ./*.tgz && rm -f ./*.tgz)
  echo "[recursos] $2"
}
npm_pkg jsqr jsqr@1.4.0
npm_pkg nayuki nayuki-qr-code-generator@1.8.0
GOOGLE_COMMIT=be503e8963ac11ca328020a6a42316b00b3d8601  # GUARDIAN-OK: commit y huellas PÚBLICAS de los documentos de Google
google() { # $1 archivo, $2 ruta en google-api-go-client, $3 sha256
  [ -f "$1" ] || { curl -fsSL -o "$1" "https://raw.githubusercontent.com/googleapis/google-api-go-client/$GOOGLE_COMMIT/$2"; echo "[recursos] $1"; }
  echo "$3  $1" | sha256sum -c --quiet -
}
google androidpublisher-v3.json androidpublisher/v3/androidpublisher-api.json cfd30b12d38960b21a9cf94567c46cc2ced40792ccd18abeab8ca5b0dab677ac  # GUARDIAN-OK: commit y huellas PÚBLICAS de los documentos de Google
google walletobjects-v1.json walletobjects/v1/walletobjects-api.json d5a73991282d0a06d94f74e77b0ae5f863b274a4a1b817a43a3f54dd37b92ffc  # GUARDIAN-OK: commit y huellas PÚBLICAS de los documentos de Google
if [ ! -f fotos/portada.jpg ]; then
  mkdir -p fotos
  python3 -I - "$REC/fotos" <<'PY'
import sys
from PIL import Image
d = sys.argv[1]
# Una «portada» de 1200×800 con un degradado y EXIF (autor y una marca de ubicación falsa: la app la tiene que quitar).
im = Image.new("RGB", (1200, 800))
im.putdata([(30 + x * 180 // 1200, 90 + y * 120 // 800, 140) for y in range(800) for x in range(1200)])
ex = Image.Exif(); ex[0x013B] = "Casa del dueno"; ex[0x8298] = "GPS-PRUEBA"
im.save(f"{d}/portada.jpg", "JPEG", quality=88, exif=ex.tobytes())
g = Image.new("RGBA", (1000, 1000))
g.putdata([((x * 7) % 256, (y * 5) % 256, 160, 255) for y in range(1000) for x in range(1000)])
g.save(f"{d}/galeria.png")
open(f"{d}/falsa.jpg", "w").write("esto no es una foto")
PY
  echo "[recursos] fotos"
fi
if [ ! -x imgvenv/bin/python ]; then
  python3 -m venv imgvenv && imgvenv/bin/pip install -q -r "$RAIZ/services/moderacion-img/requirements.txt" && echo "[recursos] imgvenv" \
    || echo "⚠ [recursos] no se pudo hacer el venv de la moderación (com5d no corre sin él)" >&2
fi
echo "[recursos] listo en $REC"
