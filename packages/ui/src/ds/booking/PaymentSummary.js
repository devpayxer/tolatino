"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/booking/PaymentSummary.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2aa · Pago de la cita (Booking → Revisa y envía). Sacado de To'Latino Prototipo.dc.html tal como se ve. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const K = {
  font: '700 10px ' + mono,
  letterSpacing: '.2em',
  color: 'rgba(11,14,18,.42)'
};

/* Precio (líneas con sub), Total del servicio, CÓMO SE PAGA con barra (hoy / en el local), filas con punto y monto, aviso del depósito retenido y la tarjeta con Cambiar.
   notes = avisos entre el total y cómo se paga (estimado, precio de la ficha). hold = el depósito que se retiene (Auto). cardError = tarjeta rechazada. */
function PaymentSummary({
  screenLabel,
  priceLabel,
  lines = [],
  totalLabel,
  totalMono,
  total,
  notes = [],
  howLabel,
  bar,
  rows = [],
  hold,
  card,
  cardError
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      padding: 16,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, priceLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 13px/1.35 Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, l.label), has(l.sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, l.sub) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      font: '600 12.5px/1.35 ' + mono,
      color: 'var(--tl-ink)'
    }
  }, l.value)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: totalMono ? {
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.5)'
    } : {
      font: '700 13.5px Manrope,sans-serif'
    }
  }, totalLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 20px/1 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, total)), notes.map((n, i) => n.tone === 'deposit' ? /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginTop: 12,
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.DepositNote, null, n.text)) : /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginTop: 10,
      padding: '11px 13px',
      borderRadius: 13,
      background: 'rgba(0,229,196,.12)',
      font: '600 12px/1.5 Manrope,sans-serif',
      color: 'var(--tl-open-text)',
      textWrap: 'pretty'
    }
  }, n.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 15,
      borderTop: '1px dashed rgba(11,14,18,.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, howLabel), bar ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 3,
      height: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: bar.a,
      borderRadius: 99,
      background: 'var(--tl-ink)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: bar.b,
      borderRadius: 99,
      background: 'rgba(11,14,18,.12)'
    }
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 99,
      background: r.dot || 'var(--tl-ink)',
      marginTop: 5,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px/1.35 Manrope,sans-serif'
    }
  }, r.label), has(r.sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 12px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.58)',
      textWrap: 'pretty'
    }
  }, r.sub) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      font: '800 17px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em',
      color: r.color || 'var(--tl-ink)'
    }
  }, r.value)))), hold ? /*#__PURE__*/React.createElement("div", {
    "data-screen-label": hold.screenLabel,
    style: {
      marginTop: 14,
      padding: '12px 13px',
      borderRadius: 14,
      background: 'rgba(75,55,245,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "lock",
    size: 14,
    color: "var(--tl-action)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'var(--tl-action)'
    }
  }, hold.kicker)), has(hold.ok) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none',
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    color: "var(--tl-open)",
    strokeWidth: 2.2
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.75)',
      textWrap: 'pretty'
    }
  }, hold.ok)) : null, has(hold.kept) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none',
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "warning",
    size: 13,
    color: "var(--tl-pro-ink)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1.45 Manrope,sans-serif',
      color: 'var(--tl-pro-ink)',
      textWrap: 'pretty'
    }
  }, hold.kept)) : null, has(hold.foot) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '500 11px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, hold.foot) : null) : null, card ? /*#__PURE__*/React.createElement("div", {
    "data-screen-label": card.screenLabel,
    onClick: card.onClick,
    style: {
      marginTop: 14,
      padding: '11px 12px',
      borderRadius: 13,
      background: 'var(--tl-paper)',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      cursor: card.onClick ? 'pointer' : 'default'
    }
  }, card.kind === 'wallet' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 26,
      borderRadius: 6,
      background: 'rgba(0,229,196,.16)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "wallet",
    size: 15,
    color: "var(--tl-open-text)"
  })) : card.kind === 'none' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 26,
      boxSizing: 'border-box',
      borderRadius: 6,
      border: '1.5px solid rgba(11,14,18,.2)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "card",
    size: 15,
    color: "rgba(11,14,18,.55)"
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 26,
      borderRadius: 6,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '700 9px ' + mono,
      flex: 'none'
    }
  }, card.brand), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 12.5px Manrope,sans-serif'
    }
  }, card.label), has(card.sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '600 9px/1.4 ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.5)'
    }
  }, card.sub) : null), has(card.change) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11.5px Manrope,sans-serif',
      color: 'var(--tl-action)',
      flex: 'none'
    }
  }, card.change) : null) : null, has(cardError) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: '11px 13px',
      borderRadius: 13,
      background: 'rgba(192,57,43,.08)',
      display: 'flex',
      gap: 9,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none',
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "warning",
    size: 15,
    color: "var(--tl-danger)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px/1.45 Manrope,sans-serif',
      color: 'var(--tl-danger)'
    }
  }, cardError)) : null));
}

/* 2aa · «Tu depósito»: qué pasa con el depósito en cada caso (si confirman, si no pueden, si cancelas a tiempo o tarde, si no llegas) y el plazo de la devolución. */
function DepositOutcomes({
  screenLabel,
  title,
  rows = [],
  foot
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      padding: 16,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
      padding: '11px 0',
      borderTop: r.top != null ? r.top : i ? '1px solid rgba(11,14,18,.07)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      font: '500 12.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.72)',
      textWrap: 'pretty'
    }
  }, r.label), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      maxWidth: '46%',
      textAlign: 'right',
      font: '700 12.5px/1.45 Manrope,sans-serif',
      color: r.color || 'var(--tl-ink)'
    }
  }, r.value)))), has(foot) ? /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 11,
      borderTop: '1px solid rgba(11,14,18,.07)',
      font: '500 11.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, foot) : null);
}
Object.assign(__ds_scope, { PaymentSummary, DepositOutcomes });
