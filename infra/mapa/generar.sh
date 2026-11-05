#!/bin/bash
# Teselas propias de Pensilvania (decisión O, PLAN §5: «MapLibre + teselas propias de OpenStreetMap»).
# Descarga el extracto de OpenStreetMap de Pensilvania (Geofabrik) y genera un .mbtiles con el esquema OpenMapTiles
# usando Planetiler (código abierto). Lo sirve tileserver-gl (raster PNG para las piezas del sistema y vectorial para
# MapLibre). Idempotente: si el archivo ya existe y tiene menos de 30 días, no hace nada.
# Uso: bash infra/mapa/generar.sh /var/lib/tolatino/mapa
set -euo pipefail
DIR="${1:?carpeta de datos}"
PLANETILER="${PLANETILER_IMAGEN:-ghcr.io/onthegomap/planetiler:latest}"
OUT="$DIR/pennsylvania.mbtiles"
mkdir -p "$DIR"
if [ -f "$OUT" ] && [ -z "$(find "$OUT" -mtime +30 2>/dev/null)" ] && [ "${FORZAR:-0}" != 1 ]; then
  echo "[mapa] $OUT al día"; exit 0
fi
echo "[mapa] descargando OpenStreetMap de Pensilvania…"
curl -fsSL --retry 4 -o "$DIR/pennsylvania-latest.osm.pbf.tmp" https://download.geofabrik.de/north-america/us/pennsylvania-latest.osm.pbf
mv "$DIR/pennsylvania-latest.osm.pbf.tmp" "$DIR/pennsylvania-latest.osm.pbf"
echo "[mapa] generando teselas con $PLANETILER…"
docker run --rm -e JAVA_TOOL_OPTIONS="-Xmx3g" -v "$DIR":/data "$PLANETILER" \
  --osm-path=/data/pennsylvania-latest.osm.pbf --output=/data/pennsylvania.nuevo.mbtiles --download --force
mv "$DIR/pennsylvania.nuevo.mbtiles" "$OUT"
ls -la "$OUT"
echo "[mapa] listo"
