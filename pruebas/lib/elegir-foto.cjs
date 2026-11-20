// Elegir una foto como la elige una persona (20 nov, CI dirigido 44707074106): tocar «Agregar una foto», que abre el selector, y elegir el
// archivo. Antes msg9t ponía el archivo directo en el <input type=file> escondido justo después de cargar la página; en el WebKit del CI (iPad y
// iPhone SE) a veces eso pasaba antes de que la página respondiera y el cambio no llegaba a nadie: la miniatura nunca salía. Una persona no
// puede elegir antes de que el botón responda (el selector lo abre el botón), así que la prueba hace lo mismo: si el toque no abrió el selector,
// vuelve a tocar (hasta 3 veces). Si la foto no se sube, el error dice por qué (sin POST, o el status y la respuesta del servidor).
// toque: el control que abre el selector (por defecto el botón «Agregar una foto»); listo: lo que se espera después (por defecto la miniatura).
async function elegirFoto(p, archivo, { boton = 'Agregar una foto', ruta = /\/api\/mensajes\/foto(\?|$)/, toque = null, listo = null } = {}) {
  // Las respuestas de la ruta de fotos desde ahora: la app reintenta UNA vez si la primera no llega (lib/subir-foto.ts, mandar).
  const resps = [], oye = (r) => { try { if (ruta.test(new URL(r.url()).pathname + new URL(r.url()).search) && r.request().method() === 'POST') resps.push(r); } catch { /* otra cosa */ } };
  p.on('response', oye);
  let fc = null;
  for (let i = 0; i < 3 && !fc; i++) {
    [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), (toque ? toque(p) : p.getByRole('button', { name: boton }).first()).click()]);
  }
  if (!fc) throw new Error(`«${boton}» no abrió el selector de archivos (3 toques)`);
  await fc.setFiles(archivo);
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && !resps.some((r) => r.status() === 200) && !(resps.length >= 2) && !(resps.length === 1 && ![400].includes(resps[0].status()))) await new Promise((r) => setTimeout(r, 150));
  p.off('response', oye);
  if (!resps.length) throw new Error('la foto elegida no se subió: no hubo POST a la ruta de fotos');
  const r = resps[resps.length - 1];
  if (r.status() !== 200) throw new Error(`la foto elegida no se subió (${resps.length} intento(s): ${resps.map((x) => x.status()).join(', ')}): ${(await r.text().catch(() => '')).slice(0, 300)}`);
  if (resps.length > 1) console.log(`  · INESTABLE la primera subida de la foto no llegó (${resps[0].status()}); el reintento de la app sí (200)`);
  if (listo) await listo(p); else await p.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
}
module.exports = { elegirFoto };
