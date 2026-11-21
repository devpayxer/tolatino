"""Video de presentación del negocio (C-001): procesar propio con ffmpeg (LGPL/GPL, programa libre; HERRAMIENTAS «construir lo propio»).

Servicio HTTP pequeño, solo en la red interna del compose (sin puertos públicos, sin salida a internet):
- GET  /salud     -> {"ok": true, "ffmpeg": "<versión>"}
- POST /procesar  -> cuerpo = el video tal como lo subió el negocio (MP4, MOV del iPhone, WebM…; hasta 120 MB).
                     Responde {"ok": true, "segundos": n, "ancho": w, "alto": h, "mp4": <base64>, "portada": <base64 jpg>}
                     o {"ok": false, "error": "no_es_video" | "muy_grande" | "fallo"}.
                     9t · Medios en flujo: con «Accept: application/x-tolatino-video» (la app de hoy) contesta en BINARIO: cabeceras x-segundos,
                     x-ancho, x-alto, x-portada-bytes y el cuerpo = la portada JPEG y después el MP4 (sin base64, sin JSON grande: la app lo pasa
                     por partes a su disco y al almacén). Sin esa cabecera, el JSON de arriba (por compatibilidad). Los errores son siempre JSON.
                     La entrada se escribe a la carpeta temporal POR PARTES (1 MB a la vez): nunca está entera en memoria.
Lo que hace: deja solo los primeros 30 s (?max=), el lado largo a 1280 px como mucho (720p), H.264 + AAC en MP4 con «faststart»
(empieza a verse antes de terminar de bajar), SIN metadatos (fuera la ubicación GPS del teléfono, la fecha y el modelo), y saca la
portada del segundo 1 (o del 0 si dura menos). El video nunca se guarda aquí: se procesa en una carpeta temporal y se borra.
"""
import base64
import json
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

MAX = 120 * 1024 * 1024
TROZO = 1024 * 1024  # 9t · de a 1 MB: la entrada y la salida nunca enteras en memoria
PUERTO = int(os.environ.get("PUERTO", "8791"))
TIEMPO = 150  # segundos como mucho para procesar un video


def correr(args, t=TIEMPO):
    return subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, timeout=t, check=False)


def version():
    try:
        r = correr(["ffmpeg", "-hide_banner", "-version"], 10)
        return r.stdout.decode("utf8", "replace").splitlines()[0][:80]
    except Exception:  # sin ffmpeg: /salud lo dice, nunca se inventa un resultado
        return None


def sondear(ruta):
    r = correr(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", ruta], 30)
    if r.returncode != 0:
        return None
    d = json.loads(r.stdout or b"{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v:
        return None
    try:
        dur = float(d.get("format", {}).get("duration") or v.get("duration") or 0)
    except ValueError:
        dur = 0.0
    return {"dur": dur, "audio": any(s.get("codec_type") == "audio" for s in d.get("streams", []))}


def recibir(rfile, n, ruta):
    """La entrada a disco por partes; False si llegó menos de lo anunciado (la conexión se cortó)."""
    quedan = n
    with open(ruta, "wb") as f:
        while quedan > 0:
            parte = rfile.read(min(TROZO, quedan))
            if not parte:
                return False
            f.write(parte)
            quedan -= len(parte)
    return True


def procesar(tmp, maximo):
    """El video ya está en tmp/entrada. Devuelve el resultado con las RUTAS de salida (quien llama borra tmp)."""
    try:
        ent, sal, por = os.path.join(tmp, "entrada"), os.path.join(tmp, "salida.mp4"), os.path.join(tmp, "portada.jpg")
        s = sondear(ent)
        if not s or s["dur"] <= 0.2:
            return {"ok": False, "error": "no_es_video"}
        # Lado largo a 1280 como mucho (720p), medidas pares (H.264), sin agrandar lo que es más chico.
        escala = "scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))',scale=trunc(iw/2)*2:trunc(ih/2)*2"
        args = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", ent, "-t", str(maximo), "-map", "0:v:0", "-map", "0:a:0?",
                "-map_metadata", "-1", "-map_chapters", "-1", "-vf", escala, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
                "-profile:v", "main", "-pix_fmt", "yuv420p", "-r", "30", "-threads", "2", "-movflags", "+faststart"]
        args += (["-c:a", "aac", "-b:a", "96k", "-ac", "2"] if s["audio"] else ["-an"]) + [sal]
        r = correr(args)
        if r.returncode != 0 or not os.path.exists(sal):
            return {"ok": False, "error": "fallo"}
        f2 = sondear(sal) or {"dur": 0}
        dur = min(float(maximo), f2["dur"] or s["dur"])
        en = "1" if dur > 1.5 else "0"
        correr(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", en, "-i", sal, "-frames:v", "1", "-q:v", "3", por], 30)
        if not os.path.exists(por):
            return {"ok": False, "error": "fallo"}
        dim = correr(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", sal], 20)
        st = (json.loads(dim.stdout or b"{}").get("streams") or [{}])[0]
        return {"ok": True, "segundos": round(dur, 2), "ancho": st.get("width"), "alto": st.get("height"), "mp4": sal, "portada": por}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "fallo"}


class Manejo(BaseHTTPRequestHandler):
    def responder(self, codigo, datos):
        cuerpo = json.dumps(datos).encode()
        self.send_response(codigo)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):  # noqa: N802
        if urlparse(self.path).path == "/salud":
            v = version()
            return self.responder(200 if v else 503, {"ok": bool(v), "ffmpeg": v})
        self.responder(404, {"ok": False})

    def do_POST(self):  # noqa: N802
        u = urlparse(self.path)
        if u.path != "/procesar":
            return self.responder(404, {"ok": False})
        n = int(self.headers.get("content-length") or 0)
        if n <= 0 or n > MAX:
            return self.responder(413, {"ok": False, "error": "muy_grande"})
        try:
            maximo = max(1, min(60, int(parse_qs(u.query).get("max", ["30"])[0])))
        except ValueError:
            maximo = 30
        tmp = tempfile.mkdtemp(prefix="video-")
        try:
            if not recibir(self.rfile, n, os.path.join(tmp, "entrada")):
                return self.responder(400, {"ok": False, "error": "fallo"})
            r = procesar(tmp, maximo)
            if not r["ok"]:
                return self.responder(422, r)
            if "application/x-tolatino-video" in (self.headers.get("accept") or ""):
                return self.binario(r)
            with open(r["mp4"], "rb") as a, open(r["portada"], "rb") as b:
                r = {**r, "mp4": base64.b64encode(a.read()).decode(), "portada": base64.b64encode(b.read()).decode()}
            self.responder(200, r)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def binario(self, r):
        """La portada y el MP4 tal cual, por partes desde el disco (sin base64 ni JSON grande)."""
        np, nm = os.path.getsize(r["portada"]), os.path.getsize(r["mp4"])
        self.send_response(200)
        self.send_header("content-type", "application/x-tolatino-video")
        self.send_header("content-length", str(np + nm))
        self.send_header("x-segundos", str(r["segundos"]))
        self.send_header("x-ancho", str(r["ancho"] or ""))
        self.send_header("x-alto", str(r["alto"] or ""))
        self.send_header("x-portada-bytes", str(np))
        self.end_headers()
        for ruta in (r["portada"], r["mp4"]):
            with open(ruta, "rb") as f:
                shutil.copyfileobj(f, self.wfile, TROZO)

    def log_message(self, *a):  # sin registro de cada pedido (nada personal en los registros)
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PUERTO), Manejo).serve_forever()
