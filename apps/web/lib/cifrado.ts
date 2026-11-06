import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/* Cifrado de columna para lo sensible (op_private.note_enc · fase4-salud-pro.md §3): AES-256-GCM con la llave de los secretos
   del entorno (DATOS_SECRET, la crea infra/pruebas/deploy.sh en el servidor; nunca pasa por el chat). Formato:
   12 bytes iv · 16 bytes tag · texto cifrado. En el sandbox, sin DATOS_SECRET, se deriva de AUTH_SECRET; en producción
   es obligatoria (sin llave no se guarda la nota: falla y no se pierde nada a escondidas). */
function llave(): Buffer {
  const d = process.env.DATOS_SECRET;
  if (d && d.length >= 32) return createHash("sha256").update(`op_private:${d}`).digest();
  if (process.env.TOLATINO_ENTORNO === "produccion") throw new Error("Falta DATOS_SECRET en los secretos del entorno");
  const a = process.env.AUTH_SECRET ?? "sandbox-sin-secreto";
  return createHash("sha256").update(`op_private:sandbox:${a}`).digest();
}
export function cifrar(texto: string): Buffer {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", llave(), iv);
  const ct = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}
export function descifrar(b: Buffer | null | undefined): string | null {
  if (!b || b.length < 29) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", llave(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch { return null; } // llave cambiada o dato dañado: no se muestra nada (nunca el cifrado)
}
