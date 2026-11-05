"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/booking/PartyPicker.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const mono = "'JetBrains Mono',monospace";
const K = {
  font: '700 10px ' + mono,
  letterSpacing: '.2em',
  color: 'rgba(11,14,18,.42)'
};

/* 2o · Reservar mesa. Primero "¿Cuántos son?": sin personas no se muestran fechas ni horas. max = personas en línea; max+1 "N+" = evento privado. */
function PartyPicker({
  value,
  max = 8,
  ask = true,
  title = '¿Cuántos son?',
  sub = 'Te mostramos solo los días y las horas con mesa para tu grupo.',
  label = 'PERSONAS',
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", null, ask && !value ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 20px/1.15 Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      font: '500 12.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, sub)) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.45)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, [...Array(max + 1)].map((_, k) => k + 1).map(n => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: n,
    variant: value === n ? 'selected' : 'filter',
    onClick: () => onChange && onChange(n)
  }, n > max ? max + 1 + '+' : n))));
}

/* 2o · Tu reservación (en la pestaña, en Resumen y en la columna). tone: neutral (pendiente) · signal (confirmada) · action (espera tu respuesta). */
function ReservationCard({
  label = 'TU RESERVACIÓN',
  tag,
  tone = 'neutral',
  title,
  sub,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      padding: '14px 16px',
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1.5px solid var(--tl-ink)',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: K
  }, label), /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: tone
  }, tag)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '700 13.5px/1.3 Manrope,sans-serif'
    }
  }, title), sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 11.5px/1.45 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)'
    }
  }, sub) : null), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 16,
    color: "rgba(11,14,18,.35)"
  }));
}

/* 2o · Lista de espera: se liberó una mesa. Se guarda 10 min; también llega por SMS. */
function TableOffer({
  title = 'Se liberó una mesa',
  when,
  note = 'Te la guardamos 10 minutos. También te mandamos un SMS.',
  takeLabel = 'Tomar la mesa',
  noLabel = 'No, gracias',
  onTake,
  onNo
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1.5px solid var(--tl-open)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: 'rgba(0,229,196,.16)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 18,
    color: "var(--tl-open-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 16px/1.2 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '700 13.5px/1.35 Manrope,sans-serif'
    }
  }, when), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '500 12px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, note))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "md",
    onClick: onTake
  }, takeLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "md",
    variant: "secondary",
    onClick: onNo
  }, noLabel))));
}
Object.assign(__ds_scope, { PartyPicker, ReservationCard, TableOffer });
