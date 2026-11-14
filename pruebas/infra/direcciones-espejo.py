"""9m · Una copia del Censo y de OpenAddresses EN SU FORMATO (shapefiles en .zip con los mismos campos que TIGER/Line 2024 y GeoJSON por líneas como
OpenAddresses) para probar infra/direcciones/generar.sh sin red: Hazleton (Luzerne, 42079) y una muestra de California (San Francisco, 06075), Texas
(Travis, 48453) y Nueva York (New York County, 36061). Las calles y sus rangos imitan las de verdad (cuadras de 100 números); los puntos son ficticios.
Uso: python3 -I pruebas/infra/direcciones-espejo.py <carpeta>   (necesita ogr2ogr)."""
import csv
import gzip
import json
import os
import subprocess
import sys
import zipfile

T = sys.argv[1]
ANIO = "2024"

# Calle, condado, código postal, punto de inicio (lat, lng), paso por cuadra (dlat, dlng), primera cuadra, cuántas cuadras.
CALLES = [
    ("N Wyoming St", "42079", "18201", (40.9585, -75.9747), (0.0012, 0.0), 0, 10),
    ("S Wyoming St", "42079", "18201", (40.9585, -75.9747), (-0.0012, 0.0), 0, 6),
    ("N Church St", "42079", "18201", (40.9585, -75.9772), (0.0012, 0.0), 0, 8),
    ("W Broad St", "42079", "18201", (40.9585, -75.9747), (0.0, -0.0016), 0, 8),
    ("E Broad St", "42079", "18201", (40.9585, -75.9747), (0.0, 0.0016), 0, 8),
    ("W Diamond Ave", "42079", "18201", (40.9620, -75.9747), (0.0, -0.0016), 0, 6),
    ("Dr Carlton B Goodlett Pl", "06075", "94102", (37.7786, -122.4196), (0.0011, 0.0), 0, 3),
    ("Market St", "06075", "94103", (37.7790, -122.4140), (0.0008, 0.0010), 10, 6),
    ("Congress Ave", "48453", "78701", (30.2690, -97.7425), (0.0011, 0.0002), 6, 8),
    ("E 6th St", "48453", "78701", (30.2672, -97.7431), (0.0002, 0.0011), 0, 6),
    ("5th Ave", "36061", "10118", (40.7466, -73.9843), (0.0007, -0.0005), 3, 4),
    ("W 34th St", "36061", "10001", (40.7505, -73.9880), (-0.0004, 0.0010), 0, 5),
]
LUGARES = [("42", "4233408", "Hazleton", (40.94, -76.0), (40.98, -75.94)), ("06", "0667000", "San Francisco", (37.70, -122.52), (37.82, -122.35)),
           ("48", "4805000", "Austin", (30.15, -97.90), (30.45, -97.60)), ("36", "3651000", "New York", (40.68, -74.03), (40.80, -73.90))]
ZIPS = [("18201", 40.9590, -75.9750), ("94102", 37.7790, -122.4190), ("94103", 37.7740, -122.4110), ("78701", 30.2710, -97.7430), ("10118", 40.7484, -73.9857), ("10001", 40.7506, -73.9972)]


def ogr_zip(nombre, csvruta, tipo, carpeta):
    """CSV con WKT → shapefile (EPSG:4269, como TIGER) → zip con el nombre de TIGER."""
    shp = os.path.join(T, nombre + ".shp")
    subprocess.run(["ogr2ogr", "-f", "ESRI Shapefile", shp, csvruta, "-oo", "GEOM_POSSIBLE_NAMES=WKT", "-oo", "KEEP_GEOM_COLUMNS=NO", "-a_srs", "EPSG:4269", "-nlt", tipo, "-overwrite"], check=True)
    os.makedirs(carpeta, exist_ok=True)
    with zipfile.ZipFile(os.path.join(carpeta, nombre + ".zip"), "w") as z:
        for ext in (".shp", ".shx", ".dbf", ".prj"):
            z.write(os.path.join(T, nombre + ext), nombre + ext)
            os.remove(os.path.join(T, nombre + ext))
    for ext in (".cpg",):
        p = os.path.join(T, nombre + ext)
        if os.path.exists(p):
            os.remove(p)


