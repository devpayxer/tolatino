import "server-only";

/* 8h · El cuerpo de un pedido de la tubería, cortado ANTES de leerlo entero (content-length y, por si miente, contando lo que llega). */
export async function leerCuerpo(req: Request, max: number): Promise<Buffer | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  const r = req.body?.getReader();
  if (!r) return Buffer.alloc(0);
  const partes: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await r.cancel().catch(() => undefined); return null; }
    partes.push(value);
  }
  return Buffer.concat(partes);
}
export const NO_CACHE = { "cache-control": "no-store" } as const;
