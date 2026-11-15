/* 9n-5 · Un plazo de Sistema › Configuración dicho en palabras, con su plural en los dos idiomas: «1 hora» / «24 horas»,
   «1 hour» / «24 hours», «1 día» / «30 días». Sin servidor: el número llega de lib/config.ts (valor, valores o cfgSql) y la
   pantalla solo lo dice. Nunca un número fijo en el texto. */
export const horasTxt = (n: number, es: boolean) => `${n} ${es ? (n === 1 ? "hora" : "horas") : n === 1 ? "hour" : "hours"}`;
export const diasTxt = (n: number, es: boolean) => `${n} ${es ? (n === 1 ? "día" : "días") : n === 1 ? "day" : "days"}`;
