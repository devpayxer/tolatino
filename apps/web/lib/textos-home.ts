/* 9f · Los textos del Inicio de la ciudad (antes escritos a mano en Inicio.tsx con E2). Viven aquí como cadenas con llave (APP-HOME.clave) para que el
   Super Admin › Textos y páginas › Cadenas las lea y las edite (lib/cms.ts: la base primero, este archivo de respaldo). Mismas palabras de siempre:
   hasta que alguien edite una, la pantalla se ve exactamente igual. Las marcas {x} se conservan al editar. */
export const HOME = {
  es: {
    hoy: "Hoy en el barrio", semana: "Esta semana", gratis: "GRATIS", desde: "DESDE ", conBoletos: "CON BOLETOS", comunidad: "Comunidad",
    pregunto: "PREGUNTÓ", encuesta: "ENCUESTA", aviso: "AVISO",
    comunidadSub: "La comunidad es para vecinos con cuenta. Entra para leer las respuestas y recomendar.", irComunidad: "Ir a la comunidad", entrar: "Entrar",
    anuncioK: "ANUNCIO", avisoCiudadK: "AVISO DE LA CIUDAD",
  },
  en: {
    hoy: "Today nearby", semana: "This week", gratis: "FREE", desde: "FROM ", conBoletos: "TICKETED", comunidad: "Community",
    pregunto: "ASKED", encuesta: "POLL", aviso: "NOTICE",
    comunidadSub: "Community is for neighbors with an account. Sign in to read answers and recommend.", irComunidad: "Go to community", entrar: "Sign in",
    anuncioK: "ANNOUNCEMENT", avisoCiudadK: "CITY NOTICE",
  },
} as const;
