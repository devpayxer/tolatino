/* Colores del correo. Los clientes de correo no leen variables CSS, así que van en hex; el guardián «coloresCorreo»
   comprueba que cada uno sea igual al token de packages/ui/src/tokens.css (no se pueden desalinear). */
export const C = {
  ink: "#0B0E12", // GUARDIAN-OK: --tl-ink (correo)
  action: "#4B37F5", // GUARDIAN-OK: --tl-action (correo)
  signal: "#00E5C4", // GUARDIAN-OK: --tl-signal (correo)
  paper: "#F7F6F3", // GUARDIAN-OK: --tl-paper (correo)
  white: "#FFFFFF", // GUARDIAN-OK: --tl-white (correo)
} as const;
