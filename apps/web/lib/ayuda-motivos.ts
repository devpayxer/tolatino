/* Los nombres de los motivos y de lo que se pide en una ayuda con una cita, para el panel del negocio y el Super Admin
   (en la pantalla de la persona salen del diseño de cada rubro). Una sola lista: antes había dos copias que se desfasaban.
   «cobro» y «espera» dicen distinto en Doctores y Profesionales. */
type L = [string, string];
const BASE: Record<string, L> = {
  win: ["No llegó en la franja", "Did not arrive in the window"], more: ["Cobró más de lo aprobado", "Charged more than approved"], bad: ["Quedó mal o volvió a fallar", "Not fixed or failed again"],
  dmg: ["Dañó algo de la casa", "Damaged something in the home"], who: ["Vino otra persona", "Someone else came"], tarde: ["No estuvo listo cuando prometieron", "Not ready when promised"],
  igual: ["Sigue el mismo problema", "Same problem is back"], dano: ["Dañaron algo del carro", "Damaged something on the car"], piezas: ["No le dieron las piezas viejas", "Old parts not returned"],
  cobro: ["Cobraron más del precio publicado", "Charged more than the posted price"], quien: ["No la atendió quien reservó", "Not the person they booked"], quedo: ["No quedó como lo pidió", "It did not turn out as asked"],
  espera: ["Esperó mucho a pesar de la cita", "Long wait despite the booking"], dep: ["No le devolvieron el depósito", "Deposit not returned"], otro: ["Otra cosa", "Something else"],
  // Doctores
  seguro: ["Cobraron a su seguro algo que no pidió", "Billed their insurance for something not requested"], noseg: ["No aceptaron su seguro después de confirmar", "Insurance not taken after confirming"],
  interp: ["No había intérprete", "No interpreter"], trato: ["Mal trato", "Treated badly"],
  // Profesionales
  ley: ["Ofreció algo que no podía hacer por ley", "Offered something they could not legally do"], nohizo: ["No hizo lo acordado", "Did not do what was agreed"],
  fecha: ["Perdió una fecha o un documento", "Missed a deadline or lost a document"], contesta: ["No le contesta", "Does not answer"],
  // Mercados y Tiendas (4s)
  peso: ["El peso no cuadra", "The weight does not add up"], falto: ["Faltó algo", "Something was missing"], fresco: ["No estaba fresco", "Not fresh"],
  sust: ["Cambiaron algo sin preguntar", "Swapped something without asking"], caja: ["No cobraron el precio publicado", "Did not charge the posted price"],
  apa: ["No guardaron el apartado", "Did not keep the hold"], talla: ["Talla o artículo equivocado", "Wrong size or item"], cambio: ["No aceptan el cambio", "Exchange refused"],
  // Fiestas y Transporte (4z)
  nollego: ["No llegaron", "They did not show up"], nocomo: ["No quedó como lo acordado", "Not as agreed"], inseguro: ["Manejo inseguro", "Unsafe driving"],
  equipaje: ["Perdió o dañó su equipaje o caja", "Lost or damaged their luggage or box"],
  // Noche (4nd)
  cover: ["Cobraron más cover", "Charged more cover"], lista: ["No respetaron la lista", "List not honored"], mesa: ["No respetaron la mesa", "Table not honored"],
  minimo: ["Cobraron el mínimo aparte", "Charged the minimum as an extra fee"],
  // Educación, Niños y Deporte (4ef)
  cert: ["No le dieron el certificado prometido", "Did not get the promised certificate"], horario: ["No cumplieron el horario", "Schedule not kept"],
  ensena: ["No enseñan lo prometido", "Not teaching what was promised"], lic: ["No tenían licencia", "No license"], cuidado: ["No cuidaron bien a su niño", "Did not take good care of their child"],
  salir: ["No lo dejan cancelar", "Will not let them cancel"], equipo: ["El equipo o la cancha no sirven", "Equipment or field not usable"],
};
const POR_RUBRO: Record<string, Record<string, L>> = {
  salud: { cobro: ["Le cobraron algo que no dijeron", "Charged something not mentioned"], espera: ["Esperó mucho más de lo que dijeron", "Waited much longer than stated"] },
  pro: { cobro: ["Cobró más del total por escrito", "Charged more than the written total"] },
  merc: { tarde: ["Llegó tarde", "Arrived late"], caja: ["No cobraron el precio del estante", "Did not charge the shelf price"] },
  tienda: { caja: ["Cobraron más en la caja", "Charged more at the register"], dano: ["Llegó dañado", "Arrived damaged"] },
  fiesta: { tarde: ["Llegaron tarde", "Arrived late"], falto: ["Faltó algo del paquete", "Something in the package was missing"], cobro: ["Cobraron más del paquete", "Charged more than the package"], dano: ["Dañaron algo o no recogieron", "Damaged something or did not pick up"] },
  noche: { inseguro: ["Se sintió inseguro", "Felt unsafe"], trato: ["Mal trato en la puerta", "Treated badly at the door"], dep: ["No le descontaron el depósito", "Deposit not taken off the bill"] },
  edu: { cobro: ["Cobraron más del total", "Charged more than the total"] }, ninos: { cobro: ["Cobraron más de lo que dijeron", "Charged more than stated"] },
  dep: { cobro: ["La cuota no fue la que vio", "The fee was not what they saw"] },
  trans: { cobro: ["Cobró más del precio cerrado", "Charged more than the fixed price"], tarde: ["Salió o llegó muy tarde", "Left or arrived very late"], nollego: ["No pasó a recogerlo", "Did not pick them up"] },
};
export const motivoAyuda = (k: string, rubro?: string | null): L => POR_RUBRO[rubro ?? ""]?.[k] ?? BASE[k] ?? BASE.otro!;
/* Lo que pide (corr/rev/avis/seg/fin, o como se guarda: reponer/devolver/avisar/seguro/terminar). */
const QUIERE: Record<string, L> = {
  corr: ["Que se lo arreglen o repongan sin cargo", "Fix or replace it at no charge"], rev: ["Que le devuelvan", "A refund"], avis: ["Solo quiere avisar", "Just letting you know"],
  seg: ["Que corrijan el cobro a su seguro", "Fix the charge to their insurance"], fin: ["Que terminen lo acordado, sin cobrar más", "Finish what was agreed, at no extra charge"],
  desc: ["Un descuento, a acordar con el negocio", "A discount, agreed with the business"],
  grupo: ["Terminar en otro grupo sin pagar otra vez", "Finish in another group without paying again"], arreglar: ["Que lo arreglen", "Have it fixed"],
  baja: ["Cancelar la membresía", "Cancel the membership"],
};
const W2Q: Record<string, string> = { reponer: "corr", devolver: "rev", avisar: "avis", seguro: "seg", terminar: "fin", descuento: "desc", otro_grupo: "grupo", arreglar: "arreglar", cancelar_membresia: "baja" };
export const quiereAyuda = (k: string): L => QUIERE[W2Q[k] ?? k] ?? QUIERE.avis!;
