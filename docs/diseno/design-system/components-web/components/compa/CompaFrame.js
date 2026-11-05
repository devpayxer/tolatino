// Fuente: components/compa/CompaFrame.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* 2as · El Compa, hoja de ayuda (variante 1b) y 2at · El Compa, pasos guiados (variante 1c). Asistente de IA de To'Latino.
   Sacados de To'Latino Compa.dc.html tal como se ven. La hoja va sobre el pedido, la cita o el boleto; los pasos son la página Ayuda (APP-COMPA).
   Contexto = RequestCard · razones = HelpReasonList · opciones = OptionCard, dentro de CompaSlot. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const LOGO = 'assets/logo-tolatino.svg';
const KF = '@keyframes cpUp{from{transform:translateY(64px);opacity:0}to{transform:none;opacity:1}}@keyframes cpFade{from{opacity:0}to{opacity:1}}@keyframes cpDot{0%,80%,100%{opacity:.25}40%{opacity:1}}.tl-cp-hs{scrollbar-width:none}.tl-cp-hs::-webkit-scrollbar{display:none}';
function useKF() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('tl-compa-kf')) return;
    const s = document.createElement('style');
    s.id = 'tl-compa-kf';
    s.textContent = KF;
    document.head.appendChild(s);
  }, []);
}
const meta = {
  font: '600 9px ' + mono,
  letterSpacing: '.06em',
  color: 'rgba(11,14,18,.5)'
};
const M = '12px 14px 0';

/* Símbolo de To'Latino en círculo: así se ve El Compa. */
function CompaAvatar({
  size = 36,
  logo = LOGO
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      boxSizing: 'border-box',
      borderRadius: 99,
      border: '1px solid rgba(11,14,18,.1)',
      background: '#fff url(' + logo + ') center/60% no-repeat',
      flex: 'none',
      display: 'inline-block'
    }
  });
}

/* Marco completo. mode sheet = 2as: fondo oscuro + hoja 88 % (móvil) o panel de 420 a la derecha (desktop, top = dónde empieza).
   mode page = 2at: barra con volver, título y «Con una persona» (siempre a la vista). children = los bloques de la conversación. abajo: confirm = props de CompaConfirmBar (gana) · composer = props de CompaComposer · o footer (nodo). */
