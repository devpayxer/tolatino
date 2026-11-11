/* Los colores de las cáscaras salen de los tokens del sistema de diseño (packages/ui/src/tokens.css), nunca escritos en los scripts. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOKENS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../packages/ui/src/tokens.css"), "utf8");
export const token = (n) => {
  const m = new RegExp(`${n}:\\s*(#[0-9A-Fa-f]{6})\\b`).exec(TOKENS);
  if (!m) throw new Error(`token ${n} no está en tokens.css`);
  return m[1].toUpperCase();
};
