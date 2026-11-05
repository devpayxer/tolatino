// Fuente: components/booking/StaffPicker.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

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
        background: p.image ? 'center/cover url(' + p.image + ')' : '#EDEBE6',
        border: on ? '2.5px solid #0B0E12' : 'none',
        boxSizing: 'border-box'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 7,
        font: '700 11.5px Manrope,sans-serif',
        color: '#0B0E12'
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 9.5px ' + mono,
        color: p.soon ? '#00695B' : 'rgba(11,14,18,.4)'
      }
    }, p.next));
  }), anyoneLabel ? /*#__PURE__*/React.createElement("div", {
    onClick: () => onSelect && onSelect('any'),
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
      background: '#F4F3EF',
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
    style: {
      padding: '13px 14px',
      borderRadius: 15,
      border: selected ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)',
      background: '#fff',
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
      color: '#0B0E12'
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
      color: '#0B0E12'
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
      style: {
        flex: 'none',
        width: 56,
        padding: '11px 0',
        borderRadius: 14,
        background: on ? '#0B0E12' : '#fff',
        border: on ? 'none' : '1px solid rgba(11,14,18,.1)',
        color: on ? '#fff' : d.off ? 'rgba(11,14,18,.3)' : '#0B0E12',
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
      style: {
        padding: '12px 0',
        borderRadius: 12,
        textAlign: 'center',
        font: '700 13px Manrope,sans-serif',
        background: on ? '#4B37F5' : '#fff',
        border: on ? 'none' : '1px solid rgba(11,14,18,.1)',
        color: on ? '#fff' : s.taken ? 'rgba(11,14,18,.3)' : '#0B0E12',
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
    style: {
      padding: '13px 14px',
      borderRadius: 14,
      background: '#fff',
      border: checked ? '1.5px solid #0B0E12' : '1px solid rgba(11,14,18,.1)',
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
      background: '#0B0E12',
      color: '#fff',
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
      color: '#0B0E12'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px ' + mono,
      color: '#0B0E12'
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
    color: "#4B37F5"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: '#332A6B'
    }
  }, children));
}
function StepHeader({
  title,
  step,
  total,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 14px',
      background: '#fff',
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
      color: '#0B0E12'
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
      background: '#0B0E12'
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
      background: '#fff',
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
      color: '#0B0E12'
    }
  }, total)), /*#__PURE__*/React.createElement("div", {
    onClick: onCta,
    style: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      background: '#0B0E12',
      color: '#fff',
      font: '700 14px Manrope,sans-serif',
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, cta));
}
Object.assign(__ds_scope, { StaffPicker, ServiceRow, DateStrip, TimeSlots, AddOnRow, DepositNote, StepHeader, TotalBar });
