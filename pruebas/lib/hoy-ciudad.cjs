// 23 nov · «Hoy» de una prueba que no lo pregunta a la base: el día de la ciudad (America/New_York, la zona de las cinco ciudades), nunca el de Greenwich.
// `new Date().toISOString().slice(0, 10)` da el día de UTC: de las 7 u 8 PM a la medianoche de Hazleton ya es «mañana» (el mismo defecto que el guardián
// hoyEnLaCiudad vigila en la app). Guardián: hoyDeLaPruebaEnLaCiudad.
const hoyCiudad = (zona = 'America/New_York', d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
module.exports = { hoyCiudad };
