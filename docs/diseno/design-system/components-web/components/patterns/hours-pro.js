// Fuente: components/patterns/hours-pro.js (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

/* Horario Pro — datos y formato compartidos (ficha móvil + desktop). Hoy: mié 23 sep 2026, 11:40 AM. */
window.TLHoursPro = function () {
  const NOW = 11 + 40 / 60;
  const fmt = h => {
    const hh = Math.floor(h) % 24,
      m = Math.round((h - Math.floor(h)) * 60);
    return (hh % 12 || 12) + ':' + String(m).padStart(2, '0') + (hh < 12 ? ' AM' : ' PM');
  };
  const rng = (a, b) => {
    const A = fmt(a),
      B = fmt(b);
    return (b < 24 && A.slice(-2) === B.slice(-2) ? A.slice(0, -3) : A) + ' – ' + B;
  };
  const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const DOWL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MON = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const PAT = {
    1: [[10, 13, 'w'], [15, 20, 'w']],
    2: [[9, 21, 'w']],
    3: [[9, 13, 'w'], [14, 21, 'w']],
    4: [[9, 19, 'w'], [19, 21, 'c']],
    5: [[8, 19, 'w'], [19, 23, 'c']],
    6: [[8, 20, 'w']],
    0: [[10, 17, 'w']]
  };
  const EXC = {
    '2026-09-26': {
      segs: [[8, 16, 'w']],
      name: 'Evento del barrio en la 103',
      tag: 'CIERRA TEMPRANO'
    },
    '2026-10-12': {
      segs: [[10, 15, 'c']],
      name: 'Día de la Raza · feriado',
      tag: 'FERIADO'
    },
    '2026-10-31': {
      segs: [[8, 20, 'w'], [20, 24, 'c']],
      name: 'Halloween',
      tag: 'HASTA 12 AM'
    },
    '2026-11-26': {
      segs: [],
      name: 'Acción de Gracias',
      tag: 'CERRADO'
    }
  };
  const RED = {
      bg: 'rgba(192,57,43,.1)',
      fg: '#C0392B'
    },
    GRN = {
      bg: 'rgba(0,229,196,.2)',
      fg: '#00695B'
    },
    IND = {
      bg: 'rgba(75,55,245,.1)',
      fg: '#4B37F5'
    };
  const TAGS = {
    'FERIADO': IND,
    'CIERRA TEMPRANO': RED,
    'CERRADO': RED,
    'EXTENDIDO': GRN,
    'HASTA 12 AM': GRN
  };
  const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const blocks = segs => {
    const o = [];
    segs.forEach(s => {
      const l = o[o.length - 1];
      if (l && l[1] === s[0]) l[1] = s[1];else o.push([s[0], s[1]]);
    });
    return o;
  };
  const text = segs => segs.length ? blocks(segs).map(b => rng(b[0], b[1])).join(' · ') : 'Cerrado';
  const TODAY = '2026-09-23';
  const tw = PAT[3];
  const tl = [{
    a: tw[0][0],
    b: tw[0][1],
    l: 'Abierto'
  }, {
    a: tw[0][1],
    b: tw[1][0],
    l: 'Pausa de almuerzo'
  }, {
    a: tw[1][0],
    b: tw[1][1],
    l: 'Cierra a las 9'
  }];
  const today = tl.map((t, i) => {
    const past = NOW >= t.b,
      now = NOW >= t.a && NOW < t.b,
      pause = t.l.startsWith('Pausa');
    return {
      range: rng(t.a, t.b),
      label: t.l,
      op: past ? .45 : 1,
      dot: now ? '#00A88F' : '#fff',
      ring: now ? '#00A88F' : pause ? 'rgba(11,14,18,.2)' : '#0B0E12',
      nowDisp: now ? 'inline-block' : 'none',
      lineDisp: i < tl.length - 1 ? 'block' : 'none'
    };
  });
  const mins = Math.round((13 - NOW) * 60);
  const changes = Object.keys(EXC).map(k => {
    const [y, m, dd] = k.split('-').map(Number);
    const d = new Date(y, m - 1, dd),
      e = EXC[k],
      ts = TAGS[e.tag];
    return {
      dateLong: DOWL[d.getDay()] + ' ' + dd + ' ' + MON[m - 1].toLowerCase(),
      name: e.name,
      tagFg: ts.fg,
      text: e.segs.length ? text(e.segs) + (e.segs.every(s => s[2] === 'c') ? ', solo cita' : '') : 'Cerrado'
    };
  });
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(2026, 8, 21 + i),
      e = EXC[key(d)],
      dow = d.getDay(),
      segs = e ? e.segs : PAT[dow];
    const tag = e ? e.tag : dow === 5 ? 'EXTENDIDO' : null,
      ts = tag ? TAGS[tag] : null,
      isT = key(d) === TODAY;
    const lines = [];
    if (!segs.length) lines.push({
      range: 'Cerrado',
      type: '',
      color: 'transparent',
      dash: '#C0392B',
      fg: '#C0392B',
      weight: 700
    });
    segs.forEach((s, j) => {
      const p = segs[j - 1];
      if (p && p[1] < s[0]) lines.push({
        range: rng(p[1], s[0]),
        type: 'PAUSA',
        color: 'transparent',
        dash: 'rgba(11,14,18,.3)',
        fg: 'rgba(11,14,18,.45)',
        weight: 500
      });
      lines.push({
        range: rng(s[0], s[1]),
        type: s[2] === 'c' ? 'SOLO CITA' : '',
        color: s[2] === 'c' ? '#4B37F5' : '#0B0E12',
        dash: 'transparent',
        fg: '#0B0E12',
        weight: 600
      });
    });
    return {
      d: isT ? 'HOY' : DOW[dow],
      dc: isT ? '#00695B' : 'rgba(11,14,18,.55)',
      lines,
      tag: tag || '',
      tagDisp: tag ? 'inline-block' : 'none',
      tagBg: ts ? ts.bg : 'transparent',
      tagFg: ts ? ts.fg : 'transparent'
    };
  });
  return {
    hpToday: today,
    hpCountdown: Math.floor(mins / 60) + ' h ' + mins % 60 + ' min',
    hpChanges: changes,
    hpWeek: week
  };
};
