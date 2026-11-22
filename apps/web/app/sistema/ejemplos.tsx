"use client";
/* Ejemplos del catálogo (/sistema). Datos de muestra SOLO para revisar el aspecto de cada componente; nunca se
   usan en pantallas. Los componentes sin ejemplo aquí se ven completos en la pantalla que los usa. */
import * as UI from "@tolatino/ui";
import type { ComponentType, ReactNode } from "react";

const Fila = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-2">{children}</div>;
const Col = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-3">{children}</div>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type K = "Button" | "Chip" | "Tag" | "Icon" | "IconButton" | "Placeholder" | "SectionHeader" | "Eyebrow" | "Tabs" | "FilterRail" | "BusinessRow" | "EventCard" | "InfoCard" | "StoryCard" | "ReviewCard" | "OwnerCard" | "TodayCard" | "ServiceRow" | "DateStrip" | "TimeSlots" | "KpiCard" | "OnbProgress";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Chip, Tag, Icon, IconButton, Placeholder, SectionHeader, Eyebrow, Tabs, FilterRail, BusinessRow, EventCard, InfoCard, StoryCard, ReviewCard, OwnerCard, TodayCard, ServiceRow, DateStrip, TimeSlots, KpiCard, OnbProgress } = UI as unknown as Record<K, ComponentType<any>>;
const ICONOS = (UI as unknown as { ICON_NAMES?: string[] }).ICON_NAMES ?? [];

/* Vitrina (AK): las piezas tipadas del sistema; datos de muestra, sin fotos de verdad (el rayado del sistema). */
const FOTO_M = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><rect width='8' height='8' fill='%23d9d5cc'/></svg>";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { TarjetaVitrina, FilaFree, TarjetaVitrinaEsqueleto, FilaFreeEsqueleto } = UI as unknown as Record<"TarjetaVitrina" | "FilaFree" | "TarjetaVitrinaEsqueleto" | "FilaFreeEsqueleto", ComponentType<any>>;

