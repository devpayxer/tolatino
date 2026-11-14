"""Lee el archivo plano de retiros de NHTSA (FLAT_RCL: un .zip con un .txt separado por tabuladores, sin encabezado; los campos en el orden que
publica NHTSA en RCL.txt) y escribe CSV para la carga: campaña, marca, modelo, año, componente, resumen, consecuencia, arreglo, fecha del informe,
«no lo manejes». Solo la biblioteca estándar; se corre con «python3 -I». Una fila rota se salta.
Campos de FLAT_RCL (1 = el primero): 2 CAMPNO · 3 MAKETXT · 4 MODELTXT · 5 YEARTXT · 7 COMPNAME · 16 RCDATE (AAAAMMDD) · 20 DESC_DEFECT ·
21 CONEQUENCE_DEFECT · 22 CORRECTIVE_ACTION · 28 DO_NOT_DRIVE (Yes/No, en los archivos nuevos)."""
import csv
import io
import re
import sys
import zipfile

NORM = re.compile(r"[^A-Z0-9]+")


def norm(s):
    return NORM.sub(" ", (s or "").upper()).strip()


def main():
    w = csv.writer(sys.stdout)
    n = malos = 0
    with zipfile.ZipFile(sys.argv[1]) as z:
        nombre = next((x for x in z.namelist() if x.upper().endswith(".TXT")), None)
        if not nombre:
            print("[rcl_csv] el zip no trae el .txt", file=sys.stderr)
            sys.exit(1)
        with z.open(nombre) as f:
            for linea in io.TextIOWrapper(f, encoding="latin-1", errors="replace"):
                c = linea.rstrip("\r\n").split("\t")
                if len(c) < 22:
                    malos += 1
                    continue
                camp, marca, modelo, anio = c[1].strip().upper(), norm(c[2]), norm(c[3]), c[4].strip()
                if not re.fullmatch(r"[0-9A-Z]{6,14}", camp) or not marca or not modelo or not re.fullmatch(r"\d{4}", anio):
                    continue
                fecha = c[15].strip()
                fecha = f"{fecha[0:4]}-{fecha[4:6]}-{fecha[6:8]}" if re.fullmatch(r"\d{8}", fecha) else ""
                dnd = len(c) > 27 and c[27].strip().lower() in ("yes", "y", "true")
                w.writerow([camp, marca, modelo, anio, c[6].strip()[:200], c[19].strip()[:4000], c[20].strip()[:4000], c[21].strip()[:4000], fecha or None, "true" if dnd else "false"])
                n += 1
    print(f"[rcl_csv] {n} filas · {malos} rotas", file=sys.stderr)


if __name__ == "__main__":
    main()
