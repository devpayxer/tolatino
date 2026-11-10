"use client";
/* To'Latino Puerta · la cámara (CHK-SCAN; fase6-eventos.md §3: BarcodeDetector donde exista; jsQR (Apache-2.0, dentro del repo) en un
   Worker donde no, p. ej. iOS). Escaneo continuo, cámara trasera, linterna si el teléfono la tiene. Solo entrega el texto del QR: la
   firma, la versión y si entra lo decide el servidor. El mismo QR seguido no se manda dos veces (3.5 s). Nada se guarda ni se sube aparte. */
import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@tolatino/ui";
type Det = { detect: (v: HTMLVideoElement) => Promise<{ rawValue?: string }[]> };

export function Escaner({ activo, onCodigo, linterna, es, onLinterna }: { activo: boolean; onCodigo: (t: string) => void; linterna: boolean; es: boolean; onLinterna?: (puede: boolean) => void }) {
  const video = useRef<HTMLVideoElement>(null), act = useRef(activo), cb = useRef(onCodigo), pista = useRef<MediaStreamTrack | null>(null);
  const [estado, setEstado] = useState<"pidiendo" | "listo" | "sin_permiso" | "sin_camara">("pidiendo"), [intento, setIntento] = useState(0);
  act.current = activo; cb.current = onCodigo;
  useEffect(() => {
    let parado = false, stream: MediaStream | null = null, worker: Worker | null = null, timer: ReturnType<typeof setInterval> | null = null, ocupado = false, n = 0;
    let ultimo = { t: "", at: 0 };
    const emitir = (t: string | null | undefined) => {
      if (!t || parado || !act.current) return;
      const ahora = Date.now();
      if (t === ultimo.t && ahora - ultimo.at < 3500) return;
      ultimo = { t, at: ahora };
      cb.current(t);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado("sin_camara"); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
      catch (e) { setEstado((e as { name?: string }).name === "NotAllowedError" ? "sin_permiso" : "sin_camara"); return; }
      if (parado) { stream.getTracks().forEach((x) => x.stop()); return; }
      const v = video.current!;
      v.srcObject = stream; v.muted = true; v.setAttribute("playsinline", "");
      await v.play().catch(() => undefined);
      pista.current = stream.getVideoTracks()[0] ?? null;
      const caps = (pista.current?.getCapabilities?.() ?? {}) as { torch?: boolean };
      onLinterna?.(!!caps.torch);
      setEstado("listo");
      let det: Det | null = null;
      const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Det; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
      if (BD) { try { const f = (await BD.getSupportedFormats?.()) ?? []; if (f.includes("qr_code")) det = new BD({ formats: ["qr_code"] }); } catch { det = null; } }
      const lienzo = document.createElement("canvas"), ctx = lienzo.getContext("2d", { willReadFrequently: true });
      if (!det) { worker = new Worker("/puerta/lector.js"); worker.onmessage = (m: MessageEvent<{ texto: string | null }>) => { ocupado = false; emitir(m.data?.texto); }; }
      timer = setInterval(() => {
        if (ocupado || !act.current || v.readyState < 2 || !v.videoWidth) return;
        ocupado = true;
        if (det) { det.detect(v).then((r) => emitir(r[0]?.rawValue)).catch(() => undefined).finally(() => { ocupado = false; }); return; }
        // Un cuadro reducido (el QR del boleto se lee bien a 640 px) al Worker; el Worker contesta y suelta «ocupado».
        const w = Math.min(640, v.videoWidth), h = Math.round((v.videoHeight * w) / v.videoWidth);
        lienzo.width = w; lienzo.height = h;
        if (!ctx) { ocupado = false; return; }
        ctx.drawImage(v, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        worker!.postMessage({ px, w, h, n: ++n }, [px.buffer]);
      }, 160);
    })();
    return () => { parado = true; if (timer) clearInterval(timer); worker?.terminate(); stream?.getTracks().forEach((x) => x.stop()); pista.current = null; };
  }, [intento]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = pista.current;
    if (!t) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void t.applyConstraints({ advanced: [{ torch: linterna } as any] }).catch(() => undefined);
  }, [linterna, estado]);
  const E2 = (a: string, b: string) => (es ? a : b);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", maxHeight: "62dvh", borderRadius: 22, overflow: "hidden", background: "var(--tl-dark-2)" }}>
      <video ref={video} aria-label={E2("Cámara para escanear el QR", "Camera to scan the QR")} style={{ width: "100%", height: "100%", objectFit: "cover", display: estado === "listo" ? "block" : "none" }} />
      {estado === "listo" ? (
        <span aria-hidden style={{ position: "absolute", inset: "18%", borderRadius: 20, border: "3px solid rgba(255,255,255,.85)", boxShadow: "0 0 0 2000px rgba(11,14,18,.35)" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", color: "var(--tl-white)" }}>
          <Icon name={estado === "pidiendo" ? "grid" : "warning"} size={34} color="var(--tl-white)" />
          <span style={{ font: "800 17px/1.3 Sora,sans-serif" }}>{estado === "pidiendo" ? E2("Abriendo la cámara…", "Opening the camera…") : estado === "sin_permiso" ? E2("La cámara está bloqueada", "The camera is blocked") : E2("No encontramos la cámara", "We could not find the camera")}</span>
          {estado !== "pidiendo" ? <>
            <span style={{ font: "500 13.5px/1.5 Manrope,sans-serif", opacity: 0.75 }}>{E2("Permite la cámara para To’Latino en los ajustes del navegador. Mientras, busca a cada persona por nombre o código.", "Allow the camera for To’Latino in your browser settings. Meanwhile, search each person by name or code.")}</span>
            <Button variant="secondary" size="md" onClick={() => { setEstado("pidiendo"); setIntento((x) => x + 1); }}>{E2("Probar otra vez", "Try again")}</Button>
          </> : null}
        </div>
      )}
    </div>
  );
}