export const EJEMPLOS: Record<string, () => ReactNode> = {
  TarjetaVitrina: () => (
    <Col>
      <TarjetaVitrina nombre="Sabor Dominicano" verificado verificadoEtiqueta="Verificado" calificacion="4.8" resenas={212} dato="DOMINICANA · CATERING · 0.3 MI" estado="Abierto · hasta 9 PM" abierto
        fotos={[FOTO_M, FOTO_M, FOTO_M]} fotosTotal={27} masFotosEtiqueta={(n: number) => `+${n} FOTOS`} onMasFotos={() => undefined} chips={[{ label: "Pickup 25 min", variant: "feature" }, { label: "Delivery $3", variant: "feature" }]}
        oferta="Mofongo de chicharrón $12, hasta agotar" cta="Ordenar" ctaIcono="bag" onCta={() => undefined} onLlamar={() => undefined} llamarNombre="Llamar" guardarNombre="Guardar" quitarNombre="Quitar de guardados" onGuardar={() => undefined} />
      <TarjetaVitrina nombre="Barbería La Silla" calificacion="4.9" resenas={341} dato="BARBERÍA · 0.6 MI" estado="Cerrado · abre 10 AM" abierto={false} fotos={[]}
        chips={[{ label: "Hoy 4:30", variant: "slot" }, { label: "Hoy 5:15", variant: "slot" }, { label: "Mañana 10:00", variant: "slot" }]} cta="Booking" ctaIcono="calendar" onCta={() => undefined} />
    </Col>
  ),
  FilaFree: () => <Col><FilaFree nombre="Fritura Doña Carmen" dato="FRITURAS · 0.6 MI" calificacion="4.5" resenas={18} llamarEtiqueta="Llamar" llamarNombre="Llamar" onLlamar={() => undefined} /></Col>,
  TarjetaVitrinaEsqueleto: () => <TarjetaVitrinaEsqueleto />,
  FilaFreeEsqueleto: () => <FilaFreeEsqueleto />,
  Button: () => (
    <Col>
      {["primary", "action", "secondary", "soft", "danger", "ghost"].map((v) => (
        <div key={v} className="flex"><Button variant={v} block icon={v === "action" ? "calendar" : undefined}>Booking · {v}</Button></div>
      ))}
      <Fila><Button size="md">Mediano</Button><Button size="sm" variant="secondary">Chico</Button><Button disabled>Deshabilitado</Button></Fila>
    </Col>
  ),
  Chip: () => (
    <Fila>
      {["filter", "selected", "verified", "pro", "feature", "slot"].map((v) => <Chip key={v} variant={v}>{v}</Chip>)}
    </Fila>
  ),
  Tag: () => <Fila>{["action", "danger", "signal", "ink", "neutral"].map((t) => <Tag key={t} tone={t}>{t.toUpperCase()}</Tag>)}</Fila>,
  Icon: () => (
    <div className="grid grid-cols-6 gap-3">
      {ICONOS.map((n) => (
        <div key={n} className="flex flex-col items-center gap-1">
          <Icon name={n} size={22} />
          <span className="font-mono text-[8.5px] text-text-muted">{n}</span>
        </div>
      ))}
    </div>
  ),
  IconButton: () => <Fila><IconButton icon="heart" /><IconButton icon="share" active /><IconButton icon="search" size={44} /></Fila>,
  Placeholder: () => <Col><Placeholder height={86}>Foto</Placeholder><Placeholder tone="dark" height={60} radius={14} /></Col>,
  SectionHeader: () => <SectionHeader title="Abierto ahora" dot action="Ver todo" />,
  Eyebrow: () => <Eyebrow>Hoy en el barrio</Eyebrow>,
  Tabs: () => (
    <Tabs active="res" items={[{ id: "res", label: "Resumen" }, { id: "nov", label: "Novedades" }, { id: "menu", label: "Menú" }, { id: "rev", label: "Reseñas" }]} />
  ),
  FilterRail: () => <FilterRail active="Todo" items={["Todo", "Abierto ahora", "Verificado", "Delivery"]} />,
  BusinessRow: () => <BusinessRow name="Sabor Dominicano" meta="Comida dominicana · ★ 4.8 · 0.6 mi" verified />,
  EventCard: () => <EventCard title="Noche de bachata" meta="SÁB 8 PM · Hazleton" tag="BOLETOS" />,
  InfoCard: () => <InfoCard label="CÓMO LLEGAR">Calle Wyoming 214, al lado de la lavandería.</InfoCard>,
  StoryCard: () => (
    <StoryCard name="Panadería La Espiga" distance="0.4 mi" posts={[{ type: "Hoy hay", text: "Pan de agua recién salido. Hasta las 11 AM.", ago: "Hace 1 h" }]} />
  ),
  ReviewCard: () => (
    <ReviewCard initials="AR" name="Ana Rodríguez" who="Vecina de Hazleton" starsOn="★★★★★" when="Hace 2 días" source="VERIFICADA · PEDIDO"
      facts={["Llegó caliente", "A tiempo"]} body="El pernil igualito al de mi abuela. Pedí delivery y llegó en 25 minutos." recommend="Pernil con moro" helpful="12" />
  ),
  OwnerCard: () => (
    <OwnerCard name="Daniel Ortiz" role="Dueño" nick="Danny" quote="Cocinamos como en casa, sin apuro." since="Desde 2019" trust={["Teléfono verificado", "Licencia de comida"]} />
  ),
  TodayCard: () => <TodayCard eyebrow="HOY" title="Abierto · cierra 9 PM" sub="Pickup en 20 min · Delivery hasta 3 mi" />,
  ServiceRow: () => <Col><ServiceRow name="Corte clásico" meta="30 min" price="$20" /><ServiceRow name="Corte + barba" meta="45 min" price="$30" selected /></Col>,
  DateStrip: () => (
    <DateStrip selected="jue" days={[{ id: "mie", dow: "MIÉ", num: 4 }, { id: "jue", dow: "JUE", num: 5 }, { id: "vie", dow: "VIE", num: 6 }, { id: "sab", dow: "SÁB", num: 7 }, { id: "dom", dow: "DOM", num: 8, off: true }]} />
  ),
  TimeSlots: () => <TimeSlots selected="10:30 AM" slots={[{ t: "10:00 AM", taken: true }, { t: "10:30 AM" }, { t: "11:00 AM" }, { t: "11:30 AM" }]} />,
  KpiCard: () => <Fila><KpiCard label="NEGOCIOS NUEVOS" value="42" sub="+12 % vs semana anterior" /><KpiCard label="PEDIDOS" value="318" dark /></Fila>,
  ChangeProposal: () => {
    const CP = (UI as unknown as Record<"ChangeProposal", ComponentType<any>>).ChangeProposal; // eslint-disable-line @typescript-eslint/no-explicit-any
    return <CP item={{ name: "Pollo guisado", price: "$12.50" }} options={[{ icon: "edit", label: "Cambiar por otro plato", sub: "Mismo precio o menos" }, { icon: "close", danger: true, label: "Quitar y seguir", sub: "Se descuenta $12.50" }]} note="El negocio confirma antes de cobrar." />;
  },
  OnbProgress: () => <OnbProgress label="QUIÉN ERES · 2 DE 4" saved segments={[1, 1, 0.5, 0]} />,
};
