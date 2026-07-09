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
    title: "Nuevos KPI de ingresos en el Panel",
    description: "Segunda fila de 4 cuadros: negocios con cierre movido este mes, ingresos estimados este mes (pipeline abierto que cierra este mes), ingresos del mes actual (negocios ganados con servicio activo) e ingresos a futuro (servicio que empieza más adelante). Requiere el trigger de sql/2026-07-09_deals_cambio_fecha_cierre.sql para registrar cuándo cambia la fecha de cierre.",
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
    description: "Faltan las columnas recurrence y recurrence_day en events y tasks (sql/2026-07-09_recurrencia.sql) para que funcione la repetición.",
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
    title: "Ejecutar el SQL nuevo en Supabase",
    description: "Crear las tablas de Tickets, Tablero, Cartera activa, Chat y Calendario (ver carpeta sql/) en el proyecto real de Supabase.",
    status: "planned",
  },
  {
    date: "2026-07-08",
    title: "Automatizar el paso de etapa por tiempo",
    description: "Trigger para que un ticket pase solo de Consolidación a Décima alcanzada a los 30 días de subir la décima.",
    status: "planned",
  },
];
