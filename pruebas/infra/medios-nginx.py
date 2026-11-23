#!/usr/bin/env python3
"""Fotos a la medida (decisión AI) · ayudante de pruebas/infra/medios-nginx.test.sh. Sin dependencias.

  medios-nginx.py extraer <nginx-X.conf> <puerto_almacen> <puerto_nginx> <dir> [root]
      Saca de la configuración REAL (la del sandbox o la de producción) las ubicaciones de las fotos (/medios/…, las variantes y sus respaldos
      @tl_…), cambia el almacén por el de mentira (127.0.0.1:<puerto_almacen>) y arma un nginx.conf mínimo que escucha en <puerto_nginx>.
      Falla si falta alguna de las cinco ubicaciones: la prueba nunca corre contra una copia a mano.
  medios-nginx.py almacen <dir> <puerto>
      Un Garage de mentira: sirve los archivos de <dir> como el sitio web del bucket (404 si no está) y, como Garage, devuelve la caché de
      un año que guardó la subida (nginx tiene que esconderla en el respaldo).
"""
import http.server
import re
import sys

ESPERADAS = ["^~ /medios/privado/", "/medios/", r"~ ^/medios/n/[0-9a-f-]+\.w[0-9]+\.webp$", "@tl_maestra", "@tl_maestra_sin_webp"]


def bloques(texto):
    """Las ubicaciones del primer server {…}, con su texto completo (llaves balanceadas; ignora comentarios y comillas)."""
    sin_coment = "\n".join(re.sub(r"(^|\s)#.*$", "", l) for l in texto.split("\n"))
    # 23 nov · Solo el primer server (lo que ya decía): el del sitio de vista previa del sandbox (puerto 8081) repite «/medios/» hacia el primero.
    sin_coment = re.split(r"\n\s*server\s*\{", sin_coment, maxsplit=1)[0] if re.match(r"\s*server\s*\{", sin_coment) else sin_coment
    out, i = [], 0
    for m in re.finditer(r"(?m)^\s*location\s+([^{]+?)\s*\{", sin_coment):
        if m.start() < i:
            continue
        nivel, j, comilla = 0, m.end() - 1, None
        while j < len(sin_coment):
            c = sin_coment[j]
            if comilla:
                if c == comilla:
                    comilla = None
            elif c in "\"'":
                comilla = c
            elif c == "{":
                nivel += 1
            elif c == "}":
                nivel -= 1
                if nivel == 0:
                    break
            j += 1
        out.append((m.group(1).strip(), sin_coment[m.start():j + 1].strip()))
        i = j + 1
    return out


def extraer(conf, p_alm, p_ngx, d, root):
    texto = open(conf, encoding="utf-8").read()
    elegidas = [(k, b) for k, b in bloques(texto) if "/medios" in k or k.startswith("@tl_")]
    claves = [k for k, _ in elegidas]
    faltan = [k for k in ESPERADAS if k not in claves]
    if faltan:
        sys.exit(f"{conf}: faltan las ubicaciones {faltan} (hay {claves})")
    cuerpo = "\n".join(b for _, b in elegidas)
    cuerpo = re.sub(r"http://(127\.0\.0\.1|__RED_BASE__):3902", f"http://127.0.0.1:{p_alm}", cuerpo)
    if "3902" in cuerpo:
        sys.exit(f"{conf}: una ubicación de fotos apunta a un almacén que no reconozco")
    print(f"""{"user root;" if root else ""}
worker_processes 1;
error_log {d}/error.log warn;
pid {d}/nginx.pid;
events {{ worker_connections 64; }}
http {{
  access_log off;
  default_type application/octet-stream;
  client_body_temp_path {d}/t/body; proxy_temp_path {d}/t/proxy; fastcgi_temp_path {d}/t/fcgi; uwsgi_temp_path {d}/t/uwsgi; scgi_temp_path {d}/t/scgi;
  server {{
    listen 127.0.0.1:{p_ngx};
{cuerpo}
  }}
}}""")


class Almacen(http.server.SimpleHTTPRequestHandler):
    TIPOS = {".jpg": "image/jpeg", ".webp": "image/webp"}

    def log_message(self, *a):
        pass

    def responder(self, cuerpo_tambien):
        ruta = self.path.split("?")[0]
        if self.headers.get("Host") != "medios.web.garage" or not re.fullmatch(r"/[a-z0-9/._-]+", ruta) or ".." in ruta:
            self.send_error(400)
            return
        try:
            datos = open(self.directory + ruta, "rb").read()
        except OSError:
            self.send_response(404)
            self.send_header("Content-Type", "application/xml")
            self.end_headers()
            if cuerpo_tambien:
                self.wfile.write(b"<Error><Code>NoSuchKey</Code></Error>")
            return
        self.send_response(200)
        self.send_header("Content-Type", self.TIPOS.get(ruta[ruta.rfind("."):], "application/octet-stream"))
        self.send_header("Content-Length", str(len(datos)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        if cuerpo_tambien:
            self.wfile.write(datos)

    def do_GET(self):
        self.responder(True)

    def do_HEAD(self):
        self.responder(False)


if __name__ == "__main__":
    if sys.argv[1] == "extraer":
        extraer(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], len(sys.argv) > 6 and sys.argv[6] == "root")
    elif sys.argv[1] == "almacen":
        d = sys.argv[2]
        http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[3])), lambda *a, **k: Almacen(*a, directory=d, **k)).serve_forever()
    else:
        sys.exit(__doc__)
