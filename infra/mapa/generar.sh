#!/bin/bash
# Teselas propias de Pensilvania (decisión O, PLAN §5: «MapLibre + teselas propias de OpenStreetMap»).
# Descarga el extracto de OpenStreetMap de Pensilvania (Geofabrik) y genera un .mbtiles con el esquema OpenMapTiles
# usando Planetiler (código abierto). Lo sirve tileserver-gl (raster PNG para las piezas del sistema y vectorial para
# MapLibre). Idempotente: si el archivo ya existe y tiene menos de 30 días, no hace nada.
# Las fuentes auxiliares se bajan aquí (no con --download de Planetiler, que se cae entero si un servidor no responde):
# lagos y Natural Earth son obligatorios; los océanos son opcionales (Pensilvania no tiene costa: agua-vacia.py).
# Uso: bash infra/mapa/generar.sh /var/lib/tolatino/mapa
set -euo pipefail
DIR="${1:?carpeta de datos}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
PLANETILER="${PLANETILER_IMAGEN:-ghcr.io/onthegomap/planetiler:latest}"
OUT="$DIR/pennsylvania.mbtiles"
mkdir -p "$DIR/sources"
if [ -f "$OUT" ] && [ -z "$(find "$OUT" -mtime +30 2>/dev/null)" ] && [ "${FORZAR:-0}" != 1 ]; then
  echo "[mapa] $OUT al día"; exit 0
fi
bajar() { # url destino
  [ -s "$2" ] && return 0
  curl -fsSL --retry 3 --connect-timeout 30 -o "$2.tmp" "$1" && mv "$2.tmp" "$2"
}
echo "[mapa] descargando OpenStreetMap de Pensilvania…"
rm -f "$DIR/pennsylvania-latest.osm.pbf"
bajar https://download.geofabrik.de/north-america/us/pennsylvania-latest.osm.pbf "$DIR/pennsylvania-latest.osm.pbf"
echo "[mapa] fuentes auxiliares…"
bajar https://github.com/acalcutt/osm-lakelines/releases/download/v12/lake_centerline.shp.zip "$DIR/sources/lake_centerline.shp.zip"
bajar https://naciscdn.org/naturalearth/packages/natural_earth_vector.sqlite.zip "$DIR/sources/natural_earth_vector.sqlite.zip"
if ! bajar https://osmdata.openstreetmap.de/download/water-polygons-split-3857.zip "$DIR/sources/water-polygons-split-3857.zip"; then
  echo "[mapa] osmdata.openstreetmap.de no responde: océanos vacíos (Pensilvania no tiene costa)"
  rm -f "$DIR/sources/water-polygons-split-3857.zip.tmp"
  python3 "$AQUI/agua-vacia.py" "$DIR/sources/water-polygons-split-3857.zip"
fi
ls -la "$DIR/sources"
echo "[mapa] generando teselas con $PLANETILER…"
docker run --rm -e JAVA_TOOL_OPTIONS="-Xmx3g" -v "$DIR":/data "$PLANETILER" \
  --osm-path=/data/pennsylvania-latest.osm.pbf \
  --water-polygons-path=/data/sources/water-polygons-split-3857.zip \
  --natural-earth-path=/data/sources/natural_earth_vector.sqlite.zip \
  --lake-centerlines-path=/data/sources/lake_centerline.shp.zip \
  --output=/data/pennsylvania.nuevo.mbtiles --force
mv "$DIR/pennsylvania.nuevo.mbtiles" "$OUT"
ls -la "$OUT"
echo "[mapa] listo"
