import "server-only";
/* 8g · «Un boleto, una fecha o un evento acaba de cambiar»: quien lo cambió llama pasesPronto() DESPUÉS de su transacción (los triggers de 0129
   ya tocaron los pases adentro de ella) y el trabajador manda ya los avisos a Apple Wallet y pone al día Google Wallet, sin esperar al
   trabajador de push (5 s) ni al barrido (1 min). Import diferido: los módulos de boletos no cargan lib/pases hasta que hace falta (guardián
   paseSigueAlBoleto). Nunca falla hacia quien llama. */
export function pasesPronto(): void {
  void import("./pases").then((m) => m.pasesPronto()).catch(() => undefined);
}
