"use client";
/* APP-NEG-CITA-AYUDA y APP-NEG-CITA-AYUDA-ESTADO · móvil y desktop (diseño neg-cita-help.js, vistas pe / ps del
   prototipo): tu cita, fotos, qué pasó (motivo + nota + cuánto), qué quieres, cómo funciona y «Enviar solicitud»; luego el
   estado (pendiente, aceptó, te proponen un cambio, no pudo, en revisión de To'Latino, terminada), la respuesta del
   negocio, el camino (OrderTracker) y lo que mandaste. Compuesto con el sistema de diseño (Chip, Button, Icon, OrderTracker). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import type { CitaAyudaVista, MotivoCita, QuiereCita } from "@/lib/ayuda-cita";
import type { CitaVista } from "@/lib/citas";
import { subirFoto, subirFotoPrivada } from "@/lib/subir-foto";
import { ayudaCitaPedir, ayudaCitaResponder } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-4";
const T17 = "font-display text-[17px] font-extrabold leading-[1.2] tracking-[-0.03em]";
const RSN_B: [MotivoCita, string, string, boolean][] = [["cobro", "Cobraron más del precio publicado", "Charged more than the posted price", true], ["quien", "No me atendió quien reservé", "Not the person I booked", false],
  ["quedo", "No quedó como lo pedí", "It did not turn out as I asked", true], ["espera", "Esperé mucho a pesar de la cita", "Long wait despite the booking", false],
  ["dep", "No me devolvieron el depósito", "Deposit not returned", false], ["otro", "Otra cosa", "Something else", false]];

/* Lo que la pantalla usa de la operación: una cita, o (4s) un pedido del mercado M-… o un apartado A-… armados igual. */
export type CabezaAyuda = Pick<CitaVista, "numero" | "con" | "model" | "svc" | "dep" | "pro" | "total"> & { negocio: Pick<CitaVista["negocio"], "nombre" | "telefono" | "foto">;
  // 4if · Visitas y pruebas (D-…): la copia del total que la persona vio al pedir y qué pidió (visita · prueba · cita…).
  copia?: { k: { es: string; en: string }; cents: number } | null; que?: string };
