/* Profesionales · lo que comparten servidor y cliente (4k–4l). Sin acceso a la base. */
export const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const UNIT: Record<string, [string, string]> = { cheque: ["DEL CHEQUE", "OF THE CHECK"], fianza: ["DE LA FIANZA", "OF THE BOND"], carga: ["POR CARGA", "PER LOAD"], caso: ["DE LO QUE GANES", "OF WHAT YOU WIN"] };
export type SvcPrecio = { k: string; cents: number; gov: number; mes: boolean; hrs: string | null; unit: string | null; cred: boolean };
/* El precio de cada forma (priceFor): el total, nunca escondido. */
export function precioPro(s: SvcPrecio, es: boolean): { l: string; s: string } {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (s.k === "fijo") return s.gov ? { l: `${usd(s.cents + s.gov)}${s.mes ? E2("/mes", "/mo") : ""}`, s: E2(`HONORARIO ${usd(s.cents)} + GOBIERNO ${usd(s.gov)}`, `FEE ${usd(s.cents)} + GOVERNMENT ${usd(s.gov)}`) } : { l: `${usd(s.cents)}${s.mes ? E2("/mes", "/mo") : ""}`, s: E2("PRECIO FIJO", "FLAT PRICE") };
  if (s.k === "cons") return s.cents ? { l: usd(s.cents), s: s.cred ? E2("SE DESCUENTA SI LO CONTRATAS", "CREDITED IF YOU HIRE") : E2("CONSULTA", "CONSULTATION") } : { l: E2("Gratis", "Free"), s: E2("CONSULTA GRATIS", "FREE CONSULTATION") };
  if (s.k === "hora") return { l: `${usd(s.cents)}${E2("/hora", "/hour")}`, s: s.hrs ? E2(`ESTIMADO ${s.hrs} H`, `ESTIMATED ${s.hrs} H`) : E2("POR HORA", "HOURLY") };
  if (s.k === "pct") return { l: `${s.cents / 100} %`, s: `${(UNIT[s.unit ?? "caso"] ?? UNIT.caso!)[es ? 0 : 1]} · ${E2("SOLO SI GANAS · SI NO, $0", "ONLY IF YOU WIN · IF NOT, $0")}` };
  if (s.k === "cotiza") return s.cents ? { l: `${E2("Desde ", "From ")}${usd(s.cents)}`, s: E2("TOTAL POR ESCRITO EN LA CONSULTA", "TOTAL IN WRITING AT THE CONSULTATION") } : { l: E2("Se cotiza", "Quoted"), s: E2("TOTAL POR ESCRITO EN LA CONSULTA", "TOTAL IN WRITING AT THE CONSULTATION") };
  return { l: s.cents ? usd(s.cents) : E2("Gratis", "Free"), s: E2("SIN CITA", "WALK-IN") };
}

