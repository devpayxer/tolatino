#!/usr/bin/env python3
"""Polígonos de océano vacíos para Planetiler (capa water del esquema OpenMapTiles).
Pensilvania no toca el océano (Lake Erie y los ríos vienen del propio OpenStreetMap), así que no hace falta el archivo
de osmdata.openstreetmap.de; si ese servidor no responde, generar.sh usa este, vacío y válido (EPSG:3857).
Uso: python3 agua-vacia.py salida.zip"""
import struct, sys, zipfile, io

def shp_vacio():
    # Encabezado de 100 bytes: código 9994, largo del archivo (en palabras de 16 bits) = 50, versión 1000, tipo 5 (polígono).
    h = struct.pack(">7i", 9994, 0, 0, 0, 0, 0, 50) + struct.pack("<2i", 1000, 5) + struct.pack("<8d", 0, 0, 0, 0, 0, 0, 0, 0)
    return h

def dbf_vacio():
    campo = b"FID".ljust(11, b"\x00") + b"N" + b"\x00" * 4 + bytes([9, 0]) + b"\x00" * 14
    largo_enc = 32 + 32 + 1
    enc = struct.pack("<BBBBIHH", 3, 126, 1, 1, 0, largo_enc, 1 + 9) + b"\x00" * 20
    return enc + campo + b"\r" + b"\x1a"

PRJ = ('PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],'
       'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],'
       'PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],'
       'PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]')

with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:
    base = "water-polygons-split-3857/water_polygons"
    z.writestr(base + ".shp", shp_vacio())
    z.writestr(base + ".shx", shp_vacio())
    z.writestr(base + ".dbf", dbf_vacio())
    z.writestr(base + ".prj", PRJ)
print("agua vacía:", sys.argv[1])
