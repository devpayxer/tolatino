// Hito 19 nov · Hacer clic antes de que React conecte la página: el clic cae en el HTML del servidor y no hace nada (pedidos2c: el interruptor
// no cambió y «Guardar» siguió apagado; vec9m: el plato no abrió su hoja). React marca cada elemento que hidrata con sus props
// (__reactProps…): se espera a que ESE elemento las tenga (máx. 15 s) y entonces se actúa.
const hidratado = async (loc, ms = 15000) => {
  await loc.waitFor({ timeout: ms });
  await loc.evaluate((el, ms) => new Promise((r, x) => { const t0 = Date.now(); const k = () => (Object.keys(el).some((y) => y.startsWith('__reactProps')) ? r() : Date.now() - t0 > ms ? x(new Error('sin hidratar en ' + ms + ' ms')) : setTimeout(k, 100)); k(); }), ms);
  return loc;
};
module.exports = { hidratado };