function CompaFrame({
  mode = 'sheet',
  desktop,
  top = 0,
  title,
  sub,
  onClose,
  onBack,
  personLabel,
  onPerson,
  person2Label,
  disclaimer,
  footer,
  confirm,
  composer,
  bodyRef,
  maxWidth,
  children
}) {
  useKF();
  const sheet = mode === 'sheet',
    mw = maxWidth || (sheet ? 'none' : desktop ? 720 : 'none');
  const box = sheet ? desktop ? {
    position: 'absolute',
    top,
    right: 0,
    height: 780,
    width: 420,
    background: '#F7F6F3',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-24px 0 60px -30px rgba(11,14,18,.5)',
    animation: 'cpFade .2s ease-out'
  } : {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '88%',
    maxHeight: '88%',
    borderRadius: '26px 26px 0 0',
    background: '#F7F6F3',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'cpUp .25s ease-out'
  } : {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column'
  };
  const wrap = sheet ? {
    position: 'absolute',
    inset: 0,
    zIndex: 96,
    fontFamily: 'Manrope,sans-serif',
    color: '#0B0E12'
  } : {
    minHeight: desktop ? 760 : '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#F7F6F3',
    fontFamily: 'Manrope,sans-serif',
    color: '#0B0E12'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, sheet ? /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(11,14,18,.46)',
      animation: 'cpFade .2s ease-out'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: box
  }, sheet ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 'none',
      borderBottom: '1px solid rgba(11,14,18,.07)'
    }
  }, !desktop ? /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 99,
      background: 'rgba(11,14,18,.18)'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(CompaAvatar, {
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 16px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title || 'El Compa'), /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "action"
  }, "IA")), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      ...meta
    }
  }, sub) : null), /*#__PURE__*/React.createElement("span", {
    onClick: onClose,
    style: {
      width: 34,
      height: 34,
      borderRadius: 11,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 15,
    strokeWidth: 2
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      padding: '12px 16px',
      background: '#fff',
      borderBottom: '1px solid rgba(11,14,18,.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onBack,
    style: {
      width: 34,
      height: 34,
      borderRadius: 11,
      background: '#F7F6F3',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 16,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 15px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      ...meta
    }
  }, sub) : null), has(personLabel) ? /*#__PURE__*/React.createElement("span", {
    onClick: onPerson,
    style: {
      height: 34,
      padding: '0 12px',
      borderRadius: 99,
      border: '1.5px solid rgba(11,14,18,.14)',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '700 12px Manrope,sans-serif',
      flex: 'none',
      whiteSpace: 'nowrap',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 14
  }), personLabel) : null), /*#__PURE__*/React.createElement("div", {
    ref: bodyRef,
    className: "tl-cp-hs",
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '4px 0 14px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: mw,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, has(disclaimer) ? /*#__PURE__*/React.createElement(CompaSysLine, {
    first: true
  }, disclaimer) : null, children, sheet && has(person2Label) ? /*#__PURE__*/React.createElement("div", {
    onClick: onPerson,
    style: {
      margin: '16px 14px 0',
      textAlign: 'center',
      font: '700 13.5px Manrope,sans-serif',
      color: '#4B37F5',
      cursor: 'pointer'
    }
  }, person2Label) : null)), confirm || composer || footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      bottom: 0,
      zIndex: 5,
      flex: 'none'
    }
  }, confirm ? /*#__PURE__*/React.createElement(CompaConfirmBar, _extends({
    maxWidth: mw
  }, confirm)) : composer ? /*#__PURE__*/React.createElement(CompaComposer, _extends({
    maxWidth: mw
  }, composer)) : footer) : null));
}

/* Línea del sistema, centrada en mono: aviso de IA, «Cancelaste la solicitud», fecha. */
function CompaSysLine({
  children,
  first
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: (first ? '12px' : '14px') + ' 22px 0',
      alignSelf: 'center',
      textAlign: 'center',
      font: '600 9.5px/1.6 ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)',
      textWrap: 'pretty'
    }
  }, children);
}

/* Lo que escribió la persona (o la opción que tocó). */
function CompaUserMsg({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      alignSelf: 'flex-end',
      maxWidth: '84%',
      padding: '9px 13px',
      borderRadius: '16px 16px 4px 16px',
      background: '#0B0E12',
      color: '#fff',
      font: '600 13.5px/1.45 Manrope,sans-serif',
      textWrap: 'pretty',
      animation: 'cpFade .2s ease-out'
    }
  }, children);
}

/* Respuesta del Compa: siempre con EL COMPA · IA; source = de dónde sale («SEGÚN LA PÁGINA DE …»). */
function CompaMsg({
  children,
  source,
  name = 'EL COMPA'
}) {
  useKF();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      padding: '12px 13px',
      borderRadius: 16,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      animation: 'cpFade .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement(CompaAvatar, {
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '700 9.5px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.55)'
    }
  }, name, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "action"
  }, "IA")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 14px/1.5 Manrope,sans-serif',
      textWrap: 'pretty'
    }
  }, children), has(source) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px/1.5 ' + mono,
      letterSpacing: '.08em',
      color: '#4B37F5'
    }
  }, source) : null));
}

/* Escribiendo… (tres puntos). */
function CompaTyping() {
  useKF();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      alignSelf: 'flex-start',
      padding: '12px 14px',
      borderRadius: 16,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      gap: 5
    }
  }, ['0s', '.15s', '.3s'].map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: '#0B0E12',
      animation: 'cpDot 1.2s ' + d + ' infinite'
    }
  })));
}

/* Hueco con el margen de la conversación para otros componentes: RequestCard (la operación), HelpReasonList (razones), OptionCard (pasos guiados, gap 8). */
function CompaSlot({
  children,
  stack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      display: stack ? 'flex' : 'grid',
      flexDirection: stack ? 'column' : undefined,
      gap: stack ? 8 : undefined
    }
  }, children);
}

