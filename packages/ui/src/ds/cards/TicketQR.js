"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/TicketQR.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2ac · Boleto con QR (Eventos → Mis boletos). Sacado de To'Latino Eventos.dc.html tal como se ve. El QR es la matriz real que manda el servidor (texto firmado; 6c). */
const mono = "'JetBrains Mono',monospace";
function QrCode({
  matrix,
  size = 148,
  faded,
  label
}) {
  const N = matrix && matrix.length ? matrix.length : 21,
    pad = 4,
    sz = N + pad * 2,
    d = [];
  if (matrix) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (matrix[r][c]) d.push('M' + (c + pad) + ' ' + (r + pad) + 'h1v1h-1z');
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: '0 0 ' + sz + ' ' + sz,
    role: 'img',
    'aria-label': label || 'QR',
    shapeRendering: 'crispEdges',
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
  }), d.length ? /*#__PURE__*/React.createElement("path", {
    d: d.join(''),
    fill: "var(--tl-ink)"
  }) : null);
}

/* Tipo de entrada y a nombre de quién, estado (VÁLIDO · USADO · CANCELADO), QR grande, número y fecha. width = 250 en el carrusel móvil; sin width llena su celda (desktop). */
function TicketQR({
  type,
  name,
  status,
  statusBg = 'rgba(0,229,196,.16)',
  statusColor = 'var(--tl-signal)',
  matrix,
  qrSize,
  qrLabel,
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
    matrix: matrix,
    size: qrSize,
    label: qrLabel,
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
