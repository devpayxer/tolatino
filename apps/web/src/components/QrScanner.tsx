'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// BarcodeDetector is Chromium/Android only. This hook resolves true ONLY when the
// browser can detect QR codes, so the scanner UI is HIDDEN (never broken) on
// iOS Safari / Firefox — manual code entry stays the primary path there.
export function useBarcodeSupport(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const BD = (window as unknown as { BarcodeDetector?: { getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
        if (!BD) return;
        const fmts = await BD.getSupportedFormats();
        if (!cancelled) setOk(fmts.includes('qr_code'));
      } catch { /* unsupported */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return ok;
}

// Live camera QR scanner. Feeds the first detected code to onCode. MANDATORY cleanup
// stops the RAF loop + camera tracks (or the camera LED leaks). Only mount when
// useBarcodeSupport() is true.
export function QrScanner({ onCode, onClose, L }: { onCode: (v: string) => void; onClose: () => void; L: (a: string, b: string) => string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let stopped = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        const BD = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const detector = new BD({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes[0] && codes[0].rawValue) {
              stopped = true;
              cancelAnimationFrame(raf);
              stream?.getTracks().forEach((t) => t.stop());
              onCode(codes[0].rawValue.trim());
              return;
            }
          } catch { /* frame not ready yet */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!stopped) setErr(true);
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="relative overflow-hidden rounded-card bg-ink">
      <video ref={videoRef} autoPlay playsInline muted className="block h-[240px] w-full object-cover" />
      <button onClick={onClose} aria-label={L('Cerrar', 'Close')} className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white">
        <X size={18} strokeWidth={2.4} />
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-ink/60 px-3 py-2 text-center text-[11px] font-bold text-white">
        {err ? L('No se pudo abrir la cámara — usa el código manual.', "Couldn't open the camera — use the manual code.") : L('Apunta al código QR del boleto', "Point at the ticket's QR code")}
      </div>
    </div>
  );
}
