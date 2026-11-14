"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/patterns/HoursPro.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const mono = "'JetBrains Mono',monospace";
function HoursPro({
  data,
  dateLabel = 'HOY',
  status = 'Abierto',
  nextLabel,
  nowLabel,
  changesLabel,
  weekLabel,
  statusColor,
  weekOpen: weekOpenProp,
  style
}) {
  const [open, setOpen] = React.useState(!!weekOpenProp);
  const d = data || {
    hpToday: [],
    hpChanges: [],
    hpWeek: [],
    hpCountdown: ''
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 17,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      padding: '16px 15px 14px',
      color: 'var(--tl-ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 10px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.5)'
    }
  }, dateLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '800 22px/1.1 Sora,sans-serif',
      letterSpacing: '-.04em',
      color: statusColor || 'var(--tl-open-text)'
    }
  }, status), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '600 13px Manrope,sans-serif',
      color: 'rgba(11,14,18,.62)'
    }
  }, nextLabel || 'Pausa de almuerzo en', " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--tl-ink)',
      fontWeight: 800
    }
  }, d.hpCountdown)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, d.hpToday.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      opacity: t.op
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 14,
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 4,
      width: 12,
      height: 12,
      borderRadius: 99,
      background: t.dot,
      border: '2px solid ' + t.ring,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      width: 2,
      background: 'rgba(11,14,18,.1)',
      display: t.lineDisp
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      paddingBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13.5px Manrope,sans-serif'
    }
  }, t.range), t.nowDisp !== 'none' ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "signal",
    style: {
      fontSize: 8.5,
      padding: '2px 6px'
    }
  }, nowLabel || "AHORA") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '500 11.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, t.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      padding: 14,
      borderRadius: 16,
      background: 'rgba(75,55,245,.05)',
      border: '1px solid rgba(75,55,245,.14)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 10px ' + mono,
      letterSpacing: '.12em',
      color: 'var(--tl-action)'
    }
  }, changesLabel || "PR\xD3XIMOS CAMBIOS"), d.hpChanges.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      paddingTop: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      marginTop: 6,
      borderRadius: 99,
      background: x.tagFg,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 12.5px Manrope,sans-serif'
    }
  }, x.dateLong, " \xB7 ", x.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '600 11.5px Manrope,sans-serif',
      color: x.tagFg
    }
  }, x.text))))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(!open),
    ...__ds_scope.__btn(() => setOpen(!open), undefined, { 'aria-expanded': !!open }),
    style: {
      marginTop: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 2px 2px',
      borderTop: '1px solid rgba(11,14,18,.08)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px Manrope,sans-serif'
    }
  }, weekLabel || "Esta semana"), /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(11,14,18,.4)",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    style: {
      transform: 'rotate(' + (open ? 180 : 0) + 'deg)',
      transition: 'transform .2s'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 9.5l6 6 6-6"
  }))), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 8
    }
  }, d.hpWeek.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '11px 0',
      borderTop: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      flex: 'none',
      paddingTop: 2,
      font: '800 10.5px ' + mono,
      letterSpacing: '.08em',
      color: r.dc
    }
  }, r.d), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, r.lines.map((l, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: l.color,
      border: '1px dashed ' + l.dash,
      boxSizing: 'border-box',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: l.weight + ' 12.5px Manrope,sans-serif',
      color: l.fg
    }
  }, l.range), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 10px ' + mono,
      color: 'rgba(11,14,18,.42)'
    }
  }, l.type)))), r.tagDisp !== 'none' ? /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      padding: '3px 6px',
      borderRadius: 5,
      background: r.tagBg,
      color: r.tagFg,
      font: '800 8.5px ' + mono,
      letterSpacing: '.08em'
    }
  }, r.tag) : null))) : null);
}
Object.assign(__ds_scope, { HoursPro });
