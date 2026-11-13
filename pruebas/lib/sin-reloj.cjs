// 9b-3 · El texto de una página para compararla «antes / después» sin el reloj: la hora («12 PM» y «12:01 PM» son la misma pantalla un minuto
// después), el saludo que cambia a las 12 y a las 7 y el día de la semana; después, cada número es «#». Una prueba que compara dos fotos de la
// misma página no puede fallar porque entre las dos pasó la hora en punto (compa7e en la confirmación barajada del CI). Guardián fotoSinReloj.
const HORA = /\b\d{1,2}(:\d{2})? ?(AM|PM|a\. ?m\.|p\. ?m\.)/gi;
const SALUDO = /\b(Buenos días|Buenas tardes|Buenas noches|Good morning|Good afternoon|Good evening)\b/g;
const DIA = /\b(LUNES|MARTES|MIÉRCOLES|JUEVES|VIERNES|SÁBADO|DOMINGO|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/gi;
const norm = (t) => String(t).replace(HORA, 'HORA').replace(SALUDO, 'SALUDO').replace(DIA, 'DÍA').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
module.exports = { norm };
