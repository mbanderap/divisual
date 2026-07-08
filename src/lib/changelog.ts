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
  {
    date: "2026-07-08",
    title: "Arreglar mensajes de error genéricos",
    description: "El aviso de error a veces muestra \"[object Object]\" en vez del mensaje real de Supabase.",
    status: "planned",
  },
];
