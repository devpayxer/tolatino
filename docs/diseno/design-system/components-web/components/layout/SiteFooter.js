// Fuente: components/layout/SiteFooter.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const mono = "'JetBrains Mono',monospace";
function Tag({
  tag
}) {
  if (!tag) return null;
  const on = tag.tone === 'on';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 6px',
      borderRadius: 5,
      background: on ? 'rgba(0,229,196,.16)' : 'rgba(255,255,255,.08)',
      color: on ? '#00E5C4' : 'rgba(255,255,255,.55)',
      font: '800 8.5px ' + mono,
      letterSpacing: '.08em'
    }
  }, tag.label);
}
function Link({
  l,
  size = 13
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: l.onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '500 ' + size + 'px/1.4 Manrope,sans-serif',
      color: 'rgba(255,255,255,.72)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", null, l.label), /*#__PURE__*/React.createElement(Tag, {
    tag: l.tag
  }));
}
function SiteFooter({
  sections = [],
  quick = [],
  legal = [],
  social = [],
  stores = [],
  phrase,
  trust,
  langLabel = 'ESPAÑOL · EN',
  cityLabel = 'HAZLETON, PA',
  onLang,
  onCity,
  layout = 'wide',
  assetBase = 'assets/',
  style
}) {
  const [open, setOpen] = React.useState(null);
  const acc = layout === 'accordion';
  const brand = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxWidth: 340
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: assetBase + 'logo-tolatino-white.svg',
    alt: "",
    style: {
      width: 32,
      height: 32,
      display: 'block',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 26px/1 Sora,sans-serif',
      letterSpacing: '-.04em'
    }
  }, "To", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#7B61FF'
    }
  }, "\u2019"), "Latino")), phrase ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: '400 13px/1.6 Manrope,sans-serif',
      color: 'rgba(255,255,255,.62)'
    }
  }, phrase) : null, trust ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '700 10.5px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(255,255,255,.72)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: '#00E5C4',
      flex: 'none'
    }
  }), trust) : null, stores.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, stores.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.label,
    onClick: s.onClick,
    style: {
      padding: '10px 14px',
      borderRadius: 11,
      background: 'rgba(255,255,255,.09)',
      font: '700 11px ' + mono,
      letterSpacing: '.06em',
      cursor: 'pointer'
    }
  }, s.label))) : null);
  const cols = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))',
      gap: '32px 24px'
    }
  }, sections.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px ' + mono,
      letterSpacing: '.18em',
      color: 'rgba(255,255,255,.42)'
    }
  }, f.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, f.links.map((l, i) => /*#__PURE__*/React.createElement(Link, {
    key: i,
    l: l
  }))))));
  const accordion = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, quick.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 18px',
      paddingBottom: 18
    }
  }, quick.map(l => /*#__PURE__*/React.createElement("span", {
    key: l.label,
    onClick: l.onClick,
    style: {
      font: '700 13px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, l.label))) : null, sections.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: f.title,
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(open === i ? null : i),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 0',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10.5px ' + mono,
      letterSpacing: '.18em',
      color: 'rgba(255,255,255,.72)'
    }
  }, f.title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      transform: 'rotate(' + (open === i ? 180 : 0) + 'deg)',
      transition: 'transform .2s',
      color: 'rgba(255,255,255,.5)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    strokeWidth: 2
  }))), open === i ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 0 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, f.links.map((l, j) => /*#__PURE__*/React.createElement(Link, {
    key: j,
    l: l,
    size: 13.5
  }))) : null)));
  const pill = {
    padding: '8px 12px',
    borderRadius: 11,
    border: '1px solid rgba(255,255,255,.16)',
    display: 'flex',
    gap: 7,
    alignItems: 'center',
    font: '700 11px ' + mono,
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#0B0E12',
      color: '#fff',
      padding: acc ? '32px 24px 24px' : '52px 30px 28px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: layout === 'wide' ? '320px minmax(0,1fr)' : 'minmax(0,1fr)',
      gap: '40px 60px'
    }
  }, brand, acc ? accordion : cols), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 40,
      paddingTop: 20,
      borderTop: '1px solid rgba(255,255,255,.1)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px 24px',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px 18px',
      alignItems: 'center',
      font: '600 10.5px ' + mono,
      letterSpacing: '.06em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,.42)'
    }
  }, "\xA9 ", new Date().getFullYear(), " TO\u2019LATINO"), legal.map(l => /*#__PURE__*/React.createElement("span", {
    key: l.label,
    onClick: l.onClick,
    style: {
      color: 'rgba(255,255,255,.62)',
      cursor: 'pointer'
    }
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onLang,
    style: pill
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "globe",
    size: 15,
    color: "#fff"
  }), langLabel), /*#__PURE__*/React.createElement("span", {
    onClick: onCity,
    style: pill
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pin",
    size: 15,
    color: "#fff"
  }), cityLabel), social.map(l => /*#__PURE__*/React.createElement("span", {
    key: l.label,
    onClick: l.onClick,
    style: {
      padding: '8px 10px',
      font: '700 10.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(255,255,255,.62)',
      cursor: 'pointer'
    }
  }, l.label)))));
}
Object.assign(__ds_scope, { SiteFooter });
