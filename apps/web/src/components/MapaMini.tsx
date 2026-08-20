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
// La hoja de MapLibre faltaba aquí (las otras dos pantallas con mapa sí la
// importaban), y en un export estático eso importa: la CSS se reparte por ruta,
// así que `/negocios` NO la cargaba. NO es la causa del rectángulo gris —se comprobó
// quitándola y el lienzo seguía saliendo del tamaño correcto, porque MapLibre
// le pone medidas en línea—, pero sin ella el PIN no lleva `position:absolute`
// y cae fuera de sitio, debajo del mapa en vez de sobre el punto.
import 'maplibre-gl/dist/maplibre-gl.css';
import { crearMapa } from '@/lib/mapa';

export function MapaMini({ lat, lng, color = '#FF2D6F', alto = 130, className = '' }: {
  lat?: number | null;
  lng?: number | null;
  /** Color del pin (el del rubro del negocio). */
  color?: string;
  alto?: number;
  className?: string;
}) {
  const div = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Si ningún proveedor de tiles responde (red del usuario, proveedor caído),
  // se vuelve al marcador de posición rayado. Un hueco gris parece una app rota.
  const [sinMapa, setSinMapa] = useState(false);
  const tiene = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && !sinMapa;

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
      // `crearMapa` trae el respaldo: si el estilo vectorial no llega en unos
      // segundos, cambia al raster en vez de dejar un rectángulo vacío.
      mapa = crearMapa(ml, {
        container: div.current,
        center: [lng as number, lat as number],
        zoom: 14.5,
        interactive: false,   // se mira, no se navega (ver cabecera)
        onSinMapa: () => { if (!cancelado) setSinMapa(true); },
      });

      // Pin propio, del color del rubro — no el marcador por defecto.
      const pin = document.createElement('div');
      pin.style.cssText = `width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 4px 12px rgba(30,27,46,.28)`;
      new ml.Marker({ element: pin, anchor: 'bottom' }).setLngLat([lng as number, lat as number]).addTo(mapa);
    })();
    return () => { cancelado = true; mapa?.remove(); };
  }, [visible, tiene, lat, lng, color]);

  // Sin coordenadas — o sin ningún proveedor de tiles que responda — se conserva
  // el marcador de posición de siempre. `data-mapa` dice cuál de los dos casos
  // es: sin él, una prueba no puede distinguir «volvió al rayado» de «no se
  // pintó nada», que es justo lo que hay que vigilar aquí.
  if (!tiene) {
    return (
      <div
        data-mapa={sinMapa ? 'respaldo' : 'sin-coords'}
        className={`relative overflow-hidden rounded-[15px] ${className}`}
        style={{ height: alto, background: 'repeating-linear-gradient(135deg,#EAE6F5 0 14px,#E4DFF2 14px 28px)' }}
      />
    );
  }

  return (
    <div
      ref={div}
      data-mapa="vivo"
      className={`relative overflow-hidden rounded-[15px] ${className}`}
      style={{ height: alto, background: '#F1EEFA' }}
    />
  );
}
