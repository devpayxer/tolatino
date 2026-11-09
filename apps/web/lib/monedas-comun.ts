/* Monedas y cupones · lo que comparten las pantallas y el servidor (sin base): las líneas fijas (§1c, MD L1327; admin gam coin) y la
   forma de lo que el servidor manda a APP-GAM-MONEDAS, al panel del negocio (Cupones por monedas) y al Super Admin. Las monedas no tienen
   valor en dinero: no se compran, no se venden, no se transfieren, no se cambian por dinero y no vencen (§6 #3). */
type Bi = { es: string; en: string };

export const SIN_VALOR: Bi = { es: "Sin valor en dinero", en: "No cash value" };
export const LINEA_MONEDAS: Bi = { es: "Se ganan, nunca se compran. Sin valor en dinero: no se venden, no se pasan a otra persona y no vencen.", en: "Earned, never bought. No cash value: they can’t be sold, passed to someone else, and they don’t expire." };
export const REGLAS_MONEDAS: Bi[] = [
  { es: "Las monedas se ganan, nunca se compran. Aquí no se juega dinero.", en: "Coins are earned, never bought. No money is played here." },
  { es: "No tienen valor en dinero: no se cambian, no se venden y no se pasan a otra persona.", en: "They have no cash value: they can’t be exchanged, sold or passed to someone else." },
  { es: "Uno por persona en cada cupón. Si el código vence sin usarse, te devolvemos las monedas.", en: "One per person per coupon. If the code expires unused, we return your coins." },
];
/* Lo que cada canje explica antes de confirmar (prototipo sheet «cup»). */
export const NOTA_CANJE = (dias: number): Bi => ({
  es: `Uno por persona. Vence ${dias} días después de canjearlo. No se cambia por dinero.`,
  en: `One per person. Expires ${dias} days after redeeming. Not exchangeable for cash.`,
});
export const COSTO_MIN = 80, COSTO_MAX = 1000;

export type CuponVecino = {
  id: string; titulo: Bi; condiciones: Bi; costo: number; dias: number; negocio: { id: string; nombre: string; foto: string | null };
  agotado: boolean; mio: { codigo: string; vence: string; estado: "issued" | "used" } | null;
};
export type MiCanje = { id: string; codigo: string; titulo: Bi; negocio: { id: string; nombre: string }; costo: number; estado: "issued" | "used" | "expired"; vence: string; usado: string | null; at: string };
export type Movimiento = { id: string; t: Bi; v: number; at: string };
export type MisMonedas = {
  saldo: number; ciudad: string; reglas: { key: string; label: Bi; v: number }[];
  cupones: CuponVecino[]; masCupones: string | null; mios: MiCanje[]; masMios: string | null; log: Movimiento[]; masLog: string | null;
};

/* Panel del negocio · Cupones por monedas. */
export type EstadoCupon = "pending" | "live" | "paused" | "ended";
export type CuponNegocio = {
  id: string; titulo: Bi; condiciones: Bi; costo: number | null; cupo: number; dias: number; estado: EstadoCupon; pausaPor: "business" | "admin" | null; motivo: string | null;
  mes: number; usados: number; vivos: number; creado: string;
};
export type CuponesPanel = { cupones: CuponNegocio[]; usados: { codigo: string; titulo: Bi; at: string }[]; diasDef: number };
