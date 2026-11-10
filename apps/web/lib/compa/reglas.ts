import "server-only";

/* 7c · Lo que el SERVIDOR decide antes de llamar al modelo (fase7-compa.md §3 «Pasar a una persona»): dinero, cuenta, seguridad, emergencia
   y «quiero una persona», en español e inglés. Ante la duda, persona. Esto nunca se discute con el modelo:
   - emergencia → «llama al 911» (sin modelo; «Con una persona» a la vista);
   - dinero (cobros dobles, devoluciones, un cargo que no reconoce) → caso de Soporte con resumen, sin modelo;
   - seguridad (alguien entró a mi cuenta, acoso, amenaza, estafa) → caso de Soporte con prioridad alta, sin modelo;
   - cuenta (cambiar teléfono, ciudad, borrar la cuenta) → «Te abro Mi cuenta para eso. Tú confirmas cada cambio.» (open_screen);
   - pidió persona → caso de Soporte.
   Va sobre el texto ya tapado. */
export type Detectado = { tipo: "emergencia" } | { tipo: "dinero" } | { tipo: "seguridad" } | { tipo: "pidio" }
  | { tipo: "cuenta"; pantalla: "cuenta_telefono" | "cuenta_ciudad" | "cuenta_privacidad" } | null;

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const EMERGENCIA = /\b911\b|\bemergencia|\bambulancia|\bme (estoy muriendo|muero)\b|\bincendio\b|\bse esta quemando|\bsobredosis|\bme quiero morir|\bsuicid|\bemergency\b|\bambulance\b|\bon fire\b|\bheart attack\b|\boverdose\b|\bkill myself\b/;
const SEGURIDAD = /\b(alguien|otra persona) (entro|se metio|esta usando) (a|en) mi cuenta|\bentraron (a|en) mi cuenta|\bme (hackearon|robaron) (la|mi) cuenta|\bhacke|\bme (esta|estan) acosando|\bacoso\b|\bme amenaz|\bamenaza|\bestafa|\bme estafaron|\bfraude\b|\bsomeone (got|logged|broke) into my account|\bhacked\b|\bharass|\bthreat|\bscam(med)?\b|\bfraud\b|\bstalk/;
const DINERO = /\bme (cobraron|cobro|cobr[oa]ron)\b|\bcobr(o|aron|ado) (de mas|doble|dos veces)|\bdos veces\b.{0,30}\bcobr|\bcobr.{0,30}\bdos veces\b|\bdoble cobro|\bquiero (mi|una|el) (devolucion|reembolso|dinero)|\bdevuelvan(me)?\b|\bno me (han )?(llegado|llego|devuelto) (la|mi|el) (devolucion|reembolso|dinero|pago)|\bcargo que no\b|\bno reconozco (un|este|el|ese) (cargo|cobro)|\bcontracargo|\brefund me\b|\bi want (a|my) refund|\bcharged (me )?(twice|double|two times)|\bdouble charge|\bovercharg|\bunrecogni[sz]ed charge|\bchargeback|\bmy money back\b|\b(didn'?t|did not|never) (get|receive) my refund/;
const PERSONA = /\b(hablar|habla|hablo|comunicarme|quiero) con (una |un )?(persona|humano|agente|alguien del equipo|representante)\b|\bpersona real\b|\b(talk|speak) (to|with) (a )?(person|human|agent|representative|someone)\b|\breal person\b/;
const TEL = /\bcambiar (mi |el )?(telefono|numero|celular)\b|\bnuevo (numero|telefono)\b|\bchange (my )?(phone|number)\b/;
const CIUDAD = /\bcambiar (mi |de )?ciudad\b|\bme (mude|mudo) (a|de)\b|\bchange (my )?city\b|\bi moved to\b/;
const PRIVACIDAD = /\b(borrar|eliminar|cerrar) (mi )?cuenta\b|\bmis datos\b|\bprivacidad\b|\bdelete (my )?account\b|\bmy data\b|\bprivacy\b/;

export function detectar(textoTapado: string): Detectado {
  const t = sinAcentos(String(textoTapado ?? ""));
  if (EMERGENCIA.test(t)) return { tipo: "emergencia" };
  if (SEGURIDAD.test(t)) return { tipo: "seguridad" };
  if (DINERO.test(t)) return { tipo: "dinero" };
  if (TEL.test(t)) return { tipo: "cuenta", pantalla: "cuenta_telefono" };
  if (CIUDAD.test(t)) return { tipo: "cuenta", pantalla: "cuenta_ciudad" };
  if (PRIVACIDAD.test(t)) return { tipo: "cuenta", pantalla: "cuenta_privacidad" };
  if (PERSONA.test(t)) return { tipo: "pidio" };
  return null;
}

/* Las líneas fijas (fase7-compa.md §1c; nunca se suavizan). */
export const LINEAS = {
  emergencia: { es: "Si es una emergencia, llama al 911 ahora.", en: "If this is an emergency, call 911 now." },
  dinero: { es: "Eso lo revisa una persona del equipo: yo no muevo dinero ni cambio tu cuenta. Ya le pasé tu caso con el resumen.", en: "A person on the team reviews that: I don't move money or change your account. I already passed your case on with a summary." },
  seguridad: { es: "Eso lo ve una persona del equipo ahora mismo. Ya le pasé tu caso con el resumen. Si estás en peligro, llama al 911.", en: "A person on the team handles that right away. I already passed your case on with a summary. If you are in danger, call 911." },
  pidio: { es: "Te paso con una persona del equipo. Ya le dejé el resumen para que no tengas que repetirlo.", en: "I'm passing you to a person on the team. I left them a summary so you don't have to repeat it." },
  cuenta: { es: "Te abro Mi cuenta para eso. Tú confirmas cada cambio.", en: "I'll open My account for that. You confirm every change." },
  persona: { es: "Con una persona", en: "Talk to a person" },
  noSe: { es: "No tengo ese dato. Si quieres, te paso con una persona.", en: "I don't have that information. If you want, I'll pass you to a person." },
  apagado: { es: "El Compa no está disponible ahora. Escríbele a Soporte: te contesta una persona.", en: "El Compa is not available right now. Write to Support: a person will answer." },
  limite: { es: "Escribiste muchos mensajes seguidos. Si lo necesitas, te paso con una persona.", en: "You wrote many messages in a row. If you need to, I'll pass you to a person." },
  larga: { es: "Esta conversación ya es larga. Empieza otra o habla con una persona.", en: "This conversation is already long. Start a new one or talk to a person." },
} as const;
