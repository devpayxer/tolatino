"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/order/DeliveryPrefs.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const PH = 'repeating-linear-gradient(135deg,var(--tl-ds-e7e5e0) 0 8px,var(--tl-desk) 8px 16px)';
const mono = "'JetBrains Mono',monospace";
const K = {
  font: '700 10px ' + mono,
  letterSpacing: '.2em',
  color: 'rgba(11,14,18,.42)'
};
const card = {
  padding: 15,
  borderRadius: 18,
  background: 'var(--tl-white)',
  border: '1px solid rgba(11,14,18,.07)'
};
const Radio = ({
  on
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    width: 18,
    height: 18,
    boxSizing: 'border-box',
    borderRadius: 99,
    border: on ? '5.5px solid var(--tl-ink)' : '1.5px solid rgba(11,14,18,.2)',
    background: 'var(--tl-white)',
    flex: 'none'
  }
});

/* 2j · Cómo te lo entregamos (checkout con Delivery). En la mano (default) / Dejar en la puerta (con foto) + al llegar + instrucciones + guardar para la dirección. */
function DeliveryPrefs({
  title = 'CÓMO TE LO ENTREGAMOS',
  options = [],
  arrival = [],
  arrivalLabel = 'AL LLEGAR',
  note = '',
  noteLabel = 'INSTRUCCIONES PARA EL REPARTIDOR',
  notePlaceholder,
  onNote,
  hint,
  hintIcon = 'clock',
  saveLabel,
  saved = true,
  onSave,
  wide
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: 8
    }
  }, options.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: o.onClick,
    ...__ds_scope.__btn(o.onClick, undefined, undefined),
    style: {
      padding: wide ? 14 : 12,
      borderRadius: 14,
      border: '1.5px solid ' + (o.selected ? 'var(--tl-ink)' : 'rgba(11,14,18,.1)'),
      display: 'flex',
      flexDirection: wide ? 'row' : 'column',
      alignItems: wide ? 'center' : 'stretch',
      gap: wide ? 12 : 10,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      background: o.selected ? 'rgba(75,55,245,.1)' : 'rgba(11,14,18,.05)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: o.icon,
    size: 16,
    color: o.selected ? 'var(--tl-action)' : 'rgba(11,14,18,.6)'
  })), wide ? null : /*#__PURE__*/React.createElement(Radio, {
    on: o.selected
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13px/1.25 Manrope,sans-serif'
    }
  }, o.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 11px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, o.sub)), wide ? /*#__PURE__*/React.createElement(Radio, {
    on: o.selected
  }) : null))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, arrivalLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 7
    }
  }, arrival.map((a, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    variant: a.selected ? 'selected' : 'filter',
    onClick: a.onClick
  }, a.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      justifyContent: 'space-between',
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, /*#__PURE__*/React.createElement("span", null, noteLabel), /*#__PURE__*/React.createElement("span", null, note.length, "/200")), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: onNote,
    placeholder: notePlaceholder,
    rows: 2,
    style: {
      marginTop: 8,
      width: '100%',
      boxSizing: 'border-box',
      padding: '11px 13px',
      borderRadius: 13,
      border: '1px solid rgba(11,14,18,.12)',
      outline: 'none',
      resize: 'none',
      font: '500 13px/1.5 Manrope,sans-serif'
    }
  }), hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(11,14,18,.04)',
      display: 'flex',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: hintIcon,
    size: 15,
    color: "rgba(11,14,18,.6)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.68)'
    }
  }, hint)) : null, saveLabel ? /*#__PURE__*/React.createElement("div", {
    onClick: onSave,
    ...__ds_scope.__btn(onSave, undefined, undefined),
    style: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid rgba(11,14,18,.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      boxSizing: 'border-box',
      borderRadius: 6,
      background: saved ? 'var(--tl-ink)' : 'var(--tl-white)',
      border: saved ? 'none' : '1.5px solid rgba(11,14,18,.2)',
      display: 'grid',
      placeItems: 'center'
    }
  }, saved ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    color: "var(--tl-white)",
    strokeWidth: 2.8
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.75)'
    }
  }, saveLabel)) : null);
}

/* 2k · Estado del pedido. Delivery: Pedido enviado → Preparando → En camino → Entregado. Pickup: enviado → aceptado → cocina → listo → recogido.
   vertical (móvil) / horizontal (desktop). steps: [{ label, time, state: 'done'|'current'|'next' }]. */
