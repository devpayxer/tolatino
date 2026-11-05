/* Textos de interfaz ES/EN, copiados del prototipo (To'Latino Prototipo.dc.html, objeto t). Se mudarán a cms_strings
   (editables desde el Super Admin › Textos) cuando exista esa sección (Fase 9). */
export const T = {
  es: {
    search: "¿Qué necesitas hoy?", searchIn: "Buscar en Hazleton", searchDesk: "Buscar negocios, eventos y más en Hazleton",
    allCats: "Todas (17)", catsTitle: "CATEGORÍAS (17)", today: "Hoy en el barrio", seeAll: "Ver todo", openNow: "Abierto ahora",
    events: "Esta semana", community: "Comunidad", forBiz: "PARA NEGOCIOS", publishTitle: "Publica tu negocio gratis",
    publishBody: "Sin importar el nivel de tu emprendimiento: si ya estás establecido, si estás iniciando, o si solo es un hobby.",
    publishCta: "Publicar mi negocio", nav: ["INICIO", "NEGOCIOS", "COMUNIDAD", "EVENTOS", "YO"],
    tabs: ["INICIO", "NEGOCIOS", "COMUNIDAD", "EVENTOS"], login: "Entrar", publish: "Publicar mi negocio",
  },
  en: {
    search: "What do you need today?", searchIn: "Search Hazleton", searchDesk: "Search businesses, events and more in Hazleton",
    allCats: "All (17)", catsTitle: "CATEGORIES (17)", today: "Today nearby", seeAll: "See all", openNow: "Open now",
    events: "This week", community: "Community", forBiz: "FOR BUSINESSES", publishTitle: "List your business for free",
    publishBody: "Whatever stage you are at: established, just starting, or it is only a hobby.",
    publishCta: "List my business", nav: ["HOME", "BUSINESS", "COMMUNITY", "EVENTS", "ME"],
    tabs: ["HOME", "BUSINESS", "COMMUNITY", "EVENTS"], login: "Sign in", publish: "List my business",
  },
} as const;
