"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/onboarding/OnbTopBar.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2ad · Pasos del onboarding (Publica tu negocio): fases arriba, opciones grandes y Continuar. «Tu negocio en una línea» = BusinessPreview mode="mini".
   Sacados de To'Latino Publica tu negocio.dc.html tal como se ven. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const ell = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};
const SEG = {
  done: 'var(--tl-ink)',
  cur: 'var(--tl-action)',
  next: 'rgba(11,14,18,.1)'
};

/* Progreso: «PASO 3 DE 18 · TU NEGOCIO», «Guardado» y una barra por fase (hechas en tinta, la actual en Action). compact = dentro de OnbTopBar. */
function OnbProgress({
  label,
  saved,
  segments = [],
  compact
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: compact ? 1 : undefined,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 7 : 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.6)',
      ...(compact ? ell : null)
    }
  }, label), has(saved) ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--tl-open-text)',
      flex: 'none'
    }
  }, saved) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + Math.max(1, segments.length) + ',minmax(0,1fr))',
      gap: compact ? 4 : 5
    }
  }, segments.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      height: 4,
      borderRadius: 9,
      background: SEG[s] || s
    }
  }))));
}

/* Barra de arriba en móvil: volver, progreso y cerrar (sale y guarda). */
function OnbTopBar({
  onBack,
  onExit,
  label,
  saved,
  segments
}) {
  const btn = {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: 'rgba(11,14,18,.05)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    flex: 'none'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'var(--tl-white)',
      borderBottom: '1px solid rgba(11,14,18,.07)',
      padding: '10px 16px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onBack,
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 18,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement(OnbProgress, {
    compact: true,
    label: label,
    saved: saved,
    segments: segments
  }), /*#__PURE__*/React.createElement("span", {
    onClick: onExit,
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 17,
    strokeWidth: 2
  })));
}

/* Fases en la columna (desktop): marca (letra o ✓), nombre y cuántos pasos; la actual con tinte Action. Abajo «Guardado» y Salir. state = done · cur · next; onClick solo si se puede volver. */
const PH = {
  done: ['transparent', 'rgba(11,14,18,.75)', 'var(--tl-ink)', 'var(--tl-white)'],
  cur: ['rgba(75,55,245,.08)', 'var(--tl-ink)', 'var(--tl-action)', 'var(--tl-white)'],
  next: ['transparent', 'rgba(11,14,18,.5)', 'rgba(11,14,18,.07)', 'rgba(11,14,18,.45)']
};
function OnbPhases({
  label,
  phases = [],
  saved,
  exitLabel,
  onExit
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, has(label) ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)',
      padding: '0 12px 10px'
    }
  }, label) : null, phases.map((f, i) => {
    const [bg, fg, dbg, dfg] = PH[f.state] || PH.next;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: f.onClick,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 12px',
        borderRadius: 13,
        background: bg,
        cursor: f.onClick ? 'pointer' : 'default'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 9,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: dbg,
        color: dfg,
        font: '800 11px/1 ' + mono
      }
    }, f.state === 'done' ? '✓' : f.mark), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: '700 13.5px Manrope,sans-serif',
        color: fg
      }
    }, f.title), has(f.sub) ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        marginTop: 2,
        font: '600 9.5px ' + mono,
        letterSpacing: '.06em',
        color: 'rgba(11,14,18,.45)'
      }
    }, f.sub) : null));
  }), has(saved) || has(exitLabel) ? /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '14px 12px 0',
      paddingTop: 14,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, has(saved) ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: '700 10px ' + mono,
      letterSpacing: '.1em',
      color: 'var(--tl-open-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    color: "var(--tl-open)",
    strokeWidth: 2.2
  }), saved) : null, has(exitLabel) ? /*#__PURE__*/React.createElement("span", {
    onClick: onExit,
    style: {
      font: '700 13px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, exitLabel) : null) : null);
}

/* Opción grande: ícono 46, título y explicación, círculo de elegir. on = elegida (borde, ícono y círculo en tinta). */
function OptionCard({
  icon,
  title,
  sub,
  on,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      gap: 13,
      alignItems: 'center',
      padding: 15,
      borderRadius: 18,
      border: on ? '1.5px solid var(--tl-ink)' : '1px solid rgba(11,14,18,.1)',
      background: 'var(--tl-white)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 14,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: on ? 'var(--tl-ink)' : 'rgba(75,55,245,.08)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 21,
    color: on ? 'var(--tl-white)' : 'var(--tl-action)'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '800 15.5px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      font: '500 12.5px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, sub) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 99,
      boxSizing: 'border-box',
      border: on ? 'none' : '1.5px solid rgba(11,14,18,.22)',
      background: on ? 'var(--tl-ink)' : 'transparent',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    color: "var(--tl-white)",
    strokeWidth: 2.6
  })));
}

/* Continuar: bajo el paso en desktop (Atrás a la izquierda, nota, segunda opción y Continuar) o fija abajo en móvil (translúcida, con su espacio). alt = Saltar · Ahora no. */
function OnbActionBar({
  fixed,
  back,
  note,
  alt,
  go = {}
}) {
  if (fixed) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 96
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      background: 'rgba(247,246,243,.96)',
      backdropFilter: 'blur(14px)',
      borderTop: '1px solid rgba(11,14,18,.08)',
      padding: '12px 16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, has(note) ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.5)',
      textAlign: 'center'
    }
  }, note) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, alt ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "lg",
    onClick: alt.onClick
  }, alt.label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    size: "lg",
    icon: go.icon,
    disabled: go.disabled,
    onClick: go.onClick
  }, go.label)))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 30,
      paddingTop: 20,
      borderTop: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, back ? /*#__PURE__*/React.createElement("span", {
    onClick: back.onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '700 13.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.7)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 16,
    strokeWidth: 2
  }), back.label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '600 10px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.5)',
      textAlign: 'right'
    }
  }, note), alt ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "lg",
    onClick: alt.onClick
  }, alt.label) : null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "lg",
    icon: go.icon,
    disabled: go.disabled,
    onClick: go.onClick
  }, go.label));
}
Object.assign(__ds_scope, { OnbProgress, OnbTopBar, OnbPhases, OptionCard, OnbActionBar });
