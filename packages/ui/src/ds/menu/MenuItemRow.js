"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/menu/MenuItemRow.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const PH = 'repeating-linear-gradient(135deg,var(--tl-ds-e7e5e0) 0 8px,var(--tl-desk) 8px 16px)';
/* Patrón 2i (Menú 13a). Fila de plato: texto a la izquierda, foto 92 a la derecha con botón + (o la cantidad en el pedido).
   card = versión desktop (borde, radio 17, foto 96). off = no disponible hoy (atenuada, sin botón). */
function MenuItemRow({
  name,
  desc,
  price,
  was,
  tags = [],
  image,
  qty = 0,
  forms,
  off,
  selected,
  card,
  open,
  onOpen,
  onPlus,
  onMinus,
  onExpand,
  onEnter,
  onLeave
}) {
  const size = card ? 96 : 92,
    ring = selected && !off ? '0 0 0 2.5px var(--tl-ink)' : 'none';
  return /*#__PURE__*/React.createElement("div", {
    onClick: off ? undefined : onOpen,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    style: {
      display: 'flex',
      gap: card ? 14 : 13,
      padding: card ? 14 : '14px 0',
      borderRadius: card ? 17 : 0,
      border: card ? '1px solid rgba(11,14,18,.08)' : 'none',
      borderBottom: card ? '1px solid rgba(11,14,18,.08)' : '1px solid rgba(11,14,18,.07)',
      boxShadow: card ? ring : 'none',
      opacity: off ? .45 : 1,
      cursor: off ? 'default' : 'pointer',
      background: 'var(--tl-white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: (card ? '700 14.5px/1.3' : '700 15px/1.3') + ' Manrope,sans-serif'
    }
  }, name), desc ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '400 12px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)',
      textWrap: 'pretty'
    }
  }, desc) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px/1 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, price), was ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 11px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.4)',
      textDecoration: 'line-through'
    }
  }, was) : null, forms ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 9px 'JetBrains Mono',monospace",
      letterSpacing: '.08em',
      color: 'var(--tl-action)'
    }
  }, forms) : null, tags.map((t, i) => /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    key: i,
    tone: t.tone
  }, t.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      borderRadius: 16,
      flex: 'none',
      background: image ? 'center/cover url(' + image + ')' : PH,
      backgroundColor: 'var(--tl-photo-bg)',
      boxShadow: card ? 'none' : ring
    }
  }, off ? null : /*#__PURE__*/React.createElement(AddPill, {
    dark: true,
    qty: qty,
    open: open,
    onPlus: onPlus,
    onMinus: onMinus,
    onExpand: onExpand
  })));
}
/* 2i · 16a (patrón 2q) · Botón + que se estira: cerrado = + (o la cantidad); abierto = − cantidad + (papelera con 1). dark: fila (tinta, borde blanco, esquina -6); claro: tile (blanco, sombra). */
function AddPill({
  qty = 0,
  open,
  dark,
  onPlus,
  onMinus,
  onExpand
}) {
  const x = qty > 0 && open,
    st = e => e.stopPropagation(),
    fg = dark ? 'var(--tl-white)' : 'var(--tl-ink)';
  const right = e => {
    st(e);
    if (qty === 0 || x) {
      if (onPlus) onPlus();
    } else if (onExpand) onExpand();
  };
  const left = e => {
    st(e);
    if (onMinus) onMinus();
  };
  const box = dark ? {
    position: 'absolute',
    right: -6,
    bottom: -6,
    height: x ? 36 : 31,
    width: x ? 90 : 31,
    boxSizing: 'border-box',
    borderRadius: 12,
    background: 'var(--tl-ink)',
    border: '2.5px solid var(--tl-white)'
  } : {
    position: 'absolute',
    right: 8,
    bottom: 8,
    height: 34,
    width: x ? 94 : 32,
    borderRadius: 11,
    background: 'var(--tl-white)',
    boxShadow: '0 6px 14px -6px rgba(11,14,18,.5)'
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: st,
    style: {
      ...box,
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      color: fg,
      transition: 'width .2s ease, height .2s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: left,
    role: "button",
    "aria-label": qty === 1 ? 'Quitar' : 'Uno menos',
    "aria-hidden": !x,
    style: {
      width: 32,
      height: '100%',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: qty === 1 ? 'trash' : 'minus',
    size: 16,
    color: qty === 1 && !dark ? 'var(--tl-danger)' : fg,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": !x,
    style: {
      width: 24,
      flex: 'none',
      textAlign: 'center',
      font: '800 13.5px/1 Sora,sans-serif'
    }
  }, qty), /*#__PURE__*/React.createElement("span", {
    onClick: right,
    role: "button",
    "aria-label": qty === 0 || x ? 'Agregar' : 'Cantidad: ' + qty,
    style: {
      width: dark ? 26 : 34,
      height: '100%',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      font: '800 12.5px/1 Sora,sans-serif'
    }
  }, qty === 0 || x ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: dark ? 14 : 16,
    color: fg,
    strokeWidth: 2.4
  }) : qty));
}
/* Tarjeta de "Populares": foto 148×112 con + blanco, nombre y precio. */
function MenuTile({
  name,
  price,
  was,
  image,
  qty = 0,
  selected,
  open,
  off,
  width = 148,
  height = 112,
  onOpen,
  onPlus,
  onMinus,
  onExpand,
  onEnter,
  onLeave
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    style: {
      flex: 'none',
      width,
      minWidth: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height,
      borderRadius: 16,
      background: image ? 'center/cover url(' + image + ')' : PH,
      backgroundColor: 'var(--tl-photo-bg)',
      boxShadow: selected ? '0 0 0 2.5px var(--tl-ink)' : 'none'
    }
  }, off ? null : /*#__PURE__*/React.createElement(AddPill, {
    qty: qty,
    open: open,
    onPlus: onPlus,
    onMinus: onMinus,
    onExpand: onExpand
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '700 13px/1.3 Manrope,sans-serif'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 14px/1 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, price), was ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 10.5px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.4)',
      textDecoration: 'line-through'
    }
  }, was) : null));
}
/* Grupo de opciones de un plato: radio (elige 1) o casillas (hasta N). Obligatorio pendiente → Tag action; listo → check. */
function OptionGroup({
  title,
  meta,
  required,
  done,
  reqLabel = 'OBLIGATORIO',
  doneLabel = 'LISTO',
  options = [],
  multi,
  columns = 1,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 18,
      borderTop: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '700 15px Manrope,sans-serif'
    }
  }, title), required && !done ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "action"
  }, reqLabel) : null, required && done ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      font: "700 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.1em',
      color: 'var(--tl-open-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    color: "var(--tl-open)",
    strokeWidth: 2.4
  }), doneLabel) : null), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: "600 10px 'JetBrains Mono',monospace",
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.45)'
    }
  }, meta) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))',
      gap: 8
    }
  }, options.map((o, i) => {
    const on = !!o.selected;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => onToggle && onToggle(i),
      style: {
        padding: on ? '11.5px 13.5px' : '12px 14px',
        borderRadius: 13,
        border: on ? '1.5px solid var(--tl-ink)' : '1px solid rgba(11,14,18,.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        cursor: 'pointer',
        opacity: o.disabled ? .4 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        boxSizing: 'border-box',
        borderRadius: multi ? 6 : 99,
        border: on ? multi ? 'none' : '6px solid var(--tl-ink)' : '1.5px solid rgba(11,14,18,.22)',
        background: on && multi ? 'var(--tl-ink)' : 'var(--tl-white)',
        display: 'grid',
        placeItems: 'center',
        flex: 'none'
      }
    }, on && multi ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 12,
      color: "var(--tl-white)",
      strokeWidth: 2.8
    }) : null), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        font: '700 13px Manrope,sans-serif'
      }
    }, o.label), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "700 12px 'JetBrains Mono',monospace",
        color: 'rgba(11,14,18,.55)'
      }
    }, o.price));
  })));
}
/* Cantidad − n +. md = 50 (pie de la hoja), sm = 30 (línea del pedido). */
function QtyStepper({
  value = 1,
  size = 'md',
  onDec,
  onInc
}) {
  const md = size === 'md',
    h = md ? 50 : 30,
    w = md ? 34 : 30;
  const btn = {
    width: w,
    height: h - (md ? 6 : 2),
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    font: (md ? '700 19px/1' : '700 16px/1') + ' Manrope,sans-serif'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      height: h,
      width: 'max-content',
      padding: md ? '0 4px' : 0,
      boxSizing: 'border-box',
      borderRadius: md ? 14 : 10,
      border: '1px solid rgba(11,14,18,.12)',
      background: 'var(--tl-white)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onDec,
    style: btn
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: md ? 20 : 16,
      textAlign: 'center',
      font: (md ? '800 15px/1' : '800 12.5px/1') + ' Sora,sans-serif'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    onClick: onInc,
    style: btn
  }, "+"));
}
/* Barra flotante del pedido (móvil): aparece cuando hay platos; abre el pedido. */
function OrderBar({
  label,
  sub,
  total,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      padding: '12px 14px',
      borderRadius: 16,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 14px 28px -14px rgba(11,14,18,.8)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 10,
      background: 'rgba(255,255,255,.14)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "cart",
    size: 16,
    color: "var(--tl-white)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px Manrope,sans-serif'
    }
  }, label), sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: "600 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.06em',
      color: 'rgba(255,255,255,.55)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, sub) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 16px/1 Sora,sans-serif'
    }
  }, total));
}
/* Línea del pedido: foto 48, nombre, opciones elegidas (+ instrucciones para la cocina entre comillas), precio, cantidad y "Editar" (reabre el plato). */
function CartLine({
  name,
  summary,
  price,
  qty,
  image,
  first,
  editLabel = 'Editar',
  onEdit,
  onDec,
  onInc
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      padding: '13px 0',
      borderTop: first ? 'none' : '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onEdit,
    style: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: image ? 'center/cover url(' + image + ')' : PH,
      backgroundColor: 'var(--tl-photo-bg)',
      flex: 'none',
      cursor: onEdit ? 'pointer' : 'default'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 12.5px 'JetBrains Mono',monospace",
      flex: 'none'
    }
  }, price)), summary ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, summary) : null, onEdit ? /*#__PURE__*/React.createElement("span", {
    onClick: onEdit,
    style: {
      display: 'inline-block',
      marginTop: 4,
      font: '700 12px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, editLabel) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(QtyStepper, {
    size: "sm",
    value: qty,
    onDec: onDec,
    onInc: onInc
  }))));
}
Object.assign(__ds_scope, { MenuItemRow, AddPill, MenuTile, OptionGroup, QtyStepper, OrderBar, CartLine });
