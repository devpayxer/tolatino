// Fuente: components/community/Thread.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* 2r · Comentarios del hilo: la más votada destacada (17d), los demás recomendados con % de votos (17c), cada comentario en su tarjeta (17a) y las respuestas bajo la persona a la que contestas (18a). Sacados de To'Latino Comunidad.dc.html tal como se ven. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
/* D3 · «Ver traducción» bajo el texto. */
const Tr = ({
  t,
  mt = 6
}) => t && has(t.label) ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: mt
  }
}, /*#__PURE__*/React.createElement("span", {
  onClick: t.onClick,
  style: {
    font: '700 12px Manrope,sans-serif',
    color: '#4B37F5',
    cursor: 'pointer'
  }
}, t.label)) : null;
const MUTED = 'rgba(11,14,18,.6)';
const LINE = '#E6E3DC';
const Avatar = ({
  size,
  font,
  avatar,
  avatarColor = '#EDEBE6',
  initials,
  avatarRadius = '99px',
  avatarBorder = 'none',
  onAuthor
}) => /*#__PURE__*/React.createElement("span", {
  onClick: onAuthor,
  style: {
    width: size,
    height: size,
    boxSizing: 'border-box',
    borderRadius: avatarRadius,
    border: avatarBorder,
    background: avatar || avatarColor,
    backgroundColor: avatarColor,
    display: 'grid',
    placeItems: 'center',
    font: '800 ' + font + 'px Sora,sans-serif',
    flex: 'none',
    cursor: onAuthor ? 'pointer' : 'default'
  }
}, initials);
const Who = ({
  name,
  rank,
  onAuthor,
  size = 14
}) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
  onClick: onAuthor,
  style: {
    font: '700 ' + size + 'px/1.25 Manrope,sans-serif',
    cursor: onAuthor ? 'pointer' : 'default'
  }
}, name), rank && has(rank.label) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
  tone: rank.tone || 'neutral'
}, rank.label) : null);
const Head = p => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 11,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(Avatar, _extends({}, p, {
  size: p.avatarSize || 40,
  font: 12
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  }
}, /*#__PURE__*/React.createElement(Who, p)), has(p.time) ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 4,
    font: '600 9.5px ' + mono,
    letterSpacing: '.06em',
    color: 'rgba(11,14,18,.45)'
  }
}, p.time) : null), has(p.best) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
  tone: "signal"
}, p.best) : null);

/* Fila de acciones del comentario: votos + y −, Responder, «Es la solución» (si la puedes marcar) y menú. */
function CommentActions({
  vote = {},
  replyLabel = 'Responder',
  onReply,
  solve,
  onMenu
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 10,
      borderTop: '1px solid rgba(11,14,18,.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 34,
      padding: '0 4px',
      borderRadius: 11,
      background: 'rgba(11,14,18,.04)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: vote.onUp,
    style: {
      width: 28,
      height: 28,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 15,
    color: vote.upColor || MUTED
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      textAlign: 'center',
      font: '800 12.5px Sora,sans-serif',
      color: vote.scoreColor || '#0B0E12'
    }
  }, vote.score), /*#__PURE__*/React.createElement("span", {
    onClick: vote.onDown,
    style: {
      width: 28,
      height: 28,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      transform: 'rotate(180deg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 15,
    color: vote.downColor || MUTED
  }))), onReply ? /*#__PURE__*/React.createElement("span", {
    onClick: onReply,
    style: {
      padding: '8px 10px',
      font: '700 12.5px Manrope,sans-serif',
      color: MUTED,
      cursor: 'pointer'
    }
  }, replyLabel) : null, solve ? /*#__PURE__*/React.createElement("span", {
    onClick: solve.onClick,
    style: {
      padding: '8px 4px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      font: '700 12.5px Manrope,sans-serif',
      color: '#00695B',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    color: "#00695B",
    strokeWidth: 2.2
  }), solve.label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), onMenu ? /*#__PURE__*/React.createElement("span", {
    onClick: onMenu,
    style: {
      width: 30,
      height: 30,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 15,
    color: "rgba(11,14,18,.4)"
  })) : null);
}

