/* C-005 → C-008 · La ficha nueva del negocio (cambios.md del canvas tolatino-master+). Lo comparten la página (servidor: qué
   negocios la usan) y FichaNueva.tsx (cliente: cómo se ve). */
/* Lo que cambia por categoría (tabla de ficha3 · cambios.md): nombre y ícono de lo que vende, nombre del equipo, si se elige persona,
   la acción y los pasos de la hoja. C-005 enciende Belleza; C-006 suma las demás con su adaptador. */
export type Cfg = { tab: [string, string]; icon: string; title: [string, string]; staffTab: [string, string]; staffTitle: [string, string]; pick: boolean;
  label: [string, string]; cta: [string, string]; s1: [string, string]; s2: [string, string] };
export const CFG_FICHA: Record<string, Cfg> = {
  "NEG-BELL": { tab: ["SERVICIOS", "SERVICES"], icon: "scissors", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Equipo", "Team"], pick: true,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Booking", "Booking"], s1: ["Servicio y con quién", "Service and who"], s2: ["Día y hora", "Day and time"] },
  // C-006 · Las demás categorías (tabla de ficha3): cambian nombres, acción y pasos; la ficha es la misma.
  "NEG-FOOD": { tab: ["MENÚ", "MENU"], icon: "restaurant", title: ["Menú", "Menu"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Equipo", "Team"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Ordenar", "Order"], s1: ["Tu pedido", "Your order"], s2: ["Cuándo lo recoges", "Pickup time"] },
  "NEG-AUTO": { tab: ["SERVICIOS", "SERVICES"], icon: "wrench", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Equipo", "Team"], pick: true,
    label: ["MECÁNICO", "MECHANIC"], cta: ["Booking", "Booking"], s1: ["Servicio y mecánico", "Service and mechanic"], s2: ["Día y hora", "Day and time"] },
  "NEG-HOGAR": { tab: ["SERVICIOS", "SERVICES"], icon: "wrench", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quién va a tu casa", "Who comes to your home"], pick: true,
    label: ["QUIÉN VA", "WHO COMES"], cta: ["Booking", "Booking"], s1: ["Servicio y quién va", "Service and who comes"], s2: ["Día y franja", "Day and window"] },
  "NEG-SALUD": { tab: ["SERVICIOS", "SERVICES"], icon: "medical", title: ["Servicios", "Services"], staffTab: ["DOCTORES", "DOCTORS"], staffTitle: ["Doctores", "Doctors"], pick: true,
    label: ["DOCTOR", "DOCTOR"], cta: ["Booking", "Booking"], s1: ["Consulta y doctor", "Visit and doctor"], s2: ["Día y hora", "Day and time"] },
  "NEG-NOCHE": { tab: ["ESTA NOCHE", "TONIGHT"], icon: "drink", title: ["Esta noche", "Tonight"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quién está esta noche", "Who is here tonight"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Lista y mesas", "List and tables"], s1: ["Lista o mesa", "List or table"], s2: ["Noche y hora", "Night and time"] },
  "NEG-MERC": { tab: ["PRODUCTOS", "PRODUCTS"], icon: "cart", title: ["Productos", "Products"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quién te atiende", "Who helps you"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Ordenar", "Order"], s1: ["Tu pedido", "Your order"], s2: ["Cuándo lo recoges", "Pickup time"] },
  "NEG-FIESTA": { tab: ["SERVICIOS", "SERVICES"], icon: "party", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Equipo", "Team"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Pedir fecha", "Request a date"], s1: ["Paquete", "Package"], s2: ["Fecha y hora", "Date and time"] },
  "NEG-PRO": { tab: ["SERVICIOS", "SERVICES"], icon: "law", title: ["Servicios", "Services"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quién te atiende", "Who helps you"], pick: true,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Booking", "Booking"], s1: ["Consulta y con quién", "Visit and who"], s2: ["Día y hora", "Day and time"] },
  "NEG-TIENDA": { tab: ["PRODUCTOS", "PRODUCTS"], icon: "bag", title: ["Productos", "Products"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quién te atiende", "Who helps you"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Apartar", "Hold"], s1: ["Lo que apartas", "What you hold"], s2: ["Cuándo lo recoges", "Pickup time"] },
  "NEG-TRANS": { tab: ["VIAJES", "TRIPS"], icon: "car", title: ["Viajes y envíos", "Trips and shipping"], staffTab: ["CHOFERES", "DRIVERS"], staffTitle: ["Choferes", "Drivers"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Reservar", "Book"], s1: ["Viaje", "Trip"], s2: ["Día y salida", "Day and departure"] },
  "NEG-EDU": { tab: ["CURSOS", "COURSES"], icon: "news", title: ["Cursos", "Courses"], staffTab: ["MAESTROS", "TEACHERS"], staffTitle: ["Maestros", "Teachers"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Inscribirme", "Enroll"], s1: ["Curso", "Course"], s2: ["Día de la primera clase", "First class day"] },
  "NEG-NINOS": { tab: ["PROGRAMAS", "PROGRAMS"], icon: "smile", title: ["Programas", "Programs"], staffTab: ["MAESTROS", "TEACHERS"], staffTitle: ["Maestros", "Teachers"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Inscribirme", "Enroll"], s1: ["Programa", "Program"], s2: ["Día de la visita", "Visit day"] },
  "NEG-DEPORTE": { tab: ["MEMBRESÍAS", "MEMBERSHIPS"], icon: "bolt", title: ["Membresías", "Memberships"], staffTab: ["ENTRENADORES", "COACHES"], staffTitle: ["Entrenadores", "Coaches"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Inscribirme", "Join"], s1: ["Membresía o clase", "Membership or class"], s2: ["Día de tu primera visita", "Your first visit"] },
  "NEG-FE": { tab: ["MISAS", "SERVICES"], icon: "calendar", title: ["Misas y sacramentos", "Masses and sacraments"], staffTab: ["EQUIPO", "TEAM"], staffTitle: ["Quiénes sirven", "Who serves"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Pedir fecha", "Request a date"], s1: ["Sacramento", "Sacrament"], s2: ["Día y hora", "Day and time"] },
  "NEG-INMUEBLE": { tab: ["PROPIEDADES", "PROPERTIES"], icon: "home", title: ["Propiedades", "Properties"], staffTab: ["AGENTES", "AGENTS"], staffTitle: ["Agentes", "Agents"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Pedir visita", "Request a visit"], s1: ["Propiedad", "Property"], s2: ["Día y hora de la visita", "Visit day and time"] },
  "NEG-DEALER": { tab: ["EN EL LOTE", "ON THE LOT"], icon: "car", title: ["En el lote", "On the lot"], staffTab: ["VENDEDORES", "SALES"], staffTitle: ["Vendedores", "Salespeople"], pick: false,
    label: ["CON QUIÉN", "WITH WHOM"], cta: ["Prueba de manejo", "Test drive"], s1: ["Carro", "Car"], s2: ["Día y hora", "Day and time"] },
};

