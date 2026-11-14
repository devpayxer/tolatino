"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/booking/StaffPicker.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const mono = "'JetBrains Mono',monospace";
function StaffPicker({
  people = [],
  selected,
  onSelect,
  anyoneLabel = 'Cualquiera'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, people.map(p => {
    const on = p.id === selected;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      onClick: () => onSelect && onSelect(p.id),
      role: 'radio', 'aria-checked': on, 'aria-label': p.name, tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onSelect && onSelect(p.id); } },
      style: {
        flex: 'none',
        width: 66,
        textAlign: 'center',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 66,
        height: 66,
        borderRadius: 18,
        background: p.image ? 'center/cover url(' + p.image + ')' : 'var(--tl-desk)',
        border: on ? '2.5px solid var(--tl-ink)' : 'none',
        boxSizing: 'border-box'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 7,
        font: '700 11.5px Manrope,sans-serif',
        color: 'var(--tl-ink)'
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 9.5px ' + mono,
        color: p.soon ? 'var(--tl-open-text)' : 'rgba(11,14,18,.4)'
      }
    }, p.next));
  }), anyoneLabel ? /*#__PURE__*/React.createElement("div", {
    onClick: () => onSelect && onSelect('any'),
    role: 'radio', 'aria-checked': selected === 'any', 'aria-label': anyoneLabel, tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onSelect && onSelect('any'); } },
    style: {
      flex: 'none',
      width: 66,
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 66,
      height: 66,
      borderRadius: 18,
      background: 'var(--tl-ds-f4f3ef)',
      border: '1.5px dashed rgba(11,14,18,.2)',
      display: 'grid',
      placeItems: 'center',
      color: 'rgba(11,14,18,.45)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      font: '700 11.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, anyoneLabel)) : null);
}
function ServiceRow({
  name,
  meta,
  price,
  selected,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      padding: '13px 14px',
      borderRadius: 15,
      border: selected ? '1.5px solid var(--tl-ink)' : '1px solid rgba(11,14,18,.1)',
      background: 'var(--tl-white)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, name), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 10.5px ' + mono,
      color: 'rgba(11,14,18,.5)',
      marginTop: 3
    }
  }, meta) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 16px/1 Sora,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, price));
}
function DateStrip({
  days = [],
  selected,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, days.map(d => {
    const on = d.id === selected;
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      onClick: () => !d.off && onSelect && onSelect(d.id),
      role: 'radio', 'aria-checked': on, 'aria-disabled': d.off ? true : undefined, 'aria-label': d.dow + ' ' + d.num, tabIndex: d.off ? -1 : 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); !d.off && onSelect && onSelect(d.id); } },
      style: {
        flex: 'none',
        width: 56,
        padding: '11px 0',
        borderRadius: 14,
        background: on ? 'var(--tl-ink)' : 'var(--tl-white)',
        border: on ? 'none' : '1px solid rgba(11,14,18,.1)',
        color: on ? 'var(--tl-white)' : d.off ? 'rgba(11,14,18,.3)' : 'var(--tl-ink)',
        textAlign: 'center',
        cursor: d.off ? 'default' : 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 9.5px ' + mono,
        opacity: on || d.off ? .6 : .5
      }
    }, d.dow), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '800 18px/1.1 Sora,sans-serif',
        marginTop: 3
      }
    }, d.num));
  }));
}
function TimeSlots({
  slots = [],
  selected,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 9
    }
  }, slots.map(s => {
    const on = s.t === selected;
    return /*#__PURE__*/React.createElement("div", {
      key: s.t,
      onClick: () => !s.taken && onSelect && onSelect(s.t),
      role: 'radio', 'aria-checked': on, 'aria-disabled': s.taken ? true : undefined, 'aria-label': s.t, tabIndex: s.taken ? -1 : 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); !s.taken && onSelect && onSelect(s.t); } },
      style: {
        padding: '12px 0',
        borderRadius: 12,
        textAlign: 'center',
        font: '700 13px Manrope,sans-serif',
        background: on ? 'var(--tl-action)' : 'var(--tl-white)',
        border: on ? 'none' : '1px solid rgba(11,14,18,.1)',
        color: on ? 'var(--tl-white)' : s.taken ? 'rgba(11,14,18,.3)' : 'var(--tl-ink)',
        textDecoration: s.taken ? 'line-through' : 'none',
        boxShadow: on ? '0 8px 18px -8px rgba(75,55,245,.7)' : 'none',
        cursor: s.taken ? 'default' : 'pointer'
      }
    }, s.t);
  }));
}
function AddOnRow({
  label,
  price,
  checked,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onToggle,
    role: 'checkbox', 'aria-checked': !!checked, 'aria-label': label + (price ? ' ' + price : ''), tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onToggle && onToggle(e); } },
    style: {
      padding: '13px 14px',
      borderRadius: 14,
      background: 'var(--tl-white)',
      border: checked ? '1.5px solid var(--tl-ink)' : '1px solid rgba(11,14,18,.1)',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      cursor: 'pointer'
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 7,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 15,
    strokeWidth: 2.2
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 7,
      border: '1.5px solid rgba(11,14,18,.2)',
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '700 13px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px ' + mono,
      color: 'var(--tl-ink)'
    }
  }, price));
}
function DepositNote({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      borderRadius: 14,
      background: 'rgba(75,55,245,.07)',
      border: '1px solid rgba(75,55,245,.18)',
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bolt",
    size: 18,
    color: "var(--tl-action)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'var(--tl-ds-332a6b)'
    }
  }, children));
}
function StepHeader({
  title,
  step,
  total,
  onBack,
  backLabel = 'Volver'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 14px',
      background: 'var(--tl-white)',
      borderBottom: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onBack,
    ...(onBack ? { role: 'button', tabIndex: 0, 'aria-label': backLabel, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onBack(e); } } } : {}),
    style: {
      transform: 'rotate(180deg)',
      display: 'grid',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "right",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '700 15px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px ' + mono,
      color: 'rgba(11,14,18,.45)'
    }
  }, step, " / ", total)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      height: 3,
      borderRadius: 9,
      background: 'rgba(11,14,18,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: step / total * 100 + '%',
      height: 3,
      borderRadius: 9,
      background: 'var(--tl-ink)'
    }
  })));
}
function TotalBar({
  label = 'TOTAL',
  total,
  cta,
  onCta
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 10px',
      background: 'var(--tl-white)',
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 9.5px ' + mono,
      color: 'rgba(11,14,18,.45)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 20px/1 Sora,sans-serif',
      letterSpacing: '-.02em',
      color: 'var(--tl-ink)'
    }
  }, total)), /*#__PURE__*/React.createElement("div", {
    onClick: onCta,
    ...__ds_scope.__btn(onCta, undefined, undefined),
    style: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      font: '700 14px Manrope,sans-serif',
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, cta));
}
Object.assign(__ds_scope, { StaffPicker, ServiceRow, DateStrip, TimeSlots, AddOnRow, DepositNote, StepHeader, TotalBar });
