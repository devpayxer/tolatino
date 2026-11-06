/* CSV para Excel o Sheets. Las celdas que empiezan con = + - @ se neutralizan: una hoja de cálculo nunca ejecuta lo que
   escribió un negocio o un vecino (inyección de fórmulas). */
export const celda = (v: unknown) => {
  let t = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
export const csv = (cab: string[], filas: unknown[][]) => [cab, ...filas].map((f) => f.map(celda).join(",")).join("\r\n");
