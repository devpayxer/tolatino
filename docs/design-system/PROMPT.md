# PROMPT — Pégalo en Claude Code

Copia y pega esto como primer mensaje en Claude Code, dentro del repo donde vas a construir To'Latino.

---

Eres el desarrollador de **To'Latino**, una plataforma geolocalizada por ciudad, **mobile-first** y **bilingüe (español base, inglés secundario)** para la comunidad latina en EE. UU. — un "Yelp + Nextdoor + Eventbrite de latinos para latinos".

En la carpeta `design_handoff_tolatino/` tienes:
- `README.md` — **léelo completo primero**. Documenta cada pantalla, tokens de diseño, interacciones, estado y comportamiento responsive.
- Varios archivos `.dc.html` — **referencias de diseño en HTML de alta fidelidad** (prototipos), NO código para copiar tal cual. Ábrelos en el navegador para ver el look & feel exacto.

## Tu tarea
Recrea estos diseños como una **aplicación real** en este codebase, usando sus patrones y librerías. Si el repo está vacío, inicializa **React + TypeScript (Vite)**, con react-router e i18n (ES por defecto, EN secundario), e iconos Lucide.

**Importante — arquitectura:** El prototipo muestra todo en un "Studio" con 3 marcos de dispositivo lado a lado solo para revisión. **Descarta ese andamiaje.** Construye una sola app responsiva. Las tres "superficies" son áreas reales:
1. **Bienvenida** → landing pública (`/`).
2. **Cliente** → app con 7 categorías: Comunidad (`/comunidad`, estilo Nextdoor), Negocios (`/negocios`, estilo Yelp), Eventos (`/eventos`, con boletos), y 4 en "Muy pronto" (Transporte, Bienes Raíces, Autos, Trabajos) con lista de espera.
3. **Negocio** → panel de administración (`/negocio/*`) con sidebar (Resumen, Listado, Módulos, Clientes, Cuenta) que varía por plan (Free/Verified/Premium) y rubro.

## Requisitos transversales (no negociables)
- **Mobile-first y pixel-perfect:** el 99% de usuarios son móviles. Reproduce fielmente el móvil (incluida la **barra de navegación inferior** con FAB "+" central) y escala a tablet/escritorio con los breakpoints del README.
- **Bilingüe ES/EN** con toggle global; todo el texto tiene par ES/EN en el README/prototipo.
- **Geolocalizado por ciudad:** selector de ciudad (modal / hoja inferior) con "usar mi ubicación" y búsqueda; la ciudad se propaga a toda la app.
- **Fuente** Plus Jakarta Sans; **color primario** `#7B61FF`; **diamante ámbar** `#F4B740` en el logo. Usa la tabla completa de tokens del README.
- **Búsqueda global** con sugerencias en vivo agrupadas y filtrado real por sección.
- Interacciones con estado real: publicar (agrega al feed), ♥ guardar, "Voy", seguir, recomendar, notificaciones, menú de usuario, onboarding de negocio → panel.

## Cómo trabajar
1. Lee `design_handoff_tolatino/README.md` de principio a fin.
2. Abre los `.dc.html` en el navegador y contrástalos con el README.
3. Propón la estructura de carpetas/rutas/estado y un plan por fases (empieza por Bienvenida + Cliente/Comunidad, luego Negocios y Eventos, luego el Panel de negocio).
4. Confírmame el plan y avanza. Prioriza fidelidad visual en móvil y comportamiento real sobre cubrir todo de una vez.

Empieza leyendo el README y mostrándome el plan.
