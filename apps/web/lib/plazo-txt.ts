/* 9n-5 · Un plazo de Sistema › Configuración dicho en palabras, con su plural en los dos idiomas: «1 hora» / «24 horas»,
   «1 hour» / «24 hours», «1 día» / «30 días». Sin servidor: el número llega de lib/config.ts (valor, valores o cfgSql) y la
   pantalla solo lo dice. Nunca un número fijo en el texto. */
export const horasTxt = (n: number, es: boolean) => `${n} ${es ? (n === 1 ? "hora" : "horas") : n === 1 ? "hour" : "hours"}`;
export const diasTxt = (n: number, es: boolean) => `${n} ${es ? (n === 1 ? "día" : "días") : n === 1 ? "day" : "days"}`;
export const minTxt = (n: number, es: boolean) => `${n} ${es ? (n === 1 ? "minuto" : "minutos") : n === 1 ? "minute" : "minutes"}`;
/* Un día de la semana de Configuración (ISO: 1 = lunes … 7 = domingo, como evt_pago_dia) en palabras: diaSemana(2, es) = «martes» /
   «Tuesday»; diaSemanaTxt(2, es) = «el martes» / «Tuesday» («te llega el martes después…» / «the Tuesday after…»). */
const DIA_SEM = { es: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"], en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] };
export const diaSemana = (n: number, es: boolean) => DIA_SEM[es ? "es" : "en"][(((Math.round(n) - 1) % 7) + 7) % 7]!;
export const diaSemanaTxt = (n: number, es: boolean) => (es ? `el ${diaSemana(n, true)}` : diaSemana(n, false));
