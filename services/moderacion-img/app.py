"""Moderación de imágenes propia (fase5-comunidad.md §3 regla `img`, §6 #24; HERRAMIENTAS #28).

Servicio HTTP pequeño, solo en la red interna del compose (sin puertos públicos, sin salida a internet en tiempo de uso):
- GET  /salud      -> {"ok": true, "modelo": ..., "licencia": ...}   (lo usa el Super Admin para decir si responde)
- POST /clasificar -> cuerpo = la foto (JPEG/PNG/WebP, hasta 12 MB); responde
                      {"ok": true, "desnudez": 0.0-1.0, "etiquetas": [...], "violencia": null, "texto": null, "ms": n}

Modelo: NudeNet 3.4.2 (paquete de PyPI, licencia MIT; trae su detector ONNX «320n.onnx»), corrido con onnxruntime en CPU.
Solo detecta desnudez (partes expuestas). Violencia y texto promocional NO los mide este modelo: responde null y la app lo
dice tal cual (nada falso). La foto nunca se guarda aquí: se clasifica en memoria y se olvida.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX = 12 * 1024 * 1024
MODELO = "NudeNet 3.4.2 · 320n.onnx (onnxruntime, CPU)"
LICENCIA = "MIT (paquete nudenet en PyPI)"
# Etiquetas que cuentan como desnudez (las «COVERED», caras, pies y axilas no cuentan).
DESNUDEZ = {
    "FEMALE_GENITALIA_EXPOSED", "MALE_GENITALIA_EXPOSED", "FEMALE_BREAST_EXPOSED", "BUTTOCKS_EXPOSED", "ANUS_EXPOSED",
}

_lock = threading.Lock()
_detector = None
_error = None


def detector():
    """Carga el modelo una vez (perezoso: el servicio arranca aunque el modelo falle, y /salud lo dice)."""
    global _detector, _error
    with _lock:
        if _detector is None and _error is None:
            try:
                from nudenet import NudeDetector  # noqa: WPS433 (import tardío a propósito)
                _detector = NudeDetector()
            except Exception as e:  # el modelo no está o no carga: «no disponible», nunca un resultado inventado
                _error = str(e)[:200]
        return _detector


class H(BaseHTTPRequestHandler):
    server_version = "moderacion-img/1"

    def _json(self, code, data):
        b = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):  # sin registros con datos de nadie
        return

    def do_GET(self):
        if self.path != "/salud":
            return self._json(404, {"ok": False})
        d = detector()
        return self._json(200 if d else 503, {"ok": bool(d), "modelo": MODELO, "licencia": LICENCIA, "error": _error})

    def do_POST(self):
        if self.path != "/clasificar":
            return self._json(404, {"ok": False})
        n = int(self.headers.get("content-length") or 0)
        if n <= 0 or n > MAX:
            return self._json(413, {"ok": False, "error": "tamaño"})
        datos = self.rfile.read(n)
        d = detector()
        if not d:
            return self._json(503, {"ok": False, "error": "modelo no disponible"})
        t = time.time()
        try:
            dets = d.detect(datos)
        except Exception:
            return self._json(415, {"ok": False, "error": "no es una imagen"})
        et = [{"clase": x["class"], "p": round(float(x["score"]), 3)} for x in dets if x["class"] in DESNUDEZ]
        desnudez = max([x["p"] for x in et], default=0.0)
        return self._json(200, {"ok": True, "desnudez": desnudez, "etiquetas": et, "violencia": None, "texto": None,
                                "ms": int((time.time() - t) * 1000), "modelo": MODELO})


if __name__ == "__main__":
    puerto = int(os.environ.get("PUERTO", "8790"))
    detector()
    ThreadingHTTPServer(("0.0.0.0", puerto), H).serve_forever()