function OrderTracker({
  steps = [],
  horizontal
}) {
  const c = s => s === 'done' ? 'var(--tl-open)' : s === 'current' ? 'var(--tl-ink)' : null;
  if (horizontal) return /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      padding: '20px 22px',
      display: 'grid',
      gridTemplateColumns: 'repeat(' + steps.length + ',minmax(0,1fr))',
      gap: 8
    }
  }, steps.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 9,
      background: c(p.state) || 'rgba(11,14,18,.1)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      font: (p.state === 'current' ? 800 : 700) + ' 13px/1.25 Manrope,sans-serif',
      color: p.state === 'next' ? 'rgba(11,14,18,.42)' : 'var(--tl-ink)'
    }
  }, p.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '700 10.5px ' + mono,
      color: 'rgba(11,14,18,.5)'
    }
  }, p.time))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      padding: '16px 18px'
    }
  }, steps.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 16,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      boxSizing: 'border-box',
      borderRadius: 99,
      background: p.state === 'next' ? 'var(--tl-white)' : c(p.state),
      border: '2.5px solid ' + (c(p.state) || 'rgba(11,14,18,.2)')
    }
  }), i < steps.length - 1 ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 2,
      flex: 1,
      minHeight: 22,
      background: p.state === 'done' ? 'var(--tl-open)' : 'rgba(11,14,18,.1)'
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: (p.state === 'current' ? 800 : 700) + ' 13.5px/1.2 Manrope,sans-serif',
      color: p.state === 'next' ? 'rgba(11,14,18,.42)' : 'var(--tl-ink)'
    }
  }, p.label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11px ' + mono,
      color: 'rgba(11,14,18,.5)',
      flex: 'none'
    }
  }, p.time)))));
}

/* 2k · Cambio propuesto: el negocio no tiene un plato. Quitar y seguir / Cambiar por / Cancelar sin costo; cada opción dice lo que se cobra. */
function ChangeProposal({
  label = 'CAMBIO PROPUESTO',
  item,
  soldLabel = 'AGOTADO HOY',
  options = [],
  note
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      padding: 16,
      border: '1.5px solid var(--tl-ink)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: item.image ? 'center/cover url(' + item.image + ')' : PH,
      backgroundColor: 'var(--tl-photo-bg)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, item.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "danger"
  }, soldLabel))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px ' + mono
    }
  }, item.price)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, options.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: x.onClick,
    ...__ds_scope.__btn(x.onClick, undefined, undefined),
    style: {
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid rgba(11,14,18,.12)',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: x.danger ? 'rgba(192,57,43,.1)' : 'rgba(75,55,245,.1)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: x.icon,
    size: 16,
    color: x.danger ? 'var(--tl-danger)' : 'var(--tl-action)'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, x.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, x.sub)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 16,
    color: "rgba(11,14,18,.35)"
  })))), note ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      font: '500 11.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, note) : null);
}

/* 2l · Ayuda con el pedido: lista de motivos según la etapa (cancelar en rojo). */
function HelpReasonList({
  items = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      padding: '0 15px'
    }
  }, items.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: r.onClick,
    ...__ds_scope.__btn(r.onClick, undefined, undefined),
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      padding: '13px 0',
      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 11,
      background: r.danger ? 'rgba(192,57,43,.1)' : 'rgba(75,55,245,.1)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: r.icon,
    size: 17,
    color: r.danger ? 'var(--tl-danger)' : 'var(--tl-action)'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, r.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, r.sub)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 16,
    color: "rgba(11,14,18,.35)"
  }))));
}

/* 2l · Resumen de una solicitud (en el pedido y en Ayuda). tone: neutral (en revisión) · signal (resuelta) · danger (no aprobada) · action (parcial). */
function RequestCard({
  label = 'SOLICITUD DE AYUDA',
  tag,
  tone = 'neutral',
  title,
  sub,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      padding: '14px 16px',
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1.5px solid var(--tl-ink)',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: K
  }, label), /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: tone
  }, tag)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, sub)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 16,
    color: "rgba(11,14,18,.35)"
  }));
}

