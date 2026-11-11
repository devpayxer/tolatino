/* 8i · El ÚNICO lugar del panel que ofrece Pro con un botón («Ver Pro», «Pro»): en la web lleva a Cobros y plan › Tu plan; dentro de las apps
   de las tiendas (c.compraPro = false, lo decide el servidor) no hay botón (Apple 3.1.3(f), Pagos de Google; guardián sinCompraDigitalEnApp). */
import type { Ctx } from "./Panel";

export function ctaPro(c: Pick<Ctx, "compraPro" | "go">, l: string): { cta?: string; onCta?: () => void } {
  return c.compraPro ? { cta: l, onCta: () => c.go("pay", "plan") } : {};
}