/* 17d · La más votada: borde Signal, franja con ★ y el porqué, el negocio recomendado en grande con su botón. children = cajita para responder y respuestas. */
function TopAnswer({
  screenLabel,
  kicker,
  time,
  body,
  translate,
  business,
  actions = {},
  children,
  ...who
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      borderRadius: 20,
      border: '1.5px solid rgba(0,168,143,.28)',
      background: '#fff',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '11px 16px',
      background: 'rgba(0,229,196,.1)',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: '#00695B'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    size: 13,
    color: "#00695B"
  }), kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(Head, _extends({}, who, {
    time: time
  })), has(body) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      font: '500 15.5px/1.6 Manrope,sans-serif',
      textWrap: 'pretty'
    }
  }, body) : null, has(body) ? /*#__PURE__*/React.createElement(Tr, {
    t: translate
  }) : null, business ? /*#__PURE__*/React.createElement("div", {
    onClick: business.onOpen,
    style: {
      marginTop: 14,
      padding: 12,
      borderRadius: 16,
      background: '#F7F6F3',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      cursor: business.onOpen ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 54,
      height: 54,
      borderRadius: 14,
      background: business.image ? business.image + ' center/cover' : '#E4E1DA',
      backgroundColor: '#E4E1DA',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, business.name), business.verified ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "verified",
    size: 15,
    color: "#4B37F5"
  })) : null), has(business.meta) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 9.5px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.5)'
    }
  }, business.meta) : null), has(business.cta) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: business.onOpen
  }, business.cta)) : null) : null, /*#__PURE__*/React.createElement(CommentActions, actions), children));
}

/* 17a · Comentario en su tarjeta: autor, rango, cuándo, MEJOR RESPUESTA si es la elegida, texto, negocio que recomienda (BusinessRow) y acciones. children = cajita para responder y respuestas. */
function CommentCard({
  screenLabel,
  bg = '#fff',
  time,
  best,
  body,
  translate,
  business,
  actions = {},
  children,
  ...who
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      borderRadius: 18,
      background: bg,
      border: '1px solid rgba(11,14,18,.08)',
      padding: '16px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(Head, _extends({}, who, {
    avatarSize: 38,
    time: time,
    best: best
  })), has(body) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      font: '500 14.5px/1.6 Manrope,sans-serif',
      textWrap: 'pretty'
    }
  }, body) : null, has(body) ? /*#__PURE__*/React.createElement(Tr, {
    t: translate
  }) : null, business ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.BusinessRow, business)) : null, /*#__PURE__*/React.createElement(CommentActions, actions), children);
}
const ReplyBody = ({
  r,
  size,
  font,
  avatarSize,
  children
}) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap'
  }
}, /*#__PURE__*/React.createElement(Who, _extends({}, r, {
  size: size
})), /*#__PURE__*/React.createElement("span", {
  style: {
    font: '600 9px ' + mono,
    letterSpacing: '.06em',
    color: 'rgba(11,14,18,.45)'
  }
}, r.time)), r.hasText ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 3,
    font: '500 14px/1.55 Manrope,sans-serif',
    textWrap: 'pretty'
  }
}, has(r.at) ? /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700,
    color: '#4B37F5'
  }
}, r.at) : null, " ", r.text) : null, r.hasText ? /*#__PURE__*/React.createElement(Tr, {
  t: r.translate,
  mt: 3
}) : null, r.business ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  }
}, /*#__PURE__*/React.createElement(__ds_scope.BusinessRow, r.business)) : null, /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    font: '700 12px Manrope,sans-serif',
    color: 'rgba(11,14,18,.55)'
  }
}, /*#__PURE__*/React.createElement("span", {
  onClick: r.vote && r.vote.onUp,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    color: r.vote && r.vote.scoreColor
  }
}, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
  name: "like",
  size: 14,
  color: r.vote && r.vote.upColor || MUTED
}), r.vote && r.vote.score), r.onReply ? /*#__PURE__*/React.createElement("span", {
  onClick: r.onReply,
  style: {
    cursor: 'pointer'
  }
}, r.replyLabel) : null, /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1
  }
}), r.onMenu ? /*#__PURE__*/React.createElement("span", {
  onClick: r.onMenu,
  style: {
    display: 'grid',
    cursor: 'pointer',
    padding: 3
  }
}, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
  name: "chevronDown",
  size: 13,
  color: "rgba(11,14,18,.4)"
})) : null));

