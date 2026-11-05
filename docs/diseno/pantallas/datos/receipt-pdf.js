/* To'Latino · recibo en PDF (P8 · 20 oct 2026). PDF real (1.4, Helvetica / Courier con WinAnsiEncoding), sin librerías.
   TLPdf.receipt(R, archivo, es) recibe los mismos datos que pinta APP-NEG-PEDIDO-RECIBO (rcpVals) y descarga el archivo. */
(function () {
  const MAP = { '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2026': 0x85, '\u20AC': 0x80, '\u2212': 0x2D, '\u00A0': 0x20, '\u2605': 0x2A, '\u00D7': 0xD7 };
  const enc = t => { let o = ''; for (const ch of String(t == null ? '' : t)) { const c = ch.codePointAt(0), b = MAP[ch] != null ? MAP[ch] : c < 256 ? c : 0x3F, x = String.fromCharCode(b); o += x === '(' || x === ')' || x === '\\' ? '\\' + x : x; } return o; };
  const wrap = (s, max) => { const out = []; let cur = ''; String(s || '').split(/\s+/).forEach(w => { if ((cur + ' ' + w).trim().length > max) { if (cur) out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out; };
  function build(R, es) {
    const L = 56, RX = 556, INK = '0.043 0.055 0.071', MUT = '0.4 0.42 0.45', LAB = '0.45 0.47 0.5', pages = []; let ops = [], y = 740;
    const txt = (s, x, yy, f, sz, rgb) => ops.push((rgb || INK) + ' rg BT /' + f + ' ' + sz + ' Tf ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td (' + enc(s) + ') Tj ET');
    const right = (s, yy, sz, rgb) => { const w = enc(s).replace(/\\(.)/g, '$1').length * 0.6 * sz; txt(s, RX - w, yy, 'F3', sz, rgb); };
    const rule = yy => ops.push('0.85 G 0.6 w ' + L + ' ' + yy.toFixed(1) + ' m ' + RX + ' ' + yy.toFixed(1) + ' l S');
    const foot = () => txt('tolatino.app  \u00B7  Hazleton, PA', L, 40, 'F1', 8, LAB);
    const page = () => { foot(); pages.push(ops); ops = []; y = 740; };
    const need = h => { if (y - h < 70) page(); };
    const lb = R.lbl || {};
    txt("To'Latino", L, y, 'F2', 20); if (R.stat) right(R.stat, y + 2, 9.5, MUT); y -= 30;
    txt(lb.title || (es ? 'Recibo' : 'Receipt'), L, y, 'F2', 15); y -= 17;
    txt(R.num || '', L, y, 'F1', 9.5, MUT); y -= 24;
    txt(R.biz || '', L, y, 'F2', 12); y -= 15;
    if (R.bizAddr) { txt(R.bizAddr, L, y, 'F1', 10, MUT); y -= 15; }
    y -= 6;
    (R.meta || []).forEach(m => { txt(m.k, L, y, 'F2', 8, LAB); wrap(m.v, 70).forEach((t, i) => { txt(t, L + 118, y, 'F1', 10); if (i) y -= 0; y -= 13; }); y -= 2; });
    y -= 2; rule(y); y -= 20;
    (R.lines || []).forEach(l => { need(34); txt((l.q || 1) + '\u00D7', L, y, 'F2', 10.5); txt(l.name, L + 28, y, 'F2', 10.5); right(l.price || '', y, 10.5); y -= 13; if (l.sum) wrap(l.sum, 78).forEach(t => { txt(t, L + 28, y, 'F1', 9, MUT); y -= 12; }); y -= 7; });
    rule(y + 6); y -= 12;
    (R.rows || []).forEach(r => { need(16); txt(r.l, L, y, 'F1', 10.5); right(r.v || '', y, 10.5); y -= 15; });
    rule(y + 5); y -= 13; txt(lb.total || 'Total', L, y, 'F2', 12); right(R.total || '', y, 12); y -= 30;
    if ((R.events || []).length) { need(48); txt(lb.payK || (es ? 'MOVIMIENTOS' : 'TRANSACTIONS'), L, y, 'F2', 8, LAB); y -= 16;
      R.events.forEach(e => { need(30); txt(e.l, L, y, 'F2', 10.5); right(e.v || '', y, 10.5); y -= 13; txt([e.sub, e.t].filter(Boolean).join('  \u00B7  '), L, y, 'F1', 9, MUT); y -= 18; });
      rule(y + 6); y -= 12; txt(R.netK || '', L, y, 'F2', 8.5, LAB); right(R.net || '', y, 12); y -= 30; }
    if (R.foot) wrap(R.foot, 96).forEach(t => { need(14); txt(t, L, y, 'F1', 9, MUT); y -= 12; });
    page();
    const objs = [], add = s => { objs.push(s); return objs.length; };
    const cat = add(''), pgs = add(''), font = n => add('<< /Type /Font /Subtype /Type1 /BaseFont /' + n + ' /Encoding /WinAnsiEncoding >>');
    const f1 = font('Helvetica'), f2 = font('Helvetica-Bold'), f3 = font('Courier');
    const kids = pages.map(op => { const st = op.join('\n'), c = add('<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream'); return add('<< /Type /Page /Parent ' + pgs + ' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R /F3 ' + f3 + ' 0 R >> >> /Contents ' + c + ' 0 R >>'); });
    objs[cat - 1] = '<< /Type /Catalog /Pages ' + pgs + ' 0 R >>';
    objs[pgs - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    let out = '%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xr = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R /Info << /Title (' + enc((lb.title || 'Recibo') + ' ' + (R.num || '')) + ') /Producer (To\'Latino) >> >>\nstartxref\n' + xr + '\n%%EOF';
    const u8 = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
    return new Blob([u8], { type: 'application/pdf' });
  }
  function receipt(R, file, es) {
    try { const u = URL.createObjectURL(build(R || {}, es !== false)), a = document.createElement('a'); a.href = u; a.download = file || 'tolatino-recibo.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true; } catch (e) { return false; }
  }
  window.TLPdf = { receipt, build };
})();