def main():
    tiger = os.path.join(T, "tiger", "TIGER" + ANIO)
    condados = {}
    puntos = []
    for nombre, cty, zip5, (la, ln), (dla, dln), primera, n in CALLES:
        for k in range(n):
            b = (primera + k) * 100
            a = (la + dla * k, ln + dln * k)
            e = (la + dla * (k + 1), ln + dln * (k + 1))
            # Izquierda impares, derecha pares (como casi todo el Censo); la primera cuadra empieza en 1 y 2.
            condados.setdefault(cty, []).append([f"LINESTRING({a[1]:.6f} {a[0]:.6f}, {e[1]:.6f} {e[0]:.6f})", nombre, str(b + 1), str(b + 99), str(b + 2 if b == 0 else b), str(b + 98), zip5, zip5])
            if cty == "42079" and k < 5:
                # Puntos de OpenAddresses (Pensilvania): la casa 12 de cada cuadra, a la izquierda de la calle.
                f = 0.12
                puntos.append({"type": "Feature", "properties": {"hash": f"{cty}{nombre}{b + 13}".replace(" ", "")[:32], "number": str(b + 13), "street": nombre.upper(), "unit": "", "city": "", "postcode": zip5},
                               "geometry": {"type": "Point", "coordinates": [a[1] + (e[1] - a[1]) * f - 0.00015 * (1 if dla else 0), a[0] + (e[0] - a[0]) * f + 0.00012 * (1 if dln else 0)]}})
    for cty, filas in condados.items():
        ruta = os.path.join(T, f"{cty}.csv")
        with open(ruta, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["WKT", "FULLNAME", "LFROMHN", "LTOHN", "RFROMHN", "RTOHN", "ZIPL", "ZIPR"])
            w.writerows(filas)
        ogr_zip(f"tl_{ANIO}_{cty}_addrfeat", ruta, "LINESTRING", os.path.join(tiger, "ADDRFEAT"))
        os.remove(ruta)
    for ss, geoid, nombre, (a0, b0), (a1, b1) in LUGARES:
        ruta = os.path.join(T, f"place{ss}.csv")
        with open(ruta, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["WKT", "GEOID", "NAME"])
            w.writerow([f"POLYGON(({b0} {a0}, {b1} {a0}, {b1} {a1}, {b0} {a1}, {b0} {a0}))", geoid, nombre])
        ogr_zip(f"tl_{ANIO}_{ss}_place", ruta, "POLYGON", os.path.join(tiger, "PLACE"))
        os.remove(ruta)
    ruta = os.path.join(T, "zcta.csv")
    with open(ruta, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["WKT", "ZCTA5CE20", "INTPTLAT20", "INTPTLON20"])
        for z, la, ln in ZIPS:
            w.writerow([f"POLYGON(({ln - .01} {la - .01}, {ln + .01} {la - .01}, {ln + .01} {la + .01}, {ln - .01} {la + .01}, {ln - .01} {la - .01}))", z, f"+{la:.7f}", f"{ln:.7f}"])
    ogr_zip(f"tl_{ANIO}_us_zcta520", ruta, "POLYGON", os.path.join(tiger, "ZCTA520"))
    os.remove(ruta)
    with gzip.open(os.path.join(T, "pa-statewide.geojson.gz"), "wt") as g:
        for p in puntos:
            g.write(json.dumps(p) + "\n")
        g.write("{roto\n")  # una línea rota no frena la carga
    print(f"espejo: {sum(len(v) for v in condados.values())} tramos en {len(condados)} condados · {len(LUGARES)} lugares · {len(ZIPS)} zips · {len(puntos)} puntos")


if __name__ == "__main__":
    main()