export function AyudaCita({ c, v, es }: { c: CabezaAyuda; v: CitaAyudaVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  // Auto (CFG.ahelp) y Hogar (neg-hogar-rev.js): sus motivos, lo que se pide y sus textos; Belleza sigue igual (bhelp).
  // Doctores (neg-salud-rev.js RSN) y Profesionales (neg-pro-rev.js RSN): nada se cobra en la app; fotos privadas.
  const rub = v.rubro, sp = rub === "salud" || rub === "pro";
  // Mercados (neg-merc-rev.js RSN) y Tiendas (neg-tienda-rev.js RSN), 4s.
  // Fiestas (neg-fiesta-rev.js RSN) y Transporte (neg-trans-rev.js RSN), 4z: fotos obligatorias en lo acordado, faltó, cobro,
  // daños y equipaje; «Manejo inseguro» va directo a To'Latino.
  // Noche (neg-noche-rev.js RSN, 4nd): fotos del recibo o de la pantalla con el cover publicado (nunca de un ID); «Me sentí
  // inseguro» va directo a To'Latino.
  // Educación, Niños y Deporte (RSNS L24–26, 4ef): fotos del recibo, el contrato o lo publicado; «No cuidaron bien a mi niño» va
  // directo a To'Latino con el aviso de ChildLine (§6 #8).
  // Iglesias, Bienes Raíces y Autos (RSNS L27–29, 4if): fotos del recibo, el contrato o lo publicado; nada se cobró en la app. «Me pidieron
  // dinero por la ayuda», «Me cobraron por ver» y «Pidieron más para mudarme» van directo a To'Latino (Posible estafa) y lo ofrecido se pausa.
  const sd = rub === "fe" || rub === "inm" || rub === "dealer";
  // 6d · Boletos (APP-EVT-AYUDA-PAGO): «Un problema con el pago» va directo a To'Latino (el cobro de boletos es de la plataforma).
  const RSN: [MotivoCita, string, string, boolean][] = rub === "evt" ? [["doble", "Me cobraron dos veces", "I was charged twice", false], ["monto", "El cobro no es el que vi", "The charge is not what I saw", false],
      ["sinbol", "Pagué y no tengo mis boletos", "I paid and I do not have my tickets", false], ["otro", "Otra cosa con el pago", "Something else about the payment", false]]
    : rub === "fe" ? [["cobro", "Me pidieron dinero por la ayuda", "They asked me for money for the help", true], ["idioma", "No había servicio en español", "There was no service in Spanish", false],
      ["horario", "Cambiaron la hora sin avisar", "They changed the time without notice", false], ["trato", "Me trataron mal", "They treated me badly", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "inm" ? [["ver", "Me cobraron por ver la propiedad", "They charged me to view the property", true], ["mudar", "Pidieron más para mudarme de lo publicado", "They asked for more to move in than posted", true],
      ["fotos", "No era como en las fotos", "It was not like the photos", false], ["nollego", "No llegaron a la visita", "They did not show up for the visit", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "dealer" ? [["precio", "El precio en la puerta fue más", "The out-the-door price was higher", true], ["titulo", "No me enseñaron el título", "They did not show me the title", false],
      ["fotos", "El carro no era como en las fotos", "The car was not like the photos", false], ["nollego", "El carro no estaba el día de la prueba", "The car was not there for the test drive", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "edu" ? [["cobro", "Cobraron más del total", "They charged more than the total", true], ["cert", "No me dieron el certificado prometido", "I did not get the promised certificate", false],
      ["horario", "No cumplieron el horario", "They did not keep the schedule", false], ["ensena", "No enseñan lo prometido", "They do not teach what was promised", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "ninos" ? [["cobro", "Cobraron más de lo que dijeron", "They charged more than stated", true], ["lic", "No tenían licencia", "They had no license", false],
      ["horario", "No cumplieron el horario", "They did not keep the schedule", false], ["cuidado", "No cuidaron bien a mi niño", "They did not take good care of my child", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "dep" ? [["cobro", "La cuota no fue la que vi", "The fee was not what I saw", true], ["salir", "No me dejan cancelar", "They will not let me cancel", true],
      ["horario", "No cumplieron el horario", "They did not keep the schedule", false], ["equipo", "El equipo o la cancha no sirven", "The equipment or field is not usable", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "noche" ? [["cover", "Cobraron más cover", "They charged more cover", true], ["lista", "No respetaron la lista", "They did not honor the list", false],
      ["mesa", "No respetaron la mesa", "They did not honor the table", false], ["minimo", "Cobraron el mínimo aparte", "They charged the minimum as an extra fee", true], ["inseguro", "Me sentí inseguro", "I felt unsafe", false],
      ["trato", "Mal trato en la puerta", "Treated badly at the door", false], ["dep", "No me descontaron el depósito", "They did not take the deposit off my bill", true], ["otro", "Otra cosa", "Something else", false]]
    : rub === "evp" ? [["nocomo", "No fue como lo acordamos", "It was not as agreed", true], ["falto", "Faltó algo de lo acordado", "Something agreed was missing", true],
      ["cobro", "Cobraron más de lo acordado", "They charged more than agreed", true], ["trato", "Mal trato", "I was treated badly", false], ["dep", "No me descontaron el depósito", "The deposit was not taken off", true], ["otro", "Otra cosa", "Something else", false]]
    : rub === "fiesta" ? [["nollego", "No llegaron", "They did not show up", false], ["tarde", "Llegaron tarde", "They arrived late", false],
      ["nocomo", "No quedó como lo acordado", "It was not as agreed", true], ["falto", "Faltó algo del paquete", "Something in the package was missing", true], ["cobro", "Cobraron más del paquete", "They charged more than the package", true],
      ["dano", "Dañaron algo o no recogieron", "They damaged something or did not pick up", true], ["otro", "Otra cosa", "Something else", false]]
    : rub === "trans" ? [["cobro", "Cobró más del precio cerrado", "Charged more than the fixed price", true], ["tarde", "Salió o llegó muy tarde", "Left or arrived very late", false],
      ["nollego", "No pasó a recogerme", "Did not pick me up", false], ["inseguro", "Manejo inseguro", "Unsafe driving", false], ["equipaje", "Perdió o dañó mi equipaje o caja", "Lost or damaged my luggage or box", true],
      ["otro", "Otra cosa", "Something else", false]]
    : rub === "merc" ? [["peso", "El peso no me cuadra", "The weight does not add up", true], ["falto", "Faltó algo", "Something was missing", true], ["fresco", "No estaba fresco", "It was not fresh", true], ["sust", "Cambiaron algo sin preguntar", "They swapped something without asking", false], ["caja", "No cobraron el precio del estante", "They did not charge the shelf price", true], ["tarde", "Llegó tarde", "It arrived late", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "tienda" ? [["caja", "Cobraron más en la caja", "They charged more at the register", true], ["apa", "No guardaron mi apartado", "They did not keep my hold", false], ["talla", "Talla o artículo equivocado", "Wrong size or item", false], ["cambio", "No me aceptan el cambio", "They refuse the exchange", true], ["dano", "Llegó dañado", "It arrived damaged", true], ["otro", "Otra cosa", "Something else", false]]
    : rub === "salud" ? [["cobro", "Me cobraron algo que no dijeron", "They charged me something they did not mention", true], ["seguro", "Cobraron a mi seguro algo que no pedí", "They billed my insurance for something I did not ask for", true], ["noseg", "No aceptaron mi seguro después de confirmar", "They did not take my insurance after confirming", true], ["interp", "No había intérprete", "There was no interpreter", false], ["espera", "Esperé mucho más de lo que dijeron", "I waited much longer than they said", false], ["trato", "Mal trato", "I was treated badly", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "pro" ? [["cobro", "Cobró más del total por escrito", "Charged more than the written total", true], ["ley", "Ofreció algo que no podía hacer por ley", "Offered something they could not legally do", false], ["nohizo", "No hizo lo acordado", "Did not do what was agreed", false], ["fecha", "Perdió una fecha o un documento", "Missed a deadline or lost a document", false], ["contesta", "No me contesta", "Does not answer me", false], ["trato", "Mal trato", "I was treated badly", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "hogar" ? [["win", "No llegó en la franja", "Did not arrive in the window", false], ["more", "Cobró más de lo aprobado", "Charged more than approved", false], ["bad", "Quedó mal o volvió a fallar", "Not fixed or failed again", true], ["dmg", "Dañó algo de la casa", "Damaged something in the home", true], ["who", "Vino otra persona", "Someone else came", false], ["dep", "No me devolvieron el depósito", "Deposit not returned", false], ["otro", "Otra cosa", "Something else", false]]
    : rub === "auto" ? [["cobro", "Cobraron más del estimado sin mi OK", "Charged more than the estimate without my OK", true], ["tarde", "No estuvo listo cuando prometieron", "Not ready when promised", false], ["igual", "Sigue el mismo problema", "Same problem is back", false], ["dano", "Dañaron algo del carro", "They damaged something on the car", true], ["piezas", "No me dieron las piezas viejas", "They did not give me the old parts", false], ["dep", "No me devolvieron el depósito", "Deposit not returned", false], ["otro", "Otra cosa", "Something else", false]]
      : RSN_B;
  const quien = c.con && c.model === "chair" ? c.con.corto : c.negocio.nombre;
  const SOL: [QuiereCita, string, string, string, string][] = rub === "evt" ? [["rev", "Que me devuelvan lo cobrado de más", "Refund what was overcharged", "Vuelve a tu tarjeta en 3–5 días hábiles", "Back to your card in 3–5 business days"],
      ["avis", "Que lo revisen", "Have it checked", "To’Latino mira el cobro y te responde aquí", "To’Latino checks the charge and answers here"]]
    : rub === "fe" ? [["rev", "Que me devuelvan", "Refund me", "Lo que te cobraron · te lo devuelve la iglesia", "What they charged you · the church refunds you"],
      ["llamar", "Que me llamen", "Have them call me", "Te llama alguien de la iglesia", "Someone from the church calls you"], ["avis", "Solo quiero avisar", "I just want to let them know", "Lo lee la iglesia y To’Latino", "Read by the church and To’Latino"]]
    : rub === "inm" ? [["rev", "Que me devuelvan", "Refund me", "Lo que te cobraron de más · te lo devuelve la agencia", "What you were overcharged · the agency refunds you"],
      ["otra", "Otra visita", "Another visit", "Con hora confirmada", "At a confirmed time"], ["avis", "Solo quiero avisar", "I just want to let them know", "Lo lee la agencia y To’Latino", "Read by the agency and To’Latino"]]
    : rub === "dealer" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más · te lo devuelve el dealer", "The overcharge · the dealer refunds you"],
      ["antes", "Que lo arreglen antes de firmar", "Fix it before I sign", "Precio y papeles como lo publicado", "Price and papers as posted"], ["avis", "Solo quiero avisar", "I just want to let them know", "Lo lee el dealer y To’Latino", "Read by the dealer and To’Latino"]]
    : rub === "edu" ? [["rev", "Que me devuelvan", "Refund me", "La matrícula vuelve a tu tarjeta; lo pagado en la escuela te lo devuelve la escuela", "The fee goes back to your card; the school refunds what you paid there"],
      ["grupo", "Terminar en otro grupo", "Finish in another group", "Sin pagar otra vez", "Without paying again"], ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "ninos" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más", "The overcharge"], ["arreglar", "Que lo arreglen", "Have it fixed", "Lo acuerdas con el lugar", "You agree on it with the place"],
      ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "dep" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más", "The overcharge"], ["baja", "Cancelar mi membresía", "Cancel my membership", "Con la constancia de cuando la pediste", "With the record of when you asked"],
      ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "noche" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más o el depósito", "The overcharge or the deposit"],
      ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${c.negocio.nombre} y To’Latino`, `Read by ${c.negocio.nombre} and To’Latino`]]
    : rub === "evp" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más o el depósito", "The overcharge or the deposit"],
      ["desc", "Un descuento", "A discount", "Lo acuerdas con el restaurante", "You agree on it with the restaurant"], ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "fiesta" ? [["rev", "Que me devuelvan", "Refund me", "Lo que faltó o se cobró de más", "What was missing or overcharged"],
      ["desc", "Un descuento", "A discount", "Lo acuerdas con el negocio", "You agree on it with the business"], ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "trans" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más o el viaje", "The overcharge or the trip"], ["corr", "Que lo repongan", "Replace it", "Lo perdido o dañado", "What was lost or damaged"],
      ["avis", "Solo quiero avisar", "I just want to let them know", "Sin pedir dinero", "No money asked"]]
    : rub === "merc" ? [["rev", "Que me devuelvan", "Refund me", "Vuelve a tu tarjeta en 3–5 días hábiles", "Back to your card in 3–5 business days"], ["corr", "Que me lo repongan", "Replace it", "En tu próximo pickup o envío, sin costo", "On your next pickup or delivery, at no cost"], ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${c.negocio.nombre} y To’Latino`, `Read by ${c.negocio.nombre} and To’Latino`]]
    : rub === "tienda" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más", "The overcharge"], ["corr", "Cambiarlo", "Exchange it", "Por otra talla o artículo", "For another size or item"], ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${c.negocio.nombre} y To’Latino`, `Read by ${c.negocio.nombre} and To’Latino`]]
    : rub === "salud" ? [["rev", "Que lo revisen y me devuelvan", "Review it and refund me", "Lo cobrado de más · te lo devuelve el consultorio", "The overcharge · the office refunds you"], ["seg", "Que corrijan el cobro a mi seguro", "Fix the charge to my insurance", "Te mandan la factura corregida", "They send you the corrected bill"], ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${c.negocio.nombre} y To’Latino`, `Read by ${c.negocio.nombre} and To’Latino`]]
    : rub === "pro" ? [["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más · te lo devuelve la oficina", "The overcharge · the office refunds you"], ["fin", "Que terminen lo acordado", "Finish what was agreed", "Sin cobrarte más", "At no extra charge"], ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${c.negocio.nombre} y To’Latino`, `Read by ${c.negocio.nombre} and To’Latino`]]
    : [rub === "hogar" ? ["corr", "Que vuelva sin cargo", "Come back at no charge", "Por la garantía de la mano de obra", "Under the labor warranty"] : rub === "auto" ? ["corr", "Que lo revisen otra vez sin cargo", "Check it again at no charge", "Por la garantía del trabajo", "Under the work warranty"] : ["corr", "Que me lo arreglen sin cargo", "Fix it at no charge", "Te dan otra cita para arreglarlo", "They give you a new booking to fix it"],
    rub !== "belleza" ? ["rev", "Devolución a mi tarjeta", "Refund to my card", "Lo cobrado de más · 3–5 días hábiles", "The overcharge · 3–5 business days"] : ["rev", "Que me devuelvan", "Refund me", "Lo cobrado de más o el depósito", "The overcharge or the deposit"], ["avis", "Solo quiero avisar", "I just want to let them know", `Lo lee ${quien} y To’Latino`, `Read by ${quien} and To’Latino`]];
  const sinDar = !v.hecho, rsn = RSN.filter((r) => !sinDar || r[0] === "dep" || r[0] === "otro"), sols = SOL.filter((s) => !sinDar || s[0] !== "corr");
  const [r, setR] = useState<MotivoCita | null>(null), [nota, setNota] = useState(""), [sol, setSol] = useState<QuiereCita>(sp || sd || rub === "evt" || rub === "fiesta" || rub === "evp" || rub === "noche" || rub === "edu" || rub === "ninos" || rub === "dep" ? "rev" : sinDar ? "rev" : "corr"), [amt, setAmt] = useState("");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false), [error, setError] = useState(""), [ocupado, setOcupado] = useState(false), [flash, setFlash] = useState("");
  const fileRef = useRef<HTMLInputElement>(null), clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  const volver = () => router.push(c.numero.startsWith("B-") ? `/eventos/orden/${c.numero}` : c.numero.startsWith("M-") ? `/mercado/${c.numero}` : c.numero.startsWith("A-") ? `/apartado/${c.numero}` : c.numero.startsWith("F-") ? `/fiesta/${c.numero}` : c.numero.startsWith("EP-") ? `/privado/${c.numero}` : c.numero.startsWith("V-") ? `/viaje/${c.numero}` : c.numero.startsWith("N-") ? `/noche/${c.numero}` : c.numero.startsWith("I-") ? `/insc/${c.numero}` : c.numero.startsWith("D-") ? `/vis/${c.numero}` : `/cita/${c.numero}`);
  const compra = rub === "merc" || rub === "tienda";
  const ins = rub === "edu" || rub === "ninos" || rub === "dep";
  const prueba = c.que === "prueba";
  const titulo = rub === "evt" ? E2("Ayuda con el pago", "Payment help") : rub === "fe" ? E2("Ayuda con la iglesia", "Church help") : rub === "inm" ? E2("Ayuda con la visita", "Visit help") : rub === "dealer" ? E2("Ayuda con el dealer", "Dealer help") : ins ? E2("Ayuda con la inscripción", "Enrollment help") : rub === "noche" ? E2("Ayuda con la noche", "Night help") : rub === "evp" ? E2("Ayuda con el evento", "Event help") : rub === "fiesta" ? E2("Ayuda con la fiesta", "Party help") : rub === "trans" ? E2("Ayuda con el viaje", "Trip help") : rub === "merc" ? E2("Ayuda con el pedido", "Order help") : rub === "tienda" ? E2("Ayuda con la compra", "Purchase help") : rub === "hogar" ? E2("Ayuda con la visita", "Visit help") : rub === "pro" ? E2("Ayuda con el trámite", "Case help") : E2("Ayuda con la cita", "Appointment help");
  const honest = rub === "evt" ? E2("El cobro de tus boletos lo hizo To’Latino: lo revisa To’Latino, no el organizador. Miramos tu orden y el cobro en la tarjeta; lo cobrado de más vuelve a tu tarjeta. Para cancelar tus boletos usa «Cancelar mis boletos» en tu orden.", "To’Latino made the charge for your tickets: To’Latino reviews it, not the organizer. We check your order and the card charge; anything overcharged goes back to your card. To cancel your tickets use “Cancel my tickets” on your order.")
    : rub === "fe" ? E2("La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración. En To’Latino nada se cobra: si te pidieron dinero, te lo devuelve la iglesia directamente y tú confirmas «Me lo devolvieron». Lo que cuentas no se publica.", "Church help is free; food, clothes and prayer are never charged. Nothing is charged on To’Latino: if they asked you for money, the church refunds you directly and you confirm «They refunded me». What you write is never published.")
    : rub === "inm" ? E2("Ver una propiedad es gratis y nadie cobra por la solicitud sin decirlo. Comparamos con lo que viste al pedir la visita (queda guardado). Nada se cobró en To’Latino: lo que te cobraron de más te lo devuelve la agencia directamente y tú confirmas «Me lo devolvieron».", "Viewing a property is free and no one charges an application fee without saying so. We compare with what you saw when you asked for the visit (it stays saved). Nothing was charged on To’Latino: the agency refunds any overcharge directly and you confirm «They refunded me».")
    : rub === "dealer" ? E2("El precio en la puerta es con impuestos, placas y cargos del dealer, antes de firmar. Comparamos con lo que viste al pedir la prueba (queda guardado). Nada se cobró en To’Latino: lo cobrado de más te lo devuelve el dealer directamente y tú confirmas «Me lo devolvieron».", "The out-the-door price includes taxes, tags and dealer fees, before signing. We compare with what you saw when you asked for the test drive (it stays saved). Nothing was charged on To’Latino: the dealer refunds any overcharge directly and you confirm «They refunded me».")
    : ins ? E2("Miramos lo publicado, lo que pagaste, el precio y el plan que se copiaron al inscribirte y tus fotos. La matrícula cobrada en la app vuelve a tu tarjeta; lo pagado en el lugar te lo devuelve el lugar. La solicitud no borra tu reseña.", "We check what was posted, what you paid, the price and plan copied when you enrolled, and your photos. The fee charged in the app goes back to your card; the place refunds what you paid there. The request does not remove your review.")
    : rub === "noche" ? E2("Miramos el cover que el local publicó esa noche y tu recibo. El depósito cobrado en la app vuelve a tu tarjeta; el cover o el mínimo cobrados de más te los devuelve el local. «Me sentí inseguro» lo revisa To'Latino directamente; si alguien corre peligro ahora, llama al 911 primero.", "We check the cover the venue posted that night and your receipt. The deposit charged in the app goes back to your card; any cover or minimum overcharge, the venue refunds. “I felt unsafe” is reviewed by To'Latino directly; if someone is in danger now, call 911 first.")
    : rub === "evp" ? E2("Miramos lo que acordaron (la propuesta que aceptaste), lo que pagaste y tus fotos. El depósito cobrado en la app vuelve a tu tarjeta; lo pagado en el local te lo devuelve el restaurante. La solicitud no borra tu reseña.", "We check what you agreed (the proposal you accepted), what you paid and your photos. The deposit charged in the app goes back to your card; what you paid there, the restaurant refunds. The request does not remove your review.")
    : rub === "fiesta" ? E2("Miramos el paquete, lo que pagaste y tus fotos. Lo cobrado en la app vuelve a tu tarjeta; lo pagado al negocio te lo devuelve el negocio. La solicitud no borra tu reseña.", "We check the package, what you paid and your photos. What was charged in the app goes back to your card; what you paid the business, the business refunds. The request does not remove your review.")
    : rub === "trans" ? E2("Miramos el precio cerrado, la hora real de salida y tus fotos. «Manejo inseguro» lo revisa To'Latino directamente. Lo cobrado en la app vuelve a tu tarjeta.", "We check the fixed price, the real departure time and your photos. “Unsafe driving” is reviewed by To'Latino directly. What was charged in the app goes back to your card.")
    : rub === "merc" ? E2("Compararemos tus fotos con la foto de la balanza del mercado. Lo cobrado en la app vuelve a tu tarjeta; lo pagado en el mercado (EBT, efectivo) te lo devuelve el mercado.", "We compare your photos with the market’s scale photo. What was charged in the app goes back to your card; what you paid at the market (EBT, cash) the market returns.")
    : rub === "tienda" ? E2("Miramos el precio que la tienda publicó y tu recibo. Lo cobrado en la app vuelve a tu tarjeta; lo pagado en la caja te lo devuelve la tienda.", "We check the price the store posted and your receipt. What was charged in the app goes back to your card; what you paid at the register the store returns.")
    : rub === "salud" ? E2("Nada se cobra en To’Latino: lo que se devuelve, lo devuelve el consultorio. La solicitud no borra tu reseña.", "Nothing is charged on To’Latino: any refund comes from the office. The request does not remove your review.")
    : rub === "pro" ? E2("Nada se cobra en To’Latino: lo que se devuelve, lo devuelve la oficina. Nadie te garantiza un resultado; sí lo acordado por escrito.", "Nothing is charged on To’Latino: any refund comes from the office. No one guarantees a result; what was agreed in writing, yes.")
    : rub === "hogar" ? E2("Solo se devuelve lo que se cobró de más o lo que el negocio acepte. La solicitud no borra tu reseña.", "Only what was overcharged or what the business agrees to is refunded. The request does not remove your review.")
    : rub === "auto" ? E2("Nada se hace ni se cobra sin tu OK.", "Nothing is done or charged without your OK.") : E2("Lo que pagas es el precio publicado.", "You pay the posted price.");
  const svcT = es ? c.svc.es : c.svc.en || c.svc.es;
  const hora = (iso: string | null) => (iso ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "").toUpperCase() : "");
  const llamar = () => { if (c.negocio.telefono) location.href = `tel:${c.negocio.telefono}`; };

  const cabeza = (sub: string) => (
    <>
      <div data-screen-label={`${v.a ? "APP-NEG-CITA-AYUDA-ESTADO" : "APP-NEG-CITA-AYUDA"} · móvil`} className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:hidden">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-paper"><Icon name="chevronLeft" size={16} strokeWidth={2} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{titulo}</div><div className="mt-[3px] truncate font-mono text-[9px] font-semibold tracking-[0.06em] text-ink/50">{sub}</div></div>
      </div>
      <div className="hidden lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{v.a ? E2("Volver a la cita", "Back to the appointment") : E2("Volver", "Back")}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{sub}</div>
        <h1 className="m-0 mt-1.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.04em]">{titulo}</h1>
      </div>
    </>
  );
  // 4if · Posible estafa: directo a To'Latino y lo ofrecido en pausa mientras se revisa.
  const estafa = (r === "ver" || r === "mudar" || (rub === "fe" && r === "cobro")) ? <div role="note" data-screen-label="Ayuda · posible estafa" className="flex items-start gap-2.5 rounded-[14px] bg-danger/[.08] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="warning" size={16} color="var(--tl-danger)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.5] text-danger">{rub === "fe" ? E2("Esta solicitud va directo a To’Latino, con prioridad. Mientras la revisamos, «Pedir fecha» de este lugar queda en pausa.", "This request goes straight to To’Latino, with priority. While we review it, this place's «Ask for a date» is paused.") : E2("Esta solicitud va directo a To’Latino, con prioridad. Mientras la revisamos, la propiedad no se ve en To’Latino. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "This request goes straight to To’Latino, with priority. While we review it, the property does not show on To’Latino. Never pay a deposit before seeing the property and signing the lease.")}</span></div> : null;
  const childline = r === "cuidado" ? <div role="note" className="flex items-start gap-2.5 rounded-[14px] bg-danger/[.08] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="warning" size={16} color="var(--tl-danger)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.5] text-danger">{E2("Si un niño corre peligro, llama al 911. Si sospechas maltrato o abuso, llama a ChildLine de Pennsylvania: 1-800-932-0313. Esta solicitud va directo a To’Latino.", "If a child is in danger, call 911. If you suspect abuse or neglect, call Pennsylvania ChildLine: 1-800-932-0313. This request goes straight to To’Latino.")}</span></div> : null;
  const nota1 = <div className="flex items-start gap-2.5 rounded-[14px] bg-signal/[.12] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="shield" size={16} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-open-text">{honest}</span></div>;
  const avisos = (error || flash) ? <>{error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}{flash && <div role="status" className="rounded-[14px] bg-signal/[.16] px-3.5 py-3 text-[12.5px] font-bold text-open-text">{flash}</div>}</> : null;
  const marco = (sub: string, izq: ReactNode, der: ReactNode, barra?: ReactNode) => (
    <div className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div className="mx-auto lg:max-w-[1080px]">
        {cabeza(sub)}
        <div className="flex flex-col gap-3 px-4 pt-4 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12 lg:px-0 lg:pt-0">
          <div className="flex min-w-0 flex-col gap-3">{avisos}{izq}</div>
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-6">{der}</div>
        </div>
      </div>
      {barra}
    </div>
  );

  // ── Estado de la solicitud (APP-NEG-CITA-AYUDA-ESTADO) ──
  if (v.a) {
    const a = v.a, sol1 = SOL.find((s) => s[0] === a.wants), rs = RSN.find((x) => x[0] === a.reason);
    const st = a.status === "open" ? "sent" : a.status === "escalated" ? "rev" : a.status === "resolved" ? "done" : a.decision ?? "ok";
    const okT = a.fuera === "pending" || (sd && a.wants === "rev") ? `${E2("Te devuelven ", "They refund you ")}${a.offer ? dinero(a.offer) : E2("lo cobrado", "the charge")}` : a.wants === "llamar" ? E2("Te llaman", "They call you") : a.wants === "otra" ? E2("Otra visita", "Another visit") : a.wants === "antes" ? E2("Lo arreglan antes de firmar", "They fix it before signing") : a.wants === "seg" ? E2("Corrigen el cobro a tu seguro", "They fix the charge to your insurance") : a.wants === "fin" ? E2("Terminan lo acordado", "They finish what was agreed") : a.wants === "rev" ? `${E2("Te devolvemos ", "Refunding ")}${dinero(a.offer ?? a.refunded ?? 0)}` : a.wants === "corr" ? (es ? SOL[0]![1] : SOL[0]![2]) : E2("Gracias por avisar", "Thanks for letting us know");
    const okS = a.wants === "seg" ? E2("Te mandan la factura corregida en 10 días.", "They send you the corrected bill within 10 days.") : a.wants === "fin" ? E2("Sin cobrarte más.", "At no extra charge.")
      : a.fuera === "pending" ? E2(`Te lo devuelve ${quien} directamente: no pasó por la app. Cuando lo tengas, confirma «Me lo devolvieron».`, `${quien} refunds you directly: it did not go through the app. Once you have it, confirm «They refunded me».`)
      : a.wants === "rev" && sd ? E2(`Te lo devuelve ${quien} directamente: no pasó por la app.`, `${quien} refunds you directly: it did not go through the app.`)
      : a.wants === "llamar" ? E2("Te llaman al teléfono de tu cuenta.", "They call the phone on your account.") : a.wants === "otra" ? E2("Te dan otra visita con hora confirmada.", "They give you another visit at a confirmed time.") : a.wants === "antes" ? E2("Precio y papeles como lo publicado, antes de firmar.", "Price and papers as posted, before signing.")
      : a.wants === "rev" && sp ? (rub === "salud" ? E2("Te lo devuelve el consultorio, como pagaste.", "The office refunds you the way you paid.") : E2("Te lo devuelve la oficina, como pagaste.", "The office refunds you the way you paid."))
      : a.wants === "rev" ? (a.refunded > 0 || v.devolvible > 0 ? E2("Devuelto a tu tarjeta en 3–5 días hábiles.", "Back to your card in 3–5 business days.") : E2("Lo pagaste en el local: te lo devuelven en el local.", "You paid at the shop: they refund you at the shop.")) : a.wants === "corr" ? E2("Te dan otra cita para arreglarlo.", "They give you a new booking to fix it.") : "";
    const doneT = a.fuera === "confirmed" ? E2("Te lo devolvieron", "They refunded you") : a.closedBy === "user" ? (a.decision === "alt" && !sd ? `${E2("Devuelto ", "Refunded ")}${dinero(a.refunded || a.offer || 0)}` : okT) : a.resolution ?? "";
    const H: Record<string, [string, string, string, string, string, string]> = {
      sent: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${quien}`, E2("Responde en 24 h. Si no, To’Latino la revisa en 48 h.", "Replies within 24 h. Otherwise, To’Latino reviews it within 48 h.")],
      ok: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("ACEPTÓ", "ACCEPTED"), okT, okS],
      alt: ["dollar", "bg-pro/20", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), `${E2("Devolverte ", "Refund ")}${dinero(a.offer ?? 0)}`, E2("Tú decides. Si no te sirve, pide revisión a To’Latino.", "You decide. If it does not work for you, ask To’Latino to review.")],
      no: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO PUDO", "COULD NOT"), `${quien}${E2(" dice que cumplió lo acordado", " says they did what was agreed")}`, E2("Si no estás de acuerdo, To’Latino revisa la cita y tus fotos en 48 h.", "If you disagree, To’Latino reviews the booking and your photos within 48 h.")],
      rev: a.directa ? ["shield", "bg-danger/10", "var(--tl-danger)", E2("EN REVISIÓN DE TO’LATINO · PRIORIDAD", "UNDER TO’LATINO REVIEW · PRIORITY"), E2("Lo revisa To’Latino directamente", "To’Latino reviews it directly"),
        `${E2("No esperamos al negocio: miramos lo publicado, lo que viste al pedir y tus fotos.", "We do not wait for the business: we check the listing, what you saw when you asked and your photos.")}${a.pausa === "on" ? E2(rub === "fe" ? " Mientras tanto, «Pedir fecha» de este lugar está en pausa." : " Mientras tanto, el anuncio está en pausa.", rub === "fe" ? " Meanwhile, this place's «Ask for a date» is paused." : " Meanwhile, the listing is paused.") : ""}`]
        : ["shield", "bg-action/10", "var(--tl-action)", E2("EN REVISIÓN DE TO’LATINO", "UNDER TO’LATINO REVIEW"), E2("Revisamos en 48 h", "We review within 48 h"), a.fuera === "denied" ? E2("Dijiste que no te lo devolvieron. Miramos lo que respondió el negocio y tus fotos; si hace falta, To’Latino decide una sanción.", "You said they did not refund you. We check the business's reply and your photos; if needed, To’Latino decides a sanction.") : E2("Miramos lo publicado, la cita, lo cobrado y tus fotos. Te avisamos en Avisos.", "We check the listing, the booking, what was charged and your photos. We let you know in Alerts.")],
      done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("TERMINADA", "FINISHED"), doneT, E2("Gracias por avisarnos.", "Thanks for letting us know.")],
    };
    const h = H[st]!;
    const hacer = async (acc: "entendido" | "aceptar" | "revisar" | "devuelto" | "nodevuelto", ok: string) => {
      if (ocupado) return;
      setOcupado(true); setError("");
      const x = await ayudaCitaResponder(c.numero, acc, clave.current).catch(() => null);
      setOcupado(false);
      if (x?.ok) { setFlash(x.mensaje ? (es ? x.mensaje.es : x.mensaje.en) : ok); router.refresh(); return; }
      setError(x && !x.ok ? (es ? x.msg.es : x.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
    };
    const acts: [string, string, () => void][] = a.fuera === "pending" && a.status === "answered" ? [["check", E2("Me lo devolvieron", "They refunded me"), () => void hacer("devuelto", E2("Listo: solicitud terminada", "Done: request finished"))], ["shield", E2("No me lo devolvieron", "They did not refund me"), () => void hacer("nodevuelto", E2("Listo: To’Latino la revisa", "Done: To’Latino reviews it"))]]
      : st === "ok" ? [["check", E2("Entendido", "Got it"), () => void hacer("entendido", E2("Listo: solicitud terminada", "Done: request finished"))]]
      : st === "alt" ? [["dollar", `${E2("Aceptar ", "Accept ")}${dinero(a.offer ?? 0)}`, () => void hacer("aceptar", E2("Listo: aceptaste la propuesta", "Done: you accepted the proposal"))], ["shield", E2("Pedir revisión a To’Latino", "Ask To’Latino to review"), () => void hacer("revisar", E2("Listo: To’Latino la revisa en 48 h", "Done: To’Latino reviews it within 48 h"))]]
        : st === "no" ? [["shield", E2("Pedir revisión a To’Latino", "Ask To’Latino to review"), () => void hacer("revisar", E2("Listo: To’Latino la revisa en 48 h", "Done: To’Latino reviews it within 48 h"))]] : [];
    const respondio = st !== "sent" && !!a.reply;
    const steps = [{ label: E2("Enviada", "Sent"), time: hora(a.at), state: "done" }, { label: a.directa ? E2("Revisión de To’Latino", "To’Latino review") : `${E2("Respuesta de ", "Reply from ")}${quien}`, time: hora(a.replyAt), state: a.directa ? (st === "done" ? "done" : "current") : st !== "sent" ? "done" : "current" },
      { label: E2("Terminada", "Finished"), time: hora(a.resolvedAt), state: st === "done" ? "done" : st !== "sent" ? "current" : "next" }];
    const filas: [string, string][] = [[E2("MOTIVO", "REASON"), rs ? (es ? rs[1] : rs[2]) : "—"], [E2("QUIERES", "YOU WANT"), sol1 ? (es ? sol1[1] : sol1[2]) : "—"], ...(a.amount ? [[E2("MONTO", "AMOUNT"), dinero(a.amount)] as [string, string]] : []), [E2("LES CONTASTE", "YOU SAID"), `«${a.body}»`]];
    const sub = `${E2("SOLICITUD #", "REQUEST #")}${a.number} · ${c.numero.startsWith("D-") ? (prueba ? E2("PRUEBA DE MANEJO #", "TEST DRIVE #") : E2("VISITA #", "VISIT #")) : rub === "evt" ? E2("ORDEN #", "ORDER #") : rub === "fe" ? E2("TU LUGAR #", "YOUR SPOT #") : ins ? E2("INSCRIPCIÓN #", "ENROLLMENT #") : rub === "noche" ? E2("RESERVA #", "BOOKING #") : rub === "evp" ? E2("EVENTO PRIVADO #", "PRIVATE EVENT #") : rub === "fiesta" ? E2("FIESTA #", "PARTY #") : rub === "trans" ? E2("VIAJE #", "TRIP #") : rub === "merc" ? E2("PEDIDO #", "ORDER #") : rub === "tienda" ? E2("APARTADO #", "HOLD #") : rub === "hogar" ? E2("VISITA #", "VISIT #") : rub === "pro" ? E2("CONSULTA #", "CONSULTATION #") : E2("CITA #", "APPOINTMENT #")}${c.numero}`.toUpperCase();
    const hdr = (
      <div data-screen-label="Ayuda con la cita · estado" className="flex items-start gap-3.5 rounded-[20px] border border-ink/[.08] bg-white p-[18px]">
        <span className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-[15px] ${h[1]}`}><Icon name={h[0]} size={22} color={h[2]} /></span>
        <div className="min-w-0 flex-1"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <div className="mt-1.5 text-pretty font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{h[4]}</div>
          {h[5] && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/[.62]">{h[5]}</div>}</div>
      </div>);
    const rep = respondio && (
      <div data-screen-label="Ayuda con la cita · respuesta" className={caja}>
        <div className="flex items-center gap-[11px]"><span className="h-[38px] w-[38px] flex-none rounded-xl bg-photo-bg" style={fondo(c.con?.foto && c.model === "chair" ? c.con.foto : c.negocio.foto)} />
          <div className="min-w-0 flex-1"><div className={K}>{`${E2("RESPUESTA DE ", "REPLY FROM ")}${quien.toUpperCase()}`}</div><div className="mt-[3px] font-mono text-[9.5px] font-semibold text-ink/45">{hora(a.replyAt)}</div></div></div>
        <div className="mt-3 text-pretty text-[13.5px] font-medium leading-[1.55]">«{a.reply}»</div>
        {c.negocio.telefono && <div className="mt-3.5 flex"><Button size="md" icon="phone" block onClick={llamar}>{`${E2("Llamar a ", "Call ")}${c.negocio.nombre}`}</Button></div>}
      </div>);
    const res = st === "done" && a.closedBy === "admin" && a.resolution && <div className={caja}><div className={K}>{E2("RESPUESTA DE TO’LATINO", "TO’LATINO’S ANSWER")}</div><div className="mt-2.5 text-pretty text-[13.5px] font-medium leading-[1.55]">«{a.resolution}»{a.refunded > 0 ? E2(` Te devolvimos ${dinero(a.refunded)} a tu tarjeta.`, ` We refunded ${dinero(a.refunded)} to your card.`) : ""}</div></div>;
    const mandaste = (
      <div data-screen-label="Ayuda con la cita · lo que mandaste" className={caja}>
        <div className={K}>{E2("LO QUE MANDASTE", "WHAT YOU SENT")}</div>
        {a.fotos.length > 0 && <div className="mt-2.5 flex flex-wrap gap-2">{a.fotos.map((u) => <span key={u} className="h-[60px] w-[60px] rounded-xl bg-photo-bg" style={fondo(u)} />)}</div>}
        <div className="mt-2 flex flex-col">{filas.map(([k, x]) => <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 border-t border-ink/[.06] py-[9px]"><span className="font-mono text-[9.5px] font-bold leading-[1.6] tracking-[0.12em] text-ink/45">{k}</span><span className="text-pretty text-[13px] font-semibold leading-[1.45]">{x}</span></div>)}</div>
      </div>);
    const botones = acts.length > 0 && <div className="grid grid-cols-1 gap-2">{acts.map(([icon, l, on]) => <div key={l} className="grid"><Button variant="secondary" size="md" icon={icon} block disabled={ocupado} onClick={on}>{l}</Button></div>)}</div>;
    const track = <div className="grid"><OrderTracker steps={steps} /></div>;
    return (
      <div data-pantalla="APP-NEG-CITA-AYUDA-ESTADO">
        {marco(sub, <>{hdr}{rep}{res}<div className="lg:hidden">{track}</div>{mandaste}<div className="flex flex-col gap-3 lg:hidden">{nota1}{botones}</div></>,
          <div className="hidden flex-col gap-3.5 lg:flex">{track}{nota1}{botones}</div>)}
      </div>
    );
  }

  // ── El formulario (APP-NEG-CITA-AYUDA) ──
  const sub = `${c.numero.startsWith("D-") ? (prueba ? E2("PRUEBA DE MANEJO #", "TEST DRIVE #") : E2("VISITA #", "VISIT #")) : rub === "evt" ? E2("ORDEN #", "ORDER #") : rub === "fe" ? E2("TU LUGAR #", "YOUR SPOT #") : ins ? E2("INSCRIPCIÓN #", "ENROLLMENT #") : rub === "noche" ? E2("RESERVA #", "BOOKING #") : rub === "evp" ? E2("EVENTO PRIVADO #", "PRIVATE EVENT #") : rub === "fiesta" ? E2("FIESTA #", "PARTY #") : rub === "trans" ? E2("VIAJE #", "TRIP #") : rub === "merc" ? E2("PEDIDO #", "ORDER #") : rub === "tienda" ? E2("APARTADO #", "HOLD #") : rub === "hogar" ? E2("VISITA #", "VISIT #") : rub === "pro" ? E2("CONSULTA #", "CONSULTATION #") : E2("CITA #", "APPOINTMENT #")}${c.numero} · ${c.negocio.nombre}`.toUpperCase();
  if (!v.puede) return (
    <div data-pantalla="APP-NEG-CITA-AYUDA">
      {marco(sub, <div className={caja}><div className="text-[14px] font-bold">{v.motivo === "tarde" ? E2("La ayuda con una cita se pide hasta 7 días después.", "Booking help can be asked up to 7 days after.") : E2("La ayuda se pide cuando la cita ya pasó.", "Help can be asked once the booking is over.")}</div>
        <div className="mt-1.5 text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`Si necesitas algo ahora, escríbele o llama a ${quien}.`, `If you need something now, message or call ${quien}.`)}</div></div>, null)}
    </div>);
  const conFoto = !!r && !!RSN.find((x) => x[0] === r)?.[3];
  const miss = [!r ? E2("Elige qué pasó", "Pick what happened") : null, nota.trim().length < 15 ? E2("Cuéntanos qué pasó (15 letras o más)", "Tell us what happened (15+ characters)") : null, conFoto && !fotos.length ? E2("Agrega una foto", "Add a photo") : null].filter((x): x is string => !!x);
  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 4) return;
    setSubiendo(true); setError("");
    // Salud, Pro y Niños (4ef): la foto del recibo es privada (solo el lugar y To'Latino).
    // 4if · Iglesias, Bienes Raíces y Autos: el recibo o el contrato llevan nombres y direcciones: privada también.
    const x = sd ? await subirFotoPrivada(file) : sp || rub === "ninos" ? await subirFotoPrivada(file) : await subirFoto(file);
    setSubiendo(false);
    if (x.ok && x.id && x.url) setFotos((L) => [...L, { id: x.id!, url: x.url! }]);
    else setError(x.mensaje ? (es ? x.mensaje.es : x.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const enviar = async () => {
    if (miss.length || ocupado) return;
    setOcupado(true); setError("");
    const x = await ayudaCitaPedir(c.numero, { reason: r!, body: nota, wants: sol, amount: (r === "cobro" || r === "more" || r === "ver" || r === "mudar" || r === "precio") && (sol === "rev" || sp) ? amt : null, fotos: fotos.map((f) => f.id) }).catch(() => null);
    if (x?.ok) { router.refresh(); return; }
    setOcupado(false); setError(x && !x.ok ? (es ? x.msg.es : x.msg.en) : E2("No se pudo enviar. Revisa tu conexión.", "Could not send. Check your connection."));
  };
  const cta = E2("Enviar solicitud", "Send request"), free = rub === "evt" ? E2("LO REVISA TO’LATINO", "TO’LATINO REVIEWS IT") : E2("RESPONDE EN 24 H", "REPLIES WITHIN 24 H");
  const tuCita = (
    <div data-screen-label="Ayuda con la cita · tu cita" className={caja}>
      <div className={T17}>{rub === "evt" ? E2("Tu orden de boletos", "Your ticket order") : rub === "fe" ? E2("Tu fecha", "Your date") : rub === "inm" || rub === "dealer" ? (prueba ? E2("Tu prueba de manejo", "Your test drive") : E2("Tu visita", "Your visit")) : ins ? E2("Tu inscripción", "Your enrollment") : rub === "noche" ? E2("Tu noche", "Your night") : rub === "evp" ? E2("Tu evento privado", "Your private event") : rub === "fiesta" ? E2("Tu fiesta", "Your party") : rub === "trans" ? E2("Tu viaje", "Your trip") : rub === "merc" ? E2("Tu pedido", "Your order") : rub === "tienda" ? E2("Tu compra", "Your purchase") : E2("Tu cita", "Your appointment")}</div>
      <button type="button" onClick={volver} className="mt-3 flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="verified" size={20} color="var(--tl-white)" /></span>
        <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{rub === "evt" ? E2("TU ORDEN", "YOUR ORDER") : rub === "fe" ? E2("TU LUGAR", "YOUR SPOT") : rub === "inm" || rub === "dealer" ? (prueba ? E2("TU PRUEBA DE MANEJO", "YOUR TEST DRIVE") : E2("TU VISITA", "YOUR VISIT")) : ins ? E2("TU INSCRIPCIÓN", "YOUR ENROLLMENT") : rub === "noche" ? E2("TU NOCHE", "YOUR NIGHT") : rub === "evp" ? E2("TU EVENTO", "YOUR EVENT") : rub === "fiesta" ? E2("TU FIESTA", "YOUR PARTY") : rub === "trans" ? E2("TU VIAJE", "YOUR TRIP") : rub === "merc" ? E2("TU PEDIDO", "YOUR ORDER") : rub === "tienda" ? E2("TU APARTADO", "YOUR HOLD") : E2("TU CITA", "YOUR APPOINTMENT")}</span><span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{svcT}</span>
          <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{(c.con ? c.con.nombre : c.negocio.nombre).toUpperCase()}</span>
          <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold text-open-text"><Icon name="check" size={13} color="var(--tl-open-text)" />{sd ? `${E2("Nada se cobró en la app", "Nothing was charged in the app")}${c.copia ? ` · ${es ? c.copia.k.es : c.copia.k.en}: ${dinero(c.copia.cents)}` : ""}` : rub === "evt" ? `${E2("Pagado en la app: ", "Paid in the app: ")}${dinero(c.dep)}` : compra || rub === "fiesta" || rub === "evp" || rub === "trans" || rub === "noche" || ins ? `${E2("Total: ", "Total: ")}${dinero(c.total)}${c.dep ? E2(` · en la app ${dinero(c.dep)}`, ` · in the app ${dinero(c.dep)}`) : E2(" · pagado en el local", " · paid in store")}` : sp ? (rub === "pro" && c.pro?.total ? `${E2("Total por escrito: ", "Written total: ")}${dinero(c.pro.total.total)}` : E2("Nada se cobró en la app", "Nothing was charged in the app")) : sinDar ? `${E2("Depósito: ", "Deposit: ")}${dinero(c.dep)}` : `${E2("Precio publicado: ", "Posted price: ")}${dinero(c.total)}`}</span></span>
        <span className="flex-none text-[12.5px] font-bold text-action">{E2("Ver", "See")}</span>
      </button>
    </div>);
  const fotosB = (
    <div data-screen-label="Ayuda con la cita · fotos" className={caja}>
      <div className={T17}>{rub === "salud" ? (conFoto ? E2("Foto de la factura · obligatoria", "Photo of the bill · required") : E2("Foto de la factura · opcional", "Photo of the bill · optional")) : rub === "pro" ? (conFoto ? E2("Foto del recibo o del total por escrito · obligatoria", "Photo of the receipt or written total · required") : E2("Foto del recibo · opcional", "Photo of the receipt · optional")) : conFoto ? E2("Fotos · obligatorias", "Photos · required") : E2("Fotos · opcional", "Photos · optional")}</div>
      <div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{sd ? E2("Del recibo, el contrato o lo publicado. Solo los ven el negocio y To’Latino.", "Of the receipt, the contract or what was posted. Only the business and To’Latino see them.") : rub === "salud" ? E2("Tapa los datos médicos si aparecen; solo hace falta el cobro. Solo la ven el consultorio y To’Latino.", "Cover any medical details; only the charge is needed. Only the office and To’Latino see it.") : rub === "pro" ? E2("Tapa los números de tu caso si aparecen. Solo la ven la oficina y To’Latino.", "Cover your case numbers if they show. Only the office and To’Latino see it.") : ins ? E2("Del recibo, el contrato o lo publicado. Nunca fotos de un niño.", "Of the receipt, the contract or what was posted. Never photos of a child.") : rub === "noche" ? E2("Del recibo o de la pantalla con el cover publicado. Nunca de una identificación.", "Of the receipt or the screen with the posted cover. Never of an ID.") : rub === "hogar" ? E2("De cómo quedó o del daño.", "Of how it looks or the damage.") : rub === "auto" ? E2("Del recibo, del estimado o del daño.", "Of the receipt, the estimate or the damage.") : E2("De cómo quedó, o del recibo si es un cobro.", "Of how it turned out, or of the receipt for a charge.")}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {fotos.map((f) => <button key={f.id} type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="relative h-[76px] w-[76px] overflow-hidden rounded-[14px] bg-photo-bg" style={fondo(f.url)}>
          <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/95"><Icon name="close" size={10} strokeWidth={2.6} /></span></button>)}
        {fotos.length < 4 && <button type="button" disabled={subiendo} onClick={() => fileRef.current?.click()} className="box-border flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-ink/20">
          <Icon name="image" size={20} color="rgba(11,14,18,.5)" /><span className="font-mono text-[9px] font-bold text-ink/55">{subiendo ? "…" : E2("Foto", "Photo")}</span></button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <div className="mt-1.5 text-right font-mono text-[9.5px] font-semibold text-ink/40">{fotos.length} / 4</div>
    </div>);
  const quePaso = (
    <div data-screen-label="Ayuda con la cita · qué pasó" className={caja}>
      <div className={T17}>{E2("¿Qué pasó?", "What happened?")}</div>
      <div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Cuéntalo con calma: qué pediste y qué pasó.", "Take your time: what you asked for and what happened.")}</div>
      <div className="mt-3.5"><div className={K}>{E2("MOTIVO", "REASON")}</div>
        <div className="mt-[9px] flex flex-wrap gap-2">{rsn.map(([k, l1, l2]) => <Chip key={k} variant={r === k ? "selected" : "filter"} onClick={() => setR(r === k ? null : k)}>{es ? l1 : l2}</Chip>)}</div></div>
      <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 500))} aria-label={E2("Qué pasó", "What happened")} placeholder={rub === "inm" ? E2("Ej.: al llegar me pidieron $50 para enseñarme el apartamento…", "E.g. when I arrived they asked for $50 to show me the apartment…") : rub === "dealer" ? E2("Ej.: el total en la puerta decía $9,800 y en la oficina me pidieron $10,600…", "E.g. the out-the-door total said $9,800 and at the office they asked for $10,600…") : rub === "fe" ? E2("Ej.: para darme la despensa me pidieron $20…", "E.g. they asked me for $20 to give me groceries…") : rub === "salud" ? E2("Ej.: me dijeron $0 con Medicaid y me llegó una factura de $60…", "E.g. they said $0 with Medicaid and I got a $60 bill…") : rub === "pro" ? E2("Ej.: el total decía $740 y me pidieron $900 para mandar los papeles…", "E.g. the total said $740 and they asked for $900 to file the papers…") : rub === "hogar" ? E2("Ej.: el grifo volvió a gotear a los dos días…", "E.g. the faucet started dripping again two days later…") : rub === "auto" ? E2("Ej.: me cobraron $80 de más por una pieza que no aprobé…", "E.g. they charged $80 more for a part I did not approve…") : E2("Ej.: pedí un fade bajo y me lo dejaron alto…", "E.g. I asked for a low fade and it came out high…")} rows={3}
        className="mt-3.5 box-border w-full resize-none rounded-[13px] border border-ink/[.12] bg-white px-3.5 py-3 text-[13.5px] font-medium leading-[1.5] text-ink outline-none" />
      <div className="mt-1 text-right font-mono text-[9.5px] font-semibold text-ink/40">{nota.length} / 500</div>
      {r === "ley" && <div className="mt-2 rounded-[13px] bg-paper px-3.5 py-3 text-pretty text-[12px] font-semibold leading-[1.5] text-ink/70">{E2("Si te ofrecieron un trámite de inmigración sin ser abogado ni representante acreditado, también puedes reportarlo a la Fiscalía de Pennsylvania.", "If someone offered you an immigration case without being a lawyer or accredited representative, you can also report it to the Pennsylvania Attorney General.")}</div>}
      {(r === "cobro" || r === "more" || r === "ver" || r === "mudar" || r === "precio") && (sol === "rev" || sp) && <div className="mt-2"><div className={K}>{sp ? E2("¿CUÁNTO TE COBRARON DE MÁS? · OPCIONAL", "HOW MUCH WERE YOU OVERCHARGED? · OPTIONAL") : E2("¿CUÁNTO? · OPCIONAL", "HOW MUCH? · OPTIONAL")}</div>
        <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))} inputMode="decimal" aria-label={E2("Cuánto", "How much")} placeholder={E2("Ej.: 40", "E.g. 40")}
          className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] bg-white px-3.5 font-mono text-[13.5px] font-bold tracking-[0.06em] text-ink outline-none" /></div>}
    </div>);
  const quieres = (
    <div data-screen-label="Ayuda con la cita · qué quieres" className={caja}>
      <div className={T17}>{E2("¿Qué quieres?", "What would you like?")}</div>
      <div role="radiogroup" aria-label={E2("Qué quieres", "What would you like")} className="mt-3 flex flex-col gap-2">
        {sols.map(([k, l1, l2, s1, s2]) => <button key={k} type="button" role="radio" aria-checked={sol === k} onClick={() => setSol(k)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${sol === k ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
          <span className={`box-border h-5 w-5 flex-none rounded-full ${sol === k ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{es ? l1 : l2}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{es ? s1 : s2}</span></span></button>)}
      </div>
    </div>);
  const como = (
    <div data-screen-label="Ayuda con la cita · cómo funciona" className={caja}>
      <div className={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</div>
      <div className="mt-[11px] flex flex-col gap-2.5">{(rub === "evt" ? [E2("Va directo a To’Latino: el cobro de boletos lo hizo To’Latino, no el organizador.", "It goes straight to To’Latino: To’Latino made the ticket charge, not the organizer."),
        E2("Te respondemos aquí y te avisamos; lo cobrado de más vuelve a tu tarjeta en 3–5 días hábiles.", "We answer here and let you know; anything overcharged goes back to your card in 3–5 business days."),
        E2("Tus boletos siguen valiendo mientras lo revisamos.", "Your tickets stay valid while we review it.")] : estafa ? [E2("Va directo a To’Latino: no espera al negocio y se revisa con prioridad.", "It goes straight to To’Latino: it does not wait for the business and is reviewed with priority."), rub === "fe" ? E2("Mientras revisamos, «Pedir fecha» de este lugar queda en pausa.", "While we review, this place's «Ask for a date» is paused.") : E2("Mientras revisamos, el anuncio queda en pausa.", "While we review, the listing is paused."), E2("Tus fotos y lo que cuentas no se publican: solo los ven el negocio y To’Latino.", "Your photos and what you write are never published: only the business and To’Latino see them.")] : [E2(`${quien} recibe tu solicitud y responde en 24 h.`, `${quien} gets your request and replies within 24 h.`), E2("Si no responde o no estás de acuerdo, To’Latino la revisa en 48 h.", "If they do not reply or you disagree, To’Latino reviews it within 48 h."), sp ? E2("Tu foto y lo que cuentas no se publican: solo los ven ellos y To’Latino.", "Your photo and what you write are never published: only they and To’Latino see them.") : sd ? E2("Nada se cobra en To’Latino: lo que se devuelve, lo devuelve el negocio y tú confirmas «Me lo devolvieron».", "Nothing is charged on To’Latino: any refund comes from the business and you confirm «They refunded me».") : E2("Nada se da por resuelto hasta que respondan.", "Nothing is resolved until they reply.")]).map((t, i) => (
        <div key={i} className="flex items-start gap-2.5"><span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-ink font-mono text-[9.5px] font-extrabold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/75">{t}</span></div>))}</div>
    </div>);
  const falta = miss.length > 0 && <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3"><div className={K}>{E2("TE FALTA", "STILL NEEDED")}</div><div className="mt-1.5 flex flex-col gap-1">{miss.map((m) => <div key={m} className="text-[12.5px] font-semibold text-pro-ink">{m}</div>)}</div></div>;
  return (
    <div data-pantalla="APP-NEG-CITA-AYUDA">
      {marco(sub, <>{childline}{estafa}<div className="lg:hidden">{nota1}</div><div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">{tuCita}{fotosB}</div><div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start">{quePaso}{quieres}</div><div className="flex flex-col gap-3 lg:hidden">{como}{falta}</div></>,
        <div className="hidden flex-col gap-3.5 lg:flex">{nota1}{como}{falta}<div className="flex"><Button size="md" icon="image" block disabled={miss.length > 0 || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : cta}</Button></div>
          <div className="text-center font-mono text-[10px] font-bold tracking-[0.08em] text-open-text">{free}</div></div>,
        <div data-screen-label="Ayuda con la cita · barra" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/[.08] bg-paper/95 px-5 pb-[22px] pt-3 backdrop-blur-[14px] lg:hidden">
          <div className="min-w-0 flex-1 font-mono text-[9.5px] font-bold leading-[1.5] tracking-[0.1em] text-open-text">{free}</div>
          <Button icon="image" disabled={miss.length > 0 || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : cta}</Button>
        </div>)}
    </div>
  );
}