/* «Así queda»: la acción que El Compa preparó. active = esperando que la persona confirme (borde en tinta). rows = [{ k, v, color }]. Se confirma con CompaConfirmBar. */
function CompaActionCard({
  label,
  title,
  sub,
  rows = [],
  active
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      padding: 14,
      borderRadius: 17,
      background: '#fff',
      border: '1.5px solid ' + (active ? '#0B0E12' : 'rgba(11,14,18,.14)'),
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'cpFade .2s ease-out'
    }
  }, has(label) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.5)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 16px/1.25 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 12.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)'
    }
  }, sub) : null), rows.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(11,14,18,.07)'
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: '9px 0',
      borderBottom: '1px solid rgba(11,14,18,.06)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)'
    }
  }, r.k), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: r.color || r.c || '#0B0E12',
      textAlign: 'right'
    }
  }, r.v)))) : null);
}

/* «Tu caso pasó a Soporte»: número del caso, cuándo escribe una persona (lun–vie 9–6) y lo que El Compa le pasó (label + lines). */
function CompaHandoffCard({
  title,
  tag,
  sub,
  label,
  lines = [],
  openLabel,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      padding: 14,
      borderRadius: 17,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'cpFade .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: '#0B0E12',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 18,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px/1.25 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), has(tag) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "neutral"
  }, tag) : null), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '500 13px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.72)',
      textWrap: 'pretty'
    }
  }, sub) : null)), lines.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '11px 12px',
      borderRadius: 13,
      background: '#F7F6F3',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, has(label) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.5)'
    }
  }, label) : null, lines.map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: '600 12.5px/1.45 Manrope,sans-serif'
    }
  }, typeof x === 'string' ? x : x.t))) : null, has(openLabel) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "md",
    block: true,
    onClick: onOpen
  }, openLabel)) : null);
}

/* Respuestas sugeridas (hasta 3). items = [{ l | label, onClick }]. */
function CompaChips({
  items = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: M,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, items.map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    variant: "filter",
    onClick: c.onClick
  }, c.l || c.label)));
}

/* Campo de abajo: «O escríbelo con tus palabras» + enviar. */
function CompaComposer({
  value,
  onChange,
  onKeyDown,
  onSend,
  placeholder,
  canSend,
  maxWidth = 'none'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px 16px',
      background: '#fff',
      borderTop: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    onKeyDown: onKeyDown,
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      height: 44,
      boxSizing: 'border-box',
      borderRadius: 14,
      background: '#F7F6F3',
      border: '1px solid rgba(11,14,18,.08)',
      padding: '0 14px',
      font: '500 14px Manrope,sans-serif',
      color: '#0B0E12',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    onClick: onSend,
    style: {
      width: 44,
      height: 44,
      borderRadius: 14,
      background: canSend ? '#0B0E12' : 'rgba(11,14,18,.3)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "right",
    size: 18,
    color: "#fff",
    strokeWidth: 2
  }))));
}

/* Barra para confirmar lo que El Compa preparó: nota, Sí (primary) y No (ghost). Sin confirmación no pasa nada. */
function CompaConfirmBar({
  note,
  okLabel,
  noLabel,
  onOk,
  onNo,
  maxWidth = 'none'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 18px',
      background: 'rgba(247,246,243,.96)',
      borderTop: '1px solid rgba(11,14,18,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, has(note) ? /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center',
      font: '700 9px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.5)'
    }
  }, note) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "lg",
    block: true,
    onClick: onOk
  }, okLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "md",
    block: true,
    onClick: onNo
  }, noLabel))));
}
CompaFrame.tlv = 29;
Object.assign(__ds_scope, { CompaAvatar, CompaFrame, CompaSysLine, CompaUserMsg, CompaMsg, CompaTyping, CompaSlot, CompaActionCard, CompaHandoffCard, CompaChips, CompaComposer, CompaConfirmBar });
