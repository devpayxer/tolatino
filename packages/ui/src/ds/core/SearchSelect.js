"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/SearchSelect.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* Desplegable con buscador (Auto · «Por marca» y «Mi vehículo», 29 oct): caja blanca radio 16, buscador arriba, lista A–Z con letras, alto 264, ✓ en la elegida, «No está en la lista» opcional.
   items = [{ k, l }]; value = k elegida; onPick(k); other = { label, onClick } | null. Ordena y agrupa solo; con texto en el buscador no muestra letras. */
const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function SearchSelect({
  items = [],
  value,
  onPick,
  placeholder = 'Busca',
  empty = 'No la encontramos',
  other,
  maxHeight = 264,
  style
}) {
  const [q, setQ] = React.useState(''),
    Q = n(q.trim());
  const L = items.filter(m => !Q || n(m.l).includes(Q)).sort((a, b) => a.l.localeCompare(b.l));
  const rows = [];
  let h = '';
  L.forEach(m => {
    const c = m.l[0].toUpperCase();
    if (!Q && c !== h) {
      h = c;
      rows.push(/*#__PURE__*/React.createElement("div", {
        key: 'h' + c,
        style: {
          padding: '10px 16px 4px',
          font: "700 10px 'JetBrains Mono',monospace",
          letterSpacing: '.14em',
          color: 'rgba(11,14,18,.45)'
        }
      }, c));
    }
    const on = value === m.k;
    rows.push(/*#__PURE__*/React.createElement("div", {
      key: m.k,
      role: "option",
      "aria-selected": on,
      onClick: () => onPick && onPick(m.k),
      ...__ds_scope.__key(() => onPick && onPick(m.k)),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        minHeight: 44,
        padding: '0 16px',
        cursor: 'pointer',
        font: (on ? 800 : 600) + ' 14px Manrope,sans-serif',
        color: 'var(--tl-ink)'
      }
    }, /*#__PURE__*/React.createElement("span", null, m.l), on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 16,
      color: "var(--tl-action)"
    }) : null));
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(11,14,18,.1)',
      borderRadius: 16,
      background: 'var(--tl-white)',
      boxShadow: '0 14px 30px -16px rgba(11,14,18,.3)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 46,
      padding: '0 14px',
      borderBottom: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16,
    color: "rgba(11,14,18,.5)"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value.slice(0, 30)),
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 'none',
      background: 'none',
      font: '600 14px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    role: "listbox",
    style: {
      maxHeight,
      overflowY: 'auto',
      padding: '4px 0 6px'
    }
  }, rows, !L.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      font: '500 13px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, empty) : null, other ? /*#__PURE__*/React.createElement("div", {
    onClick: other.onClick,
    ...__ds_scope.__btn(other.onClick, undefined, undefined),
    style: {
      marginTop: 4,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 46,
      padding: '0 16px',
      cursor: 'pointer',
      font: '700 13.5px Manrope,sans-serif',
      color: 'var(--tl-action)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "edit",
    size: 15,
    color: "var(--tl-action)"
  }), other.label) : null));
}
Object.assign(__ds_scope, { SearchSelect });