/* 2m · Entra para pedir: teléfono (+1) → código de 6 dígitos. Hoja en móvil, ventana 440 en desktop. Vuelve al checkout con el carrito igual. */
function AuthSheet({
  step = 'phone',
  title = 'Entra para pedir',
  sub = 'Te mandamos un código por SMS. Tu pedido se queda igual.',
  phone = '',
  code = '',
  onPhone,
  onCode,
  onSend,
  onVerify,
  onChange,
  onClose,
  terms,
  desktop,
  error,
  phoneLabel = 'Tu teléfono',
  codeLabel = 'Código de 6 dígitos',
  closeLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Close" : "Cerrar"
}) {
  const input = {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    font: '700 15px Manrope,sans-serif'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: desktop ? {
      width: 440,
      boxSizing: 'border-box',
      padding: 26,
      borderRadius: 22,
      background: 'var(--tl-white)',
      boxShadow: '0 30px 60px -20px rgba(11,14,18,.5)'
    } : {
      background: 'var(--tl-white)',
      borderRadius: '26px 26px 0 0',
      padding: '12px 20px 30px'
    }
  }, desktop ? null : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 4,
      borderRadius: 9,
      background: 'rgba(11,14,18,.15)',
      margin: '0 auto 16px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 22px/1.1 Sora,sans-serif',
      letterSpacing: '-.035em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '500 13px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, sub)), /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    ...__ds_scope.__btn(onClose, closeLabel, undefined),
    style: {
      width: 34,
      height: 34,
      borderRadius: 11,
      background: 'rgba(11,14,18,.05)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 14,
    strokeWidth: 2.4
  }))), /*#__PURE__*/React.createElement("div", {
    id: 'tl-auth-error',
    role: 'alert',
    'aria-live': 'assertive',
    style: error ? {
      font: '600 12.5px/1.4 Manrope,sans-serif',
      color: 'var(--tl-danger)',
      margin: '12px 0 0'
    } : undefined
  }, error || null), step === 'phone' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...K,
      marginTop: 18
    }
  }, "TU TEL\xC9FONO"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      height: 50,
      borderRadius: 14,
      border: '1.5px solid rgba(11,14,18,.14)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px ' + mono,
      color: 'rgba(11,14,18,.55)'
    }
  }, "+1"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: 'rgba(11,14,18,.12)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: phone,
    onChange: onPhone,
    placeholder: "(570) 555-0142",
    inputMode: "tel",
    autoComplete: "tel",
    "aria-label": phoneLabel,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? 'tl-auth-error' : undefined,
    style: input
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    disabled: phone.replace(/\D/g, '').length !== 10,
    onClick: onSend
  }, "Enviar c\xF3digo")), terms ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      textAlign: 'center',
      font: '500 11.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, terms) : null) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...K,
      marginTop: 18
    }
  }, "C\xD3DIGO DE 6 D\xCDGITOS"), /*#__PURE__*/React.createElement("input", {
    value: code,
    onChange: onCode,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022",
    inputMode: "numeric",
    autoComplete: "one-time-code",
    "aria-label": codeLabel,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? 'tl-auth-error' : undefined,
    maxLength: 6,
    style: {
      marginTop: 8,
      width: '100%',
      boxSizing: 'border-box',
      height: 56,
      borderRadius: 14,
      border: '1.5px solid rgba(11,14,18,.14)',
      outline: 'none',
      textAlign: 'center',
      font: '800 24px ' + mono,
      letterSpacing: '.5em'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    disabled: code.length !== 6,
    onClick: onVerify
  }, "Verificar y seguir")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onChange,
    ...__ds_scope.__btn(onChange, undefined, undefined),
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, "Cambiar n\xFAmero"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 10px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.42)'
    }
  }, "REENVIAR EN 30 S"))));
}

/* 2n · Recibo: negocio + estado, datos, platos, totales y movimientos (retenido · cobrado · liberado · reembolsos) con total pagado. */
function ReceiptCard({
  business,
  address,
  status,
  statusTone = 'signal',
  meta = [],
  lines = [],
  rows = [],
  total,
  events = [],
  netLabel = 'TOTAL PAGADO',
  net,
  foot
}) {
  const dash = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px dashed rgba(11,14,18,.18)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 20px/1.15 Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, business), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '500 12px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, address)), /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: statusTone
  }, status)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...dash,
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: '14px 16px'
    }
  }, meta.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, m.k), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      font: '600 12.5px/1.4 Manrope,sans-serif'
    }
  }, m.v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...dash,
      paddingTop: 6
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      padding: '10px 0',
      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 12px/1.4 Sora,sans-serif',
      minWidth: 20
    }
  }, l.q, "\xD7"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13px/1.35 Manrope,sans-serif'
    }
  }, l.name), l.sum ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, l.sum) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px ' + mono
    }
  }, l.price)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      paddingTop: 12,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      font: '500 12.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, r.l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      color: r.fg || 'var(--tl-ink)'
    }
  }, r.v))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      color: 'var(--tl-ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13.5px Manrope,sans-serif'
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 20px/1 Sora,sans-serif'
    }
  }, total))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...dash,
      marginTop: 18,
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: K
  }, "MOVIMIENTOS"), events.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 0',
      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13px Manrope,sans-serif'
    }
  }, e.l), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, e.sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 12.5px ' + mono,
      color: e.fg || 'var(--tl-ink)'
    }
  }, e.v), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '600 10.5px ' + mono,
      color: 'rgba(11,14,18,.5)'
    }
  }, e.t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      paddingTop: 12,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.5)'
    }
  }, netLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 18px/1 Sora,sans-serif'
    }
  }, net))), foot ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      font: '500 11.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, foot) : null);
}
Object.assign(__ds_scope, { DeliveryPrefs, OrderTracker, ChangeProposal, HelpReasonList, RequestCard, AuthSheet, ReceiptCard });
