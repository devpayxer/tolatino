/* Los nombres de los motivos y de lo que se pide en una ayuda con una cita, para el panel del negocio y el Super Admin
   (en la pantalla de la persona salen del diseño de cada rubro). Una sola lista: antes había dos copias que se desfasaban.
   «cobro» y «espera» dicen distinto en Doctores y Profesionales. */
type EF = (es: string, en: string) => string;
const BASE = (E2: EF): Record<string, string> => ({
  win: E2("No llegó en la franja", "Did not arrive in the window"), more: E2("Cobró más de lo aprobado", "Charged more than approved"),
  bad: E2("Quedó mal o volvió a fallar", "Not fixed or failed again"), dmg: E2("Dañó algo de la casa", "Damaged something in the home"),
  who: E2("Vino otra persona", "Someone else came"), tarde: E2("No estuvo listo cuando prometieron", "Not ready when promised"),
  igual: E2("Sigue el mismo problema", "Same problem is back"), dano: E2("Dañaron algo del carro", "Damaged something on the car"),
  piezas: E2("No le dieron las piezas viejas", "Old parts not returned"),
  cobro: E2("Cobraron más del precio publicado", "Charged more than the posted price"),
  quien: E2("No la atendió quien reservó", "Not the person they booked"), quedo: E2("No quedó como lo pidió", "It did not turn out as asked"),
  espera: E2("Esperó mucho a pesar de la cita", "Long wait despite the booking"), dep: E2("No le devolvieron el depósito", "Deposit not returned"),
  otro: E2("Otra cosa", "Something else"), seguro: E2("Cobraron a su seguro algo que no pidió", "Billed their insurance for something not requested"),
  noseg: E2("No aceptaron su seguro después de confirmar", "Insurance not taken after confirming"),
  interp: E2("No había intérprete", "No interpreter"), trato: E2("Mal trato", "Treated badly"),
  ley: E2("Ofreció algo que no podía hacer por ley", "Offered something they could not legally do"),
  nohizo: E2("No hizo lo acordado", "Did not do what was agreed"),
  fecha: E2("Perdió una fecha o un documento", "Missed a deadline or lost a document"), contesta: E2("No le contesta", "Does not answer"),
  peso: E2("El peso no cuadra", "The weight does not add up"), falto: E2("Faltó algo", "Something was missing"),
  fresco: E2("No estaba fresco", "Not fresh"), sust: E2("Cambiaron algo sin preguntar", "Swapped something without asking"),
  caja: E2("No cobraron el precio publicado", "Did not charge the posted price"), apa: E2("No guardaron el apartado", "Did not keep the hold"),
  talla: E2("Talla o artículo equivocado", "Wrong size or item"), cambio: E2("No aceptan el cambio", "Exchange refused"),
  nollego: E2("No llegaron", "They did not show up"), nocomo: E2("No quedó como lo acordado", "Not as agreed"),
  inseguro: E2("Manejo inseguro", "Unsafe driving"), equipaje: E2("Perdió o dañó su equipaje o caja", "Lost or damaged their luggage or box"),
  cover: E2("Cobraron más cover", "Charged more cover"), lista: E2("No respetaron la lista", "List not honored"),
  mesa: E2("No respetaron la mesa", "Table not honored"), minimo: E2("Cobraron el mínimo aparte", "Charged the minimum as an extra fee"),
  cert: E2("No le dieron el certificado prometido", "Did not get the promised certificate"),
  horario: E2("No cumplieron el horario", "Schedule not kept"), ensena: E2("No enseñan lo prometido", "Not teaching what was promised"),
  lic: E2("No tenían licencia", "No license"), cuidado: E2("No cuidaron bien a su niño", "Did not take good care of their child"),
  salir: E2("No lo dejan cancelar", "Will not let them cancel"), equipo: E2("El equipo o la cancha no sirven", "Equipment or field not usable"),
  idioma: E2("No había servicio en español", "No service in Spanish"), ver: E2("Le cobraron por ver la propiedad", "Charged to view the property"),
  mudar: E2("Le pidieron más para mudarse de lo publicado", "Asked for more to move in than posted"),
  fotos: E2("No era como en las fotos", "Not like the photos"), precio: E2("El precio en la puerta fue más", "The out-the-door price was higher"),
  titulo: E2("No le enseñaron el título", "Did not show the title"), doble: E2("Le cobraron dos veces", "Charged twice"),
  monto: E2("El cobro no es el que vio", "The charge is not what they saw"), sinbol: E2("Pagó y no tiene sus boletos", "Paid and has no tickets")
});
const POR_RUBRO = (E2: EF): Record<string, Record<string, string>> => ({
  salud: { cobro: E2("Le cobraron algo que no dijeron", "Charged something not mentioned"), espera: E2("Esperó mucho más de lo que dijeron", "Waited much longer than stated") },
  pro: { cobro: E2("Cobró más del total por escrito", "Charged more than the written total") },
  merc: { tarde: E2("Llegó tarde", "Arrived late"), caja: E2("No cobraron el precio del estante", "Did not charge the shelf price") },
  tienda: { caja: E2("Cobraron más en la caja", "Charged more at the register"), dano: E2("Llegó dañado", "Arrived damaged") },
  fiesta: { tarde: E2("Llegaron tarde", "Arrived late"), falto: E2("Faltó algo del paquete", "Something in the package was missing"), cobro: E2("Cobraron más del paquete", "Charged more than the package"), dano: E2("Dañaron algo o no recogieron", "Damaged something or did not pick up") },
  noche: { inseguro: E2("Se sintió inseguro", "Felt unsafe"), trato: E2("Mal trato en la puerta", "Treated badly at the door"), dep: E2("No le descontaron el depósito", "Deposit not taken off the bill") },
  edu: { cobro: E2("Cobraron más del total", "Charged more than the total") },
  ninos: { cobro: E2("Cobraron más de lo que dijeron", "Charged more than stated") },
  dep: { cobro: E2("La cuota no fue la que vio", "The fee was not what they saw") },
  fe: { cobro: E2("Le pidieron dinero por la ayuda", "Asked for money for the help"), horario: E2("Cambiaron la hora sin avisar", "Changed the time without notice"), trato: E2("Lo trataron mal", "Treated badly") },
  inm: { nollego: E2("No llegaron a la visita", "Did not show up for the visit") },
  dealer: { nollego: E2("El carro no estaba el día de la prueba", "The car was not there for the test drive"), fotos: E2("El carro no era como en las fotos", "The car was not like the photos") },
  evp: { nocomo: E2("No fue como lo acordado", "Not as agreed"), falto: E2("Faltó algo de lo acordado", "Something agreed was missing"), cobro: E2("Cobraron más de lo acordado", "Charged more than agreed"), dep: E2("No le descontaron el depósito", "Deposit not taken off the bill") },
  trans: { cobro: E2("Cobró más del precio cerrado", "Charged more than the fixed price"), tarde: E2("Salió o llegó muy tarde", "Left or arrived very late"), nollego: E2("No pasó a recogerlo", "Did not pick them up") }
});
/* E2 es el de quien lo muestra (el de la pantalla; en el servidor, (es) => es): el texto sale por E2 y entra al catálogo del CMS. Lo que se guarda es la clave (k), nunca el texto. */
export const motivoAyuda = (E2: EF, k: string, rubro?: string | null): string => POR_RUBRO(E2)[rubro ?? ""]?.[k] ?? BASE(E2)[k] ?? BASE(E2).otro!;
/* Lo que pide (corr/rev/avis/seg/fin, o como se guarda: reponer/devolver/avisar/seguro/terminar). */
const QUIERE = (E2: EF): Record<string, string> => ({
  corr: E2("Que se lo arreglen o repongan sin cargo", "Fix or replace it at no charge"), rev: E2("Que le devuelvan", "A refund"),
  avis: E2("Solo quiere avisar", "Just letting you know"), seg: E2("Que corrijan el cobro a su seguro", "Fix the charge to their insurance"),
  fin: E2("Que terminen lo acordado, sin cobrar más", "Finish what was agreed, at no extra charge"),
  desc: E2("Un descuento, a acordar con el negocio", "A discount, agreed with the business"),
  grupo: E2("Terminar en otro grupo sin pagar otra vez", "Finish in another group without paying again"),
  arreglar: E2("Que lo arreglen", "Have it fixed"), baja: E2("Cancelar la membresía", "Cancel the membership"),
  llamar: E2("Que lo llamen", "A call back"), otra: E2("Otra visita, con hora confirmada", "Another visit, at a confirmed time"),
  antes: E2("Que lo arreglen antes de firmar", "Fix it before signing")
});
const W2Q: Record<string, string> = { reponer: "corr", devolver: "rev", avisar: "avis", seguro: "seg", terminar: "fin", descuento: "desc", otro_grupo: "grupo", arreglar: "arreglar", cancelar_membresia: "baja", llamar: "llamar", otra_visita: "otra", arreglar_antes: "antes" };
export const quiereAyuda = (E2: EF, k: string): string => QUIERE(E2)[W2Q[k] ?? k] ?? QUIERE(E2).avis!;
