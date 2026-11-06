/* Lo que una reseña pública nunca lleva (cliente y servidor usan lo mismo; el servidor decide).
   PII: teléfonos y correos. PRIVADO (4m · Doctores y Profesionales): A-number, número de caso de USCIS, diagnósticos y
   medicinas comunes, dosis. */
export const PII = /(\d[\s().-]*){10}|\S+@\S+\.\S+/;
export const PRIVADO = /\bA[\s-]?\d{8,9}\b|\b[A-Z]{3}\d{10}\b|\b(diagn[oó]stic\w*|vih|hiv|sida|c[aá]ncer|diabetes|depresi[oó]n|ansiedad cr[oó]nica|embarazad\w*|aborto|esquizofrenia|bipolar|metformina|insulina|sertralina|fluoxetina|prozac|xanax|alprazolam|adderall|oxicodona|suboxone|metadona|\d+\s?mg)\b/i;
