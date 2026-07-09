export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  status: "done" | "planned";
}

// Se actualiza a mano con cada tanda de trabajo que se commitea.
// Las entradas más recientes van primero.
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-07-09",
    title: "Fusionar duplicados de verdad",
    description: "En Ajustes, cada grupo de duplicados tiene un botón \"Fusionar\": eliges qué valor de cada campo quieres conservar (o lo escribes tú), y al confirmar se guarda en un único registro, se mueven sus vínculos (empresas, negocios, tickets, etiquetas...) y se borran los duplicados.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Eliminar un Usuario ahora revoca el acceso de verdad",
    description: "Antes, borrar a alguien de Usuarios solo quitaba su ficha; su cuenta seguía activa y podía seguir entrando. Ahora también se elimina su cuenta real. Requiere la Edge Function delete-user desplegada en Supabase.",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Negocios perdidos, archivados en vez de columna",
    description: "Se quitó \"Perdido\" del tablero (ya no hay que verlo entre las etapas activas). Junto a \"Nuevo negocio\" hay un botón \"Archivados\" con los negocios perdidos, por si hay que reabrirlos o borrarlos.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Panel: orden nuevo y cuadros accionables",
    description: "Los 8 cuadros del Panel siguen el orden: pipeline abierto, ingresos mes actual, ingresos estimados este mes, ingresos mes a futuro, cambios en la fecha, hoteles con plan, contactos, ingresos ganados. Y ahora son clicables: te llevan directo al módulo de donde sale ese dato.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Sin emojis: iconos SVG en su lugar",
    description: "Se quitaron los emojis (⏳ 📅 ↻ ✉) de las tarjetas de negocio/hotel, el indicador de recurrencia y el botón de correo, sustituidos por iconos SVG del mismo estilo que el resto de la app.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Retoques varios",
    description: "El umbral de \"en riesgo\" en Cartera activa pasó de 5 a 3 meses de desviación. \"Década\" ahora dice \"Décima\". Los Tickets ya se pueden eliminar desde su ficha, como el resto de entidades.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Filtros y exportar a CSV en Contactos, Empresas y Hoteles",
    description: "Cada vista tiene un desplegable de filtro (estado del lead / relación cliente / plan) que se combina con la búsqueda, y un botón \"Exportar CSV\" que descarga exactamente lo filtrado, solo con las columnas que tengas visibles en \"Columnas\".",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Arreglo: los contactos vinculados no se veían en la ficha de empresa",
    description: "La tarjeta de empresa ya mostraba el número de contactos asociados, pero al abrir la ficha no aparecían. Ahora la ficha de empresa lista los contactos vinculados (con su cargo) y enlaza a cada uno.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "El logo de divisual vuelve al Panel",
    description: "Al hacer clic en \"divisual\" arriba a la izquierda, ahora te lleva al Panel, como en cualquier app.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Usuarios (antes \"Personal\") ligado a cuentas reales",
    description: "Se renombró Personal a Usuarios y se movió debajo de Changelog. Nueva tabla `profiles`, sincronizada con auth.users por trigger (el navegador no puede leer auth.users directamente), para saber quién tiene cuenta de verdad. El Chat y el filtro por persona del Calendario ya solo muestran usuarios con cuenta, no todo el directorio de Personal.",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Categorías del Calendario según la pestaña",
    description: "Antes se podía crear una \"Reunión\" desde la pestaña Vacaciones. Ahora el desplegable de categoría solo ofrece las que tienen sentido en la pestaña activa (Vista técnica → Despliegue; Eventos → Reunión/Formación/Visita a hotel; Vacaciones y teletrabajo → Vacaciones/Teletrabajo).",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Arreglo: \"Panel\" siempre aparecía marcado en el menú",
    description: "El enlace de Panel usaba la clase de \"activo\" no exacta, que en Vue Router coincide con cualquier ruta (porque todas cuelgan de \"/\"). Se cambió a la clase de coincidencia exacta.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Esquema SQL consolidado en un solo archivo",
    description: "Todos los sql/*.sql anteriores (10 archivos sueltos, más las tablas base que nunca estaban en el repo) se han unido en sql/2026-07-09_schema_completo.sql: crea toda la base de datos desde cero, en el estado final que espera la app. Pensado para borrar y rehacer la base de datos.",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Notificaciones en tiempo real",
    description: "Aviso al momento (sin recargar) cuando te llega un mensaje nuevo en el Chat o te asignan una tarea en el Tablero. Requiere sql/2026-07-09_schema_completo.sql (el Chat ya tenía Realtime activado; ese archivo añade la parte que falta para las asignaciones de tareas).",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Vista imprimible de propuesta de negocio",
    description: "Botón \"Ver propuesta\" en la ficha de un negocio: abre una página limpia (sin menú) con los datos del negocio, lista para imprimir o guardar como PDF desde el navegador.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Botón de correo en Contactos",
    description: "Junto al email de un contacto hay un botón que abre tu cliente de correo con el destinatario ya puesto, y lo apunta en el historial del contacto.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Forecast de ingresos en el Panel",
    description: "Gráfico de barras con los ingresos previstos (negocios ganados) de los próximos 12 meses, con detalle al pasar el ratón y una vista en tabla.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Detectar duplicados",
    description: "Nueva herramienta en Ajustes: busca contactos con el mismo correo y empresas con el mismo nombre, y enlaza a cada ficha para revisarlas y fusionarlas a mano.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Semáforo de riesgo en Cartera activa",
    description: "La pestaña \"Tickets activos\" muestra un nivel de riesgo (alto/medio/bajo) por hotel, combinando la desviación del plan con los tickets abiertos.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "\"Vence pronto\" en Negocios y Hoteles",
    description: "Un negocio abierto con cierre previsto en menos de 15 días, o un hotel con plan que termina en menos de 30, se marca en su tarjeta.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Buscador universal (Ctrl/Cmd+K)",
    description: "Desde cualquier pantalla, Ctrl+K abre un buscador que encuentra contactos, empresas, hoteles, negocios, tareas, tickets y personal, y te lleva directo a la ficha.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Mi día",
    description: "Nueva pantalla (arriba en General): mis tareas abiertas del Tablero, eventos de hoy en el Calendario, tickets urgentes (vencen en 15 días) y negocios por cerrar esta semana, todo junto al abrir la app.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Negocios estancados y alertas de desviación",
    description: "Un negocio abierto que lleva más de 14 días en la misma etapa se marca en Negocios (⏳ y borde de aviso). Al entrar en la app, si algún hotel con plan se ha desviado más de un 15%, sale un aviso. Requiere sql/2026-07-09_schema_completo.sql para el histórico de etapa.",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Invitar usuarios desde Ajustes",
    description: "Nueva tarjeta \"Usuarios del equipo\": pones el correo (y nombre opcional) y le llega una invitación para poner su contraseña y entrar al CRM. La creación real la hace una Edge Function de Supabase (supabase/functions/invite-user) con la clave service_role, que nunca toca el navegador.",
    status: "planned",
  },
  {
    date: "2026-07-09",
    title: "Nuevos KPI de ingresos en el Panel",
    description: "Segunda fila de 4 cuadros: negocios con cierre movido este mes, ingresos estimados este mes (pipeline abierto que cierra este mes), ingresos del mes actual (negocios ganados con servicio activo) e ingresos a futuro (servicio que empieza más adelante). Requiere el trigger de sql/2026-07-09_schema_completo.sql para registrar cuándo cambia la fecha de cierre.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Etiquetas nuevas al vuelo en Contactos",
    description: "En la ficha de un contacto ya se puede crear una etiqueta nueva sin salir del formulario, igual que en las tareas del Tablero.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Borrar modelos de facturación",
    description: "En Ajustes, cada modelo de facturación tiene ahora un botón para eliminarlo.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Categorías \"Formación\" y \"Visita a hotel\" en el Calendario",
    description: "Dos categorías nuevas en la pestaña Eventos, junto a Reunión.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Recurrencia en Calendario y Tablero",
    description: "Los eventos y las tareas admiten repetición semanal (elige el día) o mensual (elige el día del mes). Un evento recurrente se proyecta en todos los meses sin duplicar filas; una tarea recurrente, al llegar a \"Listo en prod\", vuelve sola a \"Por hacer\" con la fecha de la próxima ocurrencia.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Calendario: líneas y ancho",
    description: "La cuadrícula tenía bordes dobles entre días y se estiraba demasiado en pantallas anchas. Ahora tiene un único borde limpio, esquinas redondeadas, el día de hoy resaltado y un ancho máximo para que las celdas no queden deformadas.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Borrar un negocio",
    description: "La ficha de un negocio tenía botón para guardar pero no para eliminarlo. Ya se puede borrar desde el mismo modal, como en el resto de fichas.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Ancho de Contactos, Empresas, Personal y Hoteles",
    description: "Estas vistas usaban solo una franja central del ancho disponible; ahora aprovechan todo el espacio, igual que Negocios o Tablero.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Desplegables más redondeados",
    description: "Se aumentó el radio de los selectores y menús propios de la app (buscadores, filtros, formularios). El menú nativo que despliega un <select> lo pinta el sistema operativo y no se puede redondear por CSS.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Arreglar mensajes de error genéricos",
    description: "El aviso de error mostraba \"[object Object]\" en vez del mensaje real cuando Supabase devolvía un error. Ahora se extrae el mensaje de verdad.",
    status: "done",
  },
  {
    date: "2026-07-09",
    title: "Ejecutar el SQL de recurrencia en Supabase",
    description: "Faltan las columnas recurrence y recurrence_day en events y tasks (sql/2026-07-09_schema_completo.sql) para que funcione la repetición.",
    status: "planned",
  },
  {
    date: "2026-07-08",
    title: "Backlog y etiquetas en el Tablero",
    description: "Pestaña Backlog: todas las tareas nacen sin sprint y se agrupan por sprint (o Backlog) con un desplegable para moverlas y cambiar su etapa. Etiquetas de color creables al vuelo y asignables a cualquier tarea.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Sprints, subtareas y adjuntos en el Tablero",
    description: "Sprints con fecha de inicio/fin y filtro en el tablero, checklist de subtareas dentro de cada tarea, y adjuntar enlaces (documentos, capturas...) a la ficha de la tarea.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Prioridad y fecha límite en el Tablero",
    description: "Cada tarea tiene ahora prioridad (Alta/Media/Baja, con color en el borde de la tarjeta) y fecha límite (en rojo si está vencida).",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Importación de Hoteles desde Jaippy + seguimiento de década",
    description: "Script para traer name/tau/has_plan/plan_end_date/deviation_days/current_ij desde la base de datos de Jaippy. Nuevo: last_known_tenth, last_tenth_check_at y tenth_increased para saber qué hoteles suben o bajan de década entre ejecuciones (flecha ▲▼ en Cartera activa).",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Calendario conjunto",
    description: "Vista técnica (subidas a producción), Eventos (reuniones) y Vacaciones/teletrabajo, con filtro por persona y un roadmap del día al hacer clic en una fecha.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Chat interno con solicitud de tareas",
    description: "Mensajería 1 a 1 entre personal de la empresa, con un botón para solicitar una tarea dentro de la conversación. El destinatario acepta o rechaza; al aceptar, la tarea se crea automáticamente en el Tablero.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Changelog / Roadmap",
    description: "Este apartado: lo que llevamos hecho y lo que queda por hacer, visible dentro de la app.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Cartera activa (Administración/Ventas)",
    description: "Resumen de hoteles cliente con pestañas Resumen y Tickets activos: KPIs, cambios de estado recientes y fin de plan urgente.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Tablero (Soporte/IT)",
    description: "Kanban de tareas y bugs con historias, asignación a varias personas, filtro por persona y comentarios por tarea.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Tickets (Customer Success)",
    description: "Nueva división Customer Success con el kanban de Tickets: Por iniciar → Seguimiento activo → Consolidación → Décima alcanzada → Cierre de ciclo.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Ancho de Negocios y fix de despliegue en Vercel",
    description: "El tablero de Negocios ya usa todo el ancho disponible. Se quitó node_modules del repositorio (causaba el fallo de build en Vercel) y se añadió .gitignore.",
    status: "done",
  },
  {
    date: "2026-07-08",
    title: "Automatizar el paso de etapa por tiempo",
    description: "Trigger para que un ticket pase solo de Consolidación a Décima alcanzada a los 30 días de subir la décima.",
    status: "planned",
  },
];
