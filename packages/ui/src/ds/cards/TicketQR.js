"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/TicketQR.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2ac · Boleto con QR (Eventos → Mis boletos). Sacado de To'Latino Eventos.dc.html tal como se ve. El QR de muestra se dibuja desde seed (siempre el mismo para el mismo boleto). */
const mono = "'JetBrains Mono',monospace";
function QrCode({
  seed = '',
  size = 148,
  faded
}) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = h * 16777619 | 0;
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const N = 21,
    S = 6,
    pad = 2,
    sz = (N + pad * 2) * S,
    cells = [];
  const fixed = (r, c) => r < 7 && c < 7 || r < 7 && c >= N - 7 || r >= N - 7 && c < 7;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!fixed(r, c) && rnd() > .52) cells.push([r, c]);
  const finder = (r, c) => [/*#__PURE__*/React.createElement("rect", {
    key: 'f' + r + c,
    x: (c + pad) * S,
    y: (r + pad) * S,
    width: 7 * S,
    height: 7 * S,
    fill: "none",
    stroke: "var(--tl-ink)",
    strokeWidth: S
  }), /*#__PURE__*/React.createElement("rect", {
    key: 'g' + r + c,
    x: (c + pad + 2) * S,
    y: (r + pad + 2) * S,
    width: 3 * S,
    height: 3 * S,
    fill: "var(--tl-ink)"
  })];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: '0 0 ' + sz + ' ' + sz,
    style: {
      display: 'block',
      opacity: faded ? .28 : 1
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 0,
    width: sz,
    height: sz,
    fill: "var(--tl-white)"
  }), cells.map(([r, c], i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: (c + pad) * S,
    y: (r + pad) * S,
    width: S,
    height: S,
    fill: "var(--tl-ink)"
  })), finder(0, 0), finder(0, N - 7), finder(N - 7, 0));
}

/* Tipo de entrada y a nombre de quién, estado (VÁLIDO · USADO · CANCELADO), QR grande, número y fecha. width = 250 en el carrusel móvil; sin width llena su celda (desktop). */
function TicketQR({
  type,
  name,
  status,
  statusBg = 'rgba(0,229,196,.16)',
  statusColor = 'var(--tl-signal)',
  seed,
  used,
  code,
  when,
  width,
  opacity = 1
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: width ? 'none' : undefined,
      width,
      borderRadius: 20,
      overflow: 'hidden',
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      opacity
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      borderBottom: '1px dashed rgba(255,255,255,.2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '800 13px Sora,sans-serif',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, type), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      font: '600 9px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(255,255,255,.55)'
    }
  }, name)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      padding: '5px 8px',
      borderRadius: 7,
      background: statusBg,
      color: statusColor,
      font: '800 9px ' + mono,
      letterSpacing: '.08em'
    }
  }, status)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--tl-white)'
    }
  }, /*#__PURE__*/React.createElement(QrCode, {
    seed: seed,
    faded: used
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 13px',
      background: 'var(--tl-white)',
      color: 'var(--tl-ink)',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      font: '700 8.5px ' + mono,
      letterSpacing: '.08em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.5)'
    }
  }, code), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.5)'
    }
  }, when)));
}
Object.assign(__ds_scope, { QrCode, TicketQR });
