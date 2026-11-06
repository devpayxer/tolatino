/* El primer nombre de una persona para hablarle o nombrarla corto («Luis», «Yesenia»), sin el título profesional:
   «Dra. Yesenia Rosario» → «Yesenia», «Lcdo. Julio Taveras» → «Julio» (4h-3: el panel decía «LO PONE DRA.»).
   Sin acceso a la base: lo usan cliente y servidor. */
const TITULOS = /^(dr|dra|doctor|doctora|lic|lcdo|lcda|licdo|licda|ing|arq|prof|profa|sr|sra|srta|mr|mrs|ms|rev|pastor|pastora)\.?$/i;
export function primerNombre(n: string | null | undefined): string {
  const p = String(n ?? "").trim().split(/\s+/).filter(Boolean);
  const x = p.find((w) => !TITULOS.test(w)) ?? p[0] ?? "";
  return x.replace(/,$/, "");
}
