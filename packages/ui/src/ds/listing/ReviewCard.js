"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/listing/ReviewCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2z · Tarjeta de reseña (todas las fichas). Sacada de To'Latino Prototipo.dc.html (Reseñas y Resumen) tal como se ve. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
/* D3 · «Ver traducción» / «Ver original» bajo el texto cuando el original está en el otro idioma. */
const Tr = ({
  t,
  mt = 6
}) => t && has(t.label) ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: mt
  }
}, /*#__PURE__*/React.createElement("span", {
  onClick: t.onClick,
  ...__ds_scope.__btn(t.onClick, undefined, undefined),
  style: {
    font: '700 12px Manrope,sans-serif',
    color: 'var(--tl-action)',
    cursor: 'pointer'
  }
}, t.label)) : null;

/* Quién (iniciales, TU RESEÑA, de dónde · N reseñas), estrellas, cuándo, verificada + de qué pedido o cita, el dato que no se edita (Llegó caliente · A tiempo),
   texto, fotos, «Recomienda:», respuesta del negocio y pie con Útil · N, Editar y Reportar. summary = la forma corta del Resumen (sin recomienda ni pie). */
function ReviewCard({
  summary,
  padding,
  bodySize,
  border = '1px solid rgba(11,14,18,.07)',
  initials,
  name,
  mine,
  who,
  starsOn = '',
  starsOff = '',
  when,
  source,
  facts = [],
  body,
  translate,
  photos = [],
  recommend,
  reply,
  helpful,
  edit,
  report,
  helpfulLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Helpful" : "Útil",
  photoLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Photo" : "Foto"
}) {
  const S = summary;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: padding != null ? padding : S ? 15 : 16,
      borderRadius: 17,
      background: 'var(--tl-white)',
      border
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: S ? 36 : 38,
      height: S ? 36 : 38,
      borderRadius: 12,
      background: 'var(--tl-desk)',
      display: 'grid',
      placeItems: 'center',
      font: '800 ' + (S ? 12 : 12.5) + 'px Sora,sans-serif',
      flex: 'none'
    }
  }, initials), /*#__PURE__*/React.createElement("div", {
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
      font: '700 13.5px Manrope,sans-serif'
    }
  }, name), has(mine) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "ink"
  }, mine) : null), has(who) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '600 ' + (S ? 9 : 9.5) + 'px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.45)'
    }
  }, who) : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: S ? 11 : 12,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 ' + (S ? 12.5 : 13) + 'px/1 Manrope,sans-serif',
      letterSpacing: '1.5px',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--tl-pro)'
    }
  }, starsOn), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.16)'
    }
  }, starsOff)), has(when) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.45)'
    }
  }, when) : null, source && has(source.label) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: source.tone || 'signal'
  }, source.label) : null), facts.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: S ? 9 : 10,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px 14px'
    }
  }, facts.map((f, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      font: '700 11.5px Manrope,sans-serif',
      color: f.color
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: f.icon,
    size: 13,
    color: f.color
  }), f.label))) : null, has(body) ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: (S ? 9 : 10) + 'px 0 0',
      font: '400 ' + (bodySize || 13) + 'px/1.6 Manrope,sans-serif',
      color: 'rgba(11,14,18,.78)',
      textWrap: 'pretty'
    }
  }, body) : null, has(body) ? /*#__PURE__*/React.createElement(Tr, {
    t: translate
  }) : null, photos.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: S ? 10 : 12,
      display: 'flex',
      gap: 8,
      flexWrap: S ? 'nowrap' : 'wrap'
    }
  }, photos.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: p.onClick,
    ...__ds_scope.__btn(p.onClick, photoLabel, undefined),
    style: {
      width: S ? 64 : 76,
      height: S ? 64 : 76,
      borderRadius: 12,
      background: p.image ? p.image + ' center/cover' : 'var(--tl-photo-bg)',
      backgroundColor: 'var(--tl-photo-bg)',
      cursor: p.onClick ? 'pointer' : 'default',
      flex: 'none'
    }
  }))) : null, recommend && has(recommend.text) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 7,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none',
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 14,
    color: "var(--tl-action)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.7)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 800,
      color: 'var(--tl-ink)'
    }
  }, recommend.label), " ", recommend.text)) : null, reply && has(reply.text) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: S ? 11 : 12,
      padding: S ? '11px 12px' : '12px 13px',
      borderRadius: S ? 13 : 14,
      background: 'rgba(11,14,18,.04)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.45)'
    }
  }, reply.kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: S ? 5 : 6,
      font: '400 12.5px/1.55 Manrope,sans-serif',
      color: 'rgba(11,14,18,.75)',
      textWrap: 'pretty'
    }
  }, reply.text)) : null, helpful || edit || report ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 11,
      borderTop: '1px solid rgba(11,14,18,.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, helpful && helpful.onClick ? /*#__PURE__*/React.createElement("span", {
    onClick: helpful.onClick,
    ...__ds_scope.__btn(helpful.onClick, helpfulLabel, undefined),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      boxSizing: 'border-box',
      padding: '0 12px',
      borderRadius: 999,
      border: '1px solid ' + (helpful.border || 'rgba(11,14,18,.14)'),
      background: helpful.bg || 'var(--tl-white)',
      color: helpful.color || 'var(--tl-ink)',
      font: '700 12px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 14,
    color: helpful.color || 'var(--tl-ink)'
  }), helpful.label) : null, helpful && !helpful.onClick && has(helpful.label) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, helpful.label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), edit ? /*#__PURE__*/React.createElement("span", {
    onClick: edit.onClick,
    ...__ds_scope.__btn(edit.onClick, undefined, undefined),
    style: {
      font: '700 12px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, edit.label) : null, report ? /*#__PURE__*/React.createElement("span", {
    onClick: report.onClick,
    ...__ds_scope.__btn(report.onClick, undefined, undefined),
    style: {
      font: '600 12px Manrope,sans-serif',
      color: report.color || 'rgba(11,14,18,.5)',
      cursor: 'pointer'
    }
  }, report.label) : null) : null);
}
ReviewCard.tlv = 26;
Object.assign(__ds_scope, { ReviewCard });
