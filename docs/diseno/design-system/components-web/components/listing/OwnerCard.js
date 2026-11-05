// Fuente: components/listing/OwnerCard.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const mono = "'JetBrains Mono',monospace";

/* 2p · Resumen 15b · Quién está detrás. Persona (foto, nombre, rol, apodo) + sus palabras + equipo; sin persona muestra el texto del negocio; siempre termina con la franja de lo verificado.
   trust: [{ icon, label, tone: 'ok' | 'wait' | 'info' }] — sello o teléfono verificado, años en Hazleton, pedidos entregados, rango. */
const TONE = {
  ok: '#00695B',
  wait: '#8A5A00',
  info: '#4B37F5'
};
function OwnerCard({
  photo,
  name,
  role,
  nick,
  quote,
  about,
  since,
  team = [],
  teamLabel,
  teamCta = 'Ver equipo',
  trust = [],
  desktop,
  onTeam
}) {
  const person = !!(name && quote);
  const Team = team.length ? /*#__PURE__*/React.createElement("div", {
    onClick: onTeam,
    style: {
      marginTop: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: onTeam ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      paddingLeft: 6
    }
  }, team.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: desktop ? 34 : 30,
      height: desktop ? 34 : 30,
      marginLeft: -6,
      borderRadius: 99,
      border: '2px solid #fff',
      background: 'center 25%/cover url(' + p + ')',
      backgroundColor: '#E4E1DA'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '600 12.5px/1.35 Manrope,sans-serif',
      color: 'rgba(11,14,18,.7)'
    }
  }, teamLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: '#4B37F5'
    }
  }, teamCta)) : null;
  const Quote = /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: desktop ? 0 : 14,
      display: 'flex',
      gap: desktop ? 12 : 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none',
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "quote",
    size: desktop ? 22 : 18,
    color: "#4B37F5"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: '600 ' + (desktop ? 17 : 14.5) + 'px/1.55 Manrope,sans-serif',
      textWrap: 'pretty'
    }
  }, quote));
  const Who = /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 ' + (desktop ? 24 : 17) + 'px/1.15 Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '500 ' + (desktop ? 14 : 12.5) + 'px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, role), nick ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      font: '700 9px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.45)'
    }
  }, nick) : null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: desktop ? 22 : 20,
      border: '1px solid rgba(11,14,18,.08)',
      overflow: 'hidden',
      background: '#fff'
    }
  }, person ? desktop ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '220px minmax(0,1fr)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 250,
      background: 'center 25%/cover url(' + photo + ')',
      backgroundColor: '#E4E1DA'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 26px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, Who, Quote, Team)) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 13,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 99,
      flex: 'none',
      background: 'center 25%/cover url(' + photo + ')',
      backgroundColor: '#E4E1DA'
    }
  }), Who), Quote, Team) : about ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: desktop ? '22px 26px' : '16px 16px 14px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: '500 ' + (desktop ? 17 : 14) + 'px/1.6 Manrope,sans-serif',
      color: 'rgba(11,14,18,.8)',
      textWrap: 'pretty'
    }
  }, about), since ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '600 10px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.45)'
    }
  }, since) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: desktop ? '14px 26px' : '12px 16px 13px',
      background: '#F7F6F3',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px 18px'
    }
  }, trust.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: '700 ' + (desktop ? 13 : 12) + 'px/1.3 Manrope,sans-serif'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 14,
    color: TONE[t.tone] || TONE.info
  }), t.label))));
}

/* 2p · Resumen 15b · Hoy (o el próximo día que abre). Estado grande + cómo pedir en una frase + 3 datos; "Sin delivery" cuando no hay (lo que el negocio no hace se dice). */
function TodayCard({
  eyebrow,
  title,
  dot = '#00A88F',
  sub,
  cols = [],
  noLabel,
  linkLabel,
  onLink,
  desktop
}) {
  const Cols = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: desktop ? 12 : 10,
      ...(desktop ? {} : {
        marginTop: 14,
        paddingTop: 13,
        borderTop: '1px solid rgba(11,14,18,.07)'
      })
    }
  }, cols.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      minWidth: 0,
      ...(desktop ? {
        padding: 12,
        borderRadius: 14,
        background: '#F7F6F3'
      } : {})
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.45)'
    }
  }, c.k), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      font: '700 ' + (desktop ? 14 : 13) + 'px/1.3 Manrope,sans-serif'
    }
  }, c.v))));
  const Foot = noLabel || linkLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: desktop ? 12 : 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10
    }
  }, noLabel ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: '600 12px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "ban",
    size: 14,
    color: "rgba(11,14,18,.5)"
  }), noLabel) : /*#__PURE__*/React.createElement("span", null), linkLabel ? /*#__PURE__*/React.createElement("span", {
    onClick: onLink,
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: '#4B37F5',
      cursor: 'pointer'
    }
  }, linkLabel) : null) : null;
  const Head = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px ' + mono,
      letterSpacing: '.16em',
      color: 'rgba(11,14,18,.42)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 99,
      background: dot,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + (desktop ? 26 : 21) + 'px/1.15 Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '500 ' + (desktop ? 14 : 13) + 'px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.62)',
      textWrap: 'pretty'
    }
  }, sub));
  return desktop ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px',
      borderRadius: 22,
      border: '1px solid rgba(11,14,18,.08)',
      background: '#fff',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: '20px 24px',
      alignItems: 'center'
    }
  }, Head, /*#__PURE__*/React.createElement("div", null, Cols, Foot)) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderRadius: 20,
      border: '1px solid rgba(11,14,18,.08)',
      background: '#fff'
    }
  }, Head, Cols, Foot);
}
Object.assign(__ds_scope, { OwnerCard, TodayCard });
