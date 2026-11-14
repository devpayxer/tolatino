"""Lee un archivo de OpenAddresses (GeoJSON por líneas, .geojson o .geojson.gz: una «Feature» por línea con number, street, unit, city,
postcode y hash) y escribe CSV para la carga: num, street, unit, city, zip, hash, lng, lat. Solo la biblioteca estándar (sin dependencias);
se corre con «python3 -I» (el archivo bajado no puede cargar código). Lo que no es un punto con número y calle se salta."""
import csv
import gzip
import json
import sys


def abrir(ruta):
    with open(ruta, "rb") as f:
        gz = f.read(2) == b"\x1f\x8b"
    return gzip.open(ruta, "rt", encoding="utf-8", errors="replace") if gz else open(ruta, "rt", encoding="utf-8", errors="replace")


def main():
    w = csv.writer(sys.stdout)
    n = malos = 0
    with abrir(sys.argv[1]) as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea[0] != "{":
                continue
            try:
                x = json.loads(linea)
                p = x.get("properties") or {}
                g = x.get("geometry") or {}
                if g.get("type") != "Point":
                    continue
                lng, lat = float(g["coordinates"][0]), float(g["coordinates"][1])
            except (ValueError, KeyError, IndexError, TypeError):
                malos += 1
                continue
            num, calle = str(p.get("number") or "").strip(), str(p.get("street") or "").strip()
            if not num or not calle or not num[0].isdigit():
                continue
            w.writerow([num[:12], calle[:120], str(p.get("unit") or "")[:30], str(p.get("city") or "")[:100], str(p.get("postcode") or "")[:10], str(p.get("hash") or "")[:64], lng, lat])
            n += 1
    print(f"[oa_csv] {n} puntos · {malos} líneas rotas", file=sys.stderr)


if __name__ == "__main__":
    main()