/* 18a · Respuestas: cerradas = caras de quienes respondieron + «Ver N respuestas»; abiertas = cada respuesta con su línea y, debajo, las que le contestan a esa persona (codo de línea). */
function ReplyThread({
  open,
  faces = [],
  toggleLabel,
  onToggle,
  replies = [],
  screenLabel = 'Comentario · respuestas'
}) {
  if (!open) return /*#__PURE__*/React.createElement("div", {
    onClick: onToggle,
    style: {
      marginTop: 6,
      padding: '8px 0 2px',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, faces.map((f, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 22,
      height: 22,
      boxSizing: 'border-box',
      borderRadius: 99,
      border: '2px solid #fff',
      marginLeft: f.ml != null ? f.ml : i ? -7 : 0,
      background: f.image || '#DDD9D1',
      backgroundColor: '#DDD9D1',
      display: 'grid',
      placeItems: 'center',
      font: '800 8px Sora,sans-serif'
    }
  }, f.initials))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: '#4B37F5'
    }
  }, toggleLabel));
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      marginTop: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      animation: 'tlFade .2s ease-out'
    }
  }, replies.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.key || i,
    style: {
      display: 'grid',
      gridTemplateColumns: '32px minmax(0,1fr)',
      columnGap: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Avatar, _extends({}, r, {
    size: 32,
    font: 10.5
  })), r.line ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      width: 2,
      marginLeft: 15,
      background: LINE
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(ReplyBody, {
    r: r,
    size: 13.5
  })), (r.kids || []).map((k, j) => /*#__PURE__*/React.createElement("div", {
    key: k.key || j,
    style: {
      display: 'contents'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 15,
      top: 0,
      width: 28,
      height: 27,
      boxSizing: 'border-box',
      borderLeft: '2px solid ' + LINE,
      borderBottom: '2px solid ' + LINE,
      borderBottomLeftRadius: 12
    }
  }), k.cont ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 15,
      top: 0,
      bottom: 0,
      width: 2,
      background: LINE
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      paddingTop: 14,
      display: 'flex',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Avatar, _extends({}, k, {
    size: 26,
    font: 9
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(ReplyBody, {
    r: k,
    size: 13
  }))))))), has(toggleLabel) ? /*#__PURE__*/React.createElement("span", {
    onClick: onToggle,
    style: {
      font: '700 12px Manrope,sans-serif',
      color: '#4B37F5',
      cursor: 'pointer'
    }
  }, toggleLabel) : null);
}

/* 17c · También recomiendan: cada negocio con la barra de % de votos detrás y el voto (👍 N) a la derecha. */
function AlsoRecommended({
  screenLabel,
  title,
  sub,
  items = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      borderRadius: 18,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 15px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 9px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.5)'
    }
  }, sub) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, items.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      overflow: 'hidden',
      height: 56,
      boxSizing: 'border-box',
      borderRadius: 14,
      background: '#fff',
      border: '1.5px solid ' + (b.border || 'rgba(11,14,18,.1)'),
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 6px 0 9px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: b.pct,
      background: 'rgba(75,55,245,.09)',
      transition: 'width .4s'
    }
  }), /*#__PURE__*/React.createElement("span", {
    onClick: b.onOpen,
    style: {
      position: 'relative',
      width: 36,
      height: 36,
      borderRadius: 10,
      background: b.image ? b.image + ' center/cover' : '#E4E1DA',
      backgroundColor: '#E4E1DA',
      flex: 'none',
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("div", {
    onClick: b.onOpen,
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px/1.25 Manrope,sans-serif',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, b.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '600 9px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.5)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, b.meta)), /*#__PURE__*/React.createElement("span", {
    onClick: b.onVote,
    style: {
      position: 'relative',
      height: 40,
      minWidth: 54,
      boxSizing: 'border-box',
      padding: '0 10px',
      borderRadius: 11,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      font: '800 14px Sora,sans-serif',
      color: b.color,
      cursor: 'pointer',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 15,
    color: b.color
  }), b.count)))));
}
TopAnswer.tlv = 26;
CommentCard.tlv = 26;
ReplyThread.tlv = 26;
Object.assign(__ds_scope, { CommentActions, TopAnswer, CommentCard, ReplyThread, AlsoRecommended });
