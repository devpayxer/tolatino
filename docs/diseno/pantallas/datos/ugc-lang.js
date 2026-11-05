/* D3 (22 oct) · Lo que escribe un vecino (reseñas, publicaciones, comentarios) se ve siempre en su idioma original,
   con «Ver traducción» si la app está en el otro idioma. En el prototipo los datos de ejemplo traen el texto en los dos
   idiomas y el original sale del id (1 de cada 6 se escribió en inglés). Lo que escribe la cuenta de la sesión es suyo:
   sin enlace. Donde el dato trae un solo idioma no hay traducción que mostrar. En la app: lang + traducción guardada aparte.
   TLLang.orig(id, es, en) → 'es' | 'en' · TLLang.view(id, es, en, app, open, { mine }) → { text, lang, canTr, tr } */
(function () {
  const hash = s => { let x = 7; s = String(s || ''); for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); };
  const same = (a, b) => String(a || '').trim() === String(b || '').trim();
  function orig(id, es, en) { if (!String(en || '').trim() || same(es, en)) return 'es'; if (!String(es || '').trim()) return 'en'; return hash(id) % 6 === 0 ? 'en' : 'es'; }
  function view(id, es, en, app, open, o) {
    o = o || {}; const L = orig(id, es, en), both = !!String(es || '').trim() && !!String(en || '').trim() && !same(es, en);
    const canTr = both && !o.mine && L !== app, src = L === 'es' ? (es || en) : (en || es), tr = app === 'es' ? es : en;
    return { text: canTr && open ? tr : src, lang: L, canTr, tr: canTr ? (open ? (app === 'es' ? 'Ver original' : 'See original') : (app === 'es' ? 'Ver traducción' : 'See translation')) : '' };
  }
  window.TLLang = { orig, view, hash };
})();
