/* 9t · Los esqueletos de carga de las pantallas (pedido del fundador, 19 nov): lo que se ve en el instante del toque mientras llega la página.
   Solo piezas del sistema (Esq, EsqTexto, EsqCirculo, EsqZona de @tolatino/ui, con el «fondo de foto mientras carga»). La forma imita la
   pantalla que viene (lista, ficha, muro, tabla del equipo); el marco (encabezado, pestañas de abajo, menú del Super Admin) no se toca:
   vive en el layout y sigue en su lugar. Los usa cada loading.tsx. */
import { Esq, EsqCirculo, EsqTexto, EsqZona, FilaFreeEsqueleto, TarjetaVitrinaEsqueleto } from "@tolatino/ui";

const Tarjeta = () => (
  <div className="flex gap-3 rounded-[17px] border border-line bg-white p-3">
    <Esq w={84} h={84} r={13} style={{ flex: "none" }} />
    <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1"><Esq h={15} w="70%" r={6} /><Esq h={11} w="45%" r={6} /><Esq h={11} w="60%" r={6} /></div>
  </div>
);

/* Una lista (buscar, categoría, eventos, mi cuenta…): título, fila de chips y tarjetas. */
export function EsqLista() {
  return (
    <EsqZona className="mx-auto w-full max-w-[1180px] px-5 pt-4 lg:px-10">
      <Esq h={26} w="55%" r={8} />
      <div className="mt-2"><Esq h={12} w="35%" r={6} /></div>
      <div className="mt-4 flex gap-2 overflow-hidden">{[78, 96, 70, 88, 64].map((w, i) => <Esq key={i} w={w} h={34} r={999} style={{ flex: "none" }} />)}</div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <Tarjeta key={i} />)}</div>
    </EsqZona>
  );
}

/* Las listas de negocios (Negocios, categoría, Buscar): tarjetas Vitrina y filas Free con la misma geometría que la pieza (decisión AK). */
export function EsqNegocios() {
  return (
    <EsqZona className="mx-auto w-full max-w-[1440px] px-5 pt-4 lg:px-[30px]">
      <Esq h={26} w="55%" r={8} />
      <div className="mt-4 flex gap-2 overflow-hidden">{[78, 96, 70, 88, 64].map((w, i) => <Esq key={i} w={w} h={34} r={999} style={{ flex: "none" }} />)}</div>
      <div className="tl-vit-rejilla mt-5">{Array.from({ length: 4 }, (_, i) => <TarjetaVitrinaEsqueleto key={i} />)}</div>
      <div className="tl-fila-rejilla mt-4">{Array.from({ length: 2 }, (_, i) => <FilaFreeEsqueleto key={i} />)}</div>
    </EsqZona>
  );
}

/* La ficha de un negocio: portada, nombre, datos, la fila de acciones, pestañas y secciones. */
export function EsqFicha() {
  return (
    <EsqZona className="mx-auto w-full max-w-[1180px] lg:px-10 lg:pt-6">
      <Esq h={260} r={0} className="lg:!rounded-[20px]" />
      <div className="px-5 pt-4 lg:px-0">
        <div className="flex gap-2"><Esq w={44} h={24} r={999} /><Esq w={112} h={24} r={999} /></div>
        <div className="mt-3"><Esq h={11} w="40%" r={6} /></div>
        <div className="mt-2"><Esq h={30} w="72%" r={8} /></div>
        <div className="mt-3"><Esq h={12} w="58%" r={6} /></div>
        <div className="mt-2"><Esq h={14} w="32%" r={6} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{[1, 2, 3].map((i) => <Esq key={i} h={42} r={12} style={{ flex: "1 1 30%" }} />)}</div>
        <div className="mt-5 flex gap-5 border-b border-line pb-3">{[72, 56, 64, 70].map((w, i) => <Esq key={i} w={w} h={12} r={6} />)}</div>
        <div className="mt-5 flex flex-col gap-4"><EsqTexto lineas={3} /><Esq h={120} r={17} /><EsqTexto lineas={2} ultima="40%" /></div>
      </div>
    </EsqZona>
  );
}

/* El muro de la Comunidad: publicaciones con autor, texto y acciones. */
export function EsqMuro() {
  const Pub = () => (
    <div className="rounded-[17px] border border-line bg-white p-4">
      <div className="flex items-center gap-3"><EsqCirculo d={38} /><div className="flex flex-1 flex-col gap-1.5"><Esq h={13} w="40%" r={6} /><Esq h={10} w="25%" r={6} /></div></div>
      <div className="mt-3"><EsqTexto lineas={3} /></div>
      <div className="mt-3 flex gap-4">{[48, 56, 44].map((w, i) => <Esq key={i} w={w} h={12} r={6} />)}</div>
    </div>
  );
  return (
    <EsqZona className="mx-auto w-full max-w-[720px] px-5 pt-4">
      <div className="flex gap-2 overflow-hidden">{[70, 92, 80, 66].map((w, i) => <Esq key={i} w={w} h={34} r={999} style={{ flex: "none" }} />)}</div>
      <div className="mt-4 flex flex-col gap-3">{[1, 2, 3, 4].map((i) => <Pub key={i} />)}</div>
    </EsqZona>
  );
}

/* Una pantalla del Super Admin: título, cifras y una tabla. */
export function EsqAdmin() {
  return (
    <EsqZona className="w-full px-6 pt-6">
      <Esq h={11} w={120} r={6} />
      <div className="mt-2"><Esq h={28} w={280} r={8} /></div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Esq key={i} h={86} r={14} />)}</div>
      <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-white">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
            <EsqCirculo d={28} /><Esq h={12} w="22%" r={6} /><Esq h={12} w="16%" r={6} /><Esq h={12} w="12%" r={6} /><div className="ml-auto"><Esq h={24} w={72} r={8} /></div>
          </div>
        ))}
      </div>
    </EsqZona>
  );
}
