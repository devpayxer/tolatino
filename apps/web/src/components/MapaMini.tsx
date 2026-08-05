'use client';

// Mapa pequeño de UN punto — la ubicación de un negocio en su ficha.
//
// POR QUÉ EXISTE. Hasta ahora la sección «Ubicación» no era un mapa: era el
// rayado gris con un pin dibujado encima, siempre en el centro, sin relación
// con la dirección real. Se veía como un mapa apagado y no lo era. El fundador
// lo señaló el 2026-08-05 preguntando cómo hacerlo «funcional».
//
// CÓMO. MapLibre + el estilo vectorial de `lib/mapa` (nuestra paleta), cargado
// SOLO cuando el bloque entra en pantalla: un mapa pesa, y la ficha se abre
// muchas veces sin que nadie baje hasta aquí. Sin coordenadas no se monta nada
// y se conserva el marcador de posición de siempre — nunca un mapa vacío
// fingiendo que sabemos dónde está el negocio.
//
// Es un mapa para MIRAR, no para navegar: sin rueda de zoom ni arrastre, para
// que al desplazar la ficha con el dedo no se quede atrapado dentro del mapa.
// Quien quiera navegar tiene «Cómo llegar», que abre su app de mapas.

import { useEffect, useRef, useState } from 'react';
import { MAPA_STYLE, aplicarPaletaToLatino } from '@/lib/mapa';

export function MapaMini({ lat, lng, color = '#7B61FF', alto = 130, className = '' }: {
  lat?: number | null;
  lng?: number | null;
  /** Color del pin (el del rubro del negocio). */
  color?: string;
  alto?: number;
  className?: string;
}) {
  const div = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const tiene = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);

  // Solo se monta el mapa cuando el bloque asoma por la pantalla.
  useEffect(() => {
    const el = div.current;
    if (!el || !tiene || visible) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [tiene, visible]);

  useEffect(() => {
    if (!visible || !tiene || !div.current) return;
    let cancelado = false;
    let mapa: import('maplibre-gl').Map | null = null;
    void (async () => {
      const ml = await import('maplibre-gl');
      if (cancelado || !div.current) return;
      mapa = new ml.Map({
        container: div.current,
        style: MAPA_STYLE,
        center: [lng as number, lat as number],
        zoom: 14.5,
        attributionControl: false,
        interactive: false,   // se mira, no se navega (ver cabecera)
      });
      mapa.on('style.load', () => aplicarPaletaToLatino(mapa as never));

      // Pin propio, del color del rubro — no el marcador por defecto.
      const pin = document.createElement('div');
      pin.style.cssText = `width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 4px 12px rgba(30,27,46,.28)`;
      new ml.Marker({ element: pin, anchor: 'bottom' }).setLngLat([lng as number, lat as number]).addTo(mapa);
    })();
    return () => { cancelado = true; mapa?.remove(); };
  }, [visible, tiene, lat, lng, color]);

  // Sin coordenadas se conserva el marcador de posición de siempre.
  if (!tiene) {
    return (
      <div
        className={`relative overflow-hidden rounded-[15px] ${className}`}
        style={{ height: alto, background: 'repeating-linear-gradient(135deg,#E7ECF3 0 14px,#DCE3EC 14px 28px)' }}
      />
    );
  }

  return (
    <div
      ref={div}
      className={`relative overflow-hidden rounded-[15px] ${className}`}
      style={{ height: alto, background: '#F7F5FB' }}
    />
  );
}
