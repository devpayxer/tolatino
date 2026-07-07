// Pure, DOM-free QR encoder over qrcode-generator (MIT © Kazuhiko Arase) — a
// battle-tested pure-JS encoder, so it's SSR / static-export safe (no window or
// DOM at module load or call time). We do NOT hand-vendor an encoder: a hand copy
// risks the worst "renders but won't scan" failure.
import qrcode from 'qrcode-generator';

export type QrMatrix = { n: number; dark: boolean[][] };

/** Encode `value` into a QR module matrix. typeNumber 0 = auto-fit the smallest
 *  version; ecl = error-correction level ('M' is the scan-robust default). */
export function qrMatrix(value: string, ecl: 'L' | 'M' | 'Q' | 'H' = 'M'): QrMatrix {
  const qr = qrcode(0, ecl);
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const dark = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
  return { n, dark };
}
