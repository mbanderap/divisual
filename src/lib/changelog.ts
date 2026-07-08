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
    description: "Crear las tablas de Tickets, Tablero, Cartera activa y Chat (ver carpeta sql/) en el proyecto real de Supabase.",
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
