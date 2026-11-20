// Elegir una foto como la elige una persona (20 nov, CI dirigido 44707074106): tocar «Agregar una foto», que abre el selector, y elegir el
// archivo. Antes msg9t ponía el archivo directo en el <input type=file> escondido justo después de cargar la página; en el WebKit del CI (iPad y
// iPhone SE) a veces eso pasaba antes de que la página respondiera y el cambio no llegaba a nadie: la miniatura nunca salía. Una persona no
// puede elegir antes de que el botón responda (el selector lo abre el botón), así que la prueba hace lo mismo: si el toque no abrió el selector,
// vuelve a tocar (hasta 3 veces). Si la foto no se sube, el error dice por qué (sin POST, o el status y la respuesta del servidor).
async function elegirFoto(p, archivo, { boton = 'Agregar una foto', ruta = /\/api\/mensajes\/foto(\?|$)/ } = {}) {
  const resp = p.waitForResponse((r) => ruta.test(new URL(r.url()).pathname + new URL(r.url()).search) && r.request().method() === 'POST', { timeout: 40000 }).catch(() => null);
  let fc = null;
  for (let i = 0; i < 3 && !fc; i++) {
    [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), p.getByRole('button', { name: boton }).first().click()]);
  }
  if (!fc) throw new Error(`«${boton}» no abrió el selector de archivos (3 toques)`);
  await fc.setFiles(archivo);
  const r = await resp;
  if (!r) throw new Error('la foto elegida no se subió: no hubo POST a la ruta de fotos');
  if (r.status() !== 200) throw new Error(`la foto elegida no se subió: ${r.status()} ${(await r.text().catch(() => '')).slice(0, 300)}`);
  await p.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
}
module.exports = { elegirFoto };
